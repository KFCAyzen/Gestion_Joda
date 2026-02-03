import { useState, useEffect, useCallback } from 'react';
import {
  Student,
  Document,
  DossierBourse,
  Payment,
  CoursLangue,
  EntreeComptable,
  SortieComptable,
  Notification,
  DossierStatus,
  PaymentStatus
} from '../types/joda';
import {
  getAllStudents,
  createStudent,
  updateStudent,
  getStudent,
  getStudentsByChoice,
  getStudentDocuments,
  createStudentDocument,
  updateDocumentStatus,
  createDossierBourse,
  updateDossierStatus,
  getDossiersByStatus,
  getStudentPayments,
  createPayment,
  updatePaymentStatus,
  getOverduePayments,
  calculatePenalties,
  createCoursLangue,
  getStudentCours,
  createEntreeComptable,
  createSortieComptable,
  getEntreesByPeriod,
  getSortiesByPeriod,
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  getStudentStats
} from '../utils/firebaseOperations';

// Hook pour la gestion des étudiants
export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllStudents();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des étudiants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createStudent(studentData);
      await loadStudents();
      return true;
    } catch (err) {
      setError('Erreur lors de la création de l\'étudiant');
      return false;
    }
  }, [loadStudents]);

  const editStudent = useCallback(async (id: string, data: Partial<Student>) => {
    try {
      await updateStudent(id, data);
      await loadStudents();
      return true;
    } catch (err) {
      setError('Erreur lors de la modification de l\'étudiant');
      return false;
    }
  }, [loadStudents]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return {
    students,
    loading,
    error,
    loadStudents,
    addStudent,
    editStudent
  };
}

// Hook pour la gestion des documents
export function useStudentDocuments(studentId: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      const data = await getStudentDocuments(studentId);
      setDocuments(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addDocument = useCallback(async (docData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createStudentDocument(docData);
      await loadDocuments();
      return true;
    } catch (err) {
      setError('Erreur lors de l\'ajout du document');
      return false;
    }
  }, [loadDocuments]);

  const validateDocument = useCallback(async (id: string, status: Document['status'], validatedBy?: string, rejectionReason?: string) => {
    try {
      await updateDocumentStatus(id, status, validatedBy, rejectionReason);
      await loadDocuments();
      return true;
    } catch (err) {
      setError('Erreur lors de la validation du document');
      return false;
    }
  }, [loadDocuments]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    loading,
    error,
    loadDocuments,
    addDocument,
    validateDocument
  };
}

// Hook pour la gestion des dossiers de bourses
export function useDossiersBourses() {
  const [dossiers, setDossiers] = useState<DossierBourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDossiersByStatus = useCallback(async (status?: DossierStatus) => {
    try {
      setLoading(true);
      const data = status ? await getDossiersByStatus(status) : [];
      setDossiers(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des dossiers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDossier = useCallback(async (dossierData: Omit<DossierBourse, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createDossierBourse(dossierData);
      return true;
    } catch (err) {
      setError('Erreur lors de la création du dossier');
      return false;
    }
  }, []);

  const changeDossierStatus = useCallback(async (id: string, newStatus: DossierStatus, performedBy: string, description: string) => {
    try {
      await updateDossierStatus(id, newStatus, performedBy, description);
      return true;
    } catch (err) {
      setError('Erreur lors du changement de statut');
      return false;
    }
  }, []);

  return {
    dossiers,
    loading,
    error,
    loadDossiersByStatus,
    createDossier,
    changeDossierStatus
  };
}

// Hook pour la gestion des paiements
export function usePayments(studentId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [overduePayments, setOverduePayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      if (studentId) {
        const data = await getStudentPayments(studentId);
        setPayments(data);
      }
      
      const overdue = await getOverduePayments();
      setOverduePayments(overdue);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des paiements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createPayment(paymentData);
      await loadPayments();
      return true;
    } catch (err) {
      setError('Erreur lors de la création du paiement');
      return false;
    }
  }, [loadPayments]);

  const validatePayment = useCallback(async (id: string, status: PaymentStatus, validatedBy?: string) => {
    try {
      await updatePaymentStatus(id, status, validatedBy);
      await loadPayments();
      return true;
    } catch (err) {
      setError('Erreur lors de la validation du paiement');
      return false;
    }
  }, [loadPayments]);

  const updatePenalties = useCallback(async () => {
    try {
      await calculatePenalties();
      await loadPayments();
      return true;
    } catch (err) {
      setError('Erreur lors du calcul des pénalités');
      return false;
    }
  }, [loadPayments]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return {
    payments,
    overduePayments,
    loading,
    error,
    loadPayments,
    addPayment,
    validatePayment,
    updatePenalties
  };
}

// Hook pour la gestion des cours de langues
export function useCoursLangues(studentId?: string) {
  const [cours, setCours] = useState<CoursLangue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCours = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      const data = await getStudentCours(studentId);
      setCours(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des cours');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addCours = useCallback(async (coursData: Omit<CoursLangue, 'id'>) => {
    try {
      await createCoursLangue(coursData);
      await loadCours();
      return true;
    } catch (err) {
      setError('Erreur lors de l\'inscription au cours');
      return false;
    }
  }, [loadCours]);

  useEffect(() => {
    loadCours();
  }, [loadCours]);

  return {
    cours,
    loading,
    error,
    loadCours,
    addCours
  };
}

// Hook pour la comptabilité
export function useComptabilite() {
  const [entrees, setEntrees] = useState<EntreeComptable[]>([]);
  const [sorties, setSorties] = useState<SortieComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComptabilite = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      const [entreesData, sortiesData] = await Promise.all([
        getEntreesByPeriod(startDate, endDate),
        getSortiesByPeriod(startDate, endDate)
      ]);
      
      setEntrees(entreesData);
      setSorties(sortiesData);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement de la comptabilité');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEntree = useCallback(async (entreeData: Omit<EntreeComptable, 'id' | 'createdAt'>) => {
    try {
      await createEntreeComptable(entreeData);
      return true;
    } catch (err) {
      setError('Erreur lors de l\'ajout de l\'entrée');
      return false;
    }
  }, []);

  const addSortie = useCallback(async (sortieData: Omit<SortieComptable, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createSortieComptable(sortieData);
      return true;
    } catch (err) {
      setError('Erreur lors de l\'ajout de la sortie');
      return false;
    }
  }, []);

  return {
    entrees,
    sorties,
    loading,
    error,
    loadComptabilite,
    addEntree,
    addSortie
  };
}

// Hook pour les notifications
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await getUserNotifications(userId);
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addNotification = useCallback(async (notifData: Omit<Notification, 'id' | 'createdAt'>) => {
    try {
      await createNotification(notifData);
      await loadNotifications();
      return true;
    } catch (err) {
      setError('Erreur lors de la création de la notification');
      return false;
    }
  }, [loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);
      await loadNotifications();
      return true;
    } catch (err) {
      setError('Erreur lors du marquage de la notification');
      return false;
    }
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    loadNotifications,
    addNotification,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
}

// Hook pour les statistiques
export function useStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStudentStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    loadStats
  };
}