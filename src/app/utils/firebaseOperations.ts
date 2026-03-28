import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
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

const COLLECTIONS = {
  STUDENTS: 'students',
  DOCUMENTS: 'documents', 
  DOSSIERS: 'dossiers_bourses',
  PAYMENTS: 'payments',
  COURS_LANGUES: 'cours_langues',
  ENTREES: 'entrees_comptables',
  SORTIES: 'sorties_comptables',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages'
} as const;

export async function createDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.code === 'deadline-exceeded') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    }
    throw err;
  }
}

export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() } as any);
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as T;
  return null;
}

export async function getAllDocuments<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
  } catch {
    return [];
  }
}

// Étudiants
export async function createStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return createDocument<Student>(COLLECTIONS.STUDENTS, studentData as Omit<Student, 'id'>);
}
export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  return updateDocument<Student>(COLLECTIONS.STUDENTS, id, data);
}
export async function getStudent(id: string): Promise<Student | null> {
  return getDocument<Student>(COLLECTIONS.STUDENTS, id);
}
export async function getAllStudents(): Promise<Student[]> {
  return getAllDocuments<Student>(COLLECTIONS.STUDENTS);
}
export async function getStudentsByChoice(choice: Student['choix']): Promise<Student[]> {
  const q = query(collection(db, COLLECTIONS.STUDENTS), where('choix', '==', choice));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
}

// Documents
export async function createStudentDocument(docData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return createDocument<Document>(COLLECTIONS.DOCUMENTS, docData as Omit<Document, 'id'>);
}
export async function updateDocumentStatus(id: string, status: Document['status'], validatedBy?: string, rejectionReason?: string): Promise<void> {
  return updateDocument<Document>(COLLECTIONS.DOCUMENTS, id, {
    status,
    validatedAt: status === 'valide' ? new Date() : undefined,
    validatedBy: status === 'valide' ? validatedBy : undefined,
    rejectionReason: status === 'non_conforme' ? rejectionReason : undefined
  });
}
export async function getStudentDocuments(studentId: string): Promise<Document[]> {
  const q = query(collection(db, COLLECTIONS.DOCUMENTS), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Document));
}

// Dossiers de bourses
export async function createDossierBourse(dossierData: Omit<DossierBourse, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return createDocument<DossierBourse>(COLLECTIONS.DOSSIERS, dossierData as Omit<DossierBourse, 'id'>);
}
export async function updateDossierStatus(id: string, newStatus: DossierStatus, performedBy: string, description: string): Promise<void> {
  const dossier = await getDocument<DossierBourse>(COLLECTIONS.DOSSIERS, id);
  if (!dossier) throw new Error('Dossier non trouvé');
  return updateDocument<DossierBourse>(COLLECTIONS.DOSSIERS, id, {
    status: newStatus,
    historique: [...dossier.historique, {
      id: Date.now().toString(),
      action: `Changement de statut vers ${newStatus}`,
      status: newStatus,
      description,
      performedBy,
      performedAt: new Date()
    }]
  });
}
export async function getDossiersByStatus(status: DossierStatus): Promise<DossierBourse[]> {
  const q = query(collection(db, COLLECTIONS.DOSSIERS), where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DossierBourse));
}

// Paiements
export async function createPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return createDocument<Payment>(COLLECTIONS.PAYMENTS, paymentData as Omit<Payment, 'id'>);
}
export async function updatePaymentStatus(id: string, status: PaymentStatus, validatedBy?: string): Promise<void> {
  return updateDocument<Payment>(COLLECTIONS.PAYMENTS, id, {
    status,
    validatedBy: status === 'paye' ? validatedBy : undefined,
    validatedAt: status === 'paye' ? new Date() : undefined,
    date_paiement: status === 'paye' ? new Date() : undefined
  });
}
export async function getStudentPayments(studentId: string): Promise<Payment[]> {
  const q = query(collection(db, COLLECTIONS.PAYMENTS), where('studentId', '==', studentId), orderBy('tranche', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
}
export async function getOverduePayments(): Promise<Payment[]> {
  const q = query(collection(db, COLLECTIONS.PAYMENTS), where('status', '==', 'attente'), where('date_limite', '<', new Date()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
}
export async function calculatePenalties(): Promise<void> {
  const overduePayments = await getOverduePayments();
  const batch = writeBatch(db);
  overduePayments.forEach(payment => {
    const raw = payment.date_limite as any;
    const dueDate = raw?.toDate ? raw.toDate() : new Date(raw);
    const daysLate = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
    let penaltyAmount = 0;
    if (payment.type === 'bourse' && daysLate > 3) penaltyAmount = (daysLate - 3) * 10000;
    else if ((payment.type === 'mandarin' || payment.type === 'anglais') && payment.tranche === 1 && daysLate > 14) penaltyAmount = (daysLate - 14) * 500;
    else if ((payment.type === 'mandarin' || payment.type === 'anglais') && payment.tranche > 1 && daysLate > 30) penaltyAmount = (daysLate - 30) * 1000;
    if (penaltyAmount !== payment.penalites) {
      batch.update(doc(db, COLLECTIONS.PAYMENTS, payment.id), { penalites: penaltyAmount, status: 'retard' as PaymentStatus, updatedAt: Timestamp.now() });
    }
  });
  await batch.commit();
}

// Cours de langues
export async function createCoursLangue(coursData: Omit<CoursLangue, 'id'>): Promise<string> {
  return createDocument<CoursLangue>(COLLECTIONS.COURS_LANGUES, coursData);
}
export async function getStudentCours(studentId: string): Promise<CoursLangue[]> {
  const q = query(collection(db, COLLECTIONS.COURS_LANGUES), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CoursLangue));
}
export async function createCoursLangueWithPayments(studentId: string, langue: 'mandarin' | 'anglais', _createdBy: string): Promise<string> {
  const montants = langue === 'mandarin'
    ? { INSCRIPTION: 10000, LIVRE: 11000, TRANCHE_1: 50000, TRANCHE_2: 50000 }
    : { INSCRIPTION: 10000, LIVRE: 11000, TRANCHE_1: 30000, TRANCHE_2: 40000 };
  const now = new Date();
  const [inscriptionId, livreId, tranche1Id, tranche2Id] = await Promise.all([
    createPayment({ studentId, type: langue, tranche: 1, montant: montants.INSCRIPTION, status: 'attente', date_limite: new Date(now.getTime() + 14 * 86400000), penalites: 0 }),
    createPayment({ studentId, type: langue, tranche: 2, montant: montants.LIVRE, status: 'attente', date_limite: new Date(now.getTime() + 14 * 86400000), penalites: 0 }),
    createPayment({ studentId, type: langue, tranche: 3, montant: montants.TRANCHE_1, status: 'attente', date_limite: new Date(now.getTime() + 30 * 86400000), penalites: 0 }),
    createPayment({ studentId, type: langue, tranche: 4, montant: montants.TRANCHE_2, status: 'attente', date_limite: new Date(now.getTime() + 60 * 86400000), penalites: 0 }),
  ]);
  const [inscription, livre, tranche1, tranche2] = await Promise.all([
    getDocument<Payment>(COLLECTIONS.PAYMENTS, inscriptionId),
    getDocument<Payment>(COLLECTIONS.PAYMENTS, livreId),
    getDocument<Payment>(COLLECTIONS.PAYMENTS, tranche1Id),
    getDocument<Payment>(COLLECTIONS.PAYMENTS, tranche2Id),
  ]);
  const coursId = await createCoursLangue({ studentId, langue, paiements: { inscription: inscription!, livre: livre!, tranche1: tranche1!, tranche2: tranche2! }, inscrit_le: now, statut: 'actif' });
  await updateStudent(studentId, { choix: 'procedure_cours' });
  return coursId;
}

// Comptabilité
export async function createEntreeComptable(entreeData: Omit<EntreeComptable, 'id' | 'createdAt'>): Promise<string> {
  return createDocument<EntreeComptable>(COLLECTIONS.ENTREES, entreeData as Omit<EntreeComptable, 'id'>);
}
export async function createSortieComptable(sortieData: Omit<SortieComptable, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return createDocument<SortieComptable>(COLLECTIONS.SORTIES, sortieData as Omit<SortieComptable, 'id'>);
}
export async function getEntreesByPeriod(startDate: Date, endDate: Date): Promise<EntreeComptable[]> {
  const q = query(collection(db, COLLECTIONS.ENTREES), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as EntreeComptable));
}
export async function getSortiesByPeriod(startDate: Date, endDate: Date): Promise<SortieComptable[]> {
  const q = query(collection(db, COLLECTIONS.SORTIES), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SortieComptable));
}

// Notifications
export async function createNotification(notifData: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
  return createDocument<Notification>(COLLECTIONS.NOTIFICATIONS, notifData as Omit<Notification, 'id'>);
}
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
}
export async function markNotificationAsRead(id: string): Promise<void> {
  return updateDocument<Notification>(COLLECTIONS.NOTIFICATIONS, id, { read: true });
}

// Statistiques
export async function getStudentStats() {
  const students = await getAllStudents();
  const dossiers = await getAllDocuments<DossierBourse>(COLLECTIONS.DOSSIERS);
  return {
    totalStudents: students.length,
    byChoice: {
      procedure_seule: students.filter(s => s.choix === 'procedure_seule').length,
      cours_seuls: students.filter(s => s.choix === 'cours_seuls').length,
      procedure_cours: students.filter(s => s.choix === 'procedure_cours').length
    },
    dossiersByStatus: {
      document_recu: dossiers.filter(d => d.status === 'document_recu').length,
      en_attente: dossiers.filter(d => d.status === 'en_attente').length,
      en_cours: dossiers.filter(d => d.status === 'en_cours').length,
      document_manquant: dossiers.filter(d => d.status === 'document_manquant').length,
      admission_validee: dossiers.filter(d => d.status === 'admission_validee').length,
      admission_rejetee: dossiers.filter(d => d.status === 'admission_rejetee').length,
      en_attente_universite: dossiers.filter(d => d.status === 'en_attente_universite').length,
      visa_en_cours: dossiers.filter(d => d.status === 'visa_en_cours').length,
      termine: dossiers.filter(d => d.status === 'termine').length
    }
  };
}
