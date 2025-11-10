"use client";

import { useState, useEffect } from "react";
import { saveData, loadFromFirebase } from "../utils/syncData";
import { useNotificationContext } from "../context/NotificationContext";
import { useActivityLog } from "../context/ActivityLogContext";
import { useAuth } from "../context/AuthContext";
import ProgressiveLoader from "./ProgressiveLoader";

interface Student {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    currentEducation: string;
    nationality: string;
    birthPlace: string;
    birthDate: string;
    idNumber: string;
    idIssueDate: string;
    idIssuePlace: string;
    idExpiryDate: string;
    passportNumber: string;
    desiredUniversity: string;
    desiredProgram: string;
    studyLevel: string;
    languageLevel: string;
    gender: string;
    parentName: string;
    parentPhone: string;
    scholarshipType: string;
    applicationFee: string;
    applicationDate: string;
    status: string;
}

export default function StudentsPage() {
    const [showForm, setShowForm] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [searchId, setSearchId] = useState('');
    const [searchName, setSearchName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showSpinner, setShowSpinner] = useState(true);
    
    // Générateur d'ID unique
    const generateStudentId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `S${timestamp}${random}`;
    };

    const [formData, setFormData] = useState({
        name: '',
        phonePrefix: '+237',
        phone: '',
        email: '',
        address: '',
        currentEducation: '',
        nationality: '',
        birthPlace: '',
        birthDate: '',
        idNumber: '',
        idIssueDate: '',
        idIssuePlace: '',
        idExpiryDate: '',
        passportNumber: '',
        desiredUniversity: '',
        desiredProgram: '',
        studyLevel: 'Licence',
        languageLevel: 'Débutant',
        gender: '',
        parentName: '',
        parentPhone: '',
        scholarshipType: 'Complète',
        applicationFee: '',
        applicationDate: '',
        status: 'En attente'
    });

    const handleAddStudent = () => {
        setShowForm(true);
    };

    const loadStudents = async () => {
        if (students.length === 0) setIsLoading(true);
        try {
            let studentsData = JSON.parse(localStorage.getItem('clients') || '[]');
            
            if (!Array.isArray(studentsData) || studentsData.length === 0) {
                studentsData = await loadFromFirebase('clients');
                if (!Array.isArray(studentsData)) {
                    throw new Error('Invalid data format');
                }
            }
            
            setStudents(studentsData);
            setFilteredStudents(studentsData);
        } catch (error) {
            const localStudents = JSON.parse(localStorage.getItem('clients') || '[]');
            setStudents(localStudents);
            setFilteredStudents(localStudents);
        } finally {
            setIsLoading(false);
            setShowSpinner(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let debounceTimer: NodeJS.Timeout;
        
        const loadData = async () => {
            if (isMounted) {
                await loadStudents();
            }
        };
        
        const debouncedLoadData = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (isMounted) {
                    loadData();
                }
            }, 500);
        };
        
        loadData();
        
        const handleStorageChange = (event: StorageEvent) => {
            if (event.storageArea === localStorage && event.key && isMounted) {
                debouncedLoadData();
            }
        };
        
        const handleDataUpdate = () => {
            if (isMounted) {
                debouncedLoadData();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('dashboardUpdate', handleDataUpdate);
        window.addEventListener('dataChanged', handleDataUpdate);
        
        return () => {
            isMounted = false;
            clearTimeout(debounceTimer);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('dashboardUpdate', handleDataUpdate);
            window.removeEventListener('dataChanged', handleDataUpdate);
        };
    }, []);

    const { showNotification } = useNotificationContext();
    const { addLog } = useActivityLog();
    const { user } = useAuth();

    const handleSaveStudent = async () => {
        const requiredFields = [
            'name', 'phone', 'email', 'address', 'currentEducation', 'nationality', 
            'birthPlace', 'birthDate', 'idNumber', 'desiredUniversity', 'desiredProgram', 
            'studyLevel', 'languageLevel', 'gender', 'parentName', 'parentPhone', 'scholarshipType', 'applicationFee'
        ];
        
        const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
        
        if (missingFields.length > 0) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
            return;
        }

        try {
            const studentWithId = { 
                ...formData, 
                id: generateStudentId(),
                phone: `${formData.phonePrefix} ${formData.phone}`,
                applicationDate: new Date().toISOString().split('T')[0]
            };
            await saveData('clients', studentWithId);
            addLog('Création étudiant', 'clients', `Étudiant créé: ${formData.name}`, studentWithId);
            window.dispatchEvent(new Event('dashboardUpdate'));
            showNotification("Étudiant enregistré avec succès!", "success");
            
            setShowForm(false);
            setFormData({ 
                name: '', phonePrefix: '+237', phone: '', email: '', address: '', currentEducation: '', nationality: '', 
                birthPlace: '', birthDate: '', idNumber: '', idIssueDate: '', idIssuePlace: '',
                idExpiryDate: '', passportNumber: '', desiredUniversity: '', desiredProgram: '', studyLevel: 'Licence', 
                languageLevel: 'Débutant', gender: '', parentName: '', parentPhone: '', scholarshipType: 'Complète', applicationFee: '', applicationDate: '', status: 'En attente'
            });
            await loadStudents();
        } catch (error) {
            const newStudent = { 
                id: generateStudentId(), 
                ...formData,
                phone: `${formData.phonePrefix} ${formData.phone}`,
                applicationDate: new Date().toISOString().split('T')[0],
                createdBy: user?.username || 'system'
            };
            await saveData('clients', newStudent);
            const updatedStudents = await loadFromFirebase('clients');
            setStudents(updatedStudents);
            addLog('Création étudiant', 'clients', `Étudiant créé: ${formData.name}`, newStudent);
            window.dispatchEvent(new Event('dashboardUpdate'));
            showNotification("Étudiant enregistré localement!", "success");
            
            setShowForm(false);
            setFormData({ 
                name: '', phonePrefix: '+237', phone: '', email: '', address: '', currentEducation: '', nationality: '', 
                birthPlace: '', birthDate: '', idNumber: '', idIssueDate: '', idIssuePlace: '',
                idExpiryDate: '', passportNumber: '', desiredUniversity: '', desiredProgram: '', studyLevel: 'Licence', 
                languageLevel: 'Débutant', gender: '', parentName: '', parentPhone: '', scholarshipType: 'Complète', applicationFee: '', applicationDate: '', status: 'En attente'
            });
        }
    };

    if (showSpinner && students.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des étudiants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#7D3837'}}>Étudiants</h1>
            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <button 
                    onClick={handleAddStudent}
                    style={{backgroundColor: '#7D3837'}} 
                    className="text-yellow-300 px-4 py-3 sm:py-2 rounded hover:bg-opacity-80 font-medium"
                >
                    Nouvel Étudiant
                </button>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 max-w-2xl">
                    <input
                        type="text"
                        placeholder="Rechercher par ID étudiant..."
                        value={searchId}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchId(value);
                            const nameFilter = searchName.toLowerCase();
                            const idFilter = value.toLowerCase();
                            
                            if (value.trim() === '' && searchName.trim() === '') {
                                setFilteredStudents(students);
                            } else {
                                const filtered = students.filter(student => 
                                    (idFilter === '' || student.id.toLowerCase().includes(idFilter)) &&
                                    (nameFilter === '' || student.name.toLowerCase().includes(nameFilter))
                                );
                                setFilteredStudents(filtered);
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg"
                        style={{borderColor: '#7D3837'}}
                    />
                    <input
                        type="text"
                        placeholder="Rechercher par nom étudiant..."
                        value={searchName}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchName(value);
                            const nameFilter = value.toLowerCase();
                            const idFilter = searchId.toLowerCase();
                            
                            if (value.trim() === '' && searchId.trim() === '') {
                                setFilteredStudents(students);
                            } else {
                                const filtered = students.filter(student => 
                                    (idFilter === '' || student.id.toLowerCase().includes(idFilter)) &&
                                    (nameFilter === '' || student.name.toLowerCase().includes(nameFilter))
                                );
                                setFilteredStudents(filtered);
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg"
                        style={{borderColor: '#7D3837'}}
                    />
                </div>
            </div>
            
            {showForm && (
                <div className="bg-yellow-50 border rounded p-4 sm:p-6 mb-4" style={{borderColor: '#7D3837'}}>
                    <h3 className="font-bold mb-4 sm:mb-6 text-lg sm:text-xl" style={{color: '#7D3837'}}>Nouvel Étudiant</h3>
                    
                    {/* Informations personnelles */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#7D3837'}}>Informations personnelles</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <input 
                                placeholder="Nom complet *" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <div className="flex gap-2">
                                <select
                                    value={formData.phonePrefix}
                                    onChange={(e) => setFormData({...formData, phonePrefix: e.target.value})}
                                    className="p-3 border rounded-lg w-24"
                                    style={{borderColor: '#7D3837'}}
                                >
                                    <option value="+237">+237</option>
                                    <option value="+33">+33</option>
                                    <option value="+1">+1</option>
                                    <option value="+44">+44</option>
                                    <option value="+49">+49</option>
                                    <option value="+234">+234</option>
                                    <option value="+225">+225</option>
                                </select>
                                <input 
                                    placeholder="Téléphone *" 
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({...formData, phone: value});
                                    }}
                                    className="p-3 border rounded-lg flex-1" 
                                    style={{borderColor: '#7D3837'}} 
                                />
                            </div>
                            <input 
                                placeholder="Email *" 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <input 
                                placeholder="Formation actuelle *" 
                                value={formData.currentEducation}
                                onChange={(e) => setFormData({...formData, currentEducation: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                className="p-3 border rounded-lg"
                                style={{borderColor: '#7D3837'}}
                            >
                                <option value="">Sexe *</option>
                                <option value="Masculin">Masculin</option>
                                <option value="Féminin">Féminin</option>
                            </select>
                            <input 
                                placeholder="Nationalité *" 
                                value={formData.nationality}
                                onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                        </div>
                    </div>

                    {/* Informations académiques */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#7D3837'}}>Projet d'études en Chine</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <input 
                                placeholder="Université souhaitée *" 
                                value={formData.desiredUniversity}
                                onChange={(e) => setFormData({...formData, desiredUniversity: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <input 
                                placeholder="Programme souhaité *" 
                                value={formData.desiredProgram}
                                onChange={(e) => setFormData({...formData, desiredProgram: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <select
                                value={formData.studyLevel}
                                onChange={(e) => setFormData({...formData, studyLevel: e.target.value})}
                                className="p-3 border rounded-lg"
                                style={{borderColor: '#7D3837'}}
                            >
                                <option value="Licence">Licence</option>
                                <option value="Master">Master</option>
                                <option value="Doctorat">Doctorat</option>
                            </select>
                            <select
                                value={formData.languageLevel}
                                onChange={(e) => setFormData({...formData, languageLevel: e.target.value})}
                                className="p-3 border rounded-lg"
                                style={{borderColor: '#7D3837'}}
                            >
                                <option value="Débutant">Débutant</option>
                                <option value="Intermédiaire">Intermédiaire</option>
                                <option value="Avancé">Avancé</option>
                                <option value="HSK 1">HSK 1</option>
                                <option value="HSK 2">HSK 2</option>
                                <option value="HSK 3">HSK 3</option>
                                <option value="HSK 4">HSK 4</option>
                                <option value="HSK 5">HSK 5</option>
                                <option value="HSK 6">HSK 6</option>
                            </select>
                        </div>
                    </div>

                    {/* Informations de contact parent */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#7D3837'}}>Contact parent/tuteur</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <input 
                                placeholder="Nom du parent/tuteur *" 
                                value={formData.parentName}
                                onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <input 
                                placeholder="Téléphone parent/tuteur *" 
                                value={formData.parentPhone}
                                onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                        </div>
                    </div>

                    {/* Informations de bourse */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#7D3837'}}>Bourse et paiement</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <select
                                value={formData.scholarshipType}
                                onChange={(e) => setFormData({...formData, scholarshipType: e.target.value})}
                                className="p-3 border rounded-lg"
                                style={{borderColor: '#7D3837'}}
                            >
                                <option value="Complète">Bourse complète</option>
                                <option value="Partielle">Bourse partielle</option>
                                <option value="Aucune">Aucune bourse</option>
                            </select>
                            <input 
                                type="number"
                                placeholder="Frais de candidature *" 
                                value={formData.applicationFee}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({...formData, applicationFee: value});
                                }}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#7D3837'}} 
                            />
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                className="p-3 border rounded-lg"
                                style={{borderColor: '#7D3837'}}
                            >
                                <option value="En attente">En attente</option>
                                <option value="En cours">En cours</option>
                                <option value="Acceptée">Acceptée</option>
                                <option value="Refusée">Refusée</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleSaveStudent}
                            style={{backgroundColor: '#7D3837'}} 
                            className="text-yellow-300 px-6 py-3 rounded hover:opacity-80 transition-opacity font-medium"
                        >
                            Enregistrer
                        </button>
                        <button 
                            onClick={() => setShowForm(false)} 
                            className="px-6 py-3 rounded border hover:bg-yellow-100 transition-colors font-medium" 
                            style={{borderColor: '#7D3837', color: '#7D3837'}}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 sm:p-6 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Liste des Étudiants</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                {filteredStudents.length} étudiant(s) {searchId && `sur ${students.length}`}
                            </span>
                            <button 
                                onClick={loadStudents}
                                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    <ProgressiveLoader isLoading={isLoading}>
                        {filteredStudents.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <p className="text-slate-500 text-base sm:text-lg font-medium">
                                {searchId ? 'Aucun étudiant trouvé' : 'Aucun étudiant enregistré'}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {searchId ? 'Essayez un autre ID' : 'Les étudiants apparaîtront ici après leur ajout'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {filteredStudents.map((student, index) => (
                                <div key={`student-${student.id}-${index}-${student.name}-${student.phone}`} className="bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200 hover:border-slate-300 group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#fff590'}}>
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Supprimer l'étudiant ${student.name} ?`)) {
                                                            const updatedStudents = students.filter(s => s.id !== student.id);
                                                            setStudents(updatedStudents);
                                                            setFilteredStudents(updatedStudents);
                                                            localStorage.setItem('clients', JSON.stringify(updatedStudents));
                                                            addLog('Suppression étudiant', 'clients', `Étudiant supprimé: ${student.name}`);
                                                            showNotification('Étudiant supprimé avec succès', 'success');
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all"
                                                    title="Supprimer l'étudiant"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <h3 className="font-semibold text-slate-800 text-base sm:text-lg">{student.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono">ID: {student.id}</p>
                                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                            student.status === 'Acceptée' ? 'bg-green-100 text-green-800' :
                                            student.status === 'En cours' ? 'bg-blue-100 text-blue-800' :
                                            student.status === 'Refusée' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {student.status}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className="text-slate-600 truncate">{student.desiredUniversity}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span className="text-slate-600 truncate">{student.desiredProgram}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span className="text-slate-600 truncate">{student.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    </ProgressiveLoader>
                </div>
            </div>
        </div>
    );
}