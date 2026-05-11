"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SearchBar, FilterSelect, DropdownMenu, PageHeader, LoadingState, EmptyState, StatusBadge, FormField } from "./shared";
import ConfirmDialog from "./ConfirmDialog";
import { Building2, Edit, Trash2, Power } from "lucide-react";

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
    const t = useTranslations("universityManagement");
    const supabase = createClient();
    const [universities, setUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"list" | "form">("list");
    const [editingUni, setEditingUni] = useState<University | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [cityFilter, setCityFilter] = useState("all");
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; description: string; onConfirm: () => void;
    }>({ open: false, title: '', description: '', onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));

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

                if (!error) {
                    if (user) {
                        await logActivity(
                            user.id, user.name, user.role,
                            "university_update", "universities", editingUni.id,
                            `Université modifiée — ${formData.nom}`,
                            { university_id: editingUni.id, nom: formData.nom }
                        );
                    }
                    loadUniversities();
                }
            } else {
                const { data: inserted, error } = await supabase.from("universities").insert(formData).select().single();
                if (!error) {
                    if (user && inserted) {
                        await logActivity(
                            user.id, user.name, user.role,
                            "university_create", "universities", inserted.id,
                            `Université créée — ${formData.nom}`,
                            { university_id: inserted.id, nom: formData.nom, pays: formData.pays }
                        );
                    }
                    loadUniversities();
                }
            }
            resetForm();
        } catch (err) {
            console.error("Erreur:", err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const uniToDelete = universities.find(u => u.id === id);
            const { error } = await supabase.from("universities").delete().eq("id", id);
            if (!error) {
                if (user) {
                    await logActivity(
                        user.id, user.name, user.role,
                        "university_delete", "universities", id,
                        `Université supprimée — ${uniToDelete?.nom || id}`,
                        { university_id: id }
                    );
                }
                loadUniversities();
            }
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

    const canEdit = user?.role === "agent" || user?.role === "admin" || user?.role === "super_admin";
    const canDelete = user?.role === "admin" || user?.role === "super_admin";

    const cities = useMemo(() => {
        const uniqueCities = [...new Set(universities.map(u => u.ville))];
        return uniqueCities.map(city => ({ value: city, label: city }));
    }, [universities]);

    const filteredUniversities = useMemo(() => {
        return universities.filter((u) => {
            const matchesSearch = u.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.programme.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? u.active : !u.active);
            const matchesCity = cityFilter === "all" || u.ville === cityFilter;
            return matchesSearch && matchesStatus && matchesCity;
        });
    }, [universities, searchTerm, statusFilter, cityFilter]);

    return (
        <ProtectedRoute requiredRole="user">
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    eyebrow={t("header.eyebrow")}
                    title={t("header.title")}
                    description={t("header.description")}
                    action={canEdit ? {
                        label: t("actions.addShort"),
                        onClick: () => setActiveTab("form")
                    } : undefined}
                    secondaryAction={canEdit && universities.length === 0 ? {
                        label: t("actions.addPredefined"),
                        onClick: handleSeed,
                        variant: "outline"
                    } : undefined}
                />

                {activeTab === "list" && (
                    <Card className="joda-surface border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>{t("list.title", { count: filteredUniversities.length })}</CardTitle>
                            <CardDescription>
                                {t("list.description")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 grid gap-4 sm:grid-cols-3 sm:items-end">
                                <SearchBar
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder={t("filters.searchPlaceholder")}
                                />
                                <FilterSelect
                                    label={t("filters.status")}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    options={[
                                        { value: "active", label: t("status.active") },
                                        { value: "inactive", label: t("status.inactive") },
                                    ]}
                                />
                                <FilterSelect
                                    label={t("filters.city")}
                                    value={cityFilter}
                                    onChange={setCityFilter}
                                    options={cities}
                                />
                            </div>
                            {loading ? (
                                <LoadingState message={t("loading")} />
                            ) : filteredUniversities.length === 0 ? (
                                <EmptyState
                                    icon={Building2}
                                    title={t("empty.title")}
                                    description={t("empty.description")}
                                    action={canEdit ? {
                                        label: t("actions.add"),
                                        onClick: () => setActiveTab("form")
                                    } : undefined}
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("table.university")}</TableHead>
                                            <TableHead>{t("table.city")}</TableHead>
                                            <TableHead>{t("table.programs")}</TableHead>
                                            <TableHead>{t("table.status")}</TableHead>
                                            {canEdit && <TableHead>{t("table.actions")}</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUniversities.map((u) => (
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
                                                    <StatusBadge status={u.active ? "active" : "inactive"} />
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell>
                                                        <DropdownMenu
                                                            actions={[
                                                                {
                                                                    label: t("actions.edit"),
                                                                    icon: <Edit className="h-4 w-4" />,
                                                                    onClick: () => {
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
                                                                    },
                                                                },
                                                                {
                                                                    label: u.active ? t("actions.deactivate") : t("actions.activate"),
                                                                    icon: <Power className="h-4 w-4" />,
                                                                    onClick: () => handleToggle(u.id, u.active),
                                                                },
                                                                ...(canDelete ? [{
                                                                    label: t("actions.delete"),
                                                                    icon: <Trash2 className="h-4 w-4" />,
                                                                    onClick: () => setConfirmDialog({
                                                                        open: true,
                                                                        title: t("delete.title", { name: u.nom }),
                                                                        description: t("delete.description"),
                                                                        onConfirm: () => { closeConfirm(); handleDelete(u.id); },
                                                                    }),
                                                                    variant: "danger" as const,
                                                                }] : []),
                                                            ]}
                                                        />
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
                            <CardTitle>{editingUni ? t("form.titleEdit") : t("form.titleAdd")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        label={t("form.name")}
                                        id="nom"
                                        value={formData.nom}
                                        onChange={(value) => setFormData({ ...formData, nom: value })}
                                        required
                                    />
                                    <FormField
                                        label={t("form.code")}
                                        id="code"
                                        value={formData.code}
                                        onChange={(value) => setFormData({ ...formData, code: value.toUpperCase() })}
                                        placeholder="PKU"
                                    />
                                    <FormField
                                        label={t("form.country")}
                                        id="pays"
                                        value={formData.pays}
                                        onChange={(value) => setFormData({ ...formData, pays: value })}
                                        required
                                    />
                                    <FormField
                                        label={t("form.city")}
                                        id="ville"
                                        value={formData.ville}
                                        onChange={(value) => setFormData({ ...formData, ville: value })}
                                        required
                                    />
                                    <FormField
                                        label={t("form.studyLevel")}
                                        id="niveau"
                                        value={formData.niveau_etude}
                                        onChange={(value) => setFormData({ ...formData, niveau_etude: value })}
                                        placeholder={t("form.studyLevelPlaceholder")}
                                    />
                                    <div className="sm:col-span-2">
                                        <FormField
                                            label={t("form.programs")}
                                            id="programme"
                                            value={formData.programme}
                                            onChange={(value) => setFormData({ ...formData, programme: value })}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <FormField
                                            label={t("form.criteria")}
                                            id="criteres"
                                            value={formData.criteres_admission}
                                            onChange={(value) => setFormData({ ...formData, criteres_admission: value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={resetForm}>{t("actions.cancel")}</Button>
                                    <Button type="submit">{editingUni ? t("actions.save") : t("actions.add")}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        <ConfirmDialog
            isOpen={confirmDialog.open}
            onClose={closeConfirm}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmLabel={t("actions.delete")}
        />
        </ProtectedRoute>
    );
}
