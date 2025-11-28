"use client";

import { useState, useEffect } from 'react';

interface StudentData {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentEducation: string;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  documents: {
    passport: boolean;
    criminalRecord: boolean;
    photo: boolean;
    transcript: boolean;
    diploma: boolean;
  };
  payments: {
    total: number;
    paid: number;
    remaining: number;
    nextDueDate: string;
  };
}

export default function StudentPortal() {
  const [student, setStudent] = useState<StudentData>({
    id: 'STU2024001',
    name: 'Marie Dupont',
    email: 'marie.dupont@email.com',
    phone: '+237 123 456 789',
    currentEducation: 'Terminale C',
    applicationStatus: 'pending',
    documents: {
      passport: true,
      criminalRecord: false,
      photo: true,
      transcript: false,
      diploma: false
    },
    payments: {
      total: 300000,
      paid: 100000,
      remaining: 200000,
      nextDueDate: '2024-02-15'
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En cours';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="glass-header p-8 rounded-2xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portail Étudiant</h1>
              <p className="text-gray-600">Bienvenue, {student.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">ID: {student.id}</p>
            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(student.applicationStatus)}`}>
              Candidature {getStatusText(student.applicationStatus)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 mb-8">
        {[
          { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
          { id: 'documents', label: 'Documents', icon: '📄' },
          { id: 'payments', label: 'Paiements', icon: '💳' },
          { id: 'profile', label: 'Profil', icon: '👤' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-lg'
                : 'glass-card hover:bg-red-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Card */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">État de la candidature</h3>
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900">En cours d'examen</p>
              <p className="text-gray-600 mt-2">Votre dossier est en cours de traitement</p>
            </div>
          </div>

          {/* Documents Progress */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Documents</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Complétés</span>
                <span className="font-bold text-red-600">
                  {Object.values(student.documents).filter(Boolean).length}/5
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-600 h-3 rounded-full transition-all"
                  style={{ width: `${(Object.values(student.documents).filter(Boolean).length / 5) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {5 - Object.values(student.documents).filter(Boolean).length} documents manquants
              </p>
            </div>
          </div>

          {/* Payment Status */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Paiements</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-700">Payé</span>
                <span className="font-bold text-green-600">{formatPrice(student.payments.paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Restant</span>
                <span className="font-bold text-red-600">{formatPrice(student.payments.remaining)}</span>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">Prochaine échéance</p>
                <p className="font-bold text-gray-900">{new Date(student.payments.nextDueDate).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Mes Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(student.documents).map(([key, completed]) => (
              <div key={key} className={`p-6 rounded-xl border-2 ${completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${completed ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completed && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className={`text-sm mb-4 ${completed ? 'text-green-700' : 'text-gray-600'}`}>
                  {completed ? 'Document reçu et validé' : 'Document requis'}
                </p>
                {!completed ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          // Simulation upload
                          setTimeout(() => {
                            setStudent(prev => ({
                              ...prev,
                              documents: {
                                ...prev.documents,
                                [key]: true
                              }
                            }));
                          }, 1000);
                        }
                      }}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    <p className="text-xs text-gray-500">PDF, JPG, JPEG, PNG (max 5MB)</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Voir
                    </button>
                    <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                      Remplacer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Historique des Paiements</h3>
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-green-800">Tranche 1/3 - Inscription</h4>
                  <p className="text-green-600">Payé le 15/01/2024</p>
                </div>
                <span className="text-xl font-bold text-green-800">{formatPrice(100000)}</span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-yellow-800">Tranche 2/3 - Dépôt de dossiers</h4>
                  <p className="text-yellow-600">Échéance: 15/02/2024</p>
                </div>
                <span className="text-xl font-bold text-yellow-800">{formatPrice(100000)}</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-800">Tranche 3/3 - Admission</h4>
                  <p className="text-gray-600">Échéance: 15/03/2024</p>
                </div>
                <span className="text-xl font-bold text-gray-800">{formatPrice(100000)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Mon Profil</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                <input
                  type="text"
                  value={student.name}
                  readOnly
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl shadow-inner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={student.email}
                  readOnly
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl shadow-inner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  type="text"
                  value={student.phone}
                  readOnly
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl shadow-inner"
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formation actuelle</label>
                <input
                  type="text"
                  value={student.currentEducation}
                  readOnly
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl shadow-inner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Étudiant</label>
                <input
                  type="text"
                  value={student.id}
                  readOnly
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}