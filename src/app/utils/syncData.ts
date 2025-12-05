import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Synchronise les données du localStorage vers Firebase
 * Maintient une copie de sauvegarde sans supprimer les données locales
 */
export const syncLocalStorageToFirebase = async () => {
    const collections = ['clients', 'reservations', 'rooms', 'bills', 'users', 'activityLogs'];
    
    for (const collectionName of collections) {
        try {
            const localData = JSON.parse(localStorage.getItem(collectionName) || '[]');
            const syncedIds = JSON.parse(localStorage.getItem(`${collectionName}_synced`) || '[]');
            
            // Synchroniser seulement les nouveaux éléments
            for (const item of localData) {
                if (!syncedIds.includes(item.id)) {
                    try {
                        await addDoc(collection(db, collectionName), item);
                        syncedIds.push(item.id);
                    } catch (error) {
                        // Continuer avec les autres éléments en cas d'erreur
                    }
                }
            }
            
            // Sauvegarder les IDs synchronisés
            localStorage.setItem(`${collectionName}_synced`, JSON.stringify(syncedIds));
        } catch (error) {
            // Ignorer silencieusement les erreurs
        }
    }
};

/**
 * Charge les données depuis Firebase et les fusionne avec localStorage
 */
export const loadFromFirebase = async (collectionName: string) => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const firebaseData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fusionner avec les données locales
        const localData = JSON.parse(localStorage.getItem(collectionName) || '[]');
        const mergedData = [...firebaseData];
        
        // Ajouter les données locales non synchronisées
        localData.forEach((localItem: any) => {
            if (!firebaseData.find(fbItem => fbItem.id === localItem.id)) {
                mergedData.push(localItem);
            }
        });
        
        // Sauvegarder les données fusionnées
        localStorage.setItem(collectionName, JSON.stringify(mergedData));
        return mergedData;
    } catch (error) {
        // Retourner les données locales en cas d'erreur
        return JSON.parse(localStorage.getItem(collectionName) || '[]');
    }
};

/**
 * Sauvegarde unifiée : localStorage + Firebase
 */
export const saveData = async (collectionName: string, data: any) => {
    // Générer un ID si nécessaire
    const id = data.id || Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const itemWithId = { ...data, id };
    
    // Sauvegarder immédiatement en local
    const localData = JSON.parse(localStorage.getItem(collectionName) || '[]');
    const existingIndex = localData.findIndex((item: any) => item.id === id);
    
    if (existingIndex !== -1) {
        localData[existingIndex] = itemWithId;
    } else {
        localData.push(itemWithId);
    }
    
    localStorage.setItem(collectionName, JSON.stringify(localData));
    
    // Tenter la sauvegarde Firebase en arrière-plan
    try {
        await addDoc(collection(db, collectionName), itemWithId);
        // Marquer comme synchronisé
        const syncedIds = JSON.parse(localStorage.getItem(`${collectionName}_synced`) || '[]');
        if (!syncedIds.includes(id)) {
            syncedIds.push(id);
            localStorage.setItem(`${collectionName}_synced`, JSON.stringify(syncedIds));
        }
    } catch (error) {
        // La synchronisation se fera plus tard
    }
    
    return id;
};

/**
 * Suppression unifiée : localStorage + Firebase
 */
export const deleteData = async (collectionName: string, id: string) => {
    // Supprimer immédiatement du localStorage
    const localData = JSON.parse(localStorage.getItem(collectionName) || '[]');
    const filteredData = localData.filter((item: any) => item.id !== id);
    localStorage.setItem(collectionName, JSON.stringify(filteredData));
    
    // Supprimer des IDs synchronisés
    const syncedIds = JSON.parse(localStorage.getItem(`${collectionName}_synced`) || '[]');
    const filteredSyncedIds = syncedIds.filter((syncedId: string) => syncedId !== id);
    localStorage.setItem(`${collectionName}_synced`, JSON.stringify(filteredSyncedIds));
    
    // Tenter la suppression Firebase (si l'élément était synchronisé)
    // Note: La suppression Firebase nécessiterait une logique plus complexe
    // pour retrouver le document par son ID local
};

/**
 * Mise à jour unifiée : localStorage + Firebase
 */
export const updateData = async (collectionName: string, id: string, updatedData: any) => {
    const localData = JSON.parse(localStorage.getItem(collectionName) || '[]');
    const index = localData.findIndex((item: any) => item.id === id);
    
    if (index !== -1) {
        localData[index] = { ...localData[index], ...updatedData };
        localStorage.setItem(collectionName, JSON.stringify(localData));
    }
    
    try {
        await addDoc(collection(db, collectionName), updatedData);
    } catch (error) {
        // Synchronisation ultérieure
    }
};