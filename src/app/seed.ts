// Script de seed pour la base de données Supabase
// Exécuter avec: npx tsx src/app/seed.ts

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Générer un UUID aléatoire
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function seedDatabase() {
  console.log('🌱 Début du seeding de la base de données...\n');

  try {
    // 1. Créer des utilisateurs avec des IDs fixes pour les foreign keys
    console.log('👤 Création des utilisateurs...');
    
    const adminId = generateId();
    const agentId = generateId();
    const studentUserId = generateId();

    const users = [
      {
        id: adminId,
        username: 'superadmin',
        email: 'admin@joda.com',
        password_hash: 'hashed_password_superadmin',
        role: 'admin',
        name: 'Super Administrateur',
        must_change_password: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: agentId,
        username: 'agent1',
        email: 'agent1@joda.com',
        password_hash: 'hashed_password_agent1',
        role: 'agent',
        name: 'Pierre Agent',
        must_change_password: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: studentUserId,
        username: 'student1',
        email: 'etudiant@test.com',
        password_hash: 'hashed_password_student1',
        role: 'student',
        name: 'Jean Dupont',
        must_change_password: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: usersError } = await supabase.from('users').upsert(users, { onConflict: 'email' });
    if (usersError) {
      console.error('Erreur création utilisateurs:', usersError.message);
    } else {
      console.log('✅ 3 utilisateurs créés');
    }

    // 2. Créer des universités
    console.log('\n🏛️ Création des universités...');
    
    const pkuId = generateId();
    const tsinghuaId = generateId();
    const fudanId = generateId();
    const zhejiangId = generateId();
    
    const universities = [
      {
        id: pkuId,
        nom: 'Université de Pekin (PKU)',
        pays: 'Chine',
        ville: 'Pékin',
        programme: 'Licence, Master, Doctorat',
        niveau_etude: 'Tous niveaux',
        criteres_admission: 'Bac + 12 min, HSK 4',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: tsinghuaId,
        nom: 'Université Tsinghua',
        pays: 'Chine',
        ville: 'Pékin',
        programme: 'Ingénierie, Sciences, Gestion',
        niveau_etude: 'Master, Doctorat',
        criteres_admission: 'Bac + 16 min, HSK 5',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: fudanId,
        nom: 'Université Fudan',
        pays: 'Chine',
        ville: 'Shanghai',
        programme: 'Médecine, Ingénierie, Commerce',
        niveau_etude: 'Licence, Master',
        criteres_admission: 'Bac + 12 min, HSK 4',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: zhejiangId,
        nom: 'Université Zhejiang',
        pays: 'Chine',
        ville: 'Hangzhou',
        programme: 'Sciences, Technologie, Agriculture',
        niveau_etude: 'Tous niveaux',
        criteres_admission: 'Bac + 12 min, HSK 4',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: uniError } = await supabase.from('universities').upsert(universities);
    if (uniError) {
      console.error('Erreur création universités:', uniError.message);
    } else {
      console.log('✅ 4 universités créées');
    }

    // 3. Créer des étudiants
    console.log('\n🎓 Création des étudiants...');
    
    const student1Id = generateId();
    const student2Id = generateId();
    const student3Id = generateId();
    
    const students = [
      {
        id: student1Id,
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@email.com',
        telephone: '+237 612 345 678',
        age: 22,
        sexe: 'M',
        niveau: 'Bac+2',
        filiere: 'Informatique',
        langue: 'Français',
        diplome_acquis: 'Baccalauréat C',
        choix: 'procedure_cours',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: agentId
      },
      {
        id: student2Id,
        nom: 'Mbou',
        prenom: 'Marie',
        email: 'marie.mbou@email.com',
        telephone: '+237 698 234 567',
        age: 24,
        sexe: 'F',
        niveau: 'Bac+3',
        filiere: 'Médecine',
        langue: 'Français',
        diplome_acquis: 'Baccalauréat D',
        choix: 'procedure_seule',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: agentId
      },
      {
        id: student3Id,
        nom: 'Onana',
        prenom: 'Paul',
        email: 'paul.onana@email.com',
        telephone: '+237 677 345 890',
        age: 21,
        sexe: 'M',
        niveau: 'Bac+1',
        filiere: 'Commerce',
        langue: 'Anglais',
        diplome_acquis: 'Baccalauréat G',
        choix: 'cours_seuls',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: agentId
      }
    ];

    const { error: studentsError } = await supabase.from('students').upsert(students);
    if (studentsError) {
      console.error('Erreur création étudiants:', studentsError.message);
    } else {
      console.log('✅ 3 étudiants créés');
    }

    // 4. Créer des dossiers de bourse
    console.log('\n📁 Création des dossiers de bourse...');
    
    const dossiers = [
      {
        id: generateId(),
        student_id: student1Id,
        status: 'en_cours',
        notes_internes: 'Dossier en cours de traitement',
        university_id: pkuId,
        assigned_to: agentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student2Id,
        status: 'admission_validee',
        notes_internes: 'Admission confirmée',
        university_id: tsinghuaId,
        assigned_to: agentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: dossiersError } = await supabase.from('dossier_bourses').upsert(dossiers);
    if (dossiersError) {
      console.error('Erreur création dossiers:', dossiersError.message);
    } else {
      console.log('✅ 2 dossiers de bourse créés');
    }

    // 5. Créer des paiements
    console.log('\n💳 Création des paiements...');
    
    const today = new Date();
    const payment1Date = new Date(today);
    payment1Date.setDate(payment1Date.getDate() + 30);
    
    const payment2Date = new Date(today);
    payment2Date.setDate(payment2Date.getDate() - 5);

    const payments = [
      {
        id: generateId(),
        student_id: student1Id,
        type: 'bourse',
        tranche: 1,
        montant: 100000,
        status: 'attente',
        date_limite: payment1Date.toISOString(),
        penalites: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student1Id,
        type: 'bourse',
        tranche: 2,
        montant: 500000,
        status: 'paye',
        date_limite: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        date_paiement: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        penalites: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student2Id,
        type: 'bourse',
        tranche: 1,
        montant: 100000,
        status: 'paye',
        date_limite: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        date_paiement: new Date(today.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString(),
        penalites: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student2Id,
        type: 'mandarin',
        tranche: 1,
        montant: 50000,
        status: 'retard',
        date_limite: payment2Date.toISOString(),
        penalites: 20000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: paymentsError } = await supabase.from('payments').upsert(payments);
    if (paymentsError) {
      console.error('Erreur création paiements:', paymentsError.message);
    } else {
      console.log('✅ 4 paiements créés');
    }

    // 6. Créer des documents
    console.log('\n📄 Création des documents...');
    
    const documents = [
      {
        id: generateId(),
        student_id: student1Id,
        type: 'carte_photo',
        status: 'valide',
        url: 'https://storage.example.com/photo1.jpg',
        uploaded_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student1Id,
        type: 'releve_bac',
        status: 'en_attente',
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student1Id,
        type: 'diplome_bac',
        status: 'valide',
        url: 'https://storage.example.com/diplome1.pdf',
        uploaded_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        student_id: student2Id,
        type: 'carte_photo',
        status: 'valide',
        url: 'https://storage.example.com/photo2.jpg',
        uploaded_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: docsError } = await supabase.from('documents').upsert(documents);
    if (docsError) {
      console.error('Erreur création documents:', docsError.message);
    } else {
      console.log('✅ 4 documents créés');
    }

    // 7. Créer des notifications
    console.log('\n🔔 Création des notifications...');
    
    const notifications = [
      {
        id: generateId(),
        user_id: studentUserId,
        type: 'retard_paiement',
        titre: 'Paiement en retard',
        message: 'Votre paiement de la tranche 1 est en retard.',
        read: false,
        created_at: new Date().toISOString()
      },
      {
        id: generateId(),
        user_id: agentId,
        type: 'mise_a_jour_dossier',
        titre: 'Mise à jour du dossier',
        message: 'Le dossier de Jean Dupont a été mis à jour.',
        read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { error: notifError } = await supabase.from('notifications').upsert(notifications);
    if (notifError) {
      console.error('Erreur création notifications:', notifError.message);
    } else {
      console.log('✅ 2 notifications créées');
    }

    // 8. Créer des entrées comptables
    console.log('\n💰 Création des entrées comptables...');
    
    const entrees = [
      {
        id: generateId(),
        montant: 100000,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'paiement_procedure',
        description: 'Paiement tranche 1 - Jean Dupont',
        student_id: student1Id,
        created_by: agentId,
        created_at: new Date().toISOString()
      },
      {
        id: generateId(),
        montant: 500000,
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'paiement_procedure',
        description: 'Paiement tranche 2 - Jean Dupont',
        student_id: student1Id,
        created_by: agentId,
        created_at: new Date().toISOString()
      },
      {
        id: generateId(),
        montant: 100000,
        date: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'paiement_procedure',
        description: 'Paiement tranche 1 - Marie Mbou',
        student_id: student2Id,
        created_by: agentId,
        created_at: new Date().toISOString()
      }
    ];

    const { error: entreesError } = await supabase.from('entrees_comptables').upsert(entrees);
    if (entreesError) {
      console.error('Erreur création entrées:', entreesError.message);
    } else {
      console.log('✅ 3 entrées comptables créées');
    }

    // 9. Créer des sorties comptables
    console.log('\n💸 Création des sorties comptables...');
    
    const sorties = [
      {
        id: generateId(),
        montant: 250000,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        categorie: 'loyer',
        description: 'Loyer bureau mois en cours',
        justificatif_url: 'https://storage.example.com/loyer.pdf',
        created_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        montant: 180000,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        categorie: 'salaires',
        description: 'Salaire agent mois en cours',
        created_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId(),
        montant: 35000,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        categorie: 'fonctionnement',
        description: 'Frais internet et téléphone',
        created_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: sortiesError } = await supabase.from('sorties_comptables').upsert(sorties);
    if (sortiesError) {
      console.error('Erreur création sorties:', sortiesError.message);
    } else {
      console.log('✅ 3 sorties comptables créées');
    }

    console.log('\n🎉 Seeding terminé avec succès !\n');

    // Afficher le résumé
    console.log('📊 Résumé :');
    console.log('  - 3 utilisateurs');
    console.log('  - 4 universités');
    console.log('  - 3 étudiants');
    console.log('  - 2 dossiers de bourse');
    console.log('  - 4 paiements');
    console.log('  - 4 documents');
    console.log('  - 2 notifications');
    console.log('  - 3 entrées comptables');
    console.log('  - 3 sorties comptables');

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
  }
}

// Exécuter le seed
seedDatabase();