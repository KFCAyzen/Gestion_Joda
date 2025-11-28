"use client";

import React, { useState } from 'react';

interface ScholarshipFile {
  id: string;
  studentName: string;
  university: string;
  program: string;
  status: 'incomplete' | 'pending' | 'review' | 'approved' | 'rejected';
  documents: {
    passport: boolean;
    criminalRecord: boolean;
    photo: boolean;
    transcript: boolean;
    diploma: boolean;
    motivationLetter: boolean;
    recommendationLetter: boolean;
    hskCertificate: boolean;
  };
  submissionDate: string;
  lastUpdate: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
  photoUrl?: string;
}

export default function ScholarshipFileManagement() {
  const [files, setFiles] = useState<ScholarshipFile[]>([
    {
      id: '1',
      studentName: 'Marie Dupont',
      university: 'Université de Pékin',
      program: 'Informatique',
      status: 'pending',
      documents: {
        passport: true,
        criminalRecord: true,
        photo: true,
        transcript: false,
        diploma: false,
        motivationLetter: true,
        recommendationLetter: false,
        hskCertificate: true
      },
      submissionDate: '2024-01-15',
      lastUpdate: '2024-01-20',
      notes: 'En attente du relevé de notes',
      priority: 'high',
      photoUrl: '/student1.jpg'
    },
    {
      id: '2',
      studentName: 'Jean Martin',
      university: 'Université Tsinghua',
      program: 'Économie',
      status: 'review',
      documents: {
        passport: true,
        criminalRecord: true,
        photo: true,
        transcript: true,
        diploma: true,
        motivationLetter: true,
        recommendationLetter: true,
        hskCertificate: false
      },
      submissionDate: '2024-01-10',
      lastUpdate: '2024-01-22',
      notes: 'Dossier complet, en attente certificat HSK',
      priority: 'medium',
      photoUrl: '/student2.jpg'
    },
    {
      id: '3',
      studentName: 'Sophie Chen',
      university: 'Université Fudan',
      program: 'Médecine',
      status: 'approved',
      documents: {
        passport: true,
        criminalRecord: true,
        photo: true,
        transcript: true,
        diploma: true,
        motivationLetter: true,
        recommendationLetter: true,
        hskCertificate: true
      },
      submissionDate: '2024-01-05',
      lastUpdate: '2024-01-25',
      notes: 'Bourse approuvée - félicitations!',
      priority: 'low'
    }
  ]);

  const [selectedFile, setSelectedFile] = useState<ScholarshipFile | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'incomplete': return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
      case 'pending': return 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800 border border-amber-300';
      case 'review': return 'bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-300';
      case 'approved': return 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300';
      case 'rejected': return 'bg-gradient-to-r from-red-100 to-rose-200 text-red-800 border border-red-300';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getDocumentIcon = (docType: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      passport: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      criminalRecord: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      photo: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      transcript: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      diploma: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
      motivationLetter: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      recommendationLetter: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      hskCertificate: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    };
    return icons[docType] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getDocumentName = (docType: string) => {
    const names: { [key: string]: string } = {
      passport: 'Passeport',
      criminalRecord: 'Casier judiciaire',
      photo: 'Photo d\'identité',
      transcript: 'Relevé de notes',
      diploma: 'Diplôme',
      motivationLetter: 'Lettre de motivation',
      recommendationLetter: 'Lettre de recommandation',
      hskCertificate: 'Certificat HSK'
    };
    return names[docType] || docType;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'incomplete': return 'Incomplet';
      case 'pending': return 'En attente';
      case 'review': return 'En révision';
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  const getCompletionPercentage = (documents: ScholarshipFile['documents']) => {
    const total = Object.keys(documents).length;
    const completed = Object.values(documents).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  const filteredFiles = files.filter(file => {
    const matchesStatus = filterStatus === 'all' || file.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      file.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.program.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header avec statistiques */}
      <div className="glass-header mb-8 p-8 rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Dossiers</h1>
              <p className="text-gray-600 text-lg">Suivi avancé des candidatures de bourses</p>
            </div>
          </div>
          
          {/* Stats rapides */}
          <div className="hidden lg:flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{files.length}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{files.filter(f => f.status === 'approved').length}</div>
              <div className="text-sm text-gray-500">Approuvés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{files.filter(f => f.status === 'review').length}</div>
              <div className="text-sm text-gray-500">En révision</div>
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, université ou programme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all min-w-[200px]"
          >
            <option value="all">Tous les statuts</option>
            <option value="incomplete">Incomplet</option>
            <option value="pending">En attente</option>
            <option value="review">En révision</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Liste des dossiers */}
        <div className="xl:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                  selectedFile?.id === file.id 
                    ? 'ring-2 ring-red-500 shadow-2xl shadow-red-500/20' 
                    : 'hover:shadow-xl'
                }`}
                onClick={() => setSelectedFile(file)}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                {/* Indicateur de priorité */}
                <div className={`absolute top-0 left-0 w-1 h-full ${getPriorityColor(file.priority)}`}></div>
                
                <div className="p-6">
                  {/* Header avec avatar et statut */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                        {file.photoUrl ? (
                          <img src={file.photoUrl} alt={file.studentName} className="w-full h-full object-cover" />
                        ) : (
                          file.studentName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{file.studentName}</h3>
                        <p className="text-sm text-gray-500">{file.program}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${getStatusColor(file.status)}`}>
                      {getStatusText(file.status)}
                    </span>
                  </div>

                  {/* Informations */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium">{file.university}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-6 0V7" />
                      </svg>
                      <span>Soumis le {new Date(file.submissionDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  {/* Barre de progression améliorée */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-bold text-gray-700">Documents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-600">{getCompletionPercentage(file.documents)}%</span>
                        <div className={`w-2 h-2 rounded-full ${getCompletionPercentage(file.documents) === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${getCompletionPercentage(file.documents)}%` }}
                        ></div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
                    </div>
                  </div>

                  {/* Documents grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(file.documents).slice(0, 8).map(([key, completed]) => (
                      <div
                        key={key}
                        className={`relative p-2 rounded-lg text-center transition-all ${
                          completed 
                            ? 'bg-green-100 border border-green-300 text-green-700' 
                            : 'bg-gray-100 border border-gray-300 text-gray-500'
                        }`}
                        title={getDocumentName(key)}
                      >
                        <div className={`${completed ? 'text-green-600' : 'text-gray-400'}`}>{getDocumentIcon(key)}</div>
                        {completed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Notes preview */}
                  {file.notes && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm text-blue-800 line-clamp-2">{file.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Panneau de détails */}
        <div className="xl:col-span-1">
          <div className="sticky top-6">
            {selectedFile ? (
              <div className="space-y-6">
                {/* Profil étudiant */}
                <div className="glass-card p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg overflow-hidden">
                      {selectedFile.photoUrl ? (
                        <img src={selectedFile.photoUrl} alt={selectedFile.studentName} className="w-full h-full object-cover" />
                      ) : (
                        selectedFile.studentName.charAt(0)
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedFile.studentName}</h3>
                    <p className="text-gray-600">{selectedFile.program}</p>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold mt-2 ${getStatusColor(selectedFile.status)}`}>
                      {getStatusText(selectedFile.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Université</span>
                      </div>
                      <div className="font-semibold text-gray-900">{selectedFile.university}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-6 0V7" />
                          </svg>
                          <span>Soumis</span>
                        </div>
                        <div className="text-sm font-semibold text-blue-900">{new Date(selectedFile.submissionDate).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Mis à jour</span>
                        </div>
                        <div className="text-sm font-semibold text-green-900">{new Date(selectedFile.lastUpdate).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <label>Statut du dossier</label>
                    </div>
                    <select
                      value={selectedFile.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as ScholarshipFile['status'];
                        setFiles(files.map(f => 
                          f.id === selectedFile.id 
                            ? { ...f, status: newStatus, lastUpdate: new Date().toISOString().split('T')[0] }
                            : f
                        ));
                        setSelectedFile({ ...selectedFile, status: newStatus });
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                    >
                      <option value="incomplete">Incomplet</option>
                      <option value="pending">En attente</option>
                      <option value="review">En révision</option>
                      <option value="approved">Approuvé</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                  </div>
                </div>

                {/* Documents détaillés */}
                <div className="glass-card p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents Requis
                    <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      {Object.values(selectedFile.documents).filter(Boolean).length}/{Object.keys(selectedFile.documents).length}
                    </span>
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries(selectedFile.documents).map(([key, completed]) => (
                      <div key={key} className={`p-4 rounded-xl border-2 transition-all ${
                        completed 
                          ? 'bg-green-50 border-green-200 shadow-sm' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`${completed ? 'text-green-600' : 'text-gray-400'}`}>{getDocumentIcon(key)}</div>
                            <div>
                              <div className="font-medium text-gray-900">{getDocumentName(key)}</div>
                              <div className={`flex items-center gap-1 text-xs ${
                                completed ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {completed ? (
                                  <>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Reçu</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>En attente</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={completed}
                              onChange={(e) => {
                                const updatedFile = {
                                  ...selectedFile,
                                  documents: {
                                    ...selectedFile.documents,
                                    [key]: e.target.checked
                                  }
                                };
                                setFiles(files.map(f => f.id === selectedFile.id ? updatedFile : f));
                                setSelectedFile(updatedFile);
                              }}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="glass-card p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Notes & Commentaires
                  </h3>
                  <textarea
                    value={selectedFile.notes}
                    onChange={(e) => {
                      const updatedFile = { ...selectedFile, notes: e.target.value };
                      setFiles(files.map(f => f.id === selectedFile.id ? updatedFile : f));
                      setSelectedFile(updatedFile);
                    }}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all"
                    rows={6}
                    placeholder="Ajouter des notes, commentaires ou observations sur ce dossier..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Sauvegarder
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card text-center py-20 px-8">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-8">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Aucun dossier sélectionné</h3>
                <p className="text-gray-500">Cliquez sur un dossier pour voir les détails et gérer les documents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}