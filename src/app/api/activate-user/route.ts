import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireRole } from "@/app/lib/auth";
import { triggerStudentActivationWorkflow } from "@/app/lib/student-workflow";
import { sendAccountActivatedEmail, getLang } from "@/app/lib/emailService";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bodySchema = z.object({
    userId: z.string().uuid(),
    activate: z.boolean(),
});

async function handleActivateUser(req: NextRequest) {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const { userId, activate } = parsed.data;

    // Récupérer le profil utilisateur
    const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, role, name, contact_email, email, is_active, langue")
        .eq("id", userId)
        .single();

    if (userError || !userData) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Mettre à jour is_active
    const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ is_active: activate, updated_at: new Date().toISOString() })
        .eq("id", userId);

    if (updateError) {
        console.error("[activate-user] updateError:", updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Répercuter la décision sur Supabase Auth lui-même. Sans cela, `is_active`
    // n'était qu'un drapeau applicatif : un compte désactivé continuait de
    // s'authentifier normalement auprès de GoTrue et de rafraîchir ses jetons.
    // Le bannissement coupe la délivrance de tout nouveau jeton ; les jetons
    // d'accès déjà émis, eux, sont refusés dès la requête suivante par la
    // vérification de `is_active` dans `getServerSession`.
    const BAN_FOREVER = "876000h"; // 100 ans
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: activate ? "none" : BAN_FOREVER,
    });

    if (banError) {
        // On rétablit `is_active` pour ne pas laisser un compte « désactivé » à
        // l'écran alors qu'il peut toujours se connecter : mieux vaut une erreur
        // franche qu'une désactivation de façade.
        await supabaseAdmin
            .from("users")
            .update({ is_active: !activate, updated_at: new Date().toISOString() })
            .eq("id", userId);
        console.error("[activate-user] banError:", banError.message);
        return NextResponse.json(
            {
                error: activate
                    ? "Le compte n'a pas pu être réactivé côté authentification. Statut inchangé."
                    : "Le compte n'a pas pu être désactivé côté authentification. Statut inchangé.",
            },
            { status: 502 },
        );
    }

    let workflowResult: { dossierId?: string; paymentsCreated: number } | null = null;

    // Déclencher le workflow complet uniquement lors de l'activation d'un étudiant
    if (activate && userData.role === "student") {
        const { data: studentData, error: studentError } = await supabaseAdmin
            .from("students")
            .select("id, choix, langue, niveau, nationalite, nom, prenom, filiere")
            .eq("user_id", userId)
            .maybeSingle();

        if (!studentError && studentData) {
            try {
                workflowResult = await triggerStudentActivationWorkflow(supabaseAdmin, studentData);
            } catch (err: any) {
                console.error("[activate-user] workflow error:", err?.message || err);
                // Non bloquant — le compte est déjà activé, le workflow échoue gracieusement
            }

            // Email de confirmation d'activation à l'étudiant (arrière-plan)
            const contactEmail = userData.contact_email || userData.email;
            if (contactEmail && !contactEmail.endsWith("@students.joda.app")) {
                const lang = getLang(studentData.langue);
                void (async () => {
                    try {
                        const { data: u } = await supabaseAdmin
                            .from("users")
                            .select("username")
                            .eq("id", userId)
                            .single();
                        await sendAccountActivatedEmail({
                            studentName: userData.name,
                            studentEmail: contactEmail,
                            username: u?.username ?? userData.name,
                            lang,
                        });
                    } catch (e) {
                        console.error("[activate-user] email error:", e);
                    }
                })();
            }
        }
    }

    return NextResponse.json({
        success: true,
        activate,
        workflow: workflowResult
            ? {
                  dossierId: workflowResult.dossierId ?? null,
                  paymentsCreated: workflowResult.paymentsCreated,
              }
            : null,
    });
}

export const POST = requireRole(["admin", "super_admin"], handleActivateUser);
