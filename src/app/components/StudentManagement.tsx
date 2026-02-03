"use client";

import { useState } from 'react';
import { useStudents } from '../hooks/useJodaData';
import { useAuth } from '../context/AuthContext';
import { Student, StudentChoice } from '../types/joda';
import { sanitizeForHtml, sanitizeEmail, sanitizePhone } from '../utils/security';
import { PaymentGenerationService } from '../services/PaymentService';

export default function StudentManagement() {
    const { user } = useAuth();
    const { students, loading, addStudent, editStudent } = useStudents();
    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        age: '',
        sexe: 'M' as 'M' | 'F',
        niveau: '',
        filiere: '',
        langue: '',
        diplome_acquis: '',
        photo: '',
        passeport: {
            numero: '',
            expiration: '',
            document_url: ''
        },
        choix: 'procedure_seule' as StudentChoice
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const studentData = {
            ...formData,
            email: sanitizeEmail(formData.email),
            telephone: sanitizePhone(formData.telephone),
            age: parseInt(formData.age),
            passeport: {
                ...formData.passeport,
                expiration: new Date(formData.passeport.expiration)
            },
            createdBy: user?.username || 'system'
        };

        let success = false;
        if (editingStudent) {
            success = await editStudent(editingStudent.id, studentData);
        } else {
            success = await addStudent(studentData);
            
            // Générer automatiquement les paiements selon le choix
            if (success) {
                const newStudent = { ...studentData, id: Date.now().toString() } as Student;
                await PaymentGenerationService.generatePaymentsForStudent(newStudent);
            }
        }

        if (success) {
            resetForm();
        }
    };

    const resetForm = () => {
        setFormData({
            nom: '', prenom: '', email: '', telephone: '', age: '', sexe: 'M',
            niveau: '', filiere: '', langue: '', diplome_acquis: '', photo: '',
            passeport: { numero: '', expiration: '', document_url: '' },
            choix: 'procedure_seule'
        });
        setShowForm(false);
        setEditingStudent(null);
    };

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            ...student,
            age: student.age.toString(),
            passeport: {
                ...student.passeport,
                expiration: new Date(student.passeport.expiration).toISOString().split('T')[0]
            }
        });
        setShowForm(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des étudiants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-red-600">
                    Gestion des Étudiants
                </h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Nouvel Étudiant
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-800">
                            {editingStudent ? 'Modifier l\'étudiant' : 'Nouvel étudiant'}
                        </h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {/* Informations personnelles */}
                            <div className="md:col-span-2 lg:col-span-3">
                                <h3 className="text-lg font-semibold text-red-600 mb-4">Informations personnelles</h3>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                                <input
                                    type="text"
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                                <input
                                    type="tel"
                                    value={formData.telephone}
                                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Âge *</label>
                                <input
                                    type="number"
                                    min="16"
                                    max="50"
                                    value={formData.age}
                                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sexe *</label>
                                <select
                                    value={formData.sexe}
                                    onChange={(e) => setFormData({...formData, sexe: e.target.value as 'M' | 'F'})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                >
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>

                            {/* Informations académiques */}
                            <div className="md:col-span-2 lg:col-span-3">
                                <h3 className="text-lg font-semibold text-red-600 mb-4 mt-6">Informations académiques</h3>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'étude *</label>
                                <select
                                    value={formData.niveau}
                                    onChange={(e) => setFormData({...formData, niveau: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                >
                                    <option value="">Sélectionner</option>
                                    <option value="Baccalauréat">Baccalauréat</option>
                                    <option value="Licence">Licence</option>
                                    <option value="Master">Master</option>
                                    <option value="Doctorat">Doctorat</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filière *</label>
                                <input
                                    type="text"
                                    value={formData.filiere}
                                    onChange={(e) => setFormData({...formData, filiere: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Ex: Informatique, Médecine, Ingénierie..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Langue de préférence</label>
                                <select
                                    value={formData.langue}
                                    onChange={(e) => setFormData({...formData, langue: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                >
                                    <option value="">Sélectionner</option>
                                    <option value="Français">Français</option>
                                    <option value="Anglais">Anglais</option>
                                    <option value="Chinois">Chinois</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Diplôme acquis</label>
                                <input
                                    type="text"
                                    value={formData.diplome_acquis}
                                    onChange={(e) => setFormData({...formData, diplome_acquis: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Ex: Baccalauréat série C, Licence en Informatique..."
                                />
                            </div>

                            {/* Informations passeport */}
                            <div className="md:col-span-2 lg:col-span-3">
                                <h3 className="text-lg font-semibold text-red-600 mb-4 mt-6">Informations passeport</h3>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de passeport *</label>
                                <input
                                    type="text"
                                    value={formData.passeport.numero}
                                    onChange={(e) => setFormData({
                                        ...formData, 
                                        passeport: {...formData.passeport, numero: e.target.value}
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration *</label>
                                <input
                                    type="date"
                                    value={formData.passeport.expiration}
                                    onChange={(e) => setFormData({
                                        ...formData, 
                                        passeport: {...formData.passeport, expiration: e.target.value}
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>

                            {/* Choix de l'étudiant */}
                            <div className="md:col-span-2 lg:col-span-3">
                                <h3 className="text-lg font-semibold text-red-600 mb-4 mt-6">Choix de service</h3>
                            </div>

                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Type de service souhaité *</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="border border-gray-300 rounded-lg p-4 hover:border-red-500 transition-colors">
                                        <label className="flex items-start space-x-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="choix"
                                                value="procedure_seule"
                                                checked={formData.choix === 'procedure_seule'}
                                                onChange={(e) => setFormData({...formData, choix: e.target.value as StudentChoice})}
                                                className="mt-1 text-red-600 focus:ring-red-500"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900">Procédure seule</div>
                                                <div className="text-sm text-gray-600">Accompagnement pour la bourse uniquement</div>
                                                <div className="text-sm font-semibold text-red-600 mt-1">2 990 000 FCFA</div>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="border border-gray-300 rounded-lg p-4 hover:border-red-500 transition-colors">
                                        <label className="flex items-start space-x-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="choix"
                                                value="cours_seuls"
                                                checked={formData.choix === 'cours_seuls'}
                                                onChange={(e) => setFormData({...formData, choix: e.target.value as StudentChoice})}
                                                className="mt-1 text-red-600 focus:ring-red-500"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900">Cours seuls</div>
                                                <div className="text-sm text-gray-600">Cours de langues uniquement</div>
                                                <div className="text-sm font-semibold text-red-600 mt-1">91k - 121k FCFA</div>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="border border-gray-300 rounded-lg p-4 hover:border-red-500 transition-colors">
                                        <label className="flex items-start space-x-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="choix"
                                                value="procedure_cours"
                                                checked={formData.choix === 'procedure_cours'}
                                                onChange={(e) => setFormData({...formData, choix: e.target.value as StudentChoice})}
                                                className="mt-1 text-red-600 focus:ring-red-500"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900">Procédure + Cours</div>
                                                <div className="text-sm text-gray-600">Accompagnement complet</div>
                                                <div className="text-sm font-semibold text-green-600 mt-1">Tarif avantageux</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                {editingStudent ? 'Modifier' : 'Créer'} l'étudiant
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Liste des étudiants */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Étudiants enregistrés ({students.length})
                    </h2>
                </div>
                
                <div className="p-6">
                    {students.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                            <p className="text-gray-500">Aucun étudiant enregistré</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {students.map((student) => (
                                <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {sanitizeForHtml(student.nom)} {sanitizeForHtml(student.prenom)}
                                            </h3>
                                            <p className="text-sm text-gray-600">{sanitizeForHtml(student.email)}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            student.choix === 'procedure_seule' ? 'bg-blue-100 text-blue-800' :
                                            student.choix === 'cours_seuls' ? 'bg-green-100 text-green-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                            {student.choix.replace('_', ' ')}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                                        <div>📞 {sanitizeForHtml(student.telephone)}</div>
                                        <div>🎓 {sanitizeForHtml(student.niveau)} - {sanitizeForHtml(student.filiere)}</div>
                                        <div>📄 Passeport: {sanitizeForHtml(student.passeport.numero)}</div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleEdit(student)}
                                        className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Modifier
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