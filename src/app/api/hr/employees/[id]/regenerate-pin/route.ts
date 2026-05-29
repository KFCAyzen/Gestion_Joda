import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole, AuthSession } from "@/app/lib/auth";
import { sendReportPinEmail } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handle(req: NextRequest, _session: AuthSession) {
    try {
        const id = req.nextUrl.pathname.split("/").filter(Boolean).at(-2);
        if (!id) {
            return NextResponse.json({ error: "ID employé manquant" }, { status: 400 });
        }

        const { data: plain, error } = await supabaseAdmin.rpc("hr_regenerate_report_pin", {
            emp_id: id,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!plain) {
            return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
        }

        const notifications: {
            email?: boolean;
            sms?: boolean;
            emailError?: string;
            smsError?: string;
            emailSkipped?: string;
            smsSkipped?: string;
        } = {};
        try {
            const { data: emp, error: empErr } = await supabaseAdmin
                .from("employees")
                .select("nom, prenom, email, telephone")
                .eq("id", id)
                .single();

            if (empErr) {
                console.error("[regenerate-pin] lecture employé:", empErr);
            }

            if (emp) {
                const fullName = `${emp.prenom} ${emp.nom}`.trim();
                const origin = req.nextUrl.origin;
                const reportUrl = `${origin}/fr/rapport`;
                const smsMsg = `Joda Company - Votre code PIN pour les rapports journaliers : ${plain}. Confidentiel, ne le partagez pas. Formulaire : ${reportUrl}`;

                const tasks: Promise<void>[] = [];
                if (emp.email) {
                    tasks.push(
                        sendReportPinEmail({
                            employeeName: fullName,
                            employeeEmail: emp.email,
                            pin: plain,
                            reportUrl,
                        })
                            .then((r) => { notifications.email = r.ok; if (!r.ok) notifications.emailError = r.error; })
                            .catch((err) => { console.error("[regenerate-pin] email exception:", err); notifications.email = false; notifications.emailError = err?.message || String(err); })
                    );
                } else {
                    notifications.emailSkipped = "no email on employee";
                }
                if (emp.telephone) {
                    tasks.push(
                        sendSmsToPhone(emp.telephone, smsMsg)
                            .then((r) => { notifications.sms = r.ok; if (!r.ok) notifications.smsError = r.error; })
                            .catch((err) => { console.error("[regenerate-pin] sms exception:", err); notifications.sms = false; notifications.smsError = err?.message || String(err); })
                    );
                } else {
                    notifications.smsSkipped = "no phone on employee";
                }
                await Promise.all(tasks);
            } else {
                notifications.emailSkipped = "employee row not found";
                notifications.smsSkipped = "employee row not found";
            }
        } catch (notifyErr: any) {
            console.error("[regenerate-pin] notification block failed:", notifyErr);
            notifications.emailError = notifications.emailError || notifyErr?.message;
            notifications.smsError = notifications.smsError || notifyErr?.message;
        }

        console.log("[regenerate-pin] notifications result:", JSON.stringify(notifications));
        return NextResponse.json({ employee: { id, report_pin: plain }, notifications });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(["supervisor", "admin", "super_admin"], handle);
