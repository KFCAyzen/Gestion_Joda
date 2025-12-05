"use client";

import { useState, useEffect } from 'react';
import { User } from '../context/AuthContext';
import { loadFromFirebase, saveData } from '../utils/syncData';
import StudentNotifications from './StudentNotifications';

interface StudentPortalProps {
    user: User;
    onLogout: () => void;
}

interface Application {
    id: string;
    studentId: string;
    universityName: string;
    program: string;
    status: string;
    submittedDate: string;
    lastUpdate: string;
}

interface Payment {
    id: string;
    studentId: string;
    amount: number;
    status: string;
    date: string;
    description: string;
}

interface Document {
    id: string;
    studentId: string;
    name: string;
    type: string;
    uploadDate: string;
    status: string;
    file?: string;
}

interface StudentFile {
    id: string;
    studentId: string;
    completionRate: number;
    missingDocuments: string[];
    status: string;
}

interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: string;
    icon: string;
}

interface Subscription {
    id: string;
    studentId: string;
    serviceId: string;
    serviceName: string;
    status: string;
    startDate: string;
    price: number;
}

export default function StudentPortal({ user, onLogout }: StudentPortalProps) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [studentFile, setStudentFile] = useState<StudentFile | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [currentView, setCurrentView] = useState('dashboard');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [pendingService, setPendingService] = useState<Service | null>(null);
    const [profileData, setProfileData] = useState({
        phone: '',
        address: '',
        dateOfBirth: '',
        nationality: '',
        parentName: '',
        parentPhone: '',
        education: ''
    });
    const [uploadedDocs, setUploadedDocs] = useState<{[key: string]: File | null}>({
        passport: null,
        diploma: null,
        transcript: null,
        photo: null,
        motivation: null,
        cv: null
    });
    const [employeeReceipts, setEmployeeReceipts] = useState<any[]>([]);
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);

    const availableServices: Service[] = [
        {
            id: '1',
            name: 'Cours de Mandarin',
            description: 'Cours intensifs de chinois mandarin avec professeurs natifs - Paiement en 2 tranches',
            price: 110000,
            duration: '3 mois',
            icon: 'language'
        },
        {
            id: '2',
            name: 'Cours d\'Anglais',
            description: 'Cours intensifs d\'anglais avec professeurs qualifiés - Paiement en 2 tranches',
            price: 80000,
            duration: '3 mois',
            icon: 'english'
        },
        {
            id: '3',
            name: 'Procédure de Bourse',
            description: 'Accompagnement complet pour votre demande de bourse - Paiement en 3 tranches',
            price: 2990000,
            duration: 'Jusqu\'à obtention visa',
            icon: 'scholarship'
        },
        {
            id: '4',
            name: 'Combo Complet',
            description: 'Cours de Mandarin + Procédure de Bourse - Tarif avantageux',
            price: 2800000,
            duration: 'Jusqu\'à obtention visa',
            icon: 'combo'
        }
    ];

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const allApplications = JSON.parse(localStorage.getItem('reservations') || '[]');
            const studentApps = allApplications.filter((app: any) => app.studentId === user.id);
            setApplications(studentApps);

            const allPayments = JSON.parse(localStorage.getItem('billings') || '[]');
            const studentPayments = allPayments.filter((pay: any) => pay.studentId === user.id);
            setPayments(studentPayments);

            const allDocuments = JSON.parse(localStorage.getItem('studentDocuments') || '[]');
            const studentDocs = allDocuments.filter((doc: any) => doc.studentId === user.id);
            setDocuments(studentDocs);

            const allFiles = JSON.parse(localStorage.getItem('dossiers') || '[]');
            const studentFileData = allFiles.find((file: any) => file.studentId === user.id);
            setStudentFile(studentFileData || null);

            const allSubscriptions = JSON.parse(localStorage.getItem('studentSubscriptions') || '[]');
            const studentSubs = allSubscriptions.filter((sub: any) => sub.studentId === user.id);
            setSubscriptions(studentSubs);
        }
        loadEmployeeReceipts();
        loadServiceRequests();
    }, [user.id]);

    const loadEmployeeReceipts = async () => {
        try {
            const fees = await loadFromFirebase('applicationFees');
            if (Array.isArray(fees) && user?.name) {
                setEmployeeReceipts(fees.filter((f: any) => f.receivedFrom === user.name));
            }
        } catch (error) {
            console.warn('Erreur chargement reçus:', error);
        }
    };

    const loadServiceRequests = async () => {
        try {
            const requests = await loadFromFirebase('serviceRequests');
            if (Array.isArray(requests) && user?.id) {
                setServiceRequests(requests.filter((r: any) => r.studentId === user.id));
            }
        } catch (error) {
            console.warn('Erreur chargement demandes:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Acceptée': return 'bg-green-100 text-green-700';
            case 'En cours': return 'bg-blue-100 text-blue-700';
            case 'En attente': return 'bg-yellow-100 text-yellow-700';
            case 'Refusée': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch(status) {
            case 'Payé': return 'bg-green-100 text-green-700';
            case 'En attente': return 'bg-yellow-100 text-yellow-700';
            case 'Échoué': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingDoc(true);
        
        const reader = new FileReader();
        reader.onload = () => {
            const newDoc: Document = {
                id: Date.now().toString(),
                studentId: user.id,
                name: file.name,
                type: docType,
                uploadDate: new Date().toLocaleDateString('fr-FR'),
                status: 'En attente de validation',
                file: reader.result as string
            };

            const allDocs = JSON.parse(localStorage.getItem('studentDocuments') || '[]');
            allDocs.push(newDoc);
            localStorage.setItem('studentDocuments', JSON.stringify(allDocs));
            setDocuments([...documents, newDoc]);
            setUploadingDoc(false);
        };
        reader.readAsDataURL(file);
    };

    const calculateSolvency = () => {
        const totalDue = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalPaid = payments.filter(p => p.status === 'Payé').reduce((sum, p) => sum + p.amount, 0);
        return totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;
    };

    const checkProfileComplete = () => {
        if (typeof window !== 'undefined') {
            const students = JSON.parse(localStorage.getItem('clients') || '[]');
            const studentProfile = students.find((s: any) => s.id === user.id || s.username === user.username);
            return studentProfile && studentProfile.phone && studentProfile.address;
        }
        return false;
    };

    const handleSubscribe = (service: Service) => {
        if (!checkProfileComplete()) {
            setPendingService(service);
            setShowProfileForm(true);
            return;
        }
        processSubscription(service);
    };

    const handleDocUpload = (docType: string, file: File) => {
        setUploadedDocs(prev => ({ ...prev, [docType]: file }));
    };

    const handleProfileSubmit = async () => {
        if (typeof window !== 'undefined') {
            const students = JSON.parse(localStorage.getItem('clients') || '[]');
            const existingIndex = students.findIndex((s: any) => s.id === user.id || s.username === user.username);
            
            const studentData = {
                id: user.id,
                name: user.name,
                username: user.username,
                email: (user as any).email || '',
                ...profileData,
                registrationDate: new Date().toLocaleDateString('fr-FR')
            };

            if (existingIndex >= 0) {
                students[existingIndex] = { ...students[existingIndex], ...studentData };
            } else {
                students.push(studentData);
            }

            localStorage.setItem('clients', JSON.stringify(students));

            // Upload documents if service is scholarship-related
            if (pendingService && (pendingService.id === '3' || pendingService.id === '4')) {
                const allDocs = JSON.parse(localStorage.getItem('studentDocuments') || '[]');
                const docTypes = {
                    passport: 'Passeport',
                    diploma: 'Diplôme',
                    transcript: 'Relevé de notes',
                    photo: 'Photo d\'identité',
                    motivation: 'Lettre de motivation',
                    cv: 'CV'
                };

                for (const [key, file] of Object.entries(uploadedDocs)) {
                    if (file) {
                        const reader = new FileReader();
                        await new Promise((resolve) => {
                            reader.onload = () => {
                                const newDoc: Document = {
                                    id: `${Date.now()}-${key}`,
                                    studentId: user.id,
                                    name: file.name,
                                    type: docTypes[key as keyof typeof docTypes],
                                    uploadDate: new Date().toLocaleDateString('fr-FR'),
                                    status: 'En attente de validation',
                                    file: reader.result as string
                                };
                                allDocs.push(newDoc);
                                resolve(true);
                            };
                            reader.readAsDataURL(file);
                        });
                    }
                }
                localStorage.setItem('studentDocuments', JSON.stringify(allDocs));
                setDocuments(allDocs.filter((d: any) => d.studentId === user.id));
            }

            setShowProfileForm(false);
            
            if (pendingService) {
                processSubscription(pendingService);
                setPendingService(null);
            }
        }
    };

    const processSubscription = async (service: Service) => {
        const newSubscription: Subscription = {
            id: Date.now().toString(),
            studentId: user.id,
            serviceId: service.id,
            serviceName: service.name,
            status: 'En attente de validation',
            startDate: new Date().toLocaleDateString('fr-FR'),
            price: service.price
        };

        await saveData('serviceRequests', {
            ...newSubscription,
            studentName: user.name,
            studentEmail: (user as any).email || '',
            requestDate: new Date().toISOString(),
            processedBy: null,
            processedDate: null
        });

        const allSubs = JSON.parse(localStorage.getItem('studentSubscriptions') || '[]');
        allSubs.push(newSubscription);
        localStorage.setItem('studentSubscriptions', JSON.stringify(allSubs));
        setSubscriptions([...subscriptions, newSubscription]);

        let paymentTranches: {amount: number, description: string}[] = [];

        if (service.id === '1') {
            paymentTranches = [
                { amount: 10000, description: `${service.name} - Inscription` },
                { amount: 50000, description: `${service.name} - Tranche 1` },
                { amount: 50000, description: `${service.name} - Tranche 2` }
            ];
        } else if (service.id === '2') {
            paymentTranches = [
                { amount: 10000, description: `${service.name} - Inscription` },
                { amount: 30000, description: `${service.name} - Tranche 1` },
                { amount: 40000, description: `${service.name} - Tranche 2` }
            ];
        } else if (service.id === '3') {
            paymentTranches = [
                { amount: 100000, description: `${service.name} - Inscription` },
                { amount: 500000, description: `${service.name} - Dépôt de dossier` },
                { amount: 1000000, description: `${service.name} - Après Admission` },
                { amount: 1390000, description: `${service.name} - Après obtention visa` }
            ];
        } else if (service.id === '4') {
            paymentTranches = [
                { amount: 100000, description: `${service.name} - Inscription` },
                { amount: 500000, description: `${service.name} - Dépôt de dossier` },
                { amount: 1000000, description: `${service.name} - Après Admission` },
                { amount: 1200000, description: `${service.name} - Après obtention visa` }
            ];
        }

        const allPayments = JSON.parse(localStorage.getItem('billings') || '[]');
        paymentTranches.forEach((tranche, index) => {
            const newPayment: Payment = {
                id: `${Date.now()}-${index}`,
                studentId: user.id,
                amount: tranche.amount,
                status: index === 0 ? 'En attente' : 'Non exigible',
                date: new Date().toLocaleDateString('fr-FR'),
                description: tranche.description
            };
            allPayments.push(newPayment);
        });

        localStorage.setItem('billings', JSON.stringify(allPayments));
        setPayments(allPayments.filter((p: any) => p.studentId === user.id));
        alert(`Demande envoyée ! Un employé traitera votre souscription prochainement.`);
    };

    const isSubscribed = (serviceId: string) => {
        return subscriptions.some(sub => sub.serviceId === serviceId && sub.status !== 'Annulé');
    };

    const generateReceipt = (payment: Payment) => {
        const receiptContent = `
            JODA COMPANY
            Agence de Voyage - Bourses d'Études en Chine
            ============================================
            
            REÇU DE PAIEMENT
            
            Date: ${payment.date}
            Reçu N°: ${payment.id}
            
            ============================================
            
            Étudiant: ${user.name}
            ID Étudiant: ${user.id}
            
            Description: ${payment.description}
            Montant: ${payment.amount.toLocaleString()} FCFA
            Statut: ${payment.status}
            
            ============================================
            
            Merci pour votre confiance!
            
            Pour toute question, contactez-nous:
            Email: contact@jodacompany.com
            Tél: +237 XXX XXX XXX
        `;
        
        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Recu_${payment.id}_${user.name.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center gap-2">
                            <img src="/0.png" alt="Joda Company" className="w-10 h-10 sm:w-12 sm:h-12" />
                            <div>
                                <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Portail Étudiant</h1>
                                <p className="text-xs sm:text-xs sm:text-sm text-gray-500">Bienvenue, {user.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            <button
                                onClick={() => setCurrentView('notifications')}
                                className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 transition-colors relative"
                                title="Notifications"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </button>
                            <button
                                onClick={onLogout}
                                className="p-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md sm:rounded-lg hover:bg-red-700 transition-colors"
                                title="Déconnexion"
                            >
                                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="hidden sm:inline text-sm">Déconnexion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 md:py-8">
                {currentView === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                            <div className="bg-white rounded-lg sm:rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-600">Candidatures</p>
                                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{applications.length}</p>
                                    </div>
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-600">Acceptées</p>
                                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{applications.filter(a => a.status === 'Acceptée').length}</p>
                                    </div>
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-600">Solvabilité</p>
                                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{calculateSolvency()}%</p>
                                    </div>
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-600">Dossier</p>
                                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{studentFile?.completionRate || 0}%</p>
                                    </div>
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg sm:rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200 mb-4 sm:mb-6">
                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">Avancement du dossier</h3>
                            <div className="space-y-1.5 sm:space-y-2 md:space-y-3 md:space-y-2 sm:space-y-3 md:space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                                        <span className="text-gray-600">Progression</span>
                                        <span className="font-semibold text-gray-900">{studentFile?.completionRate || 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                                        <div 
                                            className="bg-gradient-to-r from-red-500 to-red-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${studentFile?.completionRate || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                    <span className="text-xs sm:text-sm text-gray-600">Statut du dossier</span>
                                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getStatusColor(studentFile?.status || 'En attente')}`}>
                                        {studentFile?.status || 'En attente'}
                                    </span>
                                </div>
                                {studentFile?.missingDocuments && studentFile.missingDocuments.length > 0 && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm font-semibold text-yellow-800 mb-2">Documents manquants:</p>
                                        <ul className="text-sm text-yellow-700 space-y-1">
                                            {studentFile.missingDocuments.map((doc, idx) => (
                                                <li key={idx}>• {doc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Mes Candidatures</h3>
                                    <button onClick={() => setCurrentView('applications')} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {applications.length === 0 ? (
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">Aucune candidature pour le moment</p>
                                    ) : (
                                        applications.slice(0, 3).map(app => (
                                            <div key={app.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{app.universityName}</p>
                                                    <p className="text-xs sm:text-xs sm:text-sm text-gray-500">{app.program}</p>
                                                </div>
                                                <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getStatusColor(app.status)}`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Paiements Récents</h3>
                                    <button onClick={() => setCurrentView('payments')} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {payments.length === 0 ? (
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">Aucun paiement enregistré</p>
                                    ) : (
                                        payments.slice(0, 3).map(pay => (
                                            <div key={pay.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{pay.description}</p>
                                                    <p className="text-xs sm:text-xs sm:text-sm text-gray-500">{pay.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{pay.amount}€</p>
                                                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getPaymentStatusColor(pay.status)}`}>
                                                        {pay.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Documents</h3>
                                    <button onClick={() => setCurrentView('documents')} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {documents.length === 0 ? (
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">Aucun document uploadé</p>
                                    ) : (
                                        documents.slice(0, 3).map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{doc.type}</p>
                                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500">{doc.uploadDate}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{doc.status}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Mes Services</h3>
                                    <button onClick={() => setCurrentView('services')} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {subscriptions.length === 0 ? (
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">Aucun service souscrit</p>
                                    ) : (
                                        subscriptions.slice(0, 2).map(sub => (
                                            <div key={sub.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{sub.serviceName}</p>
                                                    <p className="text-xs sm:text-xs sm:text-sm text-gray-500">{sub.startDate}</p>
                                                </div>
                                                <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getPaymentStatusColor(sub.status)}`}>
                                                    {sub.status}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Reçus Officiels</h3>
                                    <button onClick={() => setCurrentView('receipts')} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {employeeReceipts.length === 0 ? (
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">Aucun reçu disponible</p>
                                    ) : (
                                        employeeReceipts.slice(0, 2).map(receipt => (
                                            <div key={receipt.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Reçu {receipt.id}</p>
                                                    <p className="text-xs sm:text-xs sm:text-sm text-gray-500">{new Date(receipt.date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                                <span className="text-sm font-semibold text-red-600">{parseInt(receipt.amount).toLocaleString()} FCFA</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-4 sm:p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Mes Demandes</h3>
                                    <button onClick={() => setCurrentView('requests')} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {serviceRequests.length === 0 ? (
                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">Aucune demande</p>
                                    ) : (
                                        serviceRequests.slice(0, 2).map(req => (
                                            <div key={req.id} className="p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{req.serviceName}</p>
                                                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getPaymentStatusColor(req.status)}`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                                {req.note && <p className="text-xs text-gray-600 mt-1">📝 {req.note}</p>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {currentView === 'applications' && (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Toutes mes candidatures</h3>
                                <button onClick={() => setCurrentView('dashboard')} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {applications.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-14 sm:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm sm:text-base text-gray-500">Aucune candidature pour le moment</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 md:space-y-2 sm:space-y-3 md:space-y-4">
                                    {applications.map(app => (
                                        <div key={app.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">{app.universityName}</h4>
                                                    <p className="text-xs sm:text-sm text-gray-600">{app.program}</p>
                                                </div>
                                                <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getStatusColor(app.status)}`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-sm sm:text-base text-gray-500">Date de soumission</p>
                                                    <p className="text-gray-900 font-medium">{app.submittedDate}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm sm:text-base text-gray-500">Dernière mise à jour</p>
                                                    <p className="text-gray-900 font-medium">{app.lastUpdate}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'payments' && (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Historique des paiements</h3>
                                <button onClick={() => setCurrentView('dashboard')} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {payments.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-14 sm:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-sm sm:text-base text-gray-500">Aucun paiement enregistré</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 md:space-y-2 sm:space-y-3 md:space-y-4">
                                    {payments.map(pay => (
                                        <div key={pay.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">{pay.description}</h4>
                                                    <p className="text-xs sm:text-sm text-gray-600">{pay.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{pay.amount.toLocaleString()} FCFA</p>
                                                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(pay.status)}`}>
                                                        {pay.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {pay.status === 'Payé' && (
                                                <button
                                                    onClick={() => generateReceipt(pay)}
                                                    className="w-full mt-3 px-3 sm:px-4 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Télécharger le reçu
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'documents' && (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Gestion des documents</h3>
                                <button onClick={() => setCurrentView('dashboard')} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="text-sm font-semibold text-blue-900 mb-3">Documents requis</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Passeport', 'Diplôme', 'Relevé de notes', 'Photo d\'identité', 'Lettre de motivation', 'CV'].map(docType => (
                                        <div key={docType} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                            <span className="text-xs sm:text-sm text-gray-700">{docType}</span>
                                            <label className="cursor-pointer">
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    onChange={(e) => handleFileUpload(e, docType)}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                />
                                                <span className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs bg-red-600 text-white rounded-md sm:rounded-lg hover:bg-red-700 transition-colors">
                                                    {documents.find(d => d.type === docType) ? 'Remplacer' : 'Upload'}
                                                </span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Documents uploadés</h4>
                            {documents.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-14 sm:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm sm:text-base text-gray-500">Aucun document uploadé</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-semibold text-gray-900">{doc.type}</p>
                                                        <p className="text-xs sm:text-xs sm:text-sm text-gray-500">{doc.name} • {doc.uploadDate}</p>
                                                    </div>
                                                </div>
                                                <span className="px-1.5 sm:px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                                    {doc.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'receipts' && (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Mes Reçus Officiels</h3>
                                <button onClick={() => setCurrentView('dashboard')} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {employeeReceipts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-14 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm sm:text-base text-gray-500">Aucun reçu disponible</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 md:space-y-2 sm:space-y-3 md:space-y-4">
                                    {employeeReceipts.map((receipt) => (
                                        <div key={receipt.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">Reçu N° {receipt.id}</h4>
                                                    <p className="text-sm text-sm sm:text-base text-gray-500">Date: {new Date(receipt.date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                    {receipt.motif}
                                                </span>
                                            </div>
                                            <div className="space-y-2 mb-2 sm:mb-3 md:mb-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Montant:</span>
                                                    <span className="font-bold text-red-600">{parseInt(receipt.amount).toLocaleString()} FCFA</span>
                                                </div>
                                                {receipt.universityName && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Université:</span>
                                                        <span className="font-medium">{receipt.universityName}</span>
                                                    </div>
                                                )}
                                                {receipt.program && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Programme:</span>
                                                        <span className="font-medium">{receipt.program}</span>
                                                    </div>
                                                )}
                                                {receipt.installmentNumber && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Tranche:</span>
                                                        <span className="font-medium">{receipt.installmentNumber}/3</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const content = `
═══════════════════════════════════════════════════════
              JODA COMPANY - REÇU DE PAIEMENT
        Agence de Bourses d'Études en Chine
═══════════════════════════════════════════════════════

REÇU N°: ${receipt.id}
DATE: ${new Date(receipt.date).toLocaleDateString('fr-FR')}

───────────────────────────────────────────────────────
INFORMATIONS ÉTUDIANT
───────────────────────────────────────────────────────
Nom: ${receipt.receivedFrom}
${receipt.universityName ? `Université: ${receipt.universityName}` : ''}
${receipt.program ? `Programme: ${receipt.program}` : ''}

───────────────────────────────────────────────────────
DÉTAILS DU PAIEMENT
───────────────────────────────────────────────────────
Motif: ${receipt.motif}
Montant: ${parseInt(receipt.amount).toLocaleString()} FCFA
Montant en lettres: ${receipt.amountInWords}
${receipt.installmentNumber ? `Tranche: ${receipt.installmentNumber}/3` : ''}
${receipt.totalAmount ? `Montant total: ${parseInt(receipt.totalAmount).toLocaleString()} FCFA` : ''}

───────────────────────────────────────────────────────
Joda Company
Douala, Cameroun
Tél: +237 123 456 789
Email: contact@gestion-joda.cm
═══════════════════════════════════════════════════════
Document officiel généré le ${new Date().toLocaleDateString('fr-FR')}
═══════════════════════════════════════════════════════
                                                    `.trim();
                                                    const blob = new Blob([content], { type: 'text/plain' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `Recu_${receipt.id}_${receipt.receivedFrom.replace(/\\s+/g, '_')}.txt`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                }}
                                                className="w-full px-4 py-2 bg-red-600 text-white rounded-md sm:rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Télécharger le reçu
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'requests' && (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Mes demandes de services</h3>
                                <button onClick={() => setCurrentView('dashboard')} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {serviceRequests.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-14 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <p className="text-sm sm:text-base text-gray-500">Aucune demande</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 md:space-y-2 sm:space-y-3 md:space-y-4">
                                    {serviceRequests.map(req => (
                                        <div key={req.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">{req.serviceName}</h4>
                                                    <p className="text-sm text-sm sm:text-base text-gray-500">Demande du {new Date(req.requestDate).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                                <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="space-y-2 mb-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Prix:</span>
                                                    <span className="font-bold text-red-600">{req.price.toLocaleString()} FCFA</span>
                                                </div>
                                            </div>
                                            {req.note && (
                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <p className="text-xs font-semibold text-blue-900 mb-1">Réponse de l'agence:</p>
                                                    <p className="text-sm text-blue-800">{req.note}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'notifications' && (
                    <StudentNotifications />
                )}

                {currentView === 'services' && (
                    <div className="space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Services disponibles</h3>
                                <button onClick={() => setCurrentView('dashboard')} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                {availableServices.map(service => (
                                    <div key={service.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between mb-2 sm:mb-3 md:mb-4">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                                {service.icon === 'language' && (
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                    </svg>
                                                )}
                                                {service.icon === 'scholarship' && (
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                )}
                                                {service.icon === 'english' && (
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                    </svg>
                                                )}
                                                {service.icon === 'combo' && (
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg sm:text-xl font-bold text-red-600">{service.price.toLocaleString()}</span>
                                                <span className="text-xs sm:text-sm text-gray-600 ml-1">FCFA</span>
                                            </div>
                                        </div>
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{service.name}</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mb-3">{service.description}</p>
                                        {service.id === '1' && (
                                            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                                <div>• Inscription: 10 000 FCFA</div>
                                                <div>• Tranche 1: 50 000 FCFA</div>
                                                <div>• Tranche 2: 50 000 FCFA</div>
                                            </div>
                                        )}
                                        {service.id === '2' && (
                                            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                                <div>• Inscription: 10 000 FCFA</div>
                                                <div>• Tranche 1: 30 000 FCFA</div>
                                                <div>• Tranche 2: 40 000 FCFA</div>
                                            </div>
                                        )}
                                        {service.id === '3' && (
                                            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                                <div>• Inscription: 100 000 FCFA</div>
                                                <div>• Dépôt dossier: 500 000 FCFA</div>
                                                <div>• Après Admission: 1 000 000 FCFA</div>
                                                <div>• Après visa: 1 390 000 FCFA</div>
                                            </div>
                                        )}
                                        {service.id === '4' && (
                                            <div className="mb-3 p-2 bg-green-50 rounded text-xs text-green-700">
                                                <div className="font-semibold mb-1">✨ Économisez 300 000 FCFA !</div>
                                                <div>• Inscription: 100 000 FCFA</div>
                                                <div>• Dépôt dossier: 500 000 FCFA</div>
                                                <div>• Après Admission: 1 000 000 FCFA</div>
                                                <div>• Après visa: 1 200 000 FCFA</div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs sm:text-xs sm:text-sm text-gray-500">Durée: {service.duration}</span>
                                            <button
                                                onClick={() => handleSubscribe(service)}
                                                disabled={isSubscribed(service.id)}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md sm:rounded-lg transition-colors ${
                                                    isSubscribed(service.id)
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-red-600 text-white hover:bg-red-700'
                                                }`}
                                            >
                                                {isSubscribed(service.id) ? 'Déjà souscrit' : 'Souscrire'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">Mes souscriptions</h3>
                            {subscriptions.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-14 sm:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-sm sm:text-base text-gray-500">Aucune souscription active</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                                    {subscriptions.map(sub => (
                                        <div key={sub.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">{sub.serviceName}</h4>
                                                    <p className="text-xs sm:text-sm text-gray-600">Souscrit le {sub.startDate}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-gray-900">{sub.price.toLocaleString()} FCFA</p>
                                                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(sub.status)}`}>
                                                        {sub.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {showProfileForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-full sm:max-w-full sm:max-w-lg md:max-w-xl md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-4 sm:p-4 sm:p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">Complétez votre profil</h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">Veuillez remplir ces informations avant de souscrire</p>
                        </div>
                        <div className="p-6 space-y-1.5 sm:space-y-2 md:space-y-3 md:space-y-2 sm:space-y-3 md:space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:p-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                                    <input
                                        type="tel"
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance *</label>
                                    <input
                                        type="date"
                                        value={profileData.dateOfBirth}
                                        onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité *</label>
                                    <input
                                        type="text"
                                        value={profileData.nationality}
                                        onChange={(e) => setProfileData({...profileData, nationality: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'études *</label>
                                    <select
                                        value={profileData.education}
                                        onChange={(e) => setProfileData({...profileData, education: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        required
                                    >
                                        <option value="">Sélectionnez</option>
                                        <option value="Baccalauréat">Baccalauréat</option>
                                        <option value="Licence">Licence</option>
                                        <option value="Master">Master</option>
                                        <option value="Doctorat">Doctorat</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète *</label>
                                <textarea
                                    value={profileData.address}
                                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    rows={2}
                                    required
                                />
                            </div>
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Informations du parent/tuteur</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:p-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                                        <input
                                            type="text"
                                            value={profileData.parentName}
                                            onChange={(e) => setProfileData({...profileData, parentName: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                                        <input
                                            type="tel"
                                            value={profileData.parentPhone}
                                            onChange={(e) => setProfileData({...profileData, parentPhone: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {pendingService && (pendingService.id === '3' || pendingService.id === '4') && (
                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Documents requis pour la bourse</h4>
                                    <p className="text-xs text-gray-600 mb-3">Veuillez uploader les documents suivants (formats acceptés: PDF, JPG, PNG)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { key: 'passport', label: 'Passeport *' },
                                            { key: 'diploma', label: 'Diplôme *' },
                                            { key: 'transcript', label: 'Relevé de notes *' },
                                            { key: 'photo', label: 'Photo d\'identité *' },
                                            { key: 'motivation', label: 'Lettre de motivation *' },
                                            { key: 'cv', label: 'CV *' }
                                        ].map(doc => (
                                            <div key={doc.key} className="border border-gray-200 rounded-lg p-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{doc.label}</label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleDocUpload(doc.key, file);
                                                    }}
                                                    className="w-full text-xs sm:text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                                />
                                                {uploadedDocs[doc.key as keyof typeof uploadedDocs] && (
                                                    <p className="text-xs text-green-600 mt-1">✓ {uploadedDocs[doc.key as keyof typeof uploadedDocs]?.name}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 sm:p-4 sm:p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowProfileForm(false);
                                    setPendingService(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleProfileSubmit}
                                disabled={
                                    !profileData.phone || 
                                    !profileData.address || 
                                    !profileData.parentName || 
                                    !profileData.parentPhone ||
                                    (pendingService && (pendingService.id === '3' || pendingService.id === '4') && 
                                        (!uploadedDocs.passport || !uploadedDocs.diploma || !uploadedDocs.transcript || 
                                         !uploadedDocs.photo || !uploadedDocs.motivation || !uploadedDocs.cv))
                                }
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md sm:rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Enregistrer et continuer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
