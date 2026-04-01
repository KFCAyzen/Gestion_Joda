import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { 
  Student, Document, DossierBourse, DossierHistoryEntry,
  Payment, CoursLangue, EntreeComptable, SortieComptable, Notification
} from '../types/joda';

// Helper pour parser les dates depuis Supabase
const parseDate = (dateStr: string | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  return new Date(dateStr);
};

// ==================== ÉTUDIANTS ====================

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (err) throw err;
      
      setStudents(data?.map(s => ({
        id: s.id,
        nom: s.nom,
        prenom: s.prenom,
        email: s.email || '',
        telephone: s.telephone || '',
        age: s.age || 0,
        sexe: s.sexe || 'M',
        niveau: s.niveau || '',
        filiere: s.filiere || '',
        langue: s.langue || '',
        diplome_acquis: s.diplome_acquis || '',
        photo: s.photo_url,
        passeport: {
          numero: s.passeport_numero || '',
          expiration: parseDate(s.passeport_expiration) || new Date(),
          document_url: s.passeport_url
        },
        choix: s.choix || 'procedure_seule',
        createdAt: parseDate(s.created_at) || new Date(),
        updatedAt: parseDate(s.updated_at) || new Date(),
        createdBy: s.created_by || ''
      })) || []);
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
      const { error: err } = await supabase
        .from('students')
        .insert({
          nom: studentData.nom,
          prenom: studentData.prenom,
          email: studentData.email,
          telephone: studentData.telephone,
          age: studentData.age,
          sexe: studentData.sexe,
          niveau: studentData.niveau,
          filiere: studentData.filiere,
          langue: studentData.langue,
          diplome_acquis: studentData.diplome_acquis,
          photo_url: studentData.photo,
          passeport_numero: studentData.passeport?.numero,
          passeport_expiration: studentData.passeport?.expiration?.toISOString(),
          passeport_url: studentData.passeport?.document_url,
          choix: studentData.choix,
          created_by: studentData.createdBy
        });
      
      if (err) throw err;
      await loadStudents();
      return true;
    } catch (err) {
      setError('Erreur lors de la création de l\'étudiant');
      return false;
    }
  }, [loadStudents]);

  const editStudent = useCallback(async (id: string, data: Partial<Student>) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (data.nom) updateData.nom = data.nom;
      if (data.prenom) updateData.prenom = data.prenom;
      if (data.email) updateData.email = data.email;
      if (data.telephone) updateData.telephone = data.telephone;
      if (data.age) updateData.age = data.age;
      if (data.sexe) updateData.sexe = data.sexe;
      if (data.niveau) updateData.niveau = data.niveau;
      if (data.filiere) updateData.filiere = data.filiere;
      if (data.langue) updateData.langue = data.langue;
      if (data.diplome_acquis) updateData.diplome_acquis = data.diplome_acquis;
      if (data.photo) updateData.photo_url = data.photo;
      if (data.passeport) {
        updateData.passeport_numero = data.passeport.numero;
        updateData.passeport_expiration = data.passeport.expiration?.toISOString();
        updateData.passeport_url = data.passeport.document_url;
      }
      if (data.choix) updateData.choix = data.choix;

      const { error: err } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id);
      
      if (err) throw err;
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

// ==================== DOCUMENTS ====================

export function useStudentDocuments(studentId: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });
      
      if (err) throw err;
      
      setDocuments(data?.map(d => ({
        id: d.id,
        studentId: d.student_id,
        type: d.type,
        status: d.status,
        url: d.url,
        uploadedAt: parseDate(d.uploaded_at),
        validatedAt: parseDate(d.validated_at),
        validatedBy: d.validated_by,
        rejectionReason: d.rejection_reason,
        createdAt: parseDate(d.created_at) || new Date(),
        updatedAt: parseDate(d.updated_at) || new Date()
      })) || []);
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
      const { error: err } = await supabase
        .from('documents')
        .insert({
          student_id: docData.studentId,
          type: docData.type,
          status: docData.status,
          url: docData.url,
          uploaded_at: docData.uploadedAt?.toISOString(),
          validated_by: docData.validatedBy,
          rejection_reason: docData.rejectionReason
        });
      
      if (err) throw err;
      await loadDocuments();
      return true;
    } catch (err) {
      setError('Erreur lors de l\'ajout du document');
      return false;
    }
  }, [loadDocuments]);

  const validateDocument = useCallback(async (id: string, status: Document['status'], validatedBy?: string, rejectionReason?: string) => {
    try {
      const { error: err } = await supabase
        .from('documents')
        .update({
          status,
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (err) throw err;
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

// ==================== DOSSIERS DE BOURSE ====================

export function useDossiersBourses() {
  const [dossiers, setDossiers] = useState<DossierBourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDossiersByStatus = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('dossier_bourses').select('*');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error: err } = await query.order('created_at', { ascending: false });
      
      if (err) throw err;
      
      // Charger l'historique pour chaque dossier
      const dossiersWithHistory = await Promise.all(
        (data || []).map(async (d) => {
          const { data: history } = await supabase
            .from('dossier_history')
            .select('*')
            .eq('dossier_id', d.id)
            .order('performed_at', { ascending: true });
          
          return {
            id: d.id,
            studentId: d.student_id,
            status: d.status,
            historique: history?.map(h => ({
              id: h.id,
              action: h.action,
              status: h.status,
              description: h.description,
              performedBy: h.performed_by,
              performedAt: parseDate(h.performed_at) || new Date(),
              metadata: h.metadata
            })) || [],
            notes_internes: d.notes_internes || '',
            createdAt: parseDate(d.created_at) || new Date(),
            updatedAt: parseDate(d.updated_at) || new Date(),
            assignedTo: d.assigned_to
          };
        })
      );
      
      setDossiers(dossiersWithHistory);
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
      const { data, error: err } = await supabase
        .from('dossier_bourses')
        .insert({
          student_id: dossierData.studentId,
          status: dossierData.status || 'document_recu',
          notes_internes: dossierData.notes_internes || '',
          assigned_to: dossierData.assignedTo
        })
        .select()
        .single();
      
      if (err) throw err;
      
      // Créer l'entrée d'historique
      if (data) {
        await supabase.from('dossier_history').insert({
          dossier_id: data.id,
          action: 'Création du dossier',
          status: 'document_recu',
          description: 'Dossier de bourse créé',
          performed_by: dossierData.assignedTo || '',
          performed_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (err) {
      setError('Erreur lors de la création du dossier');
      return false;
    }
  }, []);

  const changeDossierStatus = useCallback(async (id: string, newStatus: string, performedBy: string, description: string) => {
    try {
      const { error: err } = await supabase
        .from('dossier_bourses')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (err) throw err;
      
      // Ajouter l'entrée d'historique
      await supabase.from('dossier_history').insert({
        dossier_id: id,
        action: `Changement de statut vers ${newStatus}`,
        status: newStatus,
        description,
        performed_by: performedBy,
        performed_at: new Date().toISOString()
      });
      
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

// ==================== PAIEMENTS ====================

export function usePayments(studentId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [overduePayments, setOverduePayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger tous les paiements ou ceux d'un étudiant
      let query = supabase.from('payments').select('*');
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error: err } = await query.order('date_limite', { ascending: true });
      
      if (err) throw err;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const parsedPayments = data?.map(p => ({
        id: p.id,
        studentId: p.student_id,
        type: p.type,
        tranche: p.tranche,
        montant: p.montant,
        status: p.status,
        date_limite: parseDate(p.date_limite) || new Date(),
        date_paiement: parseDate(p.date_paiement),
        penalites: p.penalites || 0,
        facture_url: p.facture_url,
        recu_url: p.recu_url,
        validatedBy: p.validated_by,
        validatedAt: parseDate(p.validated_at),
        createdAt: parseDate(p.created_at) || new Date(),
        updatedAt: parseDate(p.updated_at) || new Date()
      })) || [];
      
      setPayments(parsedPayments);
      
      // Filtrer les paiements en retard
      const overdue = parsedPayments.filter(p => 
        p.status !== 'paye' && 
        new Date(p.date_limite) < today
      );
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
      const { error: err } = await supabase
        .from('payments')
        .insert({
          student_id: paymentData.studentId,
          type: paymentData.type,
          tranche: paymentData.tranche,
          montant: paymentData.montant,
          status: paymentData.status,
          date_limite: paymentData.date_limite?.toISOString(),
          date_paiement: paymentData.date_paiement?.toISOString(),
          penalites: paymentData.penalites,
          facture_url: paymentData.facture_url,
          recu_url: paymentData.recu_url,
          validated_by: paymentData.validatedBy
        });
      
      if (err) throw err;
      await loadPayments();
      return true;
    } catch (err) {
      setError('Erreur lors de la création du paiement');
      return false;
    }
  }, [loadPayments]);

  const validatePayment = useCallback(async (id: string, status: Payment['status'], validatedBy?: string) => {
    try {
      const { error: err } = await supabase
        .from('payments')
        .update({
          status,
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          date_paiement: status === 'paye' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (err) throw err;
      await loadPayments();
      return true;
    } catch (err) {
      setError('Erreur lors de la validation du paiement');
      return false;
    }
  }, [loadPayments]);

  const updatePenalties = useCallback(async () => {
    try {
      // Calculer les pénalités pour les paiements en retard
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: latePayments } = await supabase
        .from('payments')
        .select('*')
        .neq('status', 'paye');
      
      if (latePayments) {
        for (const p of latePayments) {
          const dateLimite = new Date(p.date_limite);
          dateLimite.setHours(0, 0, 0, 0);
          
          // 3 jours de grâce
          const graceDate = new Date(dateLimite);
          graceDate.setDate(graceDate.getDate() + 3);
          
          if (today > graceDate) {
            const daysLate = Math.floor((today.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24));
            const penalties = daysLate * 10000; // 10 000 Fcfa par jour
            
            await supabase
              .from('payments')
              .update({ penalites: penalties })
              .eq('id', p.id);
          }
        }
      }
      
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

// ==================== COURS DE LANGUES ====================

export function useCoursLangues(studentId?: string) {
  const [cours, setCours] = useState<CoursLangue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCours = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('cours_langues')
        .select('*')
        .eq('student_id', studentId);
      
      if (err) throw err;
      
      setCours(data?.map(c => ({
        id: c.id,
        studentId: c.student_id,
        langue: c.langue,
        statut: c.statut,
        inscrit_le: parseDate(c.inscrit_le) || new Date(),
        createdAt: parseDate(c.created_at) || new Date(),
        updatedAt: parseDate(c.updated_at) || new Date(),
        paiements: {} as any // À implémenter si nécessaire
      })) || []);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des cours');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addCours = useCallback(async (coursData: Omit<CoursLangue, 'id' | 'paiements'>) => {
    try {
      const { error: err } = await supabase
        .from('cours_langues')
        .insert({
          student_id: coursData.studentId,
          langue: coursData.langue,
          statut: coursData.statut || 'actif',
          inscrit_le: coursData.inscrit_le?.toISOString()
        });
      
      if (err) throw err;
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

// ==================== COMPTABILITÉ ====================

export function useComptabilite() {
  const [entrees, setEntrees] = useState<EntreeComptable[]>([]);
  const [sorties, setSorties] = useState<SortieComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComptabilite = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      
      const [entreesRes, sortiesRes] = await Promise.all([
        supabase
          .from('entrees_comptables')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase
          .from('sorties_comptables')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: false })
      ]);
      
      if (entreesRes.error) throw entreesRes.error;
      if (sortiesRes.error) throw sortiesRes.error;
      
      setEntrees(entreesRes.data?.map(e => ({
        id: e.id,
        montant: e.montant,
        date: parseDate(e.date) || new Date(),
        type: e.type,
        description: e.description || '',
        studentId: e.student_id,
        paymentId: e.payment_id,
        createdBy: e.created_by,
        createdAt: parseDate(e.created_at) || new Date()
      })) || []);
      
      setSorties(sortiesRes.data?.map(s => ({
        id: s.id,
        montant: s.montant,
        date: parseDate(s.date) || new Date(),
        categorie: s.categorie,
        description: s.description || '',
        justificatif_url: s.justificatif_url,
        validatedBy: s.validated_by,
        validatedAt: parseDate(s.validated_at),
        createdBy: s.created_by,
        createdAt: parseDate(s.created_at) || new Date(),
        updatedAt: parseDate(s.updated_at) || new Date()
      })) || []);
      
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
      const { error: err } = await supabase
        .from('entrees_comptables')
        .insert({
          montant: entreeData.montant,
          date: entreeData.date?.toISOString().split('T')[0],
          type: entreeData.type,
          description: entreeData.description,
          student_id: entreeData.studentId,
          payment_id: entreeData.paymentId,
          created_by: entreeData.createdBy
        });
      
      if (err) throw err;
      return true;
    } catch (err) {
      setError('Erreur lors de l\'ajout de l\'entrée');
      return false;
    }
  }, []);

  const addSortie = useCallback(async (sortieData: Omit<SortieComptable, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { error: err } = await supabase
        .from('sorties_comptables')
        .insert({
          montant: sortieData.montant,
          date: sortieData.date?.toISOString().split('T')[0],
          categorie: sortieData.categorie,
          description: sortieData.description,
          justificatif_url: sortieData.justificatif_url,
          validated_by: sortieData.validatedBy,
          created_by: sortieData.createdBy
        });
      
      if (err) throw err;
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

// ==================== NOTIFICATIONS ====================

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (err) throw err;
      
      setNotifications(data?.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        titre: n.titre,
        message: n.message,
        read: n.read,
        createdAt: parseDate(n.created_at) || new Date(),
        metadata: n.metadata
      })) || []);
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
      const { error: err } = await supabase
        .from('notifications')
        .insert({
          user_id: notifData.userId,
          type: notifData.type,
          titre: notifData.titre,
          message: notifData.message,
          read: notifData.read,
          metadata: notifData.metadata
        });
      
      if (err) throw err;
      await loadNotifications();
      return true;
    } catch (err) {
      setError('Erreur lors de la création de la notification');
      return false;
    }
  }, [loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (err) throw err;
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

// ==================== STATISTIQUES ====================

export function useStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const [studentsRes, dossiersRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('dossier_bourses').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('montant, status')
      ]);
      
      if (studentsRes.error) throw studentsRes.error;
      if (dossiersRes.error) throw dossiersRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      
      const paymentStats = { totalPaye: 0, totalAttente: 0, totalRetard: 0 };
      paymentsRes.data?.forEach(p => {
        if (p.status === 'paye') paymentStats.totalPaye += p.montant;
        else if (p.status === 'attente') paymentStats.totalAttente += p.montant;
        else if (p.status === 'retard') paymentStats.totalRetard += p.montant;
      });
      
      setStats({
        students: studentsRes.count || 0,
        dossiers: dossiersRes.count || 0,
        payments: paymentStats
      });
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