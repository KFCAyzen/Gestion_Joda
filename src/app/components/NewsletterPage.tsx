"use client";

import { useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Info,
    Mail,
    Newspaper,
    Send,
    Users,
    Zap,
} from "lucide-react";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationContext } from "../context/NotificationContext";

type Tab = "campaign" | "automation";

type FilterId =
    | "all"
    | "dossier_attente"
    | "dossier_cours"
    | "payment_late"
    | "langue_mandarin"
    | "langue_anglais"
    | "choix_bourse"
    | "choix_cours";

interface FilterDef {
    id: FilterId;
    label: string;
    description: string;
    activeClass: string;
}

const FILTERS: FilterDef[] = [
    {
        id: "all",
        label: "Tous les étudiants",
        description: "Tous les étudiants ayant un email de contact renseigné.",
        activeClass:
            "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500",
    },
    {
        id: "dossier_attente",
        label: "Dossier en attente",
        description: "Étudiants dont le dossier est au statut « En attente ».",
        activeClass:
            "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    },
    {
        id: "dossier_cours",
        label: "Dossier en cours",
        description: "Étudiants dont le dossier est au statut « En cours ».",
        activeClass:
            "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    },
    {
        id: "payment_late",
        label: "Paiement en retard",
        description: "Étudiants avec au moins un paiement en retard.",
        activeClass:
            "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    },
    {
        id: "langue_mandarin",
        label: "Cours Mandarin",
        description: "Étudiants inscrits en cours de mandarin.",
        activeClass:
            "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
    },
    {
        id: "langue_anglais",
        label: "Cours Anglais",
        description: "Étudiants inscrits en cours d'anglais.",
        activeClass:
            "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    },
    {
        id: "choix_bourse",
        label: "Procédure bourse",
        description: "Étudiants avec procédure bourse (seule ou avec cours).",
        activeClass:
            "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
    },
    {
        id: "choix_cours",
        label: "Cours uniquement",
        description: "Étudiants cours seuls ou procédure + cours.",
        activeClass:
            "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
    },
];

const AUTOMATION_RULES = [
    {
        id: "dossier_inactif",
        title: "Relance dossiers inactifs",
        description:
            "Envoie automatiquement un email aux étudiants dont le dossier (en attente, en cours ou document manquant) n'a pas été mis à jour depuis 14 jours ou plus. L'email rappelle le statut du dossier et invite l'étudiant à contacter son conseiller.",
        trigger: "Dossier inactif ≥ 14 jours",
        frequency: "Chaque lundi à 8h00",
        cronRoute: "/api/cron/newsletter-auto",
    },
];

export default function NewsletterPage() {
    const { showNotification } = useNotificationContext();

    const [tab, setTab] = useState<Tab>("campaign");
    const [filter, setFilter] = useState<FilterId>("all");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [previewSample, setPreviewSample] = useState<string[]>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [lastResult, setLastResult] = useState<{
        sent: number;
        errors: number;
        total: number;
    } | null>(null);

    const selectedFilter = FILTERS.find((f) => f.id === filter)!;

    const handleFilterChange = (id: FilterId) => {
        setFilter(id);
        setPreviewCount(null);
        setPreviewSample([]);
    };

    const handlePreview = async () => {
        setIsPreviewing(true);
        setPreviewCount(null);
        try {
            const res = await fetch("/api/newsletter/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filter, dryRun: true }),
            });
            const data = await res.json();
            if (res.ok) {
                setPreviewCount(data.count);
                setPreviewSample(data.sample ?? []);
            } else {
                showNotification("Erreur lors de l'aperçu des destinataires", "error");
            }
        } catch {
            showNotification("Impossible de contacter le serveur", "error");
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            showNotification("L'objet et le message sont requis", "error");
            return;
        }
        setIsSending(true);
        setLastResult(null);
        try {
            const res = await fetch("/api/newsletter/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, message, filter }),
            });
            const data = await res.json();
            if (res.ok) {
                setLastResult({ sent: data.sent, errors: data.errors, total: data.total });
                showNotification(
                    `${data.sent} email(s) envoyé(s) avec succès`,
                    "success"
                );
                setSubject("");
                setMessage("");
                setPreviewCount(null);
                setPreviewSample([]);
            } else {
                showNotification(data.error ?? "Erreur lors de l'envoi", "error");
            }
        } catch {
            showNotification("Impossible de contacter le serveur", "error");
        } finally {
            setIsSending(false);
        }
    };

    const tabBtnCls = (active: boolean) =>
        `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            active
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        }`;

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Newspaper className="w-6 h-6 text-rose-600" />
                            Newsletter
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Campagnes email et relances automatiques pour vos étudiants
                        </p>
                    </div>
                    <Badge variant="outline" className="text-xs gap-1">
                        <Mail className="w-3 h-3" /> Via Resend
                    </Badge>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-fit">
                    <button onClick={() => setTab("campaign")} className={tabBtnCls(tab === "campaign")}>
                        <Send className="w-4 h-4" />
                        Campagne manuelle
                    </button>
                    <button onClick={() => setTab("automation")} className={tabBtnCls(tab === "automation")}>
                        <Zap className="w-4 h-4" />
                        Automatisations
                    </button>
                </div>

                {/* ── Campagne manuelle ── */}
                {tab === "campaign" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Formulaire (2/3) */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Destinataires */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Users className="w-4 h-4" /> Destinataires
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {FILTERS.map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => handleFilterChange(f.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                    filter === f.id
                                                        ? `${f.activeClass} ring-2 ring-offset-1 ring-current`
                                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePreview}
                                            disabled={isPreviewing}
                                            className="text-xs"
                                        >
                                            {isPreviewing ? "Chargement..." : "Aperçu des destinataires"}
                                        </Button>
                                        {previewCount !== null && (
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {previewCount === 0
                                                    ? "Aucun destinataire"
                                                    : `${previewCount} destinataire${previewCount > 1 ? "s" : ""}`}
                                            </span>
                                        )}
                                    </div>

                                    {previewSample.length > 0 && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-3">
                                            <p className="font-medium mb-1 text-slate-600 dark:text-slate-300">Aperçu :</p>
                                            {previewSample.map((e) => (
                                                <p key={e}>{e}</p>
                                            ))}
                                            {previewCount! > previewSample.length && (
                                                <p className="italic">
                                                    ... et {previewCount! - previewSample.length} autre(s)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Contenu */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Mail className="w-4 h-4" /> Contenu de l'email
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            Objet <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Ex: Mise à jour importante sur votre dossier..."
                                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            Message <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Rédigez votre message ici. Un bouton « Mon espace étudiant » sera automatiquement ajouté en bas."
                                            rows={9}
                                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-800 resize-y"
                                        />
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                            Les sauts de ligne seront préservés. L'email est envoyé en français ou anglais selon la langue de chaque étudiant.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <Button
                                    onClick={handleSend}
                                    disabled={isSending || !subject.trim() || !message.trim()}
                                    className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSending ? "Envoi en cours..." : "Envoyer la campagne"}
                                </Button>
                                {lastResult && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                            {lastResult.sent}/{lastResult.total} envoyé(s)
                                        </span>
                                        {lastResult.errors > 0 && (
                                            <span className="text-red-500">
                                                · {lastResult.errors} erreur(s)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar droite (1/3) */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Info className="w-4 h-4" /> Filtre sélectionné
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mb-2 ${selectedFilter.activeClass}`}
                                    >
                                        {selectedFilter.label}
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {selectedFilter.description}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Conseils</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        {
                                            icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />,
                                            text: (
                                                <>
                                                    Faites un <strong>aperçu</strong> avant d'envoyer pour vérifier le nombre de destinataires.
                                                </>
                                            ),
                                        },
                                        {
                                            icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />,
                                            text: (
                                                <>
                                                    Seuls les étudiants avec un <strong>email de contact</strong> renseigné reçoivent la campagne.
                                                </>
                                            ),
                                        },
                                        {
                                            icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />,
                                            text: (
                                                <>
                                                    L'envoi est <strong>immédiat et irréversible</strong>. Relisez votre message avant d'envoyer.
                                                </>
                                            ),
                                        },
                                    ].map((tip, i) => (
                                        <div key={i} className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            {tip.icon}
                                            <span>{tip.text}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ── Automatisations ── */}
                {tab === "automation" && (
                    <div className="space-y-4 max-w-2xl">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Les automatisations envoient des emails ciblés selon des règles prédéfinies,
                            sans intervention manuelle. Elles sont déclenchées par le cron Vercel.
                        </p>
                        {AUTOMATION_RULES.map((rule) => (
                            <Card key={rule.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            {rule.title}
                                        </CardTitle>
                                        <Badge className="bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 shrink-0">
                                            Actif
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {rule.description}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                                                Déclencheur
                                            </p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {rule.trigger}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Fréquence
                                            </p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {rule.frequency}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                            <span>
                                                Route cron :{" "}
                                                <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded">
                                                    {rule.cronRoute}
                                                </code>
                                                . Pour modifier le seuil d'inactivité, ajustez la variable d'environnement{" "}
                                                <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded">
                                                    NEWSLETTER_INACTIVITY_DAYS
                                                </code>{" "}
                                                (défaut : 14).
                                            </span>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
