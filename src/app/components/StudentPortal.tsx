"use client";

import { useState, useEffect, useCallback } from 'react';
import { User } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';
import { sanitizeForHtml, sanitizeForExport } from '../utils/security';
import StudentNotifications from './StudentNotifications';
import StudentDashboard from './student/StudentDashboard';
import StudentPaymentsList from './student/StudentPaymentsList';
import StudentDocumentsList from './student/StudentDocumentsList';
import {
  getAllDocuments,
  getStudentPayments,
  getStudentDocuments,
  createStudentDocument,
  updatePaymentStatus,
} from '../utils/firebaseOperations';
import { Payment, Document, DossierBourse } from '../types/joda';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface StudentPortalProps {
  user: User;
  onLogout: () => void;
}

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

function formatMontant(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

const STATUS_COLORS: Record<string, string> = {
  paye: 'bg-green-100 text-green-700',
  attente: 'bg-yellow-100 text-yellow-700',
  retard: 'bg-red-100 text-red-700',
  valide: 'bg-green-100 text-green-700',
  en_attente: 'bg-yellow-100 text-yellow-700',
  non_conforme: 'bg-red-100 text-red-700',
  document_recu: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-purple-100 text-purple-700',
  admission_validee: 'bg-green-100 text-green-700',
  admission_rejetee: 'bg-red-100 text-red-700',
  visa_en_cours: 'bg-teal-100 text-teal-700',
  termine: 'bg-gray-100 text-gray-700',
};

const DOSSIER_LABELS: Record<string, string> = {
  document_recu: 'Documents reçus',
  en_attente: 'En attente',
  en_cours: 'En cours',
  document_manquant: 'Document manquant',
  admission_validee: 'Admission validée',
  admission_rejetee: 'Admission rejetée',
  en_attente_universite: 'En attente université',
  visa_en_cours: 'Visa en cours',
  termine: 'Terminé',
};

type View = 'dashboard' | 'payments' | 'documents' | 'dossier' | 'notifications';

export default function StudentPortal({ user, onLogout }: StudentPortalProps) {
  const { showNotification } = useNotificationContext();
  const [view, setView] = useState<View>('dashboard');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dossier, setDossier] = useState<DossierBourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pays, docs, dossiers] = await Promise.all([
        getStudentPayments(user.id),
        getStudentDocuments(user.id),
        getAllDocuments<DossierBourse>('dossiers_bourses'),
      ]);
      setPayments(pays);
      setDocuments(docs);
      const myDossier = dossiers.find(d => d.studentId === user.id) || null;
      setDossier(myDossier);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `documents/${user.id}/${docType}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await createStudentDocument({
        studentId: user.id,
        type: docType as any,
        status: 'en_attente',
        url,
        uploadedAt: new Date(),
      });
      showNotification('Document uploadé avec succès', 'success');
      await load();
    } catch {
      showNotification('Erreur lors de l\'upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const generateReceipt = (payment: Payment) => {
    const content = `
JODA COMPANY - REÇU DE PAIEMENT
================================
Étudiant : ${sanitizeForExport(user.name)}
Tranche   : ${payment.tranche}
Type      : ${payment.type}
Montant   : ${formatMontant(payment.montant)}
Statut    : ${payment.status}
Date      : ${payment.validatedAt ? toDate(payment.validatedAt).toLocaleDateString('fr-FR') : '-'}
================================
Joda Company — contact@joda.cm
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Recu_${sanitizeForExport(user.name.replace(/\s+/g, '_'))}_T${payment.tranche}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calcul solvabilité
  const totalDu = payments.reduce((s, p) => s + p.montant, 0);
  const totalPaye = payments.filter(p => p.status === 'paye').reduce((s, p) => s + p.montant, 0);
  const solvency = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 100;

  // Données pour StudentDashboard (format compatible)
  const dashPayments = payments.map(p => ({
    id: p.id,
    studentId: p.studentId,
    description: `Tranche ${p.tranche} — ${p.type}`,
    date: toDate(p.date_limite).toLocaleDateString('fr-FR'),
    amount: p.montant,
    status: p.status === 'paye' ? 'Payé' : p.status === 'retard' ? 'En retard' : 'En attente',
  }));

  const dashDocuments = documents.map(d => ({
    id: d.id,
    name: d.type,
    type: d.type,
    uploadDate: d.uploadedAt ? toDate(d.uploadedAt).toLocaleDateString('fr-FR') : '-',
    status: d.status === 'valide' ? 'Validé' : d.status === 'non_conforme' ? 'Non conforme' : 'En attente',
  }));

  const dashFile = dossier ? {
    id: dossier.id,
    studentId: dossier.studentId,
    completionRate: Math.round((documents.filter(d => d.status === 'valide').length / 5) * 100),
    missingDocuments: [],
    status: DOSSIER_LABELS[dossier.status] || dossier.status,
  } : null;

  const navItems: { key: View; label: string; icon: string }[] = [
    { key: 'dashboard',     label: 'Tableau de bord', icon: '🏠' },
    { key: 'payments',      label: 'Paiements',        icon: '💳' },
    { key: 'documents',     label: 'Documents',        icon: '📄' },
    { key: 'dossier',       label: 'Mon dossier',      icon: '📋' },
    { key: 'notifications', label: 'Notifications',    icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/0.png" alt="Joda" className="w-8 h-8" />
            <div>
              <p className="text-sm font-bold text-gray-900">Portail Étudiant</p>
              <p className="text-xs text-gray-500">{sanitizeForHtml(user.name)}</p>
            </div>
          </div>
          <button onClick={onLogout} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">
            Déconnexion
          </button>
        </div>
        {/* Nav tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                view === item.key
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : (
          <>
            {view === 'dashboard' && (
              <StudentDashboard
                applications={[]}
                payments={dashPayments}
                documents={dashDocuments}
                subscriptions={[]}
                employeeReceipts={[]}
                serviceRequests={[]}
                studentFile={dashFile}
                solvency={solvency}
                onViewChange={(v) => setView(v as View)}
                getStatusColor={(s) => STATUS_COLORS[s] || 'bg-gray-100 text-gray-700'}
                getPaymentStatusColor={(s) => STATUS_COLORS[s.toLowerCase()] || 'bg-gray-100 text-gray-700'}
              />
            )}

            {view === 'payments' && (
              <div className="space-y-4">
                {/* Résumé */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Total dû</p>
                    <p className="font-bold text-gray-900">{formatMontant(totalDu)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Payé</p>
                    <p className="font-bold text-green-600">{formatMontant(totalPaye)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                    <p className="text-xs text-gray-500">Solvabilité</p>
                    <p className="font-bold text-blue-600">{solvency}%</p>
                  </div>
                </div>

                <StudentPaymentsList
                  payments={dashPayments}
                  onBack={() => setView('dashboard')}
                  getPaymentStatusColor={(s) => STATUS_COLORS[s.toLowerCase()] || 'bg-gray-100 text-gray-700'}
                  onGenerateReceipt={(p) => {
                    const original = payments.find(pay => pay.id === p.id);
                    if (original) generateReceipt(original);
                  }}
                />

                {/* Upload facture */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Uploader une preuve de paiement</h4>
                  <div className="space-y-2">
                    {payments.filter(p => p.status !== 'paye').map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Tranche {p.tranche} — {formatMontant(p.montant)}</span>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploading(true);
                              try {
                                const storageRef = ref(storage, `factures/${user.id}/${p.id}_${Date.now()}`);
                                await uploadBytes(storageRef, file);
                                const url = await getDownloadURL(storageRef);
                                await updatePaymentStatus(p.id, 'attente');
                                showNotification('Facture uploadée, en attente de validation', 'success');
                                await load();
                              } catch {
                                showNotification('Erreur upload', 'error');
                              } finally {
                                setUploading(false);
                              }
                            }}
                          />
                          <span className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            {uploading ? '...' : 'Upload'}
                          </span>
                        </label>
                      </div>
                    ))}
                    {payments.filter(p => p.status !== 'paye').length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Tous les paiements sont validés ✓</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === 'documents' && (
              <StudentDocumentsList
                documents={dashDocuments}
                onBack={() => setView('dashboard')}
                onFileUpload={handleFileUpload}
              />
            )}

            {view === 'dossier' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Mon dossier de bourse</h3>
                  <button onClick={() => setView('dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
                </div>

                {!dossier ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">📋</p>
                    <p>Aucun dossier créé pour le moment</p>
                    <p className="text-sm mt-1">Contactez l'agence pour démarrer votre dossier</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Statut */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <span className="text-2xl">📋</span>
                      <div>
                        <p className="text-sm text-gray-500">Statut actuel</p>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[dossier.status] || 'bg-gray-100 text-gray-700'}`}>
                          {DOSSIER_LABELS[dossier.status] || dossier.status}
                        </span>
                      </div>
                    </div>

                    {/* Progression documents */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Documents validés</span>
                        <span className="font-semibold">{documents.filter(d => d.status === 'valide').length} / 5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.round((documents.filter(d => d.status === 'valide').length / 5) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Historique */}
                    {dossier.historique.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Historique des actions</h4>
                        <div className="space-y-2">
                          {dossier.historique.slice().reverse().map((entry, i) => (
                            <div key={i} className="flex gap-3 text-sm">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="text-gray-700">{entry.description}</p>
                                <p className="text-xs text-gray-400">{toDate(entry.performedAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {view === 'notifications' && (
              <StudentNotifications
                userId={user.id}
                onBack={() => setView('dashboard')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
