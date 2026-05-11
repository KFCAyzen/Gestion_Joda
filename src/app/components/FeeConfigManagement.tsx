"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePaymentConfig } from "../context/PaymentConfigContext";
import { useNotificationContext } from "../context/NotificationContext";
import { createClient } from "../lib/supabase/client";
import { logActivity } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import {
    PaymentConfig,
    PaymentConfigTranche,
    ServiceType,
    getTotalMontant,
} from "../types/payment-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, RotateCcw, GraduationCap, BookOpen } from "lucide-react";

type TabId = "bourse" | "langues";
type BourseSubTab = "bourse_bachelor" | "bourse_master";
type LangueSubTab = "mandarin" | "anglais";

function fmt(n: number) {
    return n.toLocaleString("fr-FR") + " FCFA";
}

function TrancheEditor({
    tranches,
    onChange,
}: {
    tranches: PaymentConfigTranche[];
    onChange: (t: PaymentConfigTranche[]) => void;
}) {
    const addTranche = () => {
        const next = tranches.length + 1;
        onChange([...tranches, { tranche: next, label: `Tranche ${next}`, montant: 0 }]);
    };

    const removeLast = () => {
        if (tranches.length <= 1) return;
        onChange(tranches.slice(0, -1));
    };

    const update = (index: number, field: keyof PaymentConfigTranche, value: string | number) => {
        const updated = tranches.map((t, i) =>
            i === index ? { ...t, [field]: field === "montant" ? Number(value) : value } : t
        );
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            {tranches.map((tranche, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {tranche.tranche}
                    </div>
                    <div className="col-span-6">
                        <Input
                            value={tranche.label}
                            onChange={(e) => update(i, "label", e.target.value)}
                            placeholder="Libellé"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="col-span-4">
                        <Input
                            type="number"
                            value={tranche.montant}
                            onChange={(e) => update(i, "montant", e.target.value)}
                            placeholder="Montant"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="col-span-1 text-xs text-slate-400 text-right">FCFA</div>
                </div>
            ))}
            <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={addTranche} className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Ajouter tranche
                </Button>
                {tranches.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" onClick={removeLast} className="h-7 gap-1 text-xs text-red-500 hover:text-red-700">
                        <Trash2 className="h-3 w-3" /> Supprimer la dernière
                    </Button>
                )}
            </div>
        </div>
    );
}

function ServiceConfigCard({
    serviceType,
    onSaved,
}: {
    serviceType: ServiceType;
    onSaved: () => void;
}) {
    const { user } = useAuth();
    const { getConfig } = usePaymentConfig();
    const { showNotification } = useNotificationContext();
    const supabase = createClient();
    const original = getConfig(serviceType);

    const [draft, setDraft] = useState<PaymentConfig>(() => ({
        ...original,
        tranches: original.tranches.map((t) => ({ ...t })),
    }));
    const [saving, setSaving] = useState(false);

    const reset = () =>
        setDraft({ ...original, tranches: original.tranches.map((t) => ({ ...t })) });

    const hasChanges =
        JSON.stringify(draft.tranches) !== JSON.stringify(original.tranches) ||
        draft.grace_days !== original.grace_days ||
        draft.daily_penalty !== original.daily_penalty ||
        draft.deadline_offset_days !== original.deadline_offset_days;

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                service_type: draft.service_type,
                label: draft.label,
                tranches: draft.tranches,
                grace_days: draft.grace_days,
                daily_penalty: draft.daily_penalty,
                deadline_offset_days: draft.deadline_offset_days,
                updated_at: new Date().toISOString(),
                updated_by: user?.id ?? null,
            };

            const { error } = await supabase
                .from("payment_config")
                .upsert(payload, { onConflict: "service_type" });

            if (error) {
                showNotification("Erreur lors de la sauvegarde : " + error.message, "error");
                return;
            }

            if (user) {
                await logActivity(
                    user.id, user.name, user.role,
                    "config_update", "payment_config", null,
                    `Configuration mise à jour : ${draft.label}`
                );
            }

            showNotification(`Configuration "${draft.label}" sauvegardée`, "success");
            onSaved();
        } catch {
            showNotification("Erreur inattendue lors de la sauvegarde", "error");
        } finally {
            setSaving(false);
        }
    };

    const total = getTotalMontant(draft);

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{draft.label}</CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">
                        Total : {fmt(total)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Tranches */}
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Tranches de paiement</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="mb-2 grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        <div className="col-span-1">#</div>
                        <div className="col-span-6">Libellé</div>
                        <div className="col-span-4">Montant</div>
                    </div>
                    <TrancheEditor
                        tranches={draft.tranches}
                        onChange={(t) => setDraft((d) => ({ ...d, tranches: t }))}
                    />
                </div>

                {/* Pénalités */}
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Pénalités de retard</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600">Jours de grâce</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    value={draft.grace_days}
                                    onChange={(e) => setDraft((d) => ({ ...d, grace_days: Number(e.target.value) }))}
                                    className="h-8 w-24 text-sm"
                                />
                                <span className="text-xs text-slate-400">jours</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600">Pénalité / jour</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    value={draft.daily_penalty}
                                    onChange={(e) => setDraft((d) => ({ ...d, daily_penalty: Number(e.target.value) }))}
                                    className="h-8 w-28 text-sm"
                                />
                                <span className="text-xs text-slate-400">FCFA/j</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Délai par défaut */}
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Délai d'échéance par défaut</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min={1}
                            value={draft.deadline_offset_days}
                            onChange={(e) => setDraft((d) => ({ ...d, deadline_offset_days: Number(e.target.value) }))}
                            className="h-8 w-24 text-sm"
                        />
                        <span className="text-xs text-slate-500">
                            jours après inscription (date limite par défaut)
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 border-t pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        size="sm"
                        className="gap-1.5"
                        style={{ backgroundColor: "#dc2626" }}
                    >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </Button>
                    {hasChanges && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={reset}
                            className="gap-1.5 text-slate-500"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Annuler
                        </Button>
                    )}
                    {hasChanges && (
                        <span className="ml-auto text-xs text-amber-600">Modifications non enregistrées</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function FeeConfigManagement() {
    const { refresh } = usePaymentConfig();
    const [activeTab, setActiveTab] = useState<TabId>("bourse");
    const [bourseSubTab, setBourseSubTab] = useState<BourseSubTab>("bourse_bachelor");
    const [langueSubTab, setLangueSubTab] = useState<LangueSubTab>("mandarin");

    const handleSaved = async () => {
        await refresh();
    };

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="joda-surface">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Administration
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                        Configuration des frais
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Personnalisez les tranches, les pénalités et les délais d'échéance pour chaque service.
                        Les modifications s'appliquent aux nouveaux dossiers uniquement.
                    </p>
                </div>

                {/* Tabs principaux */}
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
                    {([
                        { id: "bourse" as TabId, label: "Procédure Bourse", icon: <GraduationCap className="h-4 w-4" /> },
                        { id: "langues" as TabId, label: "Cours de Langues", icon: <BookOpen className="h-4 w-4" /> },
                    ] as const).map(({ id, label, icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                activeTab === id
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>

                {/* Contenu Procédure Bourse */}
                {activeTab === "bourse" && (
                    <div className="space-y-4">
                        {/* Sous-onglets Bachelor / Master */}
                        <div className="flex gap-2">
                            {([
                                { id: "bourse_bachelor" as BourseSubTab, label: "Bachelor" },
                                { id: "bourse_master" as BourseSubTab, label: "Master" },
                            ] as const).map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setBourseSubTab(id)}
                                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all ${
                                        bourseSubTab === id
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <ServiceConfigCard
                            key={bourseSubTab}
                            serviceType={bourseSubTab}
                            onSaved={handleSaved}
                        />
                    </div>
                )}

                {/* Contenu Cours de Langues */}
                {activeTab === "langues" && (
                    <div className="space-y-4">
                        {/* Sous-onglets Mandarin / Anglais */}
                        <div className="flex gap-2">
                            {([
                                { id: "mandarin" as LangueSubTab, label: "Mandarin" },
                                { id: "anglais" as LangueSubTab, label: "Anglais" },
                            ] as const).map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setLangueSubTab(id)}
                                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all ${
                                        langueSubTab === id
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <ServiceConfigCard
                            key={langueSubTab}
                            serviceType={langueSubTab}
                            onSaved={handleSaved}
                        />
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
