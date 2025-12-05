"use client";

import { useState, useEffect } from "react";
import { saveData, loadFromFirebase } from "../utils/syncData";
import { useNotificationContext } from "../context/NotificationContext";
import { formatPrice } from "../utils/formatPrice";
import { useActivityLog } from "../context/ActivityLogContext";

import { University } from "../types/scholarship";

export default function UniversityManagement() {
    const [showForm, setShowForm] = useState(false);
    const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
    const [universities, setUniversities] = useState<University[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotificationContext();
    const { addLog } = useActivityLog();
    

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        location: '',
        category: 'Tier 2' as University['category'],
        applicationFee: '',
        programs: '',
        minHSK: 3,
        minGPA: 2.5
    });

    // Universités prédéfinies chinoises
    const predefinedUniversities: University[] = [
        // Elite Universities (Top 10)
        { 
            id: 'pku', name: 'Université de Pékin', code: 'PKU', location: 'Pékin', 
            category: 'Elite', applicationFee: '150000', status: 'Disponible',
            programs: ['Médecine', 'Ingénierie', 'Sciences', 'Économie', 'Droit'],
            requirements: { minHSK: 6, minGPA: 3.5, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
        },
        { 
            id: 'thu', name: 'Université Tsinghua', code: 'THU', location: 'Pékin', 
            category: 'Elite', applicationFee: '150000', status: 'Disponible',
            programs: ['Ingénierie', 'Architecture', 'Sciences', 'Management', 'Arts'],
            requirements: { minHSK: 6, minGPA: 3.5, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
        },
        { 
            id: 'fudan', name: 'Université Fudan', code: 'FDU', location: 'Shanghai', 
            category: 'Elite', applicationFee: '140000', status: 'Disponible',
            programs: ['Médecine', 'Économie', 'Journalisme', 'Sciences', 'Philosophie'],
            requirements: { minHSK: 5, minGPA: 3.3, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
        },
        
        // Tier 1 Universities (Top 50)
        { 
            id: 'sjtu', name: 'Université Jiao Tong de Shanghai', code: 'SJTU', location: 'Shanghai', 
            category: 'Tier 1', applicationFee: '120000', status: 'Disponible',
            programs: ['Ingénierie', 'Médecine', 'Management', 'Sciences', 'Maritime'],
            requirements: { minHSK: 5, minGPA: 3.0, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
        },
        { 
            id: 'zju', name: 'Université du Zhejiang', code: 'ZJU', location: 'Hangzhou', 
            category: 'Tier 1', applicationFee: '110000', status: 'Disponible',
            programs: ['Ingénierie', 'Médecine', 'Agriculture', 'Sciences', 'Management'],
            requirements: { minHSK: 5, minGPA: 3.0, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
        },
        { 
            id: 'nju', name: 'Université de Nanjing', code: 'NJU', location: 'Nanjing', 
            category: 'Tier 1', applicationFee: '110000', status: 'Disponible',
            programs: ['Sciences', 'Littérature', 'Histoire', 'Philosophie', 'Géologie'],
            requirements: { minHSK: 5, minGPA: 3.0, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
        },
        { 
            id: 'whu', name: 'Université de Wuhan', code: 'WHU', location: 'Wuhan', 
            category: 'Tier 1', applicationFee: '100000', status: 'Disponible',
            programs: ['Droit', 'Économie', 'Journalisme', 'Sciences', 'Médecine'],
            requirements: { minHSK: 4, minGPA: 2.8, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
        },
        { 
            id: 'hust', name: 'Université de Science et Technologie de Huazhong', code: 'HUST', location: 'Wuhan', 
            category: 'Tier 1', applicationFee: '100000', status: 'Disponible',
            programs: ['Ingénierie', 'Médecine', 'Management', 'Sciences', 'Architecture'],
            requirements: { minHSK: 4, minGPA: 2.8, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
        },
        { 
            id: 'scu', name: 'Université du Sichuan', code: 'SCU', location: 'Chengdu', 
            category: 'Tier 1', applicationFee: '95000', status: 'Disponible',
            programs: ['Médecine', 'Littérature', 'Histoire', 'Sciences', 'Ingénierie'],
            requirements: { minHSK: 4, minGPA: 2.8, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
        },
        
        // Tier 2 Universities (Good quality)
        { 
            id: 'csu', name: 'Université du Sud Central', code: 'CSU', location: 'Changsha', 
            category: 'Tier 2', applicationFee: '85000', status: 'Disponible',
            programs: ['Médecine', 'Ingénierie', 'Transport', 'Métallurgie', 'Sciences'],
            requirements: { minHSK: 4, minGPA: 2.5, documents: ['Passeport', 'Diplôme', 'Relevés'] }
        },
        { 
            id: 'dlut', name: 'Université de Technologie de Dalian', code: 'DLUT', location: 'Dalian', 
            category: 'Tier 2', applicationFee: '80000', status: 'Disponible',
            programs: ['Ingénierie', 'Architecture', 'Management', 'Sciences', 'Chimie'],
            requirements: { minHSK: 4, minGPA: 2.5, documents: ['Passeport', 'Diplôme', 'Relevés'] }
        },
        { 
            id: 'nwu', name: 'Université du Nord-Ouest', code: 'NWU', location: 'Xi\'an', 
            category: 'Tier 2', applicationFee: '75000', status: 'Disponible',
            programs: ['Géologie', 'Archéologie', 'Sciences', 'Littérature', 'Histoire'],
            requirements: { minHSK: 3, minGPA: 2.5, documents: ['Passeport', 'Diplôme', 'Relevés'] }
        },
        { 
            id: 'lzu', name: 'Université de Lanzhou', code: 'LZU', location: 'Lanzhou', 
            category: 'Tier 2', applicationFee: '70000', status: 'Disponible',
            programs: ['Chimie', 'Physique', 'Géographie', 'Sciences', 'Médecine'],
            requirements: { minHSK: 3, minGPA: 2.3, documents: ['Passeport', 'Diplôme', 'Relevés'] }
        },
        { 
            id: 'ynu', name: 'Université du Yunnan', code: 'YNU', location: 'Kunming', 
            category: 'Tier 2', applicationFee: '65000', status: 'Disponible',
            programs: ['Ethnologie', 'Biologie', 'Écologie', 'Tourisme', 'Langues'],
            requirements: { minHSK: 3, minGPA: 2.3, documents: ['Passeport', 'Diplôme', 'Relevés'] }
        },
        
        // Tier 3 Universities (Accessible)
        { 
            id: 'gxu', name: 'Université du Guangxi', code: 'GXU', location: 'Nanning', 
            category: 'Tier 3', applicationFee: '55000', status: 'Disponible',
            programs: ['Agriculture', 'Sciences', 'Ingénierie', 'Médecine', 'Arts'],
            requirements: { minHSK: 3, minGPA: 2.0, documents: ['Passeport', 'Diplôme'] }
        },
        { 
            id: 'hnu', name: 'Université du Hainan', code: 'HNU', location: 'Haikou', 
            category: 'Tier 3', applicationFee: '50000', status: 'Disponible',
            programs: ['Tourisme', 'Marine', 'Agriculture tropicale', 'Langues', 'Commerce'],
            requirements: { minHSK: 2, minGPA: 2.0, documents: ['Passeport', 'Diplôme'] }
        },
        { 
            id: 'qhu', name: 'Université du Qinghai', code: 'QHU', location: 'Xining', 
            category: 'Tier 3', applicationFee: '45000', status: 'Disponible',
            programs: ['Médecine tibétaine', 'Géologie', 'Agriculture', 'Élevage', 'Écologie'],
            requirements: { minHSK: 2, minGPA: 2.0, documents: ['Passeport', 'Diplôme'] }
        }
    ];

    const categories = {
        'Elite': { color: 'from-red-500 to-red-600', bgColor: 'bg-red-50', textColor: 'text-red-800' },
        'Tier 1': { color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-800' },
        'Tier 2': { color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
        'Tier 3': { color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-800' }
    };

    const loadUniversities = async () => {
        setIsLoading(true);
        try {
            const universitiesData = await loadFromFirebase('universities');
            if (!Array.isArray(universitiesData) || universitiesData.length === 0) {
                for (const university of predefinedUniversities) {
                    await saveData('universities', university);
                }
                setUniversities(predefinedUniversities);
            } else {
                setUniversities(universitiesData);
            }
        } catch (error) {
            console.warn('Erreur chargement universités:', error);
            setUniversities(predefinedUniversities);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUniversities();
    }, []);

    const handleSaveUniversity = async () => {
        if (!formData.name || !formData.code || !formData.location || !formData.applicationFee) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
            return;
        }

        const existingUniversity = universities.find(uni => 
            uni.code === formData.code && (!editingUniversity || uni.id !== editingUniversity.id)
        );
        
        if (existingUniversity) {
            showNotification(`L'université avec le code ${formData.code} existe déjà`, "error");
            return;
        }

        try {
            const universityData: University = {
                id: editingUniversity?.id || Date.now().toString(),
                name: formData.name,
                code: formData.code,
                location: formData.location,
                category: formData.category,
                applicationFee: formData.applicationFee,
                status: 'Disponible',
                programs: formData.programs.split(',').map(p => p.trim()).filter(p => p),
                requirements: {
                    minHSK: formData.minHSK,
                    minGPA: formData.minGPA,
                    documents: ['Passeport', 'Diplôme', 'Relevés']
                }
            };

            await saveData('universities', universityData);
            addLog(
                editingUniversity ? 'Modification université' : 'Création université', 
                'universities', 
                `Université ${editingUniversity ? 'modifiée' : 'créée'}: ${formData.name}`, 
                universityData
            );
            
            showNotification(`Université ${editingUniversity ? 'modifiée' : 'ajoutée'} avec succès!`, "success");
            await loadUniversities();
            window.dispatchEvent(new Event('dashboardUpdate'));
            
            setShowForm(false);
            setEditingUniversity(null);
            setFormData({ name: '', code: '', location: '', category: 'Tier 2', applicationFee: '', programs: '', minHSK: 3, minGPA: 2.5 });
        } catch (error) {
            showNotification("Erreur lors de la sauvegarde", "error");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des universités...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Universités Partenaires en Chine
            </h1>
            
            {showForm && (
                <div className="bg-gray-50 border rounded p-4 sm:p-6 mb-4" style={{borderColor: '#dc2626'}}>
                    <h3 className="font-bold mb-4 text-lg sm:text-xl" style={{color: '#dc2626'}}>
                        {editingUniversity ? 'Modifier Université' : 'Nouvelle Université'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4">
                        <input 
                            placeholder="Nom de l'université *" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                        <input 
                            placeholder="Code université (ex: PKU) *" 
                            value={formData.code}
                            onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                        <input 
                            placeholder="Ville/Province *" 
                            value={formData.location}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value as University['category']})}
                            className="p-3 border rounded-lg"
                            style={{borderColor: '#dc2626'}}
                        >
                            <option value="Elite">Elite (Top 10)</option>
                            <option value="Tier 1">Tier 1 (Top 50)</option>
                            <option value="Tier 2">Tier 2 (Qualité)</option>
                            <option value="Tier 3">Tier 3 (Accessible)</option>
                        </select>
                        <input 
                            type="number"
                            placeholder="Frais de candidature (FCFA) *" 
                            value={formData.applicationFee}
                            onChange={(e) => setFormData({...formData, applicationFee: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                        <input 
                            placeholder="Programmes (séparés par virgule)" 
                            value={formData.programs}
                            onChange={(e) => setFormData({...formData, programs: e.target.value})}
                            className="p-3 border rounded-lg" 
                            style={{borderColor: '#dc2626'}} 
                        />
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleSaveUniversity}
                            style={{backgroundColor: '#dc2626'}} 
                            className="text-gray-300 px-6 py-3 rounded hover:opacity-80 transition-opacity font-medium"
                        >
                            {editingUniversity ? 'Modifier' : 'Enregistrer'}
                        </button>
                        <button 
                            onClick={() => {
                                setShowForm(false);
                                setEditingUniversity(null);
                                setFormData({ name: '', code: '', location: '', category: 'Tier 2', applicationFee: '', programs: '', minHSK: 3, minGPA: 2.5 });
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
                            Universités Chinoises ({universities.length})
                        </h2>
                        <div className="flex items-center gap-3">
                            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                <button 
                                    onClick={() => setShowForm(true)}
                                    style={{backgroundColor: '#dc2626'}} 
                                    className="text-gray-300 px-4 py-2 rounded hover:bg-opacity-80 font-medium"
                                >
                                    Ajouter Université
                                </button>
                            )}
                            <button 
                                onClick={loadUniversities}
                                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6 sm:space-y-8">
                        {Object.keys(categories).map(category => {
                            const categoryUniversities = universities.filter(uni => uni.category === category);
                            const categoryStyle = categories[category as keyof typeof categories];
                            
                            if (categoryUniversities.length === 0) return null;
                            
                            return (
                                <div key={category}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-1 h-8 bg-gradient-to-b ${categoryStyle.color} rounded-full`}></div>
                                        <h3 className="text-xl font-bold text-slate-800">{category}</h3>
                                        <span className={`text-sm px-3 py-1 rounded-full ${categoryStyle.bgColor} ${categoryStyle.textColor}`}>
                                            {categoryUniversities.length} université(s)
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4">
                                        {categoryUniversities.map((university) => (
                                            <div key={university.id} className={`${categoryStyle.bgColor} p-5 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200`}>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`w-10 h-10 bg-gradient-to-br ${categoryStyle.color} rounded-lg flex items-center justify-center`}>
                                                        <span className="text-white font-bold text-sm">{university.code}</span>
                                                    </div>
                                                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                                                        university.status === 'Disponible' ? 'bg-green-100 text-green-800' :
                                                        university.status === 'Complet' ? 'bg-red-100 text-red-800' :
                                                        university.status === 'Fermé' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {university.status}
                                                    </div>
                                                </div>
                                                
                                                <h4 className="font-semibold text-slate-800 text-lg mb-2">{university.name}</h4>
                                                <p className="text-sm text-slate-600 mb-3">{university.location}</p>
                                                
                                                <div className="space-y-2 mb-4">
                                                    <div className="text-xs text-slate-500">
                                                        HSK minimum: {university.requirements.minHSK}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {university.programs.slice(0, 3).join(', ')}
                                                        {university.programs.length > 3 && '...'}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-slate-600">Frais candidature</span>
                                                    <span className={`text-lg font-bold bg-gradient-to-r ${categoryStyle.color} bg-clip-text text-transparent`}>
                                                        {formatPrice(university.applicationFee)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}