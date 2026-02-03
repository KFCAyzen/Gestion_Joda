'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student, CoursLangue, Payment, LanguageCourse, MONTANTS_MANDARIN, MONTANTS_ANGLAIS } from '../types/joda';
import { createCoursLangueWithPayments, getStudentCours, updatePaymentStatus } from '../utils/firebaseOperations';
import LoadingSpinner from './LoadingSpinner';

interface LanguageCourseManagementProps {
  student: Student;
  onUpdate?: () => void;
}

export default function LanguageCourseManagement({ student, onUpdate }: LanguageCourseManagementProps) {
  const { user } = useAuth();
  const [cours, setCours] = useState<CoursLangue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCourse>('mandarin');
  const [showInscriptionForm, setShowInscriptionForm] = useState(false);

  useEffect(() => {
    loadCours();
  }, [student.id]);

  const loadCours = async () => {
    try {
      const coursData = await getStudentCours(student.id);
      setCours(coursData);
    } catch (error) {
      console.error('Erreur lors du chargement des cours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInscription = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      await createCoursLangueWithPayments(student.id, selectedLanguage, user.id);
      await loadCours();
      setShowInscriptionForm(false);
      onUpdate?.();
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentValidation = async (paymentId: string, isValid: boolean) => {
    if (!user) return;

    try {
      await updatePaymentStatus(paymentId, isValid ? 'paye' : 'attente', user.id);
      await loadCours();
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getPaymentStatus = (payment: Payment) => {
    if (payment.status === 'paye') return 'Payé';
    if (payment.status === 'retard') return 'En retard';
    return 'En attente';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paye': return 'text-green-600 bg-green-50';
      case 'retard': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Chargement des cours..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Cours de Langues</h3>
        {cours.length === 0 && (
          <button
            onClick={() => setShowInscriptionForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Inscrire aux cours
          </button>
        )}
      </div>

      {showInscriptionForm && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-medium mb-4">Inscription aux cours de langues</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choisir la langue
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as LanguageCourse)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="mandarin">Mandarin ({formatPrice(MONTANTS_MANDARIN.TOTAL)})</option>
                <option value="anglais">Anglais ({formatPrice(MONTANTS_ANGLAIS.TOTAL)})</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium mb-2">Détail des paiements - {selectedLanguage === 'mandarin' ? 'Mandarin' : 'Anglais'}</h5>
              {selectedLanguage === 'mandarin' ? (
                <ul className="space-y-1 text-sm">
                  <li>• Inscription: {formatPrice(MONTANTS_MANDARIN.INSCRIPTION)}</li>
                  <li>• Livre: {formatPrice(MONTANTS_MANDARIN.LIVRE)}</li>
                  <li>• Tranche 1: {formatPrice(MONTANTS_MANDARIN.TRANCHE_1)}</li>
                  <li>• Tranche 2: {formatPrice(MONTANTS_MANDARIN.TRANCHE_2)}</li>
                </ul>
              ) : (
                <ul className="space-y-1 text-sm">
                  <li>• Inscription: {formatPrice(MONTANTS_ANGLAIS.INSCRIPTION)}</li>
                  <li>• Livre: {formatPrice(MONTANTS_ANGLAIS.LIVRE)}</li>
                  <li>• Tranche 1: {formatPrice(MONTANTS_ANGLAIS.TRANCHE_1)}</li>
                  <li>• Tranche 2: {formatPrice(MONTANTS_ANGLAIS.TRANCHE_2)}</li>
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleInscription}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirmer l'inscription
              </button>
              <button
                onClick={() => setShowInscriptionForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {cours.map((coursLangue) => (
        <div key={coursLangue.id} className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium capitalize">
              Cours de {coursLangue.langue}
            </h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              coursLangue.statut === 'actif' ? 'bg-green-100 text-green-800' :
              coursLangue.statut === 'termine' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {coursLangue.statut}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(coursLangue.paiements).map(([type, payment]) => (
              <div key={type} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-sm capitalize">{type}</h5>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}`}>
                    {getPaymentStatus(payment)}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Montant: {formatPrice(payment.montant)}</p>
                  {payment.penalites > 0 && (
                    <p className="text-red-600">Pénalités: {formatPrice(payment.penalites)}</p>
                  )}
                  <p>Échéance: {new Date(payment.date_limite).toLocaleDateString('fr-FR')}</p>
                  {payment.date_paiement && (
                    <p>Payé le: {new Date(payment.date_paiement).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>

                {payment.facture_url && (
                  <div className="mt-3">
                    <a
                      href={payment.facture_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Voir la facture
                    </a>
                  </div>
                )}

                {payment.status === 'attente' && payment.facture_url && user?.role !== 'student' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handlePaymentValidation(payment.id, true)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => handlePaymentValidation(payment.id, false)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {cours.length === 0 && !showInscriptionForm && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun cours de langue inscrit</p>
        </div>
      )}
    </div>
  );
}