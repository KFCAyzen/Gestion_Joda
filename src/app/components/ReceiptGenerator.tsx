"use client";

import { Payment, Student } from "../types/joda";
import { formatPrice } from "../utils/formatPrice";
import { sanitizeForHtml } from "../utils/security";

interface ReceiptGeneratorProps {
    payment: Payment;
    student: Student;
    onClose: () => void;
}

export default function ReceiptGenerator({ payment, student, onClose }: ReceiptGeneratorProps) {
    
    const generatePDF = () => {
        const receiptContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Reçu de Paiement - Joda Company</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        line-height: 1.6;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        border-bottom: 3px solid #dc2626; 
                        padding-bottom: 20px; 
                    }
                    .company-name { 
                        font-size: 28px; 
                        font-weight: bold; 
                        color: #dc2626; 
                        margin: 0; 
                    }
                    .company-info { 
                        font-size: 12px; 
                        color: #666; 
                        margin: 10px 0; 
                    }
                    .receipt-title { 
                        font-size: 20px; 
                        margin: 20px 0; 
                        color: #dc2626; 
                        text-align: center;
                        text-decoration: underline;
                    }
                    .receipt-number {
                        text-align: right;
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 20px;
                    }
                    .student-info, .payment-info { 
                        background: #f9f9f9; 
                        padding: 20px; 
                        margin: 20px 0; 
                        border-radius: 8px; 
                        border-left: 4px solid #dc2626;
                    }
                    .info-title { 
                        font-weight: bold; 
                        color: #dc2626; 
                        margin-bottom: 15px; 
                        font-size: 16px; 
                        text-decoration: underline;
                    }
                    .info-row { 
                        display: flex; 
                        justify-content: space-between; 
                        margin: 8px 0; 
                        padding: 5px 0;
                        border-bottom: 1px dotted #ccc;
                    }
                    .info-label { 
                        font-weight: bold; 
                        color: #333; 
                    }
                    .info-value { 
                        color: #666; 
                    }
                    .amount-section {
                        background: #fff;
                        border: 2px solid #dc2626;
                        padding: 20px;
                        margin: 25px 0;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .amount-title {
                        font-size: 18px;
                        font-weight: bold;
                        color: #dc2626;
                        margin-bottom: 15px;
                    }
                    .amount-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #dc2626;
                        margin: 10px 0;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        border-top: 1px solid #ccc;
                        padding-top: 20px;
                    }
                    .signature-section {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 50px;
                        padding: 20px 0;
                    }
                    .signature-box {
                        text-align: center;
                        width: 200px;
                    }
                    .signature-line {
                        border-bottom: 1px solid #333;
                        margin: 40px 0 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="company-name">JODA COMPANY</h1>
                    <div class="company-info">
                        Agence de Voyage - Bourses d'Études en Chine<br>
                        BP : 7352 Yaoundé, N° Cont : P116012206442N<br>
                        Tel : (+237) 674 94 44 17 / 699 01 56 81<br>
                        Email: jodacompany@yahoo.com
                    </div>
                </div>
                
                <div class="receipt-number">
                    <strong>Reçu N° : ${payment.id.toUpperCase()}</strong><br>
                    Date : ${new Date().toLocaleDateString('fr-FR')}
                </div>
                
                <h2 class="receipt-title">REÇU DE PAIEMENT</h2>
                
                <div class="student-info">
                    <div class="info-title">INFORMATIONS ÉTUDIANT</div>
                    <div class="info-row">
                        <span class="info-label">Nom complet :</span>
                        <span class="info-value">${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email :</span>
                        <span class="info-value">${sanitizeForHtml(student.email)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Téléphone :</span>
                        <span class="info-value">${sanitizeForHtml(student.telephone)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Niveau d'étude :</span>
                        <span class="info-value">${sanitizeForHtml(student.niveau)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Filière souhaitée :</span>
                        <span class="info-value">${sanitizeForHtml(student.filiere)}</span>
                    </div>
                </div>
                
                <div class="payment-info">
                    <div class="info-title">DÉTAILS DU PAIEMENT</div>
                    <div class="info-row">
                        <span class="info-label">Type de paiement :</span>
                        <span class="info-value">${getPaymentTypeLabel(payment.type)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date de paiement :</span>
                        <span class="info-value">${payment.dateValidation ? new Date(payment.dateValidation).toLocaleDateString('fr-FR') : 'En attente'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Mode de paiement :</span>
                        <span class="info-value">Virement bancaire / Espèces</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Validé par :</span>
                        <span class="info-value">${payment.validePar || 'En attente de validation'}</span>
                    </div>
                </div>
                
                <div class="amount-section">
                    <div class="amount-title">MONTANT PAYÉ</div>
                    <div class="amount-value">${formatPrice(payment.montant.toString())}</div>
                    <div style="font-size: 14px; color: #666; margin-top: 10px;">
                        (${numberToWords(payment.montant)} francs CFA)
                    </div>
                </div>
                
                <div class="signature-section">
                    <div class="signature-box">
                        <div>L'Étudiant</div>
                        <div class="signature-line"></div>
                        <div>${sanitizeForHtml(student.nom)} ${sanitizeForHtml(student.prenom)}</div>
                    </div>
                    <div class="signature-box">
                        <div>Joda Company</div>
                        <div class="signature-line"></div>
                        <div>Agent Responsable</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Merci de votre confiance !</strong></p>
                    <p>Ce reçu fait foi de paiement. Veuillez le conserver précieusement.</p>
                    <p>Pour toute réclamation, contactez-nous dans les 48h suivant la réception de ce reçu.</p>
                    <p style="margin-top: 20px; font-style: italic;">
                        Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                    </p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([receiptContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Recu_${student.nom}_${student.prenom}_${payment.type}_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getPaymentTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            "bourse_tranche1": "Bourse d'Études - Tranche 1 (Inscription)",
            "bourse_tranche2": "Bourse d'Études - Tranche 2 (Dépôt dossiers)",
            "bourse_tranche3": "Bourse d'Études - Tranche 3 (Admission)",
            "bourse_tranche4": "Bourse d'Études - Tranche 4 (Visa)",
            "cours_mandarin_inscription": "Cours de Mandarin - Inscription",
            "cours_mandarin_livre": "Cours de Mandarin - Livre",
            "cours_mandarin_tranche1": "Cours de Mandarin - Tranche 1",
            "cours_mandarin_tranche2": "Cours de Mandarin - Tranche 2",
            "cours_anglais_inscription": "Cours d'Anglais - Inscription",
            "cours_anglais_livre": "Cours d'Anglais - Livre",
            "cours_anglais_tranche1": "Cours d'Anglais - Tranche 1",
            "cours_anglais_tranche2": "Cours d'Anglais - Tranche 2"
        };
        return labels[type] || type;
    };

    const numberToWords = (num: number): string => {
        // Fonction simplifiée pour convertir les nombres en mots
        const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
        const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
        const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
        
        if (num === 0) return "zéro";
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            return tens[ten] + (unit > 0 ? "-" + units[unit] : "");
        }
        
        // Pour les grands nombres, retourner une version simplifiée
        if (num >= 1000000) {
            const millions = Math.floor(num / 1000000);
            const remainder = num % 1000000;
            return `${millions} million${millions > 1 ? 's' : ''}${remainder > 0 ? ' ' + numberToWords(remainder) : ''}`;
        }
        
        if (num >= 1000) {
            const thousands = Math.floor(num / 1000);
            const remainder = num % 1000;
            return `${numberToWords(thousands)} mille${remainder > 0 ? ' ' + numberToWords(remainder) : ''}`;
        }
        
        const hundreds = Math.floor(num / 100);
        const remainder = num % 100;
        return `${hundreds > 1 ? numberToWords(hundreds) + ' ' : ''}cent${hundreds > 1 ? 's' : ''}${remainder > 0 ? ' ' + numberToWords(remainder) : ''}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Générer le reçu de paiement</h3>
                
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        <strong>Étudiant :</strong> {sanitizeForHtml(`${student.nom} ${student.prenom}`)}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                        <strong>Type :</strong> {getPaymentTypeLabel(payment.type)}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                        <strong>Montant :</strong> {formatPrice(payment.montant.toString())}
                    </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => {
                            generatePDF();
                            onClose();
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Générer le reçu
                    </button>
                </div>
            </div>
        </div>
    );
}