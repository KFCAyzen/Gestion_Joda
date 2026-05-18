import {
    DEFAULT_PAYMENT_CONFIGS,
    getBourseServiceType,
    isInternational,
} from "@/app/types/payment-config";
import type { PaymentConfig, ServiceType } from "@/app/types/payment-config";

const INTL_PROGRAM_TYPES = ["language_program_intl", "partial_scholarship_intl", "full_scholarship_intl"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = any;

// ── Payment config loader (DB-first, fallback to defaults) ────────────────────

async function loadPaymentConfigs(
    supabaseAdmin: SupabaseAdminClient
): Promise<Record<ServiceType, PaymentConfig>> {
    const { data } = await supabaseAdmin
        .from("payment_config")
        .select("*");

    const merged = { ...DEFAULT_PAYMENT_CONFIGS } as Record<ServiceType, PaymentConfig>;

    if (Array.isArray(data)) {
        for (const row of data as Array<{ service_type: string } & PaymentConfig>) {
            const st = row.service_type as ServiceType;
            if (st && merged[st]) {
                merged[st] = row as PaymentConfig;
            }
        }
    }

    return merged;
}

// ── Student data needed for the workflow ──────────────────────────────────────

export interface StudentWorkflowData {
    id: string;
    choix: string;
    langue: string;
    niveau: string;
    nationalite?: string | null;
    nom: string;
    prenom: string;
    filiere: string;
}

// ── Core workflow: dossier + payments ────────────────────────────────────────

export async function triggerStudentActivationWorkflow(
    supabaseAdmin: SupabaseAdminClient,
    student: StudentWorkflowData
): Promise<{ dossierId?: string; paymentsCreated: number }> {
    const configs = await loadPaymentConfigs(supabaseAdmin);

    const result: { dossierId?: string; paymentsCreated: number } = { paymentsCreated: 0 };

    // 1. Créer le dossier de bourse si non existant et si procédure impliquée
    if (student.choix !== "cours_seuls") {
        const { data: existingDossier } = await supabaseAdmin
            .from("dossier_bourses")
            .select("id")
            .eq("student_id", student.id)
            .maybeSingle();

        if (!existingDossier) {
            const { data: newDossier } = await supabaseAdmin
                .from("dossier_bourses")
                .insert({
                    student_id: student.id,
                    status: "document_manquant",
                    desired_program: student.filiere || "",
                    study_level: student.niveau || "",
                    notes_internes: "Dossier créé automatiquement lors de l'activation du compte.",
                })
                .select("id")
                .single();

            if (newDossier) result.dossierId = newDossier.id;
        }
    }

    // 2. Synchroniser les paiements

    // Déterminer les types de paiement attendus
    const expectedTypes = new Set<string>();
    if (student.choix === "procedure_seule" || student.choix === "procedure_cours") {
        expectedTypes.add("bourse");
    }
    const langueKey = student.langue?.toLowerCase().includes("mandarin")
        ? "mandarin"
        : student.langue?.toLowerCase().includes("anglais")
        ? "anglais"
        : null;
    if (
        !isInternational(student.nationalite) &&
        langueKey &&
        (student.choix === "cours_seuls" || student.choix === "procedure_cours")
    ) {
        expectedTypes.add(langueKey);
    }

    // Paiements existants
    const { data: existing } = await supabaseAdmin
        .from("payments")
        .select("type, status")
        .eq("student_id", student.id);
    const existingPayments: Array<{ type: string; status: string }> = existing ?? [];
    const allExistingTypes = new Set<string>(existingPayments.map((p) => p.type));

    // Supprimer les paiements en attente/retard pour types hors-service
    const typesToRemove = [...allExistingTypes].filter(
        (t) => !expectedTypes.has(t) && !INTL_PROGRAM_TYPES.includes(t)
    );
    if (typesToRemove.length > 0) {
        await supabaseAdmin
            .from("payments")
            .delete()
            .eq("student_id", student.id)
            .in("type", typesToRemove)
            .in("status", ["attente", "retard"]);
    }

    // Créer les paiements manquants
    const toInsert: {
        student_id: string;
        type: string;
        tranche: number;
        montant: number;
        status: string;
        penalites: number;
        date_limite?: string;
    }[] = [];

    if (expectedTypes.has("bourse") && !allExistingTypes.has("bourse")) {
        const serviceType = getBourseServiceType(student.niveau, student.nationalite);
        const bourseCfg = configs[serviceType] ?? DEFAULT_PAYMENT_CONFIGS[serviceType];
        const dateLimite = new Date(Date.now() + bourseCfg.deadline_offset_days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        bourseCfg.tranches.forEach((tr) =>
            toInsert.push({
                student_id: student.id,
                type: "bourse",
                tranche: tr.tranche,
                montant: tr.montant,
                status: "attente",
                penalites: 0,
                date_limite: dateLimite,
            })
        );
    }

    if (langueKey && expectedTypes.has(langueKey) && !allExistingTypes.has(langueKey)) {
        const coursCfg = configs[langueKey as ServiceType] ?? DEFAULT_PAYMENT_CONFIGS[langueKey as ServiceType];
        const dateLimite = new Date(Date.now() + coursCfg.deadline_offset_days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        coursCfg.tranches.forEach((tr) =>
            toInsert.push({
                student_id: student.id,
                type: langueKey,
                tranche: tr.tranche,
                montant: tr.montant,
                status: "attente",
                penalites: 0,
                date_limite: dateLimite,
            })
        );
    }

    if (toInsert.length > 0) {
        await supabaseAdmin.from("payments").insert(toInsert);
        result.paymentsCreated = toInsert.length;
    }

    return result;
}
