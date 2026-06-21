/* global React, ReactDOM, ICONS, StatusBar, BottomTabs, Toast, Icon, Avatar, Chip, IconBox, PHeader,
   AdminHome, AdminPerf, AdminAgent, AdminCompta,
   AdminPlus, AdminUsers, AdminRH, AdminCandidatures, AdminLogs, AdminComm, AdminChat, AdminNewsletter, AdminUniv, AdminSimple */
const { useState, useEffect, useRef } = React;

window.fmtFCFA = (n) => Number(n).toLocaleString("fr-FR");
const fmtFCFA = window.fmtFCFA;

/* ============================================================
   Mock data — aligné sur les modules web réels
   ============================================================ */
const ADMIN = { name: "Nadia Sangaré", first: "Nadia", role: "Directrice d'agence" };

/* --- agents (PerformanceHistory : score composite + breakdown + type) --- */
const AGENTS = [
  { id: "a1", name: "Karim Touré", role: "supervisor", roleLabel: "Superviseur", rank: 1, students: 31, dossiers: 28, score: 88, avgDays: 1.4,
    b: { revenue: 100, activity: 82, speed: 91, dossier: 74 }, revenue: 4200000,
    t: { bourse: { c: 9, a: 2200000 }, mandarin: { c: 7, a: 1300000 }, anglais: { c: 4, a: 700000 } },
    s: { validation: 3, attente: 2, retard: 1 } },
  { id: "a2", name: "Aïcha Koné", role: "agent", roleLabel: "Agent", rank: 2, students: 27, dossiers: 22, score: 79, avgDays: 2.1,
    b: { revenue: 74, activity: 88, speed: 80, dossier: 71 }, revenue: 3100000,
    t: { bourse: { c: 6, a: 1500000 }, mandarin: { c: 8, a: 1100000 }, anglais: { c: 3, a: 500000 } },
    s: { validation: 2, attente: 4, retard: 0 } },
  { id: "a3", name: "Moussa Diallo", role: "agent", roleLabel: "Agent", rank: 3, students: 22, dossiers: 18, score: 64, avgDays: 3.0,
    b: { revenue: 58, activity: 70, speed: 65, dossier: 68 }, revenue: 2400000,
    t: { bourse: { c: 5, a: 1200000 }, mandarin: { c: 5, a: 800000 }, anglais: { c: 2, a: 400000 } },
    s: { validation: 1, attente: 3, retard: 2 } },
  { id: "a4", name: "Sandra Mensah", role: "user", roleLabel: "Utilisateur", rank: 4, students: 16, dossiers: 11, score: 47, avgDays: 4.2,
    b: { revenue: 42, activity: 55, speed: 48, dossier: 44 }, revenue: 1800000,
    t: { bourse: { c: 4, a: 900000 }, mandarin: { c: 3, a: 600000 }, anglais: { c: 2, a: 300000 } },
    s: { validation: 0, attente: 2, retard: 1 } },
  { id: "a5", name: "Kévin Ouattara", role: "agent", roleLabel: "Agent", rank: 5, students: 12, dossiers: 8, score: 33, avgDays: 5.1,
    b: { revenue: 30, activity: 38, speed: 35, dossier: 28 }, revenue: 1100000,
    t: { bourse: { c: 2, a: 600000 }, mandarin: { c: 2, a: 350000 }, anglais: { c: 1, a: 150000 } },
    s: { validation: 0, attente: 1, retard: 0 } },
];

const EMPLOYEES_PERF = [
  { rank: 1, name: "Aïcha Koné", dept: "Admissions", index: 86, rating: 4.5, evals: 4, reports: 18, hours: 142 },
  { rank: 2, name: "Moussa Diallo", dept: "Administration", index: 78, rating: 4.0, evals: 3, reports: 15, hours: 121 },
  { rank: 3, name: "Sandra Mensah", dept: "Accueil", index: 64, rating: 3.5, evals: 2, reports: 11, hours: 98 },
  { rank: 4, name: "Kévin Ouattara", dept: "Dossiers", index: 52, rating: 3.0, evals: 2, reports: 9, hours: 76 },
];

/* --- operational dashboard journal --- */
const JOURNAL_TODAY = [
  { period: "MATIN", time: "08:14", icon: "payment", desc: "Moussa D. a enregistré un paiement procédure visa pour Awa Diabaté", amount: 400000, badge: "valider" },
  { period: "MATIN", time: "08:32", icon: "doc", desc: "Awa Diabaté a déposé son certificat médical", badge: "examiner" },
  { period: "MATIN", time: "09:05", icon: "alert", desc: "Document manquant signalé sur le dossier de Yao Kouassi", alert: true },
  { period: "MATIN", time: "09:48", icon: "dossier", desc: "Le dossier de Fatou Bamba est passé en admission validée", badge: "admission" },
  { period: "APRÈS-MIDI", time: "13:20", icon: "dossier", desc: "Demande de visa lancée pour Mariam Koné", badge: "visa" },
  { period: "APRÈS-MIDI", time: "14:02", icon: "payment", desc: "Aïcha K. a validé le paiement cours mandarin de Mariam Koné", amount: 250000 },
  { period: "APRÈS-MIDI", time: "15:30", icon: "student", desc: "Nouveau profil étudiant créé : Ibrahim Cissé" },
  { period: "APRÈS-MIDI", time: "16:11", icon: "payment", desc: "Paiement espèces déclaré pour Ibrahim Cissé (inscription)", amount: 100000, badge: "valider" },
];
const JOURNAL_YESTERDAY = [
  { period: "HIER", time: "10:40", icon: "doc", desc: "Yao Kouassi a déposé sa lettre de motivation", badge: "examiner" },
  { period: "HIER", time: "15:25", icon: "payment", desc: "Karim T. a validé un solde de scolarité (Fatou Bamba)", amount: 500000 },
  { period: "HIER", time: "17:02", icon: "dossier", desc: "Réservation de vol confirmée pour Fatou Bamba" },
];

const USERS = [
  { id: "u1", name: "Nadia Sangaré", username: "nadia.s", role: "admin", active: true, hasPin: false, mustChange: false },
  { id: "u2", name: "Karim Touré", username: "karim.t", role: "supervisor", active: true, hasPin: true, mustChange: false },
  { id: "u3", name: "Aïcha Koné", username: "aicha.k", role: "agent", active: true, hasPin: true, mustChange: false },
  { id: "u4", name: "Moussa Diallo", username: "moussa.d", role: "agent", active: true, hasPin: true, mustChange: true },
  { id: "u5", name: "Sandra Mensah", username: "sandra.m", role: "user", active: true, hasPin: true, mustChange: false },
  { id: "u6", name: "Yacine Bah", username: "yacine.b", role: "agent", active: false, hasPin: true, mustChange: false },
];

const LOGS = [
  { day: "AUJOURD'HUI", actor: "Karim T.", role: "supervisor", desc: "a validé un paiement de 400 000 F (Awa Diabaté · Wave)", time: "il y a 8 min", type: "payment" },
  { day: "AUJOURD'HUI", actor: "Fatou B.", role: "agent", desc: "a créé une entrée comptable « Procédure »", time: "il y a 25 min", type: "accounting" },
  { day: "AUJOURD'HUI", actor: "Aïcha K.", role: "agent", desc: "a validé le rapport journalier de Moussa D.", time: "il y a 1 h", type: "validate" },
  { day: "AUJOURD'HUI", actor: "Système", role: "admin", desc: "a régénéré le PIN de Sandra Mensah", time: "il y a 2 h", type: "update" },
  { day: "AUJOURD'HUI", actor: "Nadia S.", role: "admin", desc: "a rejeté un paiement (justificatif illisible)", time: "il y a 3 h", type: "reject" },
  { day: "AUJOURD'HUI", actor: "Karim T.", role: "supervisor", desc: "s'est connecté depuis Abidjan", time: "il y a 4 h", type: "login" },
  { day: "HIER", actor: "Nadia S.", role: "admin", desc: "a créé le compte agent « Kévin Ouattara »", time: "hier 17:40", type: "create" },
  { day: "HIER", actor: "Moussa D.", role: "agent", desc: "a supprimé un document en doublon", time: "hier 15:10", type: "delete" },
  { day: "HIER", actor: "Aïcha K.", role: "agent", desc: "a téléversé un justificatif de paiement", time: "hier 11:22", type: "upload" },
];

const THREADS = [
  { id: "t1", name: "Awa Diabaté", online: true, time: "09:32", last: "Merci ! J'envoie le certificat aujourd'hui.", unread: 2,
    messages: [{ from: "in", text: "Bonjour, il me manque quel document ?", time: "09:28" }, { from: "out", text: "Le certificat médical et la photo d'identité 🙏", time: "09:30" }, { from: "in", text: "Merci ! J'envoie le certificat aujourd'hui.", time: "09:32" }] },
  { id: "t2", name: "Yao Kouassi", online: false, time: "hier", last: "D'accord, je prépare la lettre.", unread: 0,
    messages: [{ from: "out", text: "Pensez à finaliser votre lettre de motivation.", time: "hier 16:10" }, { from: "in", text: "D'accord, je prépare la lettre.", time: "hier 16:40" }] },
  { id: "t3", name: "Mariam Koné", online: true, time: "08:15", last: "Le paiement mandarin est parti.", unread: 1,
    messages: [{ from: "in", text: "Le paiement mandarin est parti par virement.", time: "08:15" }] },
];

const UNIVERSITIES = [
  { id: "v1", name: "Université de Pékin", city: "Pékin", country: "Chine", flag: "🇨🇳", programs: 12, students: 24, active: true },
  { id: "v2", name: "Université de Montréal", city: "Montréal", country: "Canada", flag: "🇨🇦", programs: 9, students: 18, active: true },
  { id: "v3", name: "Paris-Dauphine", city: "Paris", country: "France", flag: "🇫🇷", programs: 15, students: 31, active: true },
  { id: "v4", name: "Université Fudan", city: "Shanghai", country: "Chine", flag: "🇨🇳", programs: 8, students: 14, active: true },
  { id: "v5", name: "Université Mohammed VI", city: "Rabat", country: "Maroc", flag: "🇲🇦", programs: 6, students: 9, active: false },
];

const CANDIDATURES = [
  { id: "c1", name: "Ibrahim Cissé", program: "Licence Ingénierie — Maroc", status: "document_manquant", bucket: "todo", ago: "il y a 2 h" },
  { id: "c2", name: "Awa Diabaté", program: "Master Informatique — Chine", status: "document_recu", bucket: "todo", ago: "ce matin" },
  { id: "c3", name: "Yao Kouassi", program: "Licence Commerce — Canada", status: "en_attente", bucket: "todo", ago: "hier" },
  { id: "c4", name: "Mariam Koné", program: "Master Marketing — Chine", status: "en_cours", bucket: "all", ago: "il y a 3 j" },
  { id: "c5", name: "Fatou Bamba", program: "Master Finance — France", status: "en_cours", bucket: "all", ago: "il y a 5 j" },
];

const REPORTS = [
  { id: "r1", employee: "Aïcha Koné", poste: "Conseillère étudiante", date: "Aujourd'hui", hours: 8, activities: "Suivi de 4 dossiers de visa, relance de l'agence partenaire à Pékin, mise à jour du tableau d'admissions.", state: "pending" },
  { id: "r2", employee: "Moussa Diallo", poste: "Agent administratif", date: "Aujourd'hui", hours: 7.5, activities: "Traitement des paiements déclarés, vérification des justificatifs Wave et Orange Money, archivage des reçus.", state: "pending" },
  { id: "r3", employee: "Sandra Mensah", poste: "Accueil & relation", date: "Aujourd'hui", hours: 8, activities: "Accueil de 9 étudiants, prise de rendez-vous, réponses aux appels entrants concernant les bourses.", state: "pending" },
  { id: "r4", employee: "Kévin Ouattara", poste: "Chargé de dossiers", date: "Hier", hours: 8, activities: "Préparation de 3 lettres d'admission, contrôle des dossiers avant envoi aux universités.", state: "approved" },
];

const MS = (now) => ([
  { label: "Inscription validée", state: "done" }, { label: "Dossier académique", state: "done" },
  { label: "Lettre d'admission", state: now >= 3 ? "done" : now === 2 ? "now" : "pending" },
  { label: "Demande de visa", state: now >= 4 ? "done" : now === 3 ? "now" : "pending" },
  { label: "Réservation du vol", state: now >= 5 ? "done" : now === 4 ? "now" : "pending" },
  { label: "Départ", state: now >= 6 ? "done" : now === 5 ? "now" : "pending" },
]);
const DOCS6 = (n) => ["Passeport", "Diplôme", "Relevés de notes", "Lettre de motivation", "Certificat médical", "Photo d'identité"].map((name, i) => ({ name, ok: i < n }));

const STUDENTS = [
  { id: "s1", name: "Awa Diabaté", ref: "JD-2041", program: "Master Informatique — Chine", dest: "Université de Pékin", status: "visa_en_cours", step: 4, pct: 62, paid: 1200000, due: 800000, milestones: MS(4), docs: DOCS6(4) },
  { id: "s2", name: "Yao Kouassi", ref: "JD-2038", program: "Licence Commerce — Canada", dest: "Université de Montréal", status: "en_attente_universite", step: 3, pct: 44, paid: 600000, due: 1400000, milestones: MS(3), docs: DOCS6(3) },
  { id: "s3", name: "Fatou Bamba", ref: "JD-2027", program: "Master Finance — France", dest: "Paris-Dauphine", status: "admission_validee", step: 6, pct: 100, paid: 2000000, due: 0, milestones: MS(6), docs: DOCS6(6) },
  { id: "s4", name: "Ibrahim Cissé", ref: "JD-2044", program: "Licence Ingénierie — Maroc", dest: "Université Mohammed VI", status: "document_manquant", step: 1, pct: 18, paid: 0, due: 1500000, milestones: MS(1), docs: DOCS6(1) },
  { id: "s5", name: "Mariam Koné", ref: "JD-2031", program: "Master Marketing — Chine", dest: "Université Fudan", status: "en_attente_universite", step: 3, pct: 50, paid: 900000, due: 600000, milestones: MS(3), docs: DOCS6(5) },
];

const FRAIS = [
  { student: "Awa Diabaté", ref: "JD-2041", tranches: [
    { label: "Frais de dossier", montant: 175000, status: "paye", due: "payé le 12 mars" },
    { label: "Procédure visa · T1", montant: 400000, status: "paye", due: "payé le 2 mai" },
    { label: "Procédure visa · T2", montant: 400000, status: "retard", due: "échéance 10 juin" },
  ]},
  { student: "Yao Kouassi", ref: "JD-2038", tranches: [
    { label: "Frais de dossier", montant: 175000, status: "paye", due: "payé le 2 avr." },
    { label: "Scolarité · T1", montant: 600000, status: "attente", due: "échéance 30 juin" },
  ]},
  { student: "Ibrahim Cissé", ref: "JD-2044", tranches: [
    { label: "Inscription", montant: 100000, status: "retard", due: "échéance 15 juin" },
  ]},
  { student: "Mariam Koné", ref: "JD-2031", tranches: [
    { label: "Cours mandarin · T1", montant: 250000, status: "paye", due: "payé aujourd'hui" },
    { label: "Procédure", montant: 350000, status: "attente", due: "échéance 5 juil." },
  ]},
];

const COURS = {
  mandarin: { active: 18, revenue: 3200000, students: [
    { name: "Mariam Koné", level: "Niveau 2 · HSK", start: "il y a 1 mois", paid: true },
    { name: "Awa Diabaté", level: "Niveau 1 · débutant", start: "il y a 2 sem.", paid: true },
    { name: "Ibrahim Cissé", level: "Niveau 1 · débutant", start: "cette semaine", paid: false },
  ]},
  anglais: { active: 11, revenue: 1600000, students: [
    { name: "Yao Kouassi", level: "Intermédiaire · IELTS", start: "il y a 3 sem.", paid: true },
    { name: "Sandra (réf.)", level: "Avancé · TOEFL", start: "il y a 1 mois", paid: true },
  ]},
};

const FEE_CONFIG = [
  { label: "Frais de dossier", scope: "Tous dossiers", amount: 175000, tranches: 1, penalty: 5, delay: 7 },
  { label: "Procédure visa", scope: "Chine, Canada", amount: 800000, tranches: 2, penalty: 10, delay: 30 },
  { label: "Cours de mandarin", scope: "Destination Chine", amount: 250000, tranches: 3, penalty: 5, delay: 15 },
  { label: "Accompagnement départ", scope: "Optionnel", amount: 120000, tranches: 1, penalty: 0, delay: 60 },
];

const STORAGE = {
  used: 6.4, total: 10, dbRows: 48230, dbSize: 312,
  buckets: [
    { label: "Documents étudiants", size: 3.1, color: "#ef4444", icon: ICONS.doc },
    { label: "Justificatifs paiement", size: 1.8, color: "#fbbf24", icon: ICONS.card },
    { label: "Fiches de paie", size: 0.9, color: "#34d9a8", icon: ICONS.receipt },
    { label: "Autres", size: 0.6, color: "#60a5fa", icon: ICONS.database },
  ],
};

const NOTIFICATIONS = [
  { day: "AUJOURD'HUI", type: "payment", title: "Paiement à valider", body: "Awa Diabaté · procédure visa · 400 000 F (Wave)", time: "08:14", read: false },
  { day: "AUJOURD'HUI", type: "alert", title: "Document manquant", body: "Le dossier de Yao Kouassi nécessite une lettre de motivation.", time: "09:05", read: false },
  { day: "AUJOURD'HUI", type: "dossier", title: "Admission validée", body: "Fatou Bamba — Paris-Dauphine.", time: "09:48", read: false },
  { day: "AUJOURD'HUI", type: "doc", title: "Nouveau document", body: "Awa Diabaté a déposé son certificat médical.", time: "08:32", read: true },
  { day: "HIER", type: "system", title: "Sauvegarde effectuée", body: "Base de données sauvegardée avec succès.", time: "23:00", read: true },
  { day: "HIER", type: "payment", title: "Paiement validé", body: "Solde de scolarité de Fatou Bamba (500 000 F).", time: "15:25", read: true },
];

function buildAdminData() {
  return {
    admin: ADMIN,
    dash: {
      aTraiter: 14, dossiersOuverts: 38, dossiersGrowth: 5, encaisseMois: 8450000, encaisseGrowth: 12,
      flux: [{ l: "L", v: 4 }, { l: "M", v: 7 }, { l: "M", v: 5 }, { l: "J", v: 9 }, { l: "V", v: 6 }, { l: "S", v: 3 }, { l: "D", v: 8, today: true, top: "8" }],
      topUniv: [{ name: "Université de Pékin", count: 9 }, { name: "Paris-Dauphine", count: 6 }, { name: "Université de Montréal", count: 4 }],
      journal: { aujourdhui: JOURNAL_TODAY, hier: JOURNAL_YESTERDAY, semaine: [...JOURNAL_TODAY, ...JOURNAL_YESTERDAY], mois: [...JOURNAL_TODAY, ...JOURNAL_YESTERDAY] },
    },
    perf: {
      revenue: 12600000, enValidation: 6, avgIndex: 70,
      daily: [
        { date: "Aujourd'hui · jeu. 21", total: 650000, courses: { c: 3, a: 250000 }, proc: { c: 2, a: 400000 } },
        { date: "Hier · mer. 20", total: 920000, courses: { c: 4, a: 320000 }, proc: { c: 3, a: 600000 } },
        { date: "Mar. 19", total: 480000, courses: { c: 2, a: 180000 }, proc: { c: 2, a: 300000 } },
      ],
    },
    agents: AGENTS,
    employeesPerf: EMPLOYEES_PERF,
    compta: {
      solde: 5250000, entrees: 8450000, sorties: 3200000, toValidate: 2,
      rows: [
        { kind: "in", time: "14:02", desc: "Paiement cours mandarin — Mariam Koné", cat: "Cours", montant: 250000 },
        { kind: "in", time: "08:14", desc: "Procédure visa — Awa Diabaté", cat: "Procédure", montant: 400000 },
        { kind: "out", time: "Hier", desc: "Loyer agence — juin", cat: "Loyer", montant: 450000, needsValidation: false },
        { kind: "out", time: "Hier", desc: "Salaires équipe — juin", cat: "Salaires", montant: 1850000, needsValidation: true },
        { kind: "in", time: "Hier", desc: "Solde scolarité — Fatou Bamba", cat: "Procédure", montant: 500000 },
        { kind: "out", time: "2 j", desc: "Fournitures bureau", cat: "Fournitures", montant: 85000, needsValidation: true },
        { kind: "out", time: "3 j", desc: "Transport partenaires", cat: "Transports", montant: 120000, needsValidation: false },
      ],
    },
    users: USERS,
    rolePerms: { super_admin: 42, admin: 38, supervisor: 24, agent: 15, user: 8 },
    rh: {
      activeCount: 5, pendingLeaves: 2, payslips: 5, pendingReports: REPORTS.filter(r => r.state === "pending").length,
      reportsHours: REPORTS.filter(r => r.date === "Aujourd'hui").reduce((s, r) => s + r.hours, 0),
      employees: [
        { id: "e1", name: "Aïcha Koné", matricule: "EMP-0001", poste: "Conseillère étudiante", statut: "actif", salaire: 320000 },
        { id: "e2", name: "Moussa Diallo", matricule: "EMP-0002", poste: "Agent administratif", statut: "actif", salaire: 280000 },
        { id: "e3", name: "Sandra Mensah", matricule: "EMP-0003", poste: "Accueil & relation", statut: "actif", salaire: 250000 },
        { id: "e4", name: "Kévin Ouattara", matricule: "EMP-0004", poste: "Chargé de dossiers", statut: "suspendu", salaire: 270000 },
        { id: "e5", name: "Yacine Bah", matricule: "EMP-0005", poste: "Agent (congé)", statut: "inactif", salaire: 260000 },
      ],
      leaves: [
        { id: "l1", name: "Sandra Mensah", type: "Congé annuel", days: 5, from: "24 juin", to: "28 juin", status: "en_attente" },
        { id: "l2", name: "Moussa Diallo", type: "Maladie", days: 2, from: "19 juin", to: "20 juin", status: "en_attente" },
        { id: "l3", name: "Aïcha Koné", type: "Congé annuel", days: 3, from: "10 juin", to: "12 juin", status: "approuve" },
      ],
      payslipsList: [
        { name: "Aïcha Koné", month: "Juin 2026", ref: "PAY-0601", net: 298000 },
        { name: "Moussa Diallo", month: "Juin 2026", ref: "PAY-0602", net: 262000 },
        { name: "Sandra Mensah", month: "Juin 2026", ref: "PAY-0603", net: 235000 },
      ],
      reports: REPORTS,
      evals: EMPLOYEES_PERF,
    },
    threads: THREADS,
    logs: LOGS,
    universities: UNIVERSITIES,
    candidatures: CANDIDATURES,
    students: STUDENTS,
    frais: FRAIS,
    cours: COURS,
    feeConfig: FEE_CONFIG,
    storage: STORAGE,
    notifications: NOTIFICATIONS,
    newsletter: {
      audiences: [
        { label: "Tous les étudiants", count: 312 },
        { label: "Dossier en cours", count: 148 },
        { label: "Départs imminents", count: 22 },
        { label: "Paiements en retard", count: 9 },
      ],
      campaigns: [
        { title: "Rappel — documents manquants", date: "Aujourd'hui", audience: "148 dossiers", status: "Envoyée", sent: 148, open: 71 },
        { title: "Newsletter — Rentrée septembre", date: "Hier", audience: "Tous", status: "Programmée" },
        { title: "Échéance de paiement", date: "12 juin", audience: "Retards", status: "Envoyée", sent: 9, open: 88 },
      ],
    },
  };
}

const ADMIN_TABS = [
  { id: "home", label: "Bord", icon: ICONS.grid },
  { id: "perf", label: "Perfs", icon: ICONS.award },
  { id: "compta", label: "Compta", icon: ICONS.wallet },
  { id: "plus", label: "Plus", icon: ICONS.more },
];
const PRIMARY = ["home", "perf", "compta", "plus"];

/* ============================================================
   App
   ============================================================ */
function App() {
  const [data, setData] = useState(buildAdminData);
  const [tab, setTab] = useState("home");
  const [detail, setDetail] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastT = useRef(null);
  const toast = (m) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 2200); };

  const go = (t) => { if (PRIMARY.includes(t)) { setDetail(null); setTab(t); } else setDetail({ type: t }); };
  const openAgent = (id) => setDetail({ type: "agent", id });
  const openChat = (id) => setDetail({ type: "chat", id: id || data.threads[0].id });
  const openStudent = (id) => setDetail({ type: "student", id });
  const back = () => setDetail(null);

  const validateReport = (id, ok) => {
    setData((d) => ({ ...d, rh: { ...d.rh, reports: d.rh.reports.map((r) => r.id === id ? { ...r, state: ok ? "approved" : "flagged" } : r), pendingReports: d.rh.reports.filter((r) => r.id !== id && r.state === "pending").length } }));
    toast(ok ? "Rapport validé ✓" : "Rapport signalé");
  };
  const toggleActive = (id) => { setData((d) => ({ ...d, users: d.users.map((u) => u.id === id ? { ...u, active: !u.active } : u) })); toast("Statut du compte mis à jour"); };
  const regenPin = () => toast("Nouveau PIN généré & envoyé");
  const markAllRead = () => { setData((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) })); toast("Notifications marquées comme lues"); };

  let screen, key;
  const D = detail?.type;
  if (D === "agent") { screen = <AdminAgent agent={data.agents.find((a) => a.id === detail.id)} back={back} toast={toast} />; key = "agent-" + detail.id; }
  else if (D === "utilisateurs") { screen = <AdminUsers data={data} back={back} regenPin={regenPin} toggleActive={toggleActive} toast={toast} />; key = "users"; }
  else if (D === "rh") { screen = <AdminRH data={data} back={back} go={go} validateReport={validateReport} toast={toast} />; key = "rh"; }
  else if (D === "candidatures") { screen = <AdminCandidatures data={data} back={back} openStudent={openStudent} />; key = "cand"; }
  else if (D === "logs") { screen = <AdminLogs data={data} back={back} />; key = "logs"; }
  else if (D === "communication") { screen = <AdminComm data={data} back={back} openChat={openChat} />; key = "comm"; }
  else if (D === "chat") { screen = <AdminChat thread={data.threads.find((t) => t.id === detail.id) || data.threads[0]} back={back} />; key = "chat-" + detail.id; }
  else if (D === "newsletter") { screen = <AdminNewsletter data={data} back={back} toast={toast} />; key = "news"; }
  else if (D === "universites") { screen = <AdminUniv data={data} back={back} toast={toast} />; key = "univ"; }
  else if (D === "student") { screen = <AdminStudentDetail student={data.students.find((s) => s.id === detail.id)} back={back} openChat={() => openChat()} toast={toast} />; key = "stu-" + detail.id; }
  else if (D === "etudiants") { screen = <AdminEtudiants data={data} back={back} openStudent={openStudent} />; key = "etu"; }
  else if (D === "dossiers") { screen = <AdminDossiers data={data} back={back} openStudent={openStudent} />; key = "dos"; }
  else if (D === "frais") { screen = <AdminFrais data={data} back={back} toast={toast} />; key = "frais"; }
  else if (D === "cours") { screen = <AdminCours data={data} back={back} toast={toast} />; key = "cours"; }
  else if (D === "config") { screen = <AdminConfigFrais data={data} back={back} toast={toast} />; key = "cfg"; }
  else if (D === "stockage") { screen = <AdminStockage data={data} back={back} />; key = "stk"; }
  else if (D === "notifications") { screen = <AdminNotifications data={data} back={back} markAllRead={markAllRead} />; key = "notif"; }
  else if (tab === "home") { screen = <AdminHome data={data} go={go} />; key = "home"; }
  else if (tab === "perf") { screen = <AdminPerf data={data} openAgent={openAgent} toast={toast} />; key = "perf"; }
  else if (tab === "compta") { screen = <AdminCompta data={data} toast={toast} />; key = "compta"; }
  else { screen = <AdminPlus data={data} go={go} toast={toast} />; key = "plus"; }

  const showTabs = !detail;
  const badges = { plus: data.rh.pendingReports || null };

  return (
    <div className="scr">
      <StatusBar />
      <div className={"scr-inner " + (detail ? "detail" : "fade")} key={key} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {screen}
      </div>
      {showTabs && <BottomTabs active={tab} onChange={go} badges={badges} tabs={ADMIN_TABS} />}
      {toastMsg && <Toast msg={toastMsg} />}
    </div>
  );
}

/* ============ device stage ============ */
function Stage() {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current; if (!el) return;
      const availH = window.innerHeight - el.getBoundingClientRect().top - 32;
      const availW = window.innerWidth - 40;
      setScale(Math.min(1, availW / 412, availH / 866));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="stage-hint">Joda · Admin mobile — 390 × 844{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}</span>
      </div>
      <div className="stage-canvas" ref={wrapRef}>
        <div style={{ width: 412 * scale, height: 866 * scale }}>
          <div className="phone" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <div className="notch" />
            <div className="phone-screen"><App /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Stage />);
