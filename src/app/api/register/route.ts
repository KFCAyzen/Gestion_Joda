import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildStudentUsername, buildStudentAuthEmail } from "@/app/lib/student-auth";
import {
    sendRegistrationConfirmationEmail,
    sendRegistrationPendingAdminEmail,
    getLang,
} from "@/app/lib/emailService";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const registerSchema = z.object({
    // Infos personnelles
    prenom: z.string().min(1).max(60),
    nom: z.string().min(1).max(60),
    email: z.string().email(),
    telephone: z.string().min(5).max(25),
    age: z.number().int().min(15).max(60),
    sexe: z.enum(["M", "F"]),
    nationalite: z.string().min(1).max(80),
    // Infos académiques
    niveau: z.string().min(1).max(100),
    filiere: z.string().min(1).max(100),
    diplome_acquis: z.string().min(1).max(100),
    langue: z.string().min(1).max(50),
    choix: z.enum(["procedure_seule", "cours_seuls", "procedure_cours"]),
    // Passeport
    passeport_numero: z.string().min(4).max(30),
    passeport_expiration: z.string().min(1),
    // Compte
    password: z.string().min(8),
});

async function findAvailableUsername(prenom: string, nom: string): Promise<string> {
    for (let suffix = 0; suffix <= 20; suffix++) {
        const candidate = buildStudentUsername(prenom, nom, suffix);
        const { data } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("username", candidate)
            .maybeSingle();
        if (!data) return candidate;
    }
    return buildStudentUsername(prenom, nom, Date.now());
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0];
            return NextResponse.json(
                { error: firstIssue?.message ?? "Données invalides", field: firstIssue?.path?.[0] },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // Vérifier que l'email n'existe pas déjà dans students
        const { data: existingStudent } = await supabaseAdmin
            .from("students")
            .select("id")
            .eq("email", data.email)
            .maybeSingle();

        if (existingStudent) {
            return NextResponse.json(
                { error: "EMAIL_EXISTS", message: "Un compte existe déjà avec cet email." },
                { status: 409 }
            );
        }

        // Vérifier aussi dans users (contact_email)
        const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("contact_email", data.email)
            .maybeSingle();

        if (existingUser) {
            return NextResponse.json(
                { error: "EMAIL_EXISTS", message: "Un compte existe déjà avec cet email." },
                { status: 409 }
            );
        }

        // Générer le nom d'utilisateur (avec gestion des doublons)
        const username = await findAvailableUsername(data.prenom, data.nom);
        const authEmail = buildStudentAuthEmail(username);

        // Vérifier si l'authEmail existe déjà dans Supabase Auth
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (authUsers?.users?.some((u) => u.email === authEmail)) {
            return NextResponse.json(
                { error: "USERNAME_EXISTS", message: "Un doublon d'identifiant existe. Contactez l'équipe." },
                { status: 409 }
            );
        }

        // Créer le compte Supabase Auth — is_active: false via user_metadata
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                username,
                name: `${data.prenom} ${data.nom}`,
                role: "student",
                telephone: data.telephone,
                is_active: false,
                self_registered: true,
            },
            app_metadata: { role: "student" },
        });

        if (authError || !authData.user) {
            console.error("[register] authError:", authError?.message);
            return NextResponse.json(
                { error: authError?.message ?? "Impossible de créer le compte" },
                { status: 500 }
            );
        }

        const userId = authData.user.id;

        // Créer l'entrée dans la table users
        const { error: userDbError } = await supabaseAdmin.from("users").insert({
            id: userId,
            email: authEmail,
            contact_email: data.email,
            username,
            name: `${data.prenom} ${data.nom}`,
            role: "student",
            telephone: data.telephone,
            password_hash: "managed_by_supabase_auth",
            must_change_password: false,
            is_active: false,
        });

        if (userDbError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            console.error("[register] userDbError:", userDbError.message);
            return NextResponse.json({ error: userDbError.message }, { status: 500 });
        }

        // Créer l'entrée dans la table students
        const { data: studentData, error: studentDbError } = await supabaseAdmin
            .from("students")
            .insert({
                nom: data.nom,
                prenom: data.prenom,
                email: data.email,
                telephone: data.telephone,
                age: data.age,
                sexe: data.sexe,
                nationalite: data.nationalite,
                niveau: data.niveau,
                filiere: data.filiere,
                diplome_acquis: data.diplome_acquis,
                langue: data.langue,
                choix: data.choix,
                passeport_numero: data.passeport_numero,
                passeport_expiration: data.passeport_expiration,
                user_id: userId,
            })
            .select("id")
            .single();

        if (studentDbError) {
            // Rollback partiel — supprimer user DB + auth
            await supabaseAdmin.from("users").delete().eq("id", userId);
            await supabaseAdmin.auth.admin.deleteUser(userId);
            console.error("[register] studentDbError:", studentDbError.message);
            return NextResponse.json({ error: studentDbError.message }, { status: 500 });
        }

        const studentId = studentData.id;
        const lang = getLang(data.langue);
        const fullName = `${data.prenom} ${data.nom}`;

        // Emails en arrière-plan (non bloquants)
        sendRegistrationConfirmationEmail({
            studentName: fullName,
            studentEmail: data.email,
            username,
            lang,
        }).catch(console.error);

        supabaseAdmin
            .from("users")
            .select("contact_email, email")
            .in("role", ["admin", "super_admin"])
            .then(({ data: admins }) => {
                const adminEmails = (admins ?? [])
                    .map((u: { contact_email?: string; email?: string }) => u.contact_email || u.email)
                    .filter(Boolean) as string[];

                sendRegistrationPendingAdminEmail({
                    studentName: fullName,
                    studentUsername: username,
                    studentEmail: data.email,
                    niveau: data.niveau,
                    filiere: data.filiere,
                    choix: data.choix,
                    adminEmails,
                }).catch(console.error);
            });

        return NextResponse.json({ success: true, studentId, username });
    } catch (err: any) {
        console.error("[register] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
    }
}
