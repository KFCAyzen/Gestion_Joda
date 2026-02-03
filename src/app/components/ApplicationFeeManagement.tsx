"use client";

import { useState, useEffect } from "react";
import { saveData, loadFromFirebase } from "../utils/syncData";
import { useNotificationContext } from "../context/NotificationContext";
import { formatPrice } from "../utils/formatPrice";
import { useActivityLog } from "../context/ActivityLogContext";
import { useAuth } from "../context/AuthContext";
import { sanitizeForHtml, sanitizeForExport } from "../utils/security";

import { ApplicationFee, ScholarshipApplication } from "../types/scholarship";

export default function ApplicationFeeManagement() {
    const [showForm, setShowForm] = useState(false);
    const [fees, setFees] = useState<ApplicationFee[]>([]);
    const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotificationContext();
    const { addLog } = useActivityLog();
    const { user } = useAuth();
    

    const [formData, setFormData] = useState({
        receivedFrom: '',
        amount: '',
        motif: 'Inscription' as ApplicationFee['motif'],
        applicationId: '',
        universityName: '',
        program: '',
        advance: '',
        remaining: '',
        studentSignature: '',
        totalAmount: '',
        installmentNumber: '1',
        dueDate: ''
    });

    const generateFeeId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 3).toUpperCase();
        return `FEE${timestamp}${random}`;
    };

    const convertNumberToWords = (num: number): string => {
        const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
        const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
        const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
        
        if (num === 0) return 'zéro';
        if (num < 10) return ones[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const one = num % 10;
            if (ten === 7) return 'soixante-' + (one === 0 ? 'dix' : teens[one]);
            if (ten === 9) return 'quatre-vingt-' + (one === 0 ? 'dix' : teens[one]);
            return tens[ten] + (one ? '-' + ones[one] : '');
        }
        if (num < 1000) {
            const hundred = Math.floor(num / 100);
            const rest = num % 100;
            return (hundred === 1 ? 'cent' : ones[hundred] + ' cent') + (rest ? ' ' + convertNumberToWords(rest) : '');
        }
        if (num < 1000000) {
            const thousand = Math.floor(num / 1000);
            const rest = num % 1000;
            return (thousand === 1 ? 'mille' : convertNumberToWords(thousand) + ' mille') + (rest ? ' ' + convertNumberToWords(rest) : '');
        }
        return num.toString();
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [feesData, applicationsData, studentsData] = await Promise.all([
                loadFromFirebase('applicationFees'),
                loadFromFirebase('applications'),
                loadFromFirebase('students')
            ]);

            setFees(Array.isArray(feesData) ? feesData : []);
            setApplications(Array.isArray(applicationsData) ? applicationsData : []);
            setStudents(Array.isArray(studentsData) ? studentsData : []);
        } catch (error) {
            console.warn('Erreur chargement données:', error);
            setFees([]);
            setApplications([]);
            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        
        const handleDataUpdate = () => {
            loadData();
        };
        
        window.addEventListener('dashboardUpdate', handleDataUpdate);
        window.addEventListener('dataChanged', handleDataUpdate);
        
        return () => {
            window.removeEventListener('dashboardUpdate', handleDataUpdate);
            window.removeEventListener('dataChanged', handleDataUpdate);
        };
    }, []);

    const handleSaveFee = async () => {
        if (!formData.receivedFrom || !formData.amount) {
            showNotification("Veuillez remplir les champs obligatoires", "error");
            return;
        }

        try {
            const calculatePenalty = (dueDate: string, amount: number) => {
                const today = new Date();
                const due = new Date(dueDate);
                const daysLate = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                return daysLate > 0 ? Math.floor(amount * 0.05 * (daysLate / 30)) : 0;
            };

            const penalty = formData.dueDate ? 
                calculatePenalty(formData.dueDate, parseInt(formData.amount)) : 0;

            const feeData: ApplicationFee = {
                id: generateFeeId(),
                date: new Date().toISOString().split('T')[0],
                amount: formData.amount,
                receivedFrom: formData.receivedFrom,
                amountInWords: convertNumberToWords(parseInt(formData.amount)) + ' francs CFA',
                motif: formData.motif,
                applicationId: formData.applicationId,
                universityName: formData.universityName,
                program: formData.program,
                advance: formData.advance,
                remaining: formData.remaining,
                studentSignature: formData.studentSignature,
                totalAmount: formData.totalAmount,
                installmentNumber: parseInt(formData.installmentNumber),
                dueDate: formData.dueDate,
                penalty: penalty,
                createdBy: user?.username || 'system'
            };

            await saveData('applicationFees', feeData);
            addLog('Création frais', 'applicationFees', `Frais enregistré: ${formData.receivedFrom} - ${formatPrice(formData.amount)}`, feeData);
            window.dispatchEvent(new Event('dashboardUpdate'));
            showNotification("Frais enregistré avec succès!", "success");
            
            setShowForm(false);
            setFormData({
                receivedFrom: '', amount: '', motif: 'Inscription', applicationId: '',
                universityName: '', program: '', advance: '', remaining: '', studentSignature: '',
                totalAmount: '', installmentNumber: '1', dueDate: ''
            });
            await loadData();
        } catch (error) {
            showNotification("Erreur lors de l'enregistrement", "error");
        }
    };

    const handlePrint = (fee: ApplicationFee) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu de Paiement - ${fee.receivedFrom}</title>
                <style>
                    @page { margin: 15mm; size: A4; }
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; padding: 0; 
                        color: #333; 
                        line-height: 1.5;
                        font-size: 12px;
                        background: white;
                    }
                    .container { max-width: 100%; margin: 0 auto; }
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        border-bottom: 3px solid #dc2626;
                        padding-bottom: 20px;
                        background: linear-gradient(135deg, #f8f9fa 0%, #f3f4f6 100%);
                        padding: 25px;
                        border-radius: 10px 10px 0 0;
                    }
                    .agency-logo {
                        width: 80px;
                        height: 80px;
                        background: #dc2626;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #f3f4f6;
                        font-weight: bold;
                        font-size: 24px;
                        margin: 0 auto 15px;
                        box-shadow: 0 4px 15px rgba(125, 56, 55, 0.3);
                    }
                    .agency-name { 
                        color: #dc2626; 
                        font-size: 28px; 
                        font-weight: bold; 
                        margin: 0;
                        letter-spacing: 2px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                    }
                    .agency-info { 
                        font-size: 11px; 
                        color: #666;
                        margin-top: 8px;
                        font-style: italic;
                    }
                    .document-title { 
                        color: #dc2626; 
                        font-size: 20px; 
                        margin: 15px 0;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .fee-id {
                        background: #f3f4f6;
                        padding: 8px 20px;
                        border-radius: 25px;
                        display: inline-block;
                        margin-top: 10px;
                        font-weight: bold;
                        color: #dc2626;
                        border: 2px solid #dc2626;
                    }
                    .section { 
                        margin-bottom: 25px; 
                        background: #f9f9f9;
                        padding: 20px;
                        border-radius: 10px;
                        border-left: 5px solid #dc2626;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                    }
                    .section-title { 
                        color: #dc2626; 
                        font-size: 16px; 
                        font-weight: bold; 
                        margin: 0 0 15px 0;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                    }
                    .field {
                        background: white;
                        padding: 12px;
                        border-radius: 6px;
                        border: 1px solid #e0e0e0;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    }
                    .field-full {
                        grid-column: 1 / -1;
                    }
                    .label { 
                        font-weight: bold; 
                        color: #dc2626;
                        display: block;
                        font-size: 10px;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                        letter-spacing: 0.5px;
                    }
                    .value {
                        color: #333;
                        font-size: 13px;
                        font-weight: 500;
                    }
                    .amount-highlight {
                        background: linear-gradient(135deg, #dc2626, #a04948);
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        text-align: center;
                        font-size: 24px;
                        font-weight: bold;
                        margin: 20px 0;
                        box-shadow: 0 4px 15px rgba(125, 56, 55, 0.3);
                    }
                    .signature-section {
                        margin-top: 40px;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 30px;
                    }
                    .signature-box {
                        text-align: center;
                        padding: 25px;
                        border: 2px dashed #dc2626;
                        border-radius: 10px;
                        background: #f8f9fa;
                    }
                    .signature-label {
                        font-weight: bold;
                        color: #dc2626;
                        margin-bottom: 40px;
                        font-size: 14px;
                        text-transform: uppercase;
                    }
                    .signature-line {
                        border-top: 2px solid #dc2626;
                        padding-top: 8px;
                        font-size: 11px;
                        color: #666;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 10px;
                        color: #666;
                        border-top: 2px solid #dc2626;
                        padding-top: 20px;
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 0 0 10px 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="agency-logo">GJ</div>
                        <h1 class="agency-name">Joda Company</h1>
                        <div class="agency-info">
                            Agence de Bourses d'Études en Chine<br>
                            Douala, Cameroun | Tél: +237 123 456 789 | Email: contact@gestion-joda.cm
                        </div>
                        <h2 class="document-title">Reçu de Paiement</h2>
                        <div class="fee-id">N° ${fee.id}</div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">Informations de Paiement</h3>
                        <div class="info-grid">
                            <div class="field">
                                <span class="label">Date</span>
                                <div class="value">${new Date(fee.date).toLocaleDateString('fr-FR')}</div>
                            </div>
                            <div class="field">
                                <span class="label">Reçu de</span>
                                <div class="value">${sanitizeForHtml(fee.receivedFrom)}</div>
                            </div>
                            <div class="field">
                                <span class="label">Motif</span>
                                <div class="value">${sanitizeForHtml(fee.motif)}</div>
                            </div>
                            <div class="field">
                                <span class="label">Université</span>
                                <div class="value">${sanitizeForHtml(fee.universityName || 'Non spécifiée')}</div>
                            </div>
                            <div class="field field-full">
                                <span class="label">Programme</span>
                                <div class="value">${sanitizeForHtml(fee.program || 'Non spécifié')}</div>
                            </div>
                        </div>
                        
                        <div class="amount-highlight">
                            Montant: ${formatPrice(fee.amount)}
                        </div>
                        
                        <div class="field">
                            <span class="label">Montant en lettres</span>
                            <div class="value">${sanitizeForHtml(fee.amountInWords)}</div>
                        </div>
                    </div>

                    <div class="signature-section">
                        <div class="signature-box">
                            <div class="signature-label">Signature de l'Étudiant</div>
                            <div style="height: 50px;"></div>
                            <div class="signature-line">
                                ${sanitizeForHtml(fee.studentSignature || fee.receivedFrom)}
                            </div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-label">Cachet de l'Agence</div>
                            <div style="height: 50px;"></div>
                            <div class="signature-line">
                                Joda Company<br>
                                ${new Date().toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <p><strong>Joda Company</strong> - Reçu généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                        <p>Spécialiste des bourses d'études en Chine - Document officiel</p>
                        <p>Reçu N° ${fee.id}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des frais...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Gestion des Frais de Candidature
            </h1>
            
            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <button 
                    onClick={() => setShowForm(true)}
                    style={{backgroundColor: '#dc2626'}} 
                    className="text-gray-300 px-4 py-3 sm:py-2 rounded hover:bg-opacity-80 font-medium"
                >
                    Nouveau Paiement
                </button>
            </div>
            
            {showForm && (
                <div className="bg-gray-50 border rounded p-4 sm:p-6 mb-4" style={{borderColor: '#dc2626'}}>
                    <h3 className="font-bold mb-4 sm:mb-6 text-lg sm:text-xl" style={{color: '#dc2626'}}>
                        Nouveau Paiement de Frais
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <input 
                            placeholder="Reçu de (nom étudiant) *" 
                            value={formData.receivedFrom}
                            onChange={(e) => setFormData({...formData, receivedFrom: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                        
                        <input 
                            type="number"
                            placeholder="Montant (FCFA) *" 
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />

                        <select
                            value={formData.motif}
                            onChange={(e) => setFormData({...formData, motif: e.target.value as ApplicationFee['motif']})}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="Inscription">Inscription</option>
                            <option value="Dépôt de dossiers">Dépôt de dossiers</option>
                            <option value="Admission">Admission</option>
                            <option value="Visa">Visa</option>
                            <option value="Autres">Autres</option>
                        </select>

                        <select
                            value={formData.receivedFrom}
                            onChange={(e) => {
                                const selectedStudent = students.find(student => student.name === e.target.value);
                                setFormData({
                                    ...formData, 
                                    receivedFrom: e.target.value
                                });
                            }}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="">Sélectionner un étudiant</option>
                            {students.map(student => (
                                <option key={student.id} value={student.name}>
                                    {student.name} - {student.id}
                                </option>
                            ))}
                        </select>

                        <input 
                            placeholder="Nom université" 
                            value={formData.universityName}
                            onChange={(e) => setFormData({...formData, universityName: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />

                        <input 
                            placeholder="Programme d'études" 
                            value={formData.program}
                            onChange={(e) => setFormData({...formData, program: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />

                        <input 
                            type="number"
                            placeholder="Avance (optionnel)" 
                            value={formData.advance}
                            onChange={(e) => setFormData({...formData, advance: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />

                        <input 
                            type="number"
                            placeholder="Montant total (3 tranches)" 
                            value={formData.totalAmount}
                            onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                        
                        <select
                            value={formData.installmentNumber}
                            onChange={(e) => setFormData({...formData, installmentNumber: e.target.value})}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="1">Tranche 1/3</option>
                            <option value="2">Tranche 2/3</option>
                            <option value="3">Tranche 3/3</option>
                        </select>
                        
                        <div className="relative">
                            <input 
                                type="date" 
                                value={formData.dueDate}
                                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                className="p-3 border rounded-lg w-full" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <label className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs" style={{color: '#dc2626'}}>
                                Date limite de paiement
                            </label>
                        </div>

                        <input 
                            placeholder="Signature étudiant" 
                            value={formData.studentSignature}
                            onChange={(e) => setFormData({...formData, studentSignature: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleSaveFee}
                            style={{backgroundColor: '#dc2626'}} 
                            className="text-gray-300 px-6 py-3 rounded hover:opacity-80 transition-opacity font-medium"
                        >
                            Enregistrer
                        </button>
                        <button 
                            onClick={() => {
                                setShowForm(false);
                                setFormData({
                                    receivedFrom: '', amount: '', motif: 'Inscription', applicationId: '',
                                    universityName: '', program: '', advance: '', remaining: '', studentSignature: '',
                                    totalAmount: '', installmentNumber: '1', dueDate: ''
                                });
                            }} 
                            className="px-6 py-3 rounded border hover:bg-gray-100 transition-colors font-medium" 
                            style={{borderColor: '#dc2626', color: '#dc2626'}}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 sm:p-4 sm:p-6 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:p-4">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                            Liste des Paiements
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                {fees.length} paiement(s)
                            </span>
                            <button 
                                onClick={loadData}
                                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    {fees.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <p className="text-slate-500 text-base sm:text-lg font-medium">Aucun paiement enregistré</p>
                            <p className="text-slate-400 text-sm mt-1">Les paiements apparaîtront ici après leur enregistrement</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {fees.map((fee) => (
                                <div key={fee.id} className="bg-gradient-to-br from-white to-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: '#f3f4f6'}}>
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                                            {fee.motif}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-semibold text-slate-800 text-base sm:text-lg mb-2">
                                        {fee.receivedFrom}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mb-3">ID: {fee.id}</p>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Date:</span>
                                            <span className="font-medium">{new Date(fee.date).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        {fee.universityName && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600">Université:</span>
                                                <span className="font-medium text-right">{fee.universityName}</span>
                                            </div>
                                        )}
                                        {fee.program && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600">Programme:</span>
                                                <span className="font-medium text-right">{fee.program}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="pt-3 border-t border-slate-200 mb-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600">Montant payé</span>
                                            <span className="text-xl font-bold" style={{color: '#dc2626'}}>
                                                {formatPrice(fee.amount)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => {
                                            handlePrint(fee);
                                            addLog('Impression reçu', 'applicationFees', `Reçu imprimé: ${fee.receivedFrom}`);
                                        }}
                                        className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                                        style={{backgroundColor: '#dc2626'}}
                                    >
                                        Imprimer le reçu
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}