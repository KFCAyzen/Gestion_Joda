"use client";

import { useState, useEffect } from "react";
import { saveData, loadFromFirebase } from "../utils/syncData";
import { useNotificationContext } from "../context/NotificationContext";
import { useActivityLog } from "../context/ActivityLogContext";

import { Student } from "../types/scholarship";

export default function StudentManagement() {
    const [showForm, setShowForm] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [searchId, setSearchId] = useState('');
    const [searchName, setSearchName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotificationContext();
    const { addLog } = useActivityLog();
    

    const generateStudentId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `STU${timestamp}${random}`;
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
        gender: '',
        parentName: '',
        parentPhone: ''
    });

    const loadStudents = async () => {
        setIsLoading(true);
        try {
            let studentsData = JSON.parse(localStorage.getItem('students') || '[]');
            
            if (!Array.isArray(studentsData) || studentsData.length === 0) {
                studentsData = await loadFromFirebase('students');
                if (!Array.isArray(studentsData)) {
                    studentsData = [];
                }
            }
            
            setStudents(studentsData);
            setFilteredStudents(studentsData);
        } catch (error) {
            console.warn('Erreur chargement étudiants:', error);
            const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
            setStudents(localStudents);
            setFilteredStudents(localStudents);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
        
        const handleDataUpdate = () => {
            loadStudents();
        };
        
        window.addEventListener('dashboardUpdate', handleDataUpdate);
        window.addEventListener('dataChanged', handleDataUpdate);
        
        return () => {
            window.removeEventListener('dashboardUpdate', handleDataUpdate);
            window.removeEventListener('dataChanged', handleDataUpdate);
        };
    }, []);

    const handleSaveStudent = async () => {
        const requiredFields = [
            'name', 'phone', 'email', 'address', 'currentEducation', 'nationality', 
            'birthPlace', 'birthDate', 'idNumber', 'gender', 'parentName', 'parentPhone'
        ];
        
        const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
        
        if (missingFields.length > 0) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
            return;
        }

        try {
            const studentData: Student = { 
                id: generateStudentId(),
                ...formData,
                phone: `${formData.phonePrefix} ${formData.phone}`,
                applicationDate: new Date().toISOString().split('T')[0],
                createdBy: user?.username || 'system'
            };

            await saveData('students', studentData);
            addLog('Création étudiant', 'students', `Étudiant créé: ${formData.name}`, studentData);
            window.dispatchEvent(new Event('dashboardUpdate'));
            showNotification("Étudiant enregistré avec succès!", "success");
            
            setShowForm(false);
            setFormData({ 
                name: '', phonePrefix: '+237', phone: '', email: '', address: '', currentEducation: '', nationality: '', 
                birthPlace: '', birthDate: '', idNumber: '', idIssueDate: '', idIssuePlace: '',
                idExpiryDate: '', passportNumber: '', gender: '', parentName: '', parentPhone: ''
            });
            await loadStudents();
        } catch (error) {
            showNotification("Erreur lors de l'enregistrement", "error");
        }
    };

    const handleSearch = (idValue: string, nameValue: string) => {
        if (idValue.trim() === '' && nameValue.trim() === '') {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student => 
                (idValue === '' || student.id.toLowerCase().includes(idValue.toLowerCase())) &&
                (nameValue === '' || student.name.toLowerCase().includes(nameValue.toLowerCase()))
            );
            setFilteredStudents(filtered);
        }
    };

    if (isLoading) {
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Gestion des Étudiants
            </h1>
            
            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <button 
                    onClick={() => setShowForm(true)}
                    style={{backgroundColor: '#dc2626'}} 
                    className="text-gray-300 px-4 py-3 sm:py-2 rounded hover:bg-opacity-80 font-medium"
                >
                    Nouvel Étudiant
                </button>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 max-w-2xl">
                    <input
                        type="text"
                        placeholder="Rechercher par ID étudiant..."
                        value={searchId}
                        onChange={(e) => {
                            setSearchId(e.target.value);
                            handleSearch(e.target.value, searchName);
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg"
                        style={{borderColor: '#dc2626'}}
                    />
                    <input
                        type="text"
                        placeholder="Rechercher par nom..."
                        value={searchName}
                        onChange={(e) => {
                            setSearchName(e.target.value);
                            handleSearch(searchId, e.target.value);
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg"
                        style={{borderColor: '#dc2626'}}
                    />
                </div>
            </div>
            
            {showForm && (
                <div className="bg-gray-50 border rounded p-4 sm:p-6 mb-4" style={{borderColor: '#dc2626'}}>
                    <h3 className="font-bold mb-4 sm:mb-6 text-lg sm:text-xl" style={{color: '#dc2626'}}>
                        Nouvel Étudiant
                    </h3>
                    
                    {/* Informations personnelles */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#dc2626'}}>
                            Informations personnelles
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <input 
                                placeholder="Nom complet *" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <div className="flex gap-2">
                                <select
                                    value={formData.phonePrefix}
                                    onChange={(e) => setFormData({...formData, phonePrefix: e.target.value})}
                                    className="p-3 border rounded-lg w-24"
                                    style={{borderColor: '#dc2626'}}
                                >
                                    <option value="+237">+237</option>
                                    <option value="+33">+33</option>
                                    <option value="+1">+1</option>
                                    <option value="+44">+44</option>
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
                                    style={{borderColor: '#dc2626'}} 
                                />
                            </div>
                            <input 
                                placeholder="Email *" 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <input 
                                placeholder="Adresse complète *" 
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <input 
                                placeholder="Formation actuelle *" 
                                value={formData.currentEducation}
                                onChange={(e) => setFormData({...formData, currentEducation: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                className="p-3 border rounded-lg"
                                style={{borderColor: '#dc2626'}}
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
                                style={{borderColor: '#dc2626'}} 
                            />
                            <input 
                                placeholder="Lieu de naissance *" 
                                value={formData.birthPlace}
                                onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={formData.birthDate}
                                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                                    className="p-3 border rounded-lg w-full" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                                <label className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs" style={{color: '#dc2626'}}>
                                    Date de naissance *
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Documents d'identité */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#dc2626'}}>
                            Documents d'identité
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <input 
                                placeholder="Numéro pièce d'identité *" 
                                value={formData.idNumber}
                                onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={formData.idIssueDate}
                                    onChange={(e) => setFormData({...formData, idIssueDate: e.target.value})}
                                    className="p-3 border rounded-lg w-full" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                                <label className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs" style={{color: '#dc2626'}}>
                                    Date délivrance
                                </label>
                            </div>
                            <input 
                                placeholder="Lieu de délivrance" 
                                value={formData.idIssuePlace}
                                onChange={(e) => setFormData({...formData, idIssuePlace: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={formData.idExpiryDate}
                                    onChange={(e) => setFormData({...formData, idExpiryDate: e.target.value})}
                                    className="p-3 border rounded-lg w-full" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                                <label className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs" style={{color: '#dc2626'}}>
                                    Date expiration
                                </label>
                            </div>
                            <input 
                                placeholder="Numéro passeport" 
                                value={formData.passportNumber}
                                onChange={(e) => setFormData({...formData, passportNumber: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                        </div>
                    </div>

                    {/* Contact parent/tuteur */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#dc2626'}}>
                            Contact parent/tuteur
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <input 
                                placeholder="Nom du parent/tuteur *" 
                                value={formData.parentName}
                                onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                            <input 
                                placeholder="Téléphone parent/tuteur *" 
                                value={formData.parentPhone}
                                onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                                className="p-3 border rounded-lg" 
                                style={{borderColor: '#dc2626'}} 
                            />
                        </div>
                    </div>

                    {/* Documents à télécharger */}
                    <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold mb-3 text-base sm:text-lg" style={{color: '#dc2626'}}>
                            Documents requis
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Passeport
                                </label>
                                <input 
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Casier judiciaire
                                </label>
                                <input 
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Photo de l'étudiant
                                </label>
                                <input 
                                    type="file"
                                    accept=".jpg,.jpeg,.png"
                                    className="w-full p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Relevé du Bac
                                </label>
                                <input 
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Diplôme du Bac
                                </label>
                                <input 
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                                    style={{borderColor: '#dc2626'}} 
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Formats acceptés : PDF, JPG, JPEG, PNG (max 5MB par fichier)<br/>
                            <span className="text-blue-600 font-medium">Tous les documents peuvent être ajoutés ultérieurement</span>
                        </p>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleSaveStudent}
                            style={{backgroundColor: '#dc2626'}} 
                            className="text-gray-300 px-6 py-3 rounded hover:opacity-80 transition-opacity font-medium"
                        >
                            Enregistrer
                        </button>
                        <button 
                            onClick={() => {
                                setShowForm(false);
                                setFormData({ 
                                    name: '', phonePrefix: '+237', phone: '', email: '', address: '', currentEducation: '', nationality: '', 
                                    birthPlace: '', birthDate: '', idNumber: '', idIssueDate: '', idIssuePlace: '',
                                    idExpiryDate: '', passportNumber: '', gender: '', parentName: '', parentPhone: ''
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
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 sm:p-6 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                            Liste des Étudiants
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                {filteredStudents.length} étudiant(s) {(searchId || searchName) && `sur ${students.length}`}
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
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                            <p className="text-slate-500 text-base sm:text-lg font-medium">
                                {(searchId || searchName) ? 'Aucun étudiant trouvé' : 'Aucun étudiant enregistré'}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {(searchId || searchName) ? 'Essayez d\'autres critères de recherche' : 'Les étudiants apparaîtront ici après leur ajout'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {filteredStudents.map((student) => (
                                <div key={student.id} className="bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200 hover:border-slate-300 group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#f3f4f6'}}>
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Supprimer l'étudiant ${student.name} ?`)) {
                                                        const updatedStudents = students.filter(s => s.id !== student.id);
                                                        setStudents(updatedStudents);
                                                        setFilteredStudents(updatedStudents.filter(s => 
                                                            (searchId === '' || s.id.toLowerCase().includes(searchId.toLowerCase())) &&
                                                            (searchName === '' || s.name.toLowerCase().includes(searchName.toLowerCase()))
                                                        ));
                                                        localStorage.setItem('students', JSON.stringify(updatedStudents));
                                                        addLog('Suppression étudiant', 'students', `Étudiant supprimé: ${student.name}`);
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
                                    <div className="mb-3">
                                        <h3 className="font-semibold text-slate-800 text-base sm:text-lg">{student.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono">ID: {student.id}</p>
                                        <p className="text-xs text-slate-600 mt-1">{student.nationality}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span className="text-slate-600 truncate">{student.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                            <span className="text-slate-600 truncate">{student.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span className="text-slate-600 truncate">{student.currentEducation}</span>
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