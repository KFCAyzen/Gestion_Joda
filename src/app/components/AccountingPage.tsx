"use client";

import { useState, useEffect, useCallback } from "react";
import { EntreeComptable, SortieComptable } from "../types/joda";
import {
  createEntreeComptable,
  createSortieComptable,
  getAllDocuments,
  updateDocument,
} from "../utils/firebaseOperations";
import { useNotificationContext } from "../context/NotificationContext";

type Tab = "entrees" | "sorties" | "rapport";

const CATEGORIES_SORTIES: SortieComptable["categorie"][] = [
  "loyer", "salaires", "fonctionnement", "materiels",
  "fournitures", "transports", "communication", "partenaires", "divers",
];

const TYPES_ENTREES: EntreeComptable["type"][] = [
  "paiement_procedure", "paiement_cours", "revenus_divers",
];

const labelCategorie: Record<SortieComptable["categorie"], string> = {
  loyer: "Loyer", salaires: "Salaires", fonctionnement: "Fonctionnement",
  materiels: "Matériels", fournitures: "Fournitures", transports: "Transports",
  communication: "Communication", partenaires: "Partenaires", divers: "Divers",
};

const labelType: Record<EntreeComptable["type"], string> = {
  paiement_procedure: "Paiement Procédure",
  paiement_cours: "Paiement Cours",
  revenus_divers: "Revenus Divers",
};

function formatMontant(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

interface Props {
  user: any;
}

export default function AccountingPage({ user }: Props) {
  const [tab, setTab] = useState<Tab>("rapport");
  const [entrees, setEntrees] = useState<EntreeComptable[]>([]);
  const [sorties, setSorties] = useState<SortieComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotificationContext();

  // Filtres rapport
  const today = new Date();
  const [reportDate, setReportDate] = useState(today.toISOString().slice(0, 10));

  // Formulaire entrée
  const [newEntree, setNewEntree] = useState({
    montant: "", description: "", type: "revenus_divers" as EntreeComptable["type"], date: today.toISOString().slice(0, 10),
  });

  // Formulaire sortie
  const [newSortie, setNewSortie] = useState({
    montant: "", description: "", categorie: "divers" as SortieComptable["categorie"], date: today.toISOString().slice(0, 10),
  });

  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, s] = await Promise.all([
      getAllDocuments<EntreeComptable>("entrees_comptables"),
      getAllDocuments<SortieComptable>("sorties_comptables"),
    ]);
    setEntrees(e.sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()));
    setSorties(s.sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddEntree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntree.montant || !newEntree.description) return;
    setSubmitting(true);
    try {
      await createEntreeComptable({
        montant: Number(newEntree.montant),
        description: newEntree.description,
        type: newEntree.type,
        date: new Date(newEntree.date),
        createdBy: user?.id || user?.uid || "system",
      });
      showNotification("Entrée ajoutée avec succès", "success");
      setNewEntree({ montant: "", description: "", type: "revenus_divers", date: today.toISOString().slice(0, 10) });
      await load();
    } catch {
      showNotification("Erreur lors de l'ajout", "error");
    }
    setSubmitting(false);
  };

  const handleAddSortie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSortie.montant || !newSortie.description) return;
    setSubmitting(true);
    try {
      await createSortieComptable({
        montant: Number(newSortie.montant),
        description: newSortie.description,
        categorie: newSortie.categorie,
        date: new Date(newSortie.date),
        createdBy: user?.id || user?.uid || "system",
      });
      showNotification("Sortie ajoutée avec succès", "success");
      setNewSortie({ montant: "", description: "", categorie: "divers", date: today.toISOString().slice(0, 10) });
      await load();
    } catch {
      showNotification("Erreur lors de l'ajout", "error");
    }
    setSubmitting(false);
  };

  const handleValidateSortie = async (id: string) => {
    try {
      await updateDocument<SortieComptable>("sorties_comptables", id, {
        validatedBy: user?.id || user?.uid,
        validatedAt: new Date(),
      });
      showNotification("Dépense validée", "success");
      await load();
    } catch {
      showNotification("Erreur de validation", "error");
    }
  };

  // Calculs rapport pour la date sélectionnée
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
    { key: "rapport", label: "📊 Rapport" },
    { key: "entrees", label: "💰 Entrées" },
    { key: "sorties", label: "💸 Sorties" },
  ];

  return (
    <div className="space-y-6">
      {/* Cartes résumé global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total Entrées</p>
          <p className="text-xl font-bold text-green-600">{formatMontant(totalEntrees)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total Sorties</p>
          <p className="text-xl font-bold text-red-600">{formatMontant(totalSorties)}</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm border ${soldeGlobal >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Solde Global</p>
          <p className={`text-xl font-bold ${soldeGlobal >= 0 ? "text-green-700" : "text-red-700"}`}>{formatMontant(soldeGlobal)}</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100">
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

        <div className="p-5">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Chargement...</div>
          ) : (
            <>
              {/* RAPPORT */}
              {tab === "rapport" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Date :</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={e => setReportDate(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Entrées du jour</p>
                      <p className="font-bold text-green-700">{formatMontant(totalEntreesJour)}</p>
                      <p className="text-xs text-gray-400">{entreesJour.length} opération(s)</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Sorties du jour</p>
                      <p className="font-bold text-red-700">{formatMontant(totalSortiesJour)}</p>
                      <p className="text-xs text-gray-400">{sortiesJour.length} opération(s)</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${soldeJour >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
                      <p className="text-xs text-gray-500">Solde du jour</p>
                      <p className={`font-bold ${soldeJour >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatMontant(soldeJour)}</p>
                    </div>
                  </div>

                  {entreesJour.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Entrées</h4>
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left py-1">Description</th><th className="text-left">Type</th><th className="text-right">Montant</th></tr></thead>
                        <tbody>
                          {entreesJour.map(e => (
                            <tr key={e.id} className="border-b border-gray-50">
                              <td className="py-1.5 text-gray-700">{e.description}</td>
                              <td className="text-gray-500">{labelType[e.type]}</td>
                              <td className="text-right font-medium text-green-600">{formatMontant(e.montant)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sortiesJour.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Sorties</h4>
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left py-1">Description</th><th className="text-left">Catégorie</th><th className="text-left">Statut</th><th className="text-right">Montant</th></tr></thead>
                        <tbody>
                          {sortiesJour.map(s => (
                            <tr key={s.id} className="border-b border-gray-50">
                              <td className="py-1.5 text-gray-700">{s.description}</td>
                              <td className="text-gray-500">{labelCategorie[s.categorie]}</td>
                              <td>
                                {s.validatedBy
                                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Validé</span>
                                  : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">En attente</span>}
                              </td>
                              <td className="text-right font-medium text-red-600">{formatMontant(s.montant)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {entreesJour.length === 0 && sortiesJour.length === 0 && (
                    <p className="text-center text-gray-400 py-6">Aucune opération ce jour</p>
                  )}
                </div>
              )}

              {/* ENTRÉES */}
              {tab === "entrees" && (
                <div className="space-y-5">
                  <form onSubmit={handleAddEntree} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Nouvelle entrée</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Montant (FCFA)</label>
                        <input
                          type="number" min="0" required
                          value={newEntree.montant}
                          onChange={e => setNewEntree(p => ({ ...p, montant: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <select
                          value={newEntree.type}
                          onChange={e => setNewEntree(p => ({ ...p, type: e.target.value as EntreeComptable["type"] }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                          {TYPES_ENTREES.map(t => <option key={t} value={t}>{labelType[t]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date</label>
                        <input
                          type="date" required
                          value={newEntree.date}
                          onChange={e => setNewEntree(p => ({ ...p, date: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <input
                          type="text" required
                          value={newEntree.description}
                          onChange={e => setNewEntree(p => ({ ...p, description: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Description..."
                        />
                      </div>
                    </div>
                    <button
                      type="submit" disabled={submitting}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {submitting ? "Ajout..." : "+ Ajouter"}
                    </button>
                  </form>

                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left py-2">Date</th><th className="text-left">Description</th><th className="text-left">Type</th><th className="text-right">Montant</th></tr></thead>
                    <tbody>
                      {entrees.map(e => (
                        <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 text-gray-500 text-xs">{toDate(e.date).toLocaleDateString("fr-FR")}</td>
                          <td className="text-gray-700">{e.description}</td>
                          <td><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{labelType[e.type]}</span></td>
                          <td className="text-right font-semibold text-green-600">{formatMontant(e.montant)}</td>
                        </tr>
                      ))}
                      {entrees.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Aucune entrée</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SORTIES */}
              {tab === "sorties" && (
                <div className="space-y-5">
                  <form onSubmit={handleAddSortie} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Nouvelle sortie</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Montant (FCFA)</label>
                        <input
                          type="number" min="0" required
                          value={newSortie.montant}
                          onChange={e => setNewSortie(p => ({ ...p, montant: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Catégorie</label>
                        <select
                          value={newSortie.categorie}
                          onChange={e => setNewSortie(p => ({ ...p, categorie: e.target.value as SortieComptable["categorie"] }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                          {CATEGORIES_SORTIES.map(c => <option key={c} value={c}>{labelCategorie[c]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date</label>
                        <input
                          type="date" required
                          value={newSortie.date}
                          onChange={e => setNewSortie(p => ({ ...p, date: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <input
                          type="text" required
                          value={newSortie.description}
                          onChange={e => setNewSortie(p => ({ ...p, description: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Description..."
                        />
                      </div>
                    </div>
                    <button
                      type="submit" disabled={submitting}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {submitting ? "Ajout..." : "+ Ajouter"}
                    </button>
                  </form>

                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left py-2">Date</th><th className="text-left">Description</th><th className="text-left">Catégorie</th><th className="text-left">Statut</th><th className="text-right">Montant</th></tr></thead>
                    <tbody>
                      {sorties.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 text-gray-500 text-xs">{toDate(s.date).toLocaleDateString("fr-FR")}</td>
                          <td className="text-gray-700">{s.description}</td>
                          <td><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{labelCategorie[s.categorie]}</span></td>
                          <td>
                            {s.validatedBy
                              ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Validé</span>
                              : isAdmin
                                ? <button onClick={() => handleValidateSortie(s.id)} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full hover:bg-yellow-200">Valider</button>
                                : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">En attente</span>}
                          </td>
                          <td className="text-right font-semibold text-red-600">{formatMontant(s.montant)}</td>
                        </tr>
                      ))}
                      {sorties.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune sortie</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
