"use client";

import { useState, useEffect } from "react";
import { saveData, loadFromFirebase } from "../utils/syncData";
import { useNotificationContext } from "../context/NotificationContext";
import { formatPrice } from "../utils/formatPrice";
import { useActivityLog } from "../context/ActivityLogContext";
import { useAuth } from "../context/AuthContext";

import { ScholarshipApplication, Student, University } from "../types/scholarship";

export default function ApplicationManagement() {
    const [showForm, setShowForm] = useState(false);
    const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotificationContext();
    const { addLog } = useActivityLog();
    const { user } = useAuth();
    

    const [formData, setFormData] = useState({
        studentId: '',
        studentName: '',
        universityCode: '',
        universityName: '',
        desiredProgram: '',
        studyLevel: 'Licence' as ScholarshipApplication['studyLevel'],
        languageLevel: 'HSK 3',
        scholarshipType: 'Complète' as ScholarshipApplication['scholarshipType'],
        applicationFee: '',
        documents: {
            passport: false,
            diploma: false,
            transcript: false,
            hskCertificate: false,
            recommendationLetter: false,
            personalStatement: false
        }
    });

    const generateApplicationId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `APP${timestamp}${random}`;
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [applicationsData, studentsData, universitiesData] = await Promise.all([
                loadFromFirebase('applications'),
                loadFromFirebase('students'),
                loadFromFirebase('universities')
            ]);

            setApplications(Array.isArray(applicationsData) ? applicationsData : []);
            setStudents(Array.isArray(studentsData) ? studentsData : []);
            setUniversities(Array.isArray(universitiesData) ? universitiesData : []);
        } catch (error) {
            console.warn('Erreur chargement données:', error);
            setApplications([]);
            setStudents([]);
            setUniversities([]);
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

    const handleSaveApplication = async () => {
        if (!formData.studentId || !formData.universityCode || !formData.desiredProgram) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
            return;
        }

        try {
            const selectedStudent = students.find(s => s.id === formData.studentId);
            const selectedUniversity = universities.find(u => u.code === formData.universityCode);

            if (!selectedStudent || !selectedUniversity) {
                showNotification("Étudiant ou université introuvable", "error");
                return;
            }

            const applicationData: ScholarshipApplication = {
                id: generateApplicationId(),
                studentId: formData.studentId,
                studentName: selectedStudent.name,
                universityCode: formData.universityCode,
                universityName: selectedUniversity.name,
                desiredProgram: formData.desiredProgram,
                studyLevel: formData.studyLevel,
                languageLevel: formData.languageLevel,
                scholarshipType: formData.scholarshipType,
                applicationFee: formData.applicationFee || selectedUniversity.applicationFee,
                applicationDate: new Date().toISOString().split('T')[0],
                status: 'En attente',
                documents: formData.documents,
                createdBy: user?.username || 'system'
            };

            await saveData('applications', applicationData);
            addLog('Création candidature', 'applications', `Candidature créée: ${selectedStudent.name} -> ${selectedUniversity.name}`, applicationData);
            window.dispatchEvent(new Event('dashboardUpdate'));
            showNotification("Candidature enregistrée avec succès!", "success");
            
            setShowForm(false);
            setFormData({
                studentId: '', studentName: '', universityCode: '', universityName: '', desiredProgram: '',
                studyLevel: 'Licence', languageLevel: 'HSK 3', scholarshipType: 'Complète', applicationFee: '',
                documents: { passport: false, diploma: false, transcript: false, hskCertificate: false, recommendationLetter: false, personalStatement: false }
            });
            await loadData();
        } catch (error) {
            showNotification("Erreur lors de l'enregistrement", "error");
        }
    };

    const updateApplicationStatus = async (applicationId: string, newStatus: ScholarshipApplication['status']) => {
        const application = applications.find(app => app.id === applicationId);
        if (!application) return;

        const updatedApplication = { ...application, status: newStatus };
        const updatedApplications = applications.map(app => 
            app.id === applicationId ? updatedApplication : app
        );

        setApplications(updatedApplications);
        
        try {
            await saveData('applications', updatedApplication);
            addLog('Changement statut candidature', 'applications', `${application.studentName}: ${newStatus}`);
            window.dispatchEvent(new Event('dashboardUpdate'));
            showNotification(`Statut mis à jour: ${newStatus}`, "success");
        } catch (error) {
            console.warn('Erreur sauvegarde:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des candidatures...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Gestion des Candidatures de Bourses
            </h1>
            
            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <button 
                    onClick={() => setShowForm(true)}
                    style={{backgroundColor: '#dc2626'}} 
                    className="text-gray-300 px-4 py-3 sm:py-2 rounded hover:bg-opacity-80 font-medium"
                >
                    Nouvelle Candidature
                </button>
            </div>
            
            {showForm && (
                <div className="bg-gray-50 border rounded p-4 sm:p-6 mb-4" style={{borderColor: '#dc2626'}}>
                    <h3 className="font-bold mb-4 sm:mb-6 text-lg sm:text-xl" style={{color: '#dc2626'}}>
                        Nouvelle Candidature de Bourse
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                                Étudiant *
                            </label>
                            <select
                                value={formData.studentId}
                                onChange={(e) => {
                                    const selectedStudent = students.find(s => s.id === e.target.value);
                                    setFormData({
                                        ...formData, 
                                        studentId: e.target.value,
                                        studentName: selectedStudent?.name || ''
                                    });
                                }}
                                className="w-full p-3 border rounded-lg"
                                style={{borderColor: '#dc2626'}}
                            >
                                <option value="">Sélectionner un étudiant</option>
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} ({student.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                                Université *
                            </label>
                            <select
                                value={formData.universityCode}
                                onChange={(e) => {
                                    const selectedUniversity = universities.find(u => u.code === e.target.value);
                                    setFormData({
                                        ...formData, 
                                        universityCode: e.target.value,
                                        universityName: selectedUniversity?.name || '',
                                        applicationFee: selectedUniversity?.applicationFee || ''
                                    });
                                }}
                                className="w-full p-3 border rounded-lg"
                                style={{borderColor: '#dc2626'}}
                            >
                                <option value="">Sélectionner une université</option>
                                {universities.filter(uni => uni.status === 'Disponible').map(university => (
                                    <option key={university.id} value={university.code}>
                                        {university.name} ({university.code}) - {formatPrice(university.applicationFee)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <input 
                            placeholder="Programme souhaité *" 
                            value={formData.desiredProgram}
                            onChange={(e) => setFormData({...formData, desiredProgram: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />

                        <select
                            value={formData.studyLevel}
                            onChange={(e) => setFormData({...formData, studyLevel: e.target.value as ScholarshipApplication['studyLevel']})}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="Licence">Licence</option>
                            <option value="Master">Master</option>
                            <option value="Doctorat">Doctorat</option>
                        </select>

                        <select
                            value={formData.languageLevel}
                            onChange={(e) => setFormData({...formData, languageLevel: e.target.value})}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="Débutant">Débutant</option>
                            <option value="HSK 1">HSK 1</option>
                            <option value="HSK 2">HSK 2</option>
                            <option value="HSK 3">HSK 3</option>
                            <option value="HSK 4">HSK 4</option>
                            <option value="HSK 5">HSK 5</option>
                            <option value="HSK 6">HSK 6</option>
                        </select>

                        <select
                            value={formData.scholarshipType}
                            onChange={(e) => setFormData({...formData, scholarshipType: e.target.value as ScholarshipApplication['scholarshipType']})}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="Complète">Bourse complète</option>
                            <option value="Partielle">Bourse partielle</option>
                            <option value="Aucune">Aucune bourse</option>
                        </select>
                    </div>

                    {/* Documents requis */}
                    <div className="mb-6">
                        <h4 className="font-semibold mb-3 text-base" style={{color: '#dc2626'}}>
                            Documents fournis
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(formData.documents).map(([key, value]) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={value}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            documents: {
                                                ...formData.documents,
                                                [key]: e.target.checked
                                            }
                                        })}
                                        className="rounded"
                                    />
                                    <span className="text-sm">
                                        {key === 'passport' ? 'Passeport' :
                                         key === 'diploma' ? 'Diplôme' :
                                         key === 'transcript' ? 'Relevés' :
                                         key === 'hskCertificate' ? 'Certificat HSK' :
                                         key === 'recommendationLetter' ? 'Lettre recommandation' :
                                         'Lettre motivation'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleSaveApplication}
                            style={{backgroundColor: '#dc2626'}} 
                            className="text-gray-300 px-6 py-3 rounded hover:opacity-80 transition-opacity font-medium"
                        >
                            Enregistrer
                        </button>
                        <button 
                            onClick={() => {
                                setShowForm(false);
                                setFormData({
                                    studentId: '', studentName: '', universityCode: '', universityName: '', desiredProgram: '',
                                    studyLevel: 'Licence', languageLevel: 'HSK 3', scholarshipType: 'Complète', applicationFee: '',
                                    documents: { passport: false, diploma: false, transcript: false, hskCertificate: false, recommendationLetter: false, personalStatement: false }
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
                            Liste des Candidatures
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                {applications.length} candidature(s)
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
                    {applications.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-slate-500 text-base sm:text-lg font-medium">Aucune candidature pour le moment</p>
                            <p className="text-slate-400 text-sm mt-1">Les candidatures apparaîtront ici après leur création</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {applications.map((application) => (
                                <div key={application.id} className="bg-gradient-to-br from-white to-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: '#f3f4f6'}}>
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <select
                                            value={application.status}
                                            onChange={(e) => updateApplicationStatus(application.id, e.target.value as ScholarshipApplication['status'])}
                                            className={`text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border-0 cursor-pointer ${
                                                application.status === 'Acceptée' ? 'bg-green-100 text-green-800' :
                                                application.status === 'En cours' ? 'bg-blue-100 text-blue-800' :
                                                application.status === 'Refusée' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            <option value="En attente">En attente</option>
                                            <option value="En cours">En cours</option>
                                            <option value="Acceptée">Acceptée</option>
                                            <option value="Refusée">Refusée</option>
                                        </select>
                                    </div>
                                    
                                    <h3 className="font-semibold text-slate-800 text-base sm:text-lg mb-2">
                                        {application.studentName}
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-3">
                                        {application.universityName} ({application.universityCode})
                                    </p>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Programme:</span>
                                            <span className="font-medium">{application.desiredProgram}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Niveau:</span>
                                            <span className="font-medium">{application.studyLevel}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Chinois:</span>
                                            <span className="font-medium">{application.languageLevel}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Bourse:</span>
                                            <span className="font-medium">{application.scholarshipType}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-3 border-t border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600">Frais candidature</span>
                                            <span className="text-base sm:text-lg font-bold" style={{color: '#dc2626'}}>
                                                {formatPrice(application.applicationFee)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}