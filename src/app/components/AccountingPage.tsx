"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EntreeComptable {
    id: string;
    montant: number;
    date: string;
    type: string;
    description: string;
    student_id: string | null;
    payment_id: string | null;
    created_by: string | null;
    created_at: string;
}

interface SortieComptable {
    id: string;
    montant: number;
    date: string;
    categorie: string;
    description: string;
    justificatif_url: string | null;
    validated_by: string | null;
    validated_at: string | null;
    created_by: string | null;
    created_at: string;
}

type Tab = "entrees" | "sorties" | "rapport";

const CATEGORIES_SORTIES: SortieComptable["categorie"][] = [
    "loyer", "salaires", "fonctionnement", "materiels",
    "fournitures", "transports", "communication", "partenaires", "divers",
];

const TYPES_ENTREES: EntreeComptable["type"][] = [
    "paiement_procedure", "paiement_cours", "revenus_divers",
];

const labelCategorie: Record<string, string> = {
    loyer: "Loyer", salaires: "Salaires", fonctionnement: "Fonctionnement",
    materiels: "Matériels", fournitures: "Fournitures", transports: "Transports",
    communication: "Communication", partenaires: "Partenaires", divers: "Divers",
};

const labelType: Record<string, string> = {
    paiement_procedure: "Paiement Procédure",
    paiement_cours: "Paiement Cours",
    revenus_divers: "Revenus Divers",
};

function formatMontant(n: number): string {
    return n.toLocaleString("fr-FR") + "FCFA";
}

function toDate(val: string | null): Date {
    if (!val) return new Date();
    return new Date(val);
}

export default function AccountingPage() {
    const { user } = useAuth();
    const [entrees, setEntrees] = useState<EntreeComptable[]>([]);
    const [sorties, setSorties] = useState<SortieComptable[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("rapport");

    const today = new Date();
    const [reportDate, setReportDate] = useState(today.toISOString().slice(0, 10));

    const [newEntree, setNewEntree] = useState({
        montant: "",
        description: "",
        type: "revenus_divers" as EntreeComptable["type"],
        date: today.toISOString().slice(0, 10),
    });

    const [newSortie, setNewSortie] = useState({
        montant: "",
        description: "",
        categorie: "divers" as SortieComptable["categorie"],
        date: today.toISOString().slice(0, 10),
    });

    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        const [e, s] = await Promise.all([
            supabase.from('entrees_comptables').select('*').order('date', { ascending: false }),
            supabase.from('sorties_comptables').select('*').order('date', { ascending: false }),
        ]);
        if (e.data) setEntrees(e.data);
        if (s.data) setSorties(s.data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleAddEntree = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntree.montant || !newEntree.description) return;
        setSubmitting(true);
        try {
            await supabase.from('entrees_comptables').insert({
                montant: Number(newEntree.montant),
                description: newEntree.description,
                type: newEntree.type,
                date: newEntree.date,
                created_by: user?.id,
            });
            setNewEntree({ montant: "", description: "", type: "revenus_divers", date: today.toISOString().slice(0, 10) });
            await load();
        } catch (err) {
            console.error('Erreur:', err);
        }
        setSubmitting(false);
    };

    const handleAddSortie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSortie.montant || !newSortie.description) return;
        setSubmitting(true);
        try {
            await supabase.from('sorties_comptables').insert({
                montant: Number(newSortie.montant),
                description: newSortie.description,
                categorie: newSortie.categorie,
                date: newSortie.date,
                created_by: user?.id,
            });
            setNewSortie({ montant: "", description: "", categorie: "divers", date: today.toISOString().slice(0, 10) });
            await load();
        } catch (err) {
            console.error('Erreur:', err);
        }
        setSubmitting(false);
    };

    const handleValidateSortie = async (id: string) => {
        try {
            await supabase.from('sorties_comptables').update({
                validated_by: user?.id,
                validated_at: new Date().toISOString(),
            }).eq('id', id);
            await load();
        } catch (err) {
            console.error('Erreur:', err);
        }
    };

    const reportDay = new Date(reportDate);
    const startOfDay = new Date(reportDay.getFullYear(), reportDay.getMonth(), reportDay.getDate());
    const endOfDay = new Date(reportDay.getFullYear(), reportDay.getMonth(), reportDay.getDate(), 23, 59, 59);

    const entreesJour = entrees.filter(e => {
        const d = toDate(e.date);
        return d >= startOfDay && d <= endOfDay;
    });
    const sortiesJour = sorties.filter(s => {
        const d = toDate(s.date);
        return d >= startOfDay && d <= endOfDay;
    });

    const totalEntrees = entrees.reduce((s, e) => s + e.montant, 0);
    const totalSorties = sorties.reduce((s, e) => s + e.montant, 0);
    const soldeGlobal = totalEntrees - totalSorties;

    const totalEntreesJour = entreesJour.reduce((s, e) => s + e.montant, 0);
    const totalSortiesJour = sortiesJour.reduce((s, e) => s + e.montant, 0);
    const soldeJour = totalEntreesJour - totalSortiesJour;

    const isAdmin = user?.role === "admin" || user?.role === "super_admin";

    const tabs: { key: Tab; label: string }[] = [
        { key: "rapport", label: "Rapport" },
        { key: "entrees", label: "Entrées" },
        { key: "sorties", label: "Sorties" },
    ];

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-gray-500 mb-1">Total Entrées</p>
                            <p className="text-xl font-bold text-green-600">{formatMontant(totalEntrees)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-gray-500 mb-1">Total Sorties</p>
                            <p className="text-xl font-bold text-red-600">{formatMontant(totalSorties)}</p>
                        </CardContent>
                    </Card>
                    <Card className={soldeGlobal >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                        <CardContent className="pt-4">
                            <p className="text-xs text-gray-500 mb-1">Solde Global</p>
                            <p className={`text-xl font-bold ${soldeGlobal >= 0 ? "text-green-700" : "text-red-700"}`}>{formatMontant(soldeGlobal)}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex border-b border-gray-200">
                            {tabs.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t.key ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Chargement...</div>
                        ) : (
                            <>
                                {tab === "rapport" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-sm font-medium">Date :</Label>
                                            <Input
                                                type="date"
                                                value={reportDate}
                                                onChange={e => setReportDate(e.target.value)}
                                                className="w-auto"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <Card className="bg-green-50 border-green-200">
                                                <CardContent className="pt-4 text-center">
                                                    <p className="text-xs text-gray-500">Entrées du jour</p>
                                                    <p className="font-bold text-green-700">{formatMontant(totalEntreesJour)}</p>
                                                    <p className="text-xs text-gray-400">{entreesJour.length} opération(s)</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-red-50 border-red-200">
                                                <CardContent className="pt-4 text-center">
                                                    <p className="text-xs text-gray-500">Sorties du jour</p>
                                                    <p className="font-bold text-red-700">{formatMontant(totalSortiesJour)}</p>
                                                    <p className="text-xs text-gray-400">{sortiesJour.length} opération(s)</p>
                                                </CardContent>
                                            </Card>
                                            <Card className={soldeJour >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
                                                <CardContent className="pt-4 text-center">
                                                    <p className="text-xs text-gray-500">Solde du jour</p>
                                                    <p className={`font-bold ${soldeJour >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatMontant(soldeJour)}</p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {entreesJour.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Entrées</h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Description</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead className="text-right">Montant</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {entreesJour.map(e => (
                                                            <TableRow key={e.id}>
                                                                <TableCell>{e.description}</TableCell>
                                                                <TableCell><Badge variant="secondary">{labelType[e.type]}</Badge></TableCell>
                                                                <TableCell className="text-right font-medium text-green-600">{formatMontant(e.montant)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}

                                        {sortiesJour.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Sorties</h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Description</TableHead>
                                                            <TableHead>Catégorie</TableHead>
                                                            <TableHead>Statut</TableHead>
                                                            <TableHead className="text-right">Montant</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sortiesJour.map(s => (
                                                            <TableRow key={s.id}>
                                                                <TableCell>{s.description}</TableCell>
                                                                <TableCell><Badge variant="outline">{labelCategorie[s.categorie]}</Badge></TableCell>
                                                                <TableCell>
                                                                    {s.validated_by
                                                                        ? <Badge className="bg-green-100 text-green-700">Validé</Badge>
                                                                        : <Badge className="bg-yellow-100 text-yellow-700">En attente</Badge>}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium text-red-600">{formatMontant(s.montant)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}

                                        {entreesJour.length === 0 && sortiesJour.length === 0 && (
                                            <p className="text-center text-gray-400 py-6">Aucune opération ce jour</p>
                                        )}
                                    </div>
                                )}

                                {tab === "entrees" && (
                                    <div className="space-y-5">
                                        {isAdmin && (
                                            <Card className="bg-gray-50">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">Nouvelle entrée</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <form onSubmit={handleAddEntree} className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Montant (FCFA)</Label>
                                                                <Input
                                                                    type="number" min="0" required
                                                                    value={newEntree.montant}
                                                                    onChange={e => setNewEntree(p => ({ ...p, montant: e.target.value }))}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Type</Label>
                                                                <Select
                                                                    value={newEntree.type}
                                                                    onValueChange={e => setNewEntree(p => ({ ...p, type: e as EntreeComptable["type"] }))}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {TYPES_ENTREES.map(t => <SelectItem key={t} value={t}>{labelType[t]}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Date</Label>
                                                                <Input
                                                                    type="date" required
                                                                    value={newEntree.date}
                                                                    onChange={e => setNewEntree(p => ({ ...p, date: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Description</Label>
                                                                <Input
                                                                    type="text" required
                                                                    value={newEntree.description}
                                                                    onChange={e => setNewEntree(p => ({ ...p, description: e.target.value }))}
                                                                    placeholder="Description..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting} className="bg-green-600">
                                                            {submitting ? "Ajout..." : "+ Ajouter"}
                                                        </Button>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Montant</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {entrees.map(e => (
                                                    <TableRow key={e.id}>
                                                        <TableCell className="text-gray-500 text-xs">{toDate(e.date).toLocaleDateString("fr-FR")}</TableCell>
                                                        <TableCell>{e.description}</TableCell>
                                                        <TableCell><Badge variant="secondary">{labelType[e.type]}</Badge></TableCell>
                                                        <TableCell className="text-right font-semibold text-green-600">{formatMontant(e.montant)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {entrees.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-gray-400">Aucune entrée</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {tab === "sorties" && (
                                    <div className="space-y-5">
                                        {isAdmin && (
                                            <Card className="bg-gray-50">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">Nouvelle sortie</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <form onSubmit={handleAddSortie} className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Montant (FCFA)</Label>
                                                                <Input
                                                                    type="number" min="0" required
                                                                    value={newSortie.montant}
                                                                    onChange={e => setNewSortie(p => ({ ...p, montant: e.target.value }))}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Catégorie</Label>
                                                                <Select
                                                                    value={newSortie.categorie}
                                                                    onValueChange={e => setNewSortie(p => ({ ...p, categorie: e as SortieComptable["categorie"] }))}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {CATEGORIES_SORTIES.map(c => <SelectItem key={c} value={c}>{labelCategorie[c]}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Date</Label>
                                                                <Input
                                                                    type="date" required
                                                                    value={newSortie.date}
                                                                    onChange={e => setNewSortie(p => ({ ...p, date: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Description</Label>
                                                                <Input
                                                                    type="text" required
                                                                    value={newSortie.description}
                                                                    onChange={e => setNewSortie(p => ({ ...p, description: e.target.value }))}
                                                                    placeholder="Description..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting} className="bg-red-600">
                                                            {submitting ? "Ajout..." : "+ Ajouter"}
                                                        </Button>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Catégorie</TableHead>
                                                    <TableHead>Statut</TableHead>
                                                    <TableHead className="text-right">Montant</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sorties.map(s => (
                                                    <TableRow key={s.id}>
                                                        <TableCell className="text-gray-500 text-xs">{toDate(s.date).toLocaleDateString("fr-FR")}</TableCell>
                                                        <TableCell>{s.description}</TableCell>
                                                        <TableCell><Badge variant="outline">{labelCategorie[s.categorie]}</Badge></TableCell>
                                                        <TableCell>
                                                            {s.validated_by
                                                                ? <Badge className="bg-green-100 text-green-700">Validé</Badge>
                                                                : isAdmin
                                                                    ? <Button variant="outline" size="sm" onClick={() => handleValidateSortie(s.id)}>Valider</Button>
                                                                    : <Badge className="bg-yellow-100 text-yellow-700">En attente</Badge>}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-red-600">{formatMontant(s.montant)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {sorties.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">Aucune sortie</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
