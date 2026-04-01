// Service de base de données Supabase
import { supabase } from '../supabase';
import type { 
  User, Student, Document, DossierBourse, DossierHistoryEntry,
  Payment, CoursLangue, EntreeComptable, SortieComptable, Notification 
} from '../types/joda';

// ==================== UTILISATEURS ====================

// Créer un utilisateur
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: userData.username,
      email: userData.email,
      password_hash: (userData as any).password || '',
      role: userData.role,
      name: userData.name,
      must_change_password: userData.mustChangePassword || false
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir tous les utilisateurs
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Obtenir un utilisateur par ID
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir un utilisateur par email
export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) throw error;
  return data;
}

// Mettre à jour un utilisateur
export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Supprimer un utilisateur
export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== ÉTUDIANTS ====================

// Créer un étudiant
export async function createStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
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
      passeport_expiration: studentData.passeport?.expiration?.toString(),
      passeport_url: studentData.passeport?.document_url,
      choix: studentData.choix,
      created_by: studentData.createdBy
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir tous les étudiants
export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Obtenir un étudiant par ID
export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Mettre à jour un étudiant
export async function updateStudent(id: string, updates: Partial<Student>) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (updates.nom) updateData.nom = updates.nom;
  if (updates.prenom) updateData.prenom = updates.prenom;
  if (updates.email) updateData.email = updates.email;
  if (updates.telephone) updateData.telephone = updates.telephone;
  if (updates.age) updateData.age = updates.age;
  if (updates.sexe) updateData.sexe = updates.sexe;
  if (updates.niveau) updateData.niveau = updates.niveau;
  if (updates.filiere) updateData.filiere = updates.filiere;
  if (updates.langue) updateData.langue = updates.langue;
  if (updates.diplome_acquis) updateData.diplome_acquis = updates.diplome_acquis;
  if (updates.photo) updateData.photo_url = updates.photo;
  if (updates.passeport) {
    updateData.passeport_numero = updates.passeport.numero;
    updateData.passeport_expiration = updates.passeport.expiration?.toString();
    updateData.passeport_url = updates.passeport.document_url;
  }
  if (updates.choix) updateData.choix = updates.choix;

  const { data, error } = await supabase
    .from('students')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Supprimer un étudiant
export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== DOCUMENTS ====================

// Créer un document
export async function createDocument(docData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      student_id: docData.studentId,
      type: docData.type,
      status: docData.status,
      url: docData.url,
      uploaded_at: docData.uploadedAt?.toString(),
      validated_by: docData.validatedBy,
      rejection_reason: docData.rejectionReason
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les documents d'un étudiant
export async function getDocumentsByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
}

// Mettre à jour un document
export async function updateDocument(id: string, updates: Partial<Document>) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (updates.status) updateData.status = updates.status;
  if (updates.url) updateData.url = updates.url;
  if (updates.validatedBy) updateData.validated_by = updates.validatedBy;
  if (updates.rejectionReason) updateData.rejection_reason = updates.rejectionReason;

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ==================== DOSSIERS DE BOURSE ====================

// Créer un dossier de bourse
export async function createDossierBourse(dossierData: Omit<DossierBourse, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('dossier_bourses')
    .insert({
      student_id: dossierData.studentId,
      status: dossierData.status,
      notes_internes: dossierData.notes_internes,
      assigned_to: dossierData.assignedTo
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les dossiers de bourse
export async function getDossierBourses() {
  const { data, error } = await supabase
    .from('dossier_bourses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Obtenir un dossier de bourse par ID
export async function getDossierBourseById(id: string) {
  const { data, error } = await supabase
    .from('dossier_bourses')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir un dossier de bourse par ID étudiant
export async function getDossierBourseByStudentId(studentId: string) {
  const { data, error } = await supabase
    .from('dossier_bourses')
    .select('*')
    .eq('student_id', studentId)
    .single();
  
  if (error) throw error;
  return data;
}

// Mettre à jour un dossier de bourse
export async function updateDossierBourse(id: string, updates: Partial<DossierBourse>) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (updates.status) updateData.status = updates.status;
  if (updates.notes_internes) updateData.notes_internes = updates.notes_internes;
  if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;

  const { data, error } = await supabase
    .from('dossier_bourses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ==================== HISTORIQUE DES DOSSIERS ====================

// Ajouter une entrée d'historique
export async function addDossierHistory(historyData: Omit<DossierHistoryEntry, 'id'>) {
  const { data, error } = await supabase
    .from('dossier_history')
    .insert({
      dossier_id: historyData.dossierId,
      action: historyData.action,
      status: historyData.status,
      description: historyData.description,
      performed_by: historyData.performedBy,
      performed_at: historyData.performedAt?.toString(),
      metadata: historyData.metadata
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir l'historique d'un dossier
export async function getDossierHistory(dossierId: string) {
  const { data, error } = await supabase
    .from('dossier_history')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('performed_at', { ascending: true });
  
  if (error) throw error;
  return data;
}

// ==================== PAIEMENTS ====================

// Créer un paiement
export async function createPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      student_id: paymentData.studentId,
      type: paymentData.type,
      tranche: paymentData.tranche,
      montant: paymentData.montant,
      status: paymentData.status,
      date_limite: paymentData.date_limite?.toString(),
      date_paiement: paymentData.date_paiement?.toString(),
      penalites: paymentData.penalites,
      facture_url: paymentData.facture_url,
      recu_url: paymentData.recu_url,
      validated_by: paymentData.validatedBy
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les paiements
export async function getPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Obtenir les paiements d'un étudiant
export async function getPaymentsByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('date_limite', { ascending: true });
  
  if (error) throw error;
  return data;
}

// Mettre à jour un paiement
export async function updatePayment(id: string, updates: Partial<Payment>) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (updates.status) updateData.status = updates.status;
  if (updates.date_paiement) updateData.date_paiement = updates.date_paiement.toString();
  if (updates.penalites !== undefined) updateData.penalites = updates.penalites;
  if (updates.facture_url) updateData.facture_url = updates.facture_url;
  if (updates.recu_url) updateData.recu_url = updates.recu_url;
  if (updates.validatedBy) updateData.validated_by = updates.validatedBy;

  const { data, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ==================== COURS DE LANGUES ====================

// Créer un cours de langue
export async function createCoursLangue(coursData: Omit<CoursLangue, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('cours_langues')
    .insert({
      student_id: coursData.studentId,
      langue: coursData.langue,
      statut: coursData.statut,
      inscrit_le: coursData.inscrit_le?.toString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les cours de langue
export async function getCoursLangues() {
  const { data, error } = await supabase
    .from('cours_langues')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Obtenir les cours de langue d'un étudiant
export async function getCoursLanguesByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('cours_langues')
    .select('*')
    .eq('student_id', studentId);
  
  if (error) throw error;
  return data;
}

// Mettre à jour un cours de langue
export async function updateCoursLangue(id: string, updates: Partial<CoursLangue>) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (updates.statut) updateData.statut = updates.statut;

  const { data, error } = await supabase
    .from('cours_langues')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ==================== COMPTABILITÉ ====================

// Créer une entrée comptable
export async function createEntreeComptable(entreeData: Omit<EntreeComptable, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('entrees_comptables')
    .insert({
      montant: entreeData.montant,
      date: entreeData.date?.toString(),
      type: entreeData.type,
      description: entreeData.description,
      student_id: entreeData.studentId,
      payment_id: entreeData.paymentId,
      created_by: entreeData.createdBy
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les entrées comptables
export async function getEntreesComptables() {
  const { data, error } = await supabase
    .from('entrees_comptables')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Créer une sortie comptable
export async function createSortieComptable(sortieData: Omit<SortieComptable, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('sorties_comptables')
    .insert({
      montant: sortieData.montant,
      date: sortieData.date?.toString(),
      categorie: sortieData.categorie,
      description: sortieData.description,
      justificatif_url: sortieData.justificatif_url,
      validated_by: sortieData.validatedBy,
      created_by: sortieData.createdBy
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les sorties comptables
export async function getSortiesComptables() {
  const { data, error } = await supabase
    .from('sorties_comptables')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// ==================== NOTIFICATIONS ====================

// Créer une notification
export async function createNotification(notifData: Omit<Notification, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notifData.userId,
      type: notifData.type,
      titre: notifData.titre,
      message: notifData.message,
      read: notifData.read,
      metadata: notifData.metadata
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Obtenir les notifications d'un utilisateur
export async function getNotificationsByUser(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Mettre à jour une notification (marquer comme lu)
export async function updateNotification(id: string, updates: Partial<Notification>) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: updates.read })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Marquer toutes les notifications comme lues
export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);
  
  if (error) throw error;
}

// ==================== UNIVERSITÉS ====================

// Obtenir les universités
export async function getUniversities() {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('active', true)
    .order('nom', { ascending: true });
  
  if (error) throw error;
  return data;
}

// Créer une université
export async function createUniversity(universityData: any) {
  const { data, error } = await supabase
    .from('universities')
    .insert(universityData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ==================== STATISTIQUES ====================

// Obtenir les statistiques globales
export async function getStats() {
  const [studentsCount, dossiersCount, paymentsCount, usersCount] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('dossier_bourses').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true })
  ]);

  return {
    students: studentsCount.count || 0,
    dossiers: dossiersCount.count || 0,
    payments: paymentsCount.count || 0,
    users: usersCount.count || 0
  };
}

// Obtenir les statistiques des paiements
export async function getPaymentStats() {
  const { data, error } = await supabase
    .from('payments')
    .select('montant, status');
  
  if (error) throw error;
  
  const stats = {
    totalPaye: 0,
    totalAttente: 0,
    totalRetard: 0
  };
  
  data?.forEach(payment => {
    if (payment.status === 'paye') stats.totalPaye += payment.montant;
    else if (payment.status === 'attente') stats.totalAttente += payment.montant;
    else if (payment.status === 'retard') stats.totalRetard += payment.montant;
  });
  
  return stats;
}