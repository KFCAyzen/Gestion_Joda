"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface University {
    id: string;
    nom: string;
    pays: string;
    ville: string;
    programme: string;
    niveau_etude: string;
    criteres_admission: string;
    active: boolean;
    created_at: string;
}

const predefinedUniversities: Omit<University, "id" | "created_at">[] = [
    { nom: "Université de Pékin (PKU)", pays: "Chine", ville: "Pékin", programme: "Licence, Master, Doctorat", niveau_etude: "Tous niveaux", criteres_admission: "Bac + 12 min, HSK 4", active: true },
    { nom: "Université Tsinghua", pays: "Chine", ville: "Pékin", programme: "Ingénierie, Sciences, Gestion", niveau_etude: "Master, Doctorat", criteres_admission: "Bac + 16 min, HSK 5", active: true },
    { nom: "Université Fudan", pays: "Chine", ville: "Shanghai", programme: "Médecine, Ingénierie, Commerce", niveau_etude: "Licence, Master", criteres_admission: "Bac + 12 min, HSK 4", active: true },
    { nom: "Université Zhejiang", pays: "Chine", ville: "Hangzhou", programme: "Sciences, Technologie, Agriculture", niveau_etude: "Tous niveaux", criteres_admission: "Bac + 12 min, HSK 4", active: true },
    { nom: "Université Nankai", pays: "Chine", ville: "Tianjin", programme: "Sciences, Ingénierie, Médecine", niveau_etude: "Licence, Master", criteres_admission: "Bac + 12 min, HSK 4", active: true },
    { nom: "Université de Wuhan", pays: "Chine", ville: "Wuhan", programme: "Sciences, Médecine, Ingénierie", niveau_etude: "Tous niveaux", criteres_admission: "Bac + 12 min, HSK 4", active: true },
    { nom: "Université Sun Yat-sen", pays: "Chine", ville: "Canton", programme: "Médecine, Management, Arts", niveau_etude: "Licence, Master", criteres_admission: "Bac + 12 min, HSK 4", active: true },
    { nom: "Université Tongji", pays: "Chine", ville: "Shanghai", programme: "Ingénierie, Médecine, Design", niveau_etude: "Tous niveaux", criteres_admission: "Bac + 12 min, HSK 4", active: true },
];

export default function UniversityManagement() {
    const { user } = useAuth();
    const [universities, setUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"list" | "form">("list");
    const [editingUni, setEditingUni] = useState<University | null>(null);
    const [formData, setFormData] = useState({
        nom: "",
        code: "",
        pays: "",
        ville: "",
        programme: "",
        niveau_etude: "",
        criteres_admission: "",
        active: true,
    });

    const loadUniversities = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("universities").select("*").order("nom", { ascending: true });
            if (data) setUniversities(data);
        } catch (err) {
            console.error("Erreur:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUniversities();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingUni) {
                const { error } = await supabase
                    .from("universities")
                    .update(formData)
                    .eq("id", editingUni.id);

                if (!error) loadUniversities();
            } else {
                const { error } = await supabase.from("universities").insert(formData);
                if (!error) loadUniversities();
            }
            resetForm();
        } catch (err) {
            console.error("Erreur:", err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from("universities").delete().eq("id", id);
            if (!error) loadUniversities();
        } catch (err) {
            console.error("Erreur:", err);
        }
    };

    const handleSeed = async () => {
        try {
            const { error } = await supabase.from("universities").upsert(predefinedUniversities);
            if (!error) loadUniversities();
        } catch (err) {
            console.error("Erreur:", err);
        }
    };

    const handleToggle = async (id: string, active: boolean) => {
        try {
            await supabase.from("universities").update({ active: !active }).eq("id", id);
            loadUniversities();
        } catch (err) {
            console.error("Erreur:", err);
        }
    };

    const resetForm = () => {
        setFormData({
            nom: "",
            code: "",
            pays: "",
            ville: "",
            programme: "",
            niveau_etude: "",
            criteres_admission: "",
            active: true,
        });
        setEditingUni(null);
        setActiveTab("list");
    };

    const canEdit = user?.role === "admin" || user?.role === "super_admin";

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            Réseau partenaires
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            Gestion des Universités
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Administre le catalogue des universités et leur disponibilité.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canEdit && universities.length === 0 && (
                            <Button variant="outline" onClick={handleSeed}>
                                Ajouter les prédéfinies
                            </Button>
                        )}
                        {canEdit && <Button onClick={() => setActiveTab("form")}>+ Université</Button>}
                    </div>
                </div>

                {activeTab === "list" && (
                    <Card className="joda-surface border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>Universités Partenaires ({universities.length})</CardTitle>
                            <CardDescription>
                                Vue d'ensemble des destinations actives et des programmes proposés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="py-8 text-center text-slate-500">Chargement...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Université</TableHead>
                                            <TableHead>Ville</TableHead>
                                            <TableHead>Programmes</TableHead>
                                            <TableHead>Statut</TableHead>
                                            {canEdit && <TableHead>Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {universities.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell>
                                                    <div className="font-medium">{u.nom}</div>
                                                    <div className="text-sm text-slate-500">{u.pays}</div>
                                                </TableCell>
                                                <TableCell>{u.ville}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{u.programme}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.active ? "default" : "secondary"}>
                                                        {u.active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleToggle(u.id, u.active)}
                                                            >
                                                                {u.active ? "Désactiver" : "Activer"}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingUni(u);
                                                                    setFormData({
                                                                        nom: u.nom,
                                                                        code: (u as any).code || "",
                                                                        pays: u.pays,
                                                                        ville: u.ville,
                                                                        programme: u.programme,
                                                                        niveau_etude: u.niveau_etude,
                                                                        criteres_admission: u.criteres_admission,
                                                                        active: u.active,
                                                                    });
                                                                    setActiveTab("form");
                                                                }}
                                                            >
                                                                Modifier
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDelete(u.id)}
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === "form" && canEdit && (
                    <Card className="joda-surface max-w-2xl border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>{editingUni ? "Modifier" : "Ajouter"} une Université</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="nom">Nom de l'Université *</Label>
                                        <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Code (ex: PKU)</Label>
                                        <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="PKU" maxLength={10} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pays">Pays *</Label>
                                        <Input id="pays" value={formData.pays} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ville">Ville *</Label>
                                        <Input id="ville" value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="niveau">Niveau d'études</Label>
                                        <Input id="niveau" value={formData.niveau_etude} onChange={(e) => setFormData({ ...formData, niveau_etude: e.target.value })} placeholder="Licence, Master, Doctorat" />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="programme">Programmes</Label>
                                        <Input id="programme" value={formData.programme} onChange={(e) => setFormData({ ...formData, programme: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="criteres">Critères d'admission</Label>
                                        <Input id="criteres" value={formData.criteres_admission} onChange={(e) => setFormData({ ...formData, criteres_admission: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                                    <Button type="submit">{editingUni ? "Enregistrer" : "Ajouter"}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    );
}
