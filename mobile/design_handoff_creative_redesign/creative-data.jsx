/* global ICONS, window */
// =====================================================================
// JODA — Unified mock data for the navigable creative app (Wave 6)
// One object that satisfies every v2 screen component.
// =====================================================================
const JODA_DATA = {
  staff: {
    staff: { first: "Awa", name: "Awa Traoré" },
    profile: { name: "Karim Touré", role: "Responsable des admissions", agency: "Agence Abidjan", stats: { dossiers: 38, rate: 87, team: 6 } },
    kpis: { dayPct: 72, handledToday: 18, targetToday: 25, pending: 7, activeDossiers: 42, dossiersTrend: 5,
      collectedMonth: 4200000, collectTrend: 12, paymentsToValidate: 4, reportsToValidate: 3, team: 5 },
    staffSpark: { label: "4,2M", points: [12, 18, 14, 22, 19, 27, 24, 31] },
    todoPayments: [
      { id: "p1", student: "Awa Diabaté", type: "Procédure visa", ago: "il y a 2 h", amount: 400000 },
      { id: "p2", student: "Mariam Koné", type: "Cours mandarin", ago: "ce matin", amount: 250000 },
      { id: "p3", student: "Ibrahim Cissé", type: "Inscription", ago: "hier", amount: 100000 },
    ],
    dossiers: [
      { id: "s1", name: "Awa Diabaté", program: "Master Informatique — Chine", chip: "live", bucket: "now", pct: 62, step: 4, docs: "4/6", pay: "1.2M", dest: "Pékin" },
      { id: "s2", name: "Yao Kouassi", program: "Licence Commerce — Canada", chip: "due", bucket: "review", pct: 38, step: 2, docs: "3/6", pay: "600K", dest: "Montréal" },
      { id: "s3", name: "Fatou Bamba", program: "Master Finance — France", chip: "done", bucket: "done", pct: 100, step: 6, docs: "6/6", pay: "Soldé", dest: "Paris" },
      { id: "s4", name: "Ibrahim Cissé", program: "Licence Ingénierie — Maroc", chip: "live", bucket: "now", pct: 22, step: 1, docs: "1/6", pay: "Aucun", dest: "Rabat" },
      { id: "s5", name: "Mariam Koné", program: "Master Marketing — Chine", chip: "due", bucket: "review", pct: 50, step: 3, docs: "5/6", pay: "900K", dest: "Shanghai" },
    ],
    payments: [
      { id: "p1", student: "Awa Diabaté", type: "Procédure visa", tranche: 2, amount: 400000, ago: "il y a 12 min", method: "Wave", proof: "recu-wave-0412.jpg", state: "pending" },
      { id: "p2", student: "Yao Kouassi", type: "Frais de dossier", amount: 150000, ago: "il y a 1 h", method: "Orange Money", proof: "capture-om.png", state: "pending" },
      { id: "p3", student: "Mariam Koné", type: "Cours mandarin", tranche: 1, amount: 250000, ago: "ce matin", method: "Virement", proof: "virement-bcea.pdf", state: "pending" },
      { id: "p4", student: "Fatou Bamba", type: "Solde scolarité", amount: 500000, ago: "hier", method: "Wave", proof: "recu-final.jpg", state: "approved" },
    ],
    threads: [
      { id: "t1", name: "Awa Diabaté", online: true, time: "09:32", last: "Merci ! J'envoie le certificat médical aujourd'hui.", unread: 2,
        messages: [
          { from: "in", text: "Bonjour, j'ai une question sur mon dossier de visa 🙏", time: "09:20" },
          { from: "out", text: "Bonjour Awa ! Bien sûr, je vous écoute.", time: "09:24" },
          { from: "in", text: "Il me manque quel document exactement ?", time: "09:27" },
          { from: "out", text: "Le certificat médical et la photo d'identité.", time: "09:30" },
          { from: "in", text: "Merci ! J'envoie le certificat médical aujourd'hui.", time: "09:32" },
        ] },
      { id: "t2", name: "Yao Kouassi", online: false, time: "hier", last: "D'accord, je prépare la lettre.", unread: 0,
        messages: [{ from: "out", text: "Pensez à finaliser votre lettre de motivation.", time: "hier 16:10" }, { from: "in", text: "D'accord, je prépare la lettre.", time: "hier 16:40" }] },
      { id: "t3", name: "Mariam Koné", online: true, time: "08:15", last: "Le paiement du mandarin est parti.", unread: 1,
        messages: [{ from: "in", text: "Le paiement du mandarin est parti par virement.", time: "08:15" }] },
    ],
    unread: 3,
    reports: [
      { id: "r1", employee: "Aïcha Koné", poste: "Conseillère étudiante", date: "Aujourd'hui", hours: 8, activities: "Suivi de 4 dossiers de visa, relance de l'agence partenaire à Pékin, mise à jour du tableau d'admissions.", state: "pending" },
      { id: "r2", employee: "Moussa Diallo", poste: "Agent administratif", date: "Aujourd'hui", hours: 7, activities: "Traitement de 6 paiements, archivage des justificatifs, préparation des fiches de paie.", state: "pending" },
      { id: "r3", employee: "Sandra Mensah", poste: "Accueil & relation", date: "Hier", hours: 6, activities: "Accueil de 8 candidats, présentation des offres Chine et Canada, prise de rendez-vous.", state: "approved" },
    ],
    fiche: {
      id: "s1", name: "Awa Diabaté", ref: "JD-2041", program: "Master Informatique — Chine", dest: "Université de Pékin", pct: 62, step: 4,
      docs: [
        { name: "Passeport", ok: true }, { name: "Diplôme licence", ok: true }, { name: "Relevés de notes", ok: true },
        { name: "Lettre de motivation", ok: true }, { name: "Certificat médical", ok: false }, { name: "Photo d'identité", ok: false },
      ],
    },
  },

  admin: {
    admin: { name: "Nadia Sangaré" },
    dash: {
      aTraiter: 14, dossiersOuverts: 38, dossiersGrowth: 5, encaisseMois: 8450000, encaisseGrowth: 12,
      flux: [{ l: "L", v: 4 }, { l: "M", v: 7 }, { l: "M", v: 5 }, { l: "J", v: 9 }, { l: "V", v: 6 }, { l: "S", v: 3 }, { l: "D", v: 8 }], fluxTotal: 42,
      topUniv: [{ name: "Université de Pékin", count: 24 }, { name: "Paris-Dauphine", count: 19 }, { name: "Université Fudan", count: 14 }],
    },
    adminSpark: [6.2, 7.1, 6.8, 8.4, 9.1, 8.7, 10.2, 11.0, 10.6, 12.4],
    donut: [
      { label: "Chine", v: 38, color: "#ff5a5f" }, { label: "Canada", v: 18, color: "#fbbf24" },
      { label: "France", v: 22, color: "#34d9a8" }, { label: "Maroc", v: 8, color: "#a78bfa" },
    ],
    perf: { revenue: 12600000, enValidation: 6 },
    agents: [
      { id: "a1", name: "Karim Touré", roleLabel: "Superviseur", rank: 1, students: 31, dossiers: 28, score: 88, b: { revenue: 100, activity: 82, speed: 91, dossier: 74 } },
      { id: "a2", name: "Aïcha Koné", roleLabel: "Agent", rank: 2, students: 27, dossiers: 22, score: 79, b: { revenue: 74, activity: 88, speed: 80, dossier: 71 } },
      { id: "a3", name: "Moussa Diallo", roleLabel: "Agent", rank: 3, students: 22, dossiers: 18, score: 64, b: { revenue: 58, activity: 70, speed: 65, dossier: 68 } },
      { id: "a4", name: "Sandra Mensah", roleLabel: "Utilisateur", rank: 4, students: 16, dossiers: 11, score: 47, b: { revenue: 42, activity: 55, speed: 48, dossier: 44 } },
      { id: "a5", name: "Kévin Ouattara", roleLabel: "Agent", rank: 5, students: 12, dossiers: 8, score: 33, b: { revenue: 30, activity: 38, speed: 35, dossier: 28 } },
    ],
    compta: {
      solde: 5250000, entrees: 8450000, sorties: 3200000, toValidate: 2,
      rows: [
        { kind: "in", time: "14:02", desc: "Cours mandarin — Mariam Koné", cat: "Cours", montant: 250000 },
        { kind: "in", time: "08:14", desc: "Procédure visa — Awa Diabaté", cat: "Procédure", montant: 400000 },
        { kind: "out", time: "Hier", desc: "Loyer agence — juin", cat: "Loyer", montant: 450000 },
        { kind: "out", time: "Hier", desc: "Salaires équipe — juin", cat: "Salaires", montant: 1850000, needsValidation: true },
        { kind: "in", time: "Hier", desc: "Solde scolarité — Fatou Bamba", cat: "Procédure", montant: 500000 },
        { kind: "out", time: "2 j", desc: "Fournitures bureau", cat: "Fournitures", montant: 85000, needsValidation: true },
      ],
    },
    users: [
      { id: "u1", name: "Nadia Sangaré", username: "nadia.s", role: "admin" },
      { id: "u2", name: "Karim Touré", username: "karim.t", role: "supervisor" },
      { id: "u3", name: "Aïcha Koné", username: "aicha.k", role: "agent" },
      { id: "u4", name: "Moussa Diallo", username: "moussa.d", role: "agent" },
      { id: "u5", name: "Ousmane Bemba", username: "o.bemba", role: "super_admin" },
      { id: "u6", name: "Sandra Mensah", username: "sandra.m", role: "user" },
      { id: "u7", name: "Kévin Ouattara", username: "kevin.o", role: "agent" },
    ],
    rolePerms: { super_admin: 42, admin: 38, supervisor: 24, agent: 15, user: 8 },
    rh: {
      activeCount: 3, pendingLeaves: 2, payslips: 5, pendingReports: 3,
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
    },
    candidatures: [
      { id: "c1", name: "Ibrahim Cissé", program: "Licence Ingénierie — Maroc", status: "document_manquant", bucket: "todo", ago: "il y a 2 h" },
      { id: "c2", name: "Awa Diabaté", program: "Master Informatique — Chine", status: "document_recu", bucket: "todo", ago: "ce matin" },
      { id: "c3", name: "Yao Kouassi", program: "Licence Commerce — Canada", status: "en_attente", bucket: "todo", ago: "hier" },
      { id: "c4", name: "Mariam Koné", program: "Master Marketing — Chine", status: "en_cours", bucket: "all", ago: "il y a 3 j" },
      { id: "c5", name: "Fatou Bamba", program: "Master Finance — France", status: "en_cours", bucket: "all", ago: "il y a 5 j" },
    ],
    universities: [
      { id: "v1", name: "Université de Pékin", city: "Pékin", country: "Chine", flag: "🇨🇳", programs: 12, students: 24, active: true },
      { id: "v2", name: "Université de Montréal", city: "Montréal", country: "Canada", flag: "🇨🇦", programs: 9, students: 18, active: true },
      { id: "v3", name: "Université Fudan", city: "Shanghai", country: "Chine", flag: "🇨🇳", programs: 7, students: 11, active: true },
      { id: "v4", name: "Paris-Dauphine", city: "Paris", country: "France", flag: "🇫🇷", programs: 5, students: 8, active: false },
    ],
    cours: {
      mandarin: { active: 18, revenue: 3200000, students: [
        { name: "Mariam Koné", level: "Niveau 2 · HSK", start: "il y a 1 mois", paid: true },
        { name: "Awa Diabaté", level: "Niveau 1 · débutant", start: "il y a 2 sem.", paid: true },
        { name: "Ibrahim Cissé", level: "Niveau 1 · débutant", start: "cette semaine", paid: false },
      ] },
      anglais: { active: 11, revenue: 1600000, students: [
        { name: "Yao Kouassi", level: "Intermédiaire · IELTS", start: "il y a 3 sem.", paid: true },
        { name: "Sandra Mensah", level: "Avancé · TOEFL", start: "il y a 1 mois", paid: true },
      ] },
    },
    storage: {
      used: 6.4, total: 10, dbRows: 48230, dbSize: 312,
      buckets: [
        { label: "Documents étudiants", size: 3.1, color: "#ef4444", icon: ICONS.doc },
        { label: "Justificatifs paiement", size: 1.8, color: "#fbbf24", icon: ICONS.card },
        { label: "Fiches de paie", size: 0.9, color: "#34d9a8", icon: ICONS.receipt },
        { label: "Autres", size: 0.6, color: "#60a5fa", icon: ICONS.database },
      ],
    },
    logs: [
      { day: "AUJOURD'HUI", actor: "Karim T.", desc: "a validé un paiement de 400 000 F (Awa Diabaté · Wave)", time: "il y a 8 min", type: "payment" },
      { day: "AUJOURD'HUI", actor: "Fatou B.", desc: "a créé une entrée comptable « Procédure »", time: "il y a 25 min", type: "accounting" },
      { day: "AUJOURD'HUI", actor: "Aïcha K.", desc: "a validé le rapport journalier de Moussa D.", time: "il y a 1 h", type: "validate" },
      { day: "AUJOURD'HUI", actor: "Nadia S.", desc: "a rejeté un paiement (justificatif illisible)", time: "il y a 3 h", type: "reject" },
      { day: "HIER", actor: "Nadia S.", desc: "a créé le compte agent « Kévin Ouattara »", time: "hier 17:40", type: "create" },
      { day: "HIER", actor: "Moussa D.", desc: "a supprimé un document en doublon", time: "hier 15:10", type: "delete" },
    ],
  },

  shared: {
    notifications: [
      { day: "AUJOURD'HUI", type: "payment", title: "Paiement à valider", body: "Awa Diabaté · procédure visa · 400 000 F (Wave)", time: "08:14", read: false },
      { day: "AUJOURD'HUI", type: "alert", title: "Document manquant", body: "Le dossier de Yao Kouassi nécessite une lettre de motivation.", time: "09:05", read: false },
      { day: "AUJOURD'HUI", type: "dossier", title: "Admission validée", body: "Fatou Bamba — Paris-Dauphine.", time: "09:48", read: false },
      { day: "AUJOURD'HUI", type: "doc", title: "Nouveau document", body: "Awa Diabaté a déposé son certificat médical.", time: "08:32", read: true },
      { day: "HIER", type: "system", title: "Sauvegarde effectuée", body: "Base de données sauvegardée avec succès.", time: "23:00", read: true },
      { day: "HIER", type: "payment", title: "Paiement validé", body: "Solde de scolarité de Fatou Bamba (500 000 F).", time: "15:25", read: true },
    ],
  },
};
window.JODA_DATA = JODA_DATA;
