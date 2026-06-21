/* global React, ReactDOM, ICONS, StatusBar, BottomTabs, Toast, Icon, Avatar, Chip, IconBox,
   ScreenHome, ScreenDossiers, ScreenStudent, ScreenPaiements, ScreenMessages, ScreenChat, ScreenRapports, ScreenProfil, fmtFCFA */
const { useState, useEffect, useRef } = React;

/* ============================================================
   Mock data
   ============================================================ */
const STAFF = {
  name: "Karim Touré", first: "Karim", role: "Responsable des admissions",
  agency: "Agence Abidjan", ag_kind: "staff",
  stats: { dossiers: 38, rate: 87, team: 6 },
};

const STUDENTS = [
  {
    id: "s1", name: "Awa Diabaté", ref: "JD-2041", program: "Master Informatique — Chine",
    dest: "Université de Pékin", chip: "live", status: "À traiter", bucket: "now",
    pct: 62, step: 4, stepLabel: "Visa", docs: "4/6 docs", pay: "1.2M payés", dest2: "Pékin",
    paid: 1200000, due: 800000, docsDone: 4, docsTotal: 6,
    milestones: [
      { label: "Inscription validée", state: "done", date: "12 mars" },
      { label: "Dossier académique", state: "done", date: "28 mars" },
      { label: "Lettre d'admission", state: "done", date: "9 mai" },
      { label: "Demande de visa", state: "now" },
      { label: "Réservation du vol", state: "pending" },
      { label: "Départ", state: "pending" },
    ],
    docs: [
      { name: "Passeport", ok: true }, { name: "Diplôme licence", ok: true },
      { name: "Relevés de notes", ok: true }, { name: "Lettre de motivation", ok: true },
      { name: "Certificat médical", ok: false }, { name: "Photo d'identité", ok: false },
    ],
  },
  {
    id: "s2", name: "Yao Kouassi", ref: "JD-2038", program: "Licence Commerce — Canada",
    dest: "Université de Montréal", chip: "due", status: "En revue", bucket: "review",
    pct: 38, step: 2, stepLabel: "Dossier", docs: "3/6 docs", pay: "600K payés", dest2: "Montréal",
    paid: 600000, due: 1400000, docsDone: 3, docsTotal: 6,
    milestones: [
      { label: "Inscription validée", state: "done", date: "2 avr." },
      { label: "Dossier académique", state: "now" },
      { label: "Lettre d'admission", state: "pending" },
      { label: "Demande de visa", state: "pending" },
      { label: "Réservation du vol", state: "pending" },
      { label: "Départ", state: "pending" },
    ],
    docs: [
      { name: "Passeport", ok: true }, { name: "Diplôme bac", ok: true },
      { name: "Relevés de notes", ok: true }, { name: "Lettre de motivation", ok: false },
      { name: "Test de langue", ok: false }, { name: "Photo d'identité", ok: false },
    ],
  },
  {
    id: "s3", name: "Fatou Bamba", ref: "JD-2027", program: "Master Finance — France",
    dest: "Université Paris-Dauphine", chip: "done", status: "Complet", bucket: "done",
    pct: 100, step: 6, stepLabel: "Départ", docs: "6/6 docs", pay: "Soldé", dest2: "Paris",
    paid: 2000000, due: 0, docsDone: 6, docsTotal: 6,
    milestones: [
      { label: "Inscription validée", state: "done", date: "5 janv." },
      { label: "Dossier académique", state: "done", date: "20 janv." },
      { label: "Lettre d'admission", state: "done", date: "14 févr." },
      { label: "Demande de visa", state: "done", date: "30 mars" },
      { label: "Réservation du vol", state: "done", date: "18 avr." },
      { label: "Départ", state: "done", date: "2 sept." },
    ],
    docs: [
      { name: "Passeport", ok: true }, { name: "Diplôme licence", ok: true },
      { name: "Relevés de notes", ok: true }, { name: "Lettre de motivation", ok: true },
      { name: "Test de langue", ok: true }, { name: "Photo d'identité", ok: true },
    ],
  },
  {
    id: "s4", name: "Ibrahim Cissé", ref: "JD-2044", program: "Licence Ingénierie — Maroc",
    dest: "Université Mohammed VI", chip: "live", status: "À traiter", bucket: "now",
    pct: 22, step: 1, stepLabel: "Inscription", docs: "1/6 docs", pay: "Aucun", dest2: "Rabat",
    paid: 0, due: 1500000, docsDone: 1, docsTotal: 6,
    milestones: [
      { label: "Inscription validée", state: "now" },
      { label: "Dossier académique", state: "pending" },
      { label: "Lettre d'admission", state: "pending" },
      { label: "Demande de visa", state: "pending" },
      { label: "Réservation du vol", state: "pending" },
      { label: "Départ", state: "pending" },
    ],
    docs: [
      { name: "Passeport", ok: true }, { name: "Diplôme bac", ok: false },
      { name: "Relevés de notes", ok: false }, { name: "Lettre de motivation", ok: false },
      { name: "Test de langue", ok: false }, { name: "Photo d'identité", ok: false },
    ],
  },
  {
    id: "s5", name: "Mariam Koné", ref: "JD-2031", program: "Master Marketing — Chine",
    dest: "Université Fudan", chip: "due", status: "En revue", bucket: "review",
    pct: 50, step: 3, stepLabel: "Admission", docs: "5/6 docs", pay: "900K payés", dest2: "Shanghai",
    paid: 900000, due: 600000, docsDone: 5, docsTotal: 6,
    milestones: [
      { label: "Inscription validée", state: "done", date: "10 mars" },
      { label: "Dossier académique", state: "done", date: "1 avr." },
      { label: "Lettre d'admission", state: "now" },
      { label: "Demande de visa", state: "pending" },
      { label: "Réservation du vol", state: "pending" },
      { label: "Départ", state: "pending" },
    ],
    docs: [
      { name: "Passeport", ok: true }, { name: "Diplôme licence", ok: true },
      { name: "Relevés de notes", ok: true }, { name: "Lettre de motivation", ok: true },
      { name: "Test de langue", ok: true }, { name: "Photo d'identité", ok: false },
    ],
  },
];

const DOSSIERS_LIST = STUDENTS.map((s) => ({
  id: s.id, name: s.name, program: s.program, status: s.status, chip: s.chip, bucket: s.bucket,
  pct: s.pct, step: s.step, docs: s.docsDone + "/" + s.docsTotal, pay: s.due === 0 ? "Soldé" : fmtFCFA(s.paid / 1000) + "K", dest: s.dest2,
}));

const PAYMENTS = [
  { id: "p1", student: "Awa Diabaté", type: "Procédure visa", tranche: 2, amount: 400000, ago: "il y a 12 min", method: "Wave", proof: "recu-wave-0412.jpg", state: "pending" },
  { id: "p2", student: "Yao Kouassi", type: "Frais de dossier", amount: 150000, ago: "il y a 1 h", method: "Orange Money", proof: "capture-om.png", state: "pending" },
  { id: "p3", student: "Mariam Koné", type: "Cours mandarin", tranche: 1, amount: 250000, ago: "il y a 3 h", method: "Virement", proof: "bordereau-banque.pdf", state: "pending" },
  { id: "p4", student: "Ibrahim Cissé", type: "Inscription", amount: 100000, ago: "hier", method: "Espèces", proof: "recu-caisse.jpg", state: "pending" },
  { id: "p5", student: "Fatou Bamba", type: "Solde scolarité", amount: 500000, ago: "hier", method: "Virement", proof: "—", state: "approved", by: "Karim" },
];

const THREADS = [
  { id: "t1", name: "Awa Diabaté", online: true, time: "09:32", last: "Merci ! J'envoie le certificat médical aujourd'hui.", unread: 2,
    messages: [
      { from: "in", text: "Bonjour, j'ai une question sur mon dossier de visa 🙏", time: "09:20" },
      { from: "out", text: "Bonjour Awa ! Bien sûr, je vous écoute.", time: "09:24" },
      { from: "in", text: "Il me manque quel document exactement ?", time: "09:28" },
      { from: "out", text: "Il manque le certificat médical et la photo d'identité. Le reste est validé ✅", time: "09:30" },
      { from: "in", text: "Merci ! J'envoie le certificat médical aujourd'hui.", time: "09:32" },
    ] },
  { id: "t2", name: "Yao Kouassi", online: false, time: "hier", last: "D'accord, je prépare la lettre de motivation.", unread: 0,
    messages: [
      { from: "out", text: "Bonjour Yao, pensez à finaliser votre lettre de motivation pour avancer le dossier.", time: "hier 16:10" },
      { from: "in", text: "D'accord, je prépare la lettre de motivation.", time: "hier 16:40" },
    ] },
  { id: "t3", name: "Mariam Koné", online: true, time: "08:15", last: "Le paiement du mandarin est parti par virement.", unread: 1,
    messages: [
      { from: "in", text: "Le paiement du mandarin est parti par virement.", time: "08:15" },
    ] },
  { id: "t4", name: "Ibrahim Cissé", online: false, time: "lun.", last: "Super, merci pour les infos !", unread: 0,
    messages: [
      { from: "in", text: "Comment je commence mon inscription ?", time: "lun. 11:00" },
      { from: "out", text: "Je vous ai envoyé le lien et la liste des pièces. Commencez par le passeport.", time: "lun. 11:20" },
      { from: "in", text: "Super, merci pour les infos !", time: "lun. 11:22" },
    ] },
];

const REPORTS = [
  { id: "r1", employee: "Aïcha Koné", poste: "Conseillère étudiante", date: "Aujourd'hui", hours: 8,
    activities: "Suivi de 4 dossiers de visa, relance de l'agence partenaire à Pékin, mise à jour du tableau d'admissions.", note: "", state: "pending" },
  { id: "r2", employee: "Moussa Diallo", poste: "Agent administratif", date: "Aujourd'hui", hours: 7.5,
    activities: "Traitement des paiements déclarés, vérification des justificatifs Wave et Orange Money, archivage des reçus.", note: "Réseau instable en matinée.", state: "pending" },
  { id: "r3", employee: "Sandra Mensah", poste: "Accueil & relation", date: "Aujourd'hui", hours: 8,
    activities: "Accueil de 9 étudiants, prise de rendez-vous, réponses aux appels entrants concernant les bourses.", note: "", state: "pending" },
  { id: "r4", employee: "Kévin Ouattara", poste: "Chargé de dossiers", date: "Hier", hours: 8,
    activities: "Préparation de 3 lettres d'admission, contrôle des dossiers académiques avant envoi aux universités.", note: "", state: "approved" },
];

function buildData() {
  return {
    staff: STAFF,
    kpis: {
      dayPct: 64, handledToday: 9, targetToday: 14, pending: 5,
      activeDossiers: 38, dossiersTrend: 4, collectedMonth: 8450000, collectTrend: 12,
      paymentsToValidate: PAYMENTS.filter(p => p.state === "pending").length,
      reportsToValidate: REPORTS.filter(r => r.state === "pending").length, team: 6,
    },
    todoPayments: PAYMENTS.filter(p => p.state === "pending").map(p => ({ id: p.id, student: p.student, type: p.type, ago: p.ago, amount: p.amount })),
    todoReports: REPORTS.filter(r => r.state === "pending").map(r => ({ id: r.id, employee: r.employee, poste: r.poste, hours: r.hours, date: r.date })),
    recentDossiers: DOSSIERS_LIST,
    dossiers: DOSSIERS_LIST,
    students: STUDENTS,
    payments: PAYMENTS,
    threads: THREADS,
    unread: THREADS.reduce((s, t) => s + (t.unread || 0), 0),
    reports: REPORTS,
    reportsTotalHours: REPORTS.filter(r => r.date === "Aujourd'hui").reduce((s, r) => s + r.hours, 0),
  };
}

/* ============================================================
   App — tab + detail-stack navigation
   ============================================================ */
function App() {
  const [data, setData] = useState(buildData);
  const [tab, setTab] = useState("home");
  const [detail, setDetail] = useState(null); // {type:'student'|'chat'|'rapports', id}
  const [proof, setProof] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastT = useRef(null);

  const toast = (m) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 2200); };

  const go = (t) => { setDetail(null); setTab(t); };
  const openStudent = (id) => setDetail({ type: "student", id });
  const openChat = (id) => setDetail({ type: "chat", id: id || data.threads[0].id });
  const openRapports = () => setDetail({ type: "rapports" });
  const back = () => setDetail(null);

  const validate = (id, ok) => {
    setData((d) => ({ ...d, payments: d.payments.map((p) => p.id === id ? { ...p, state: ok ? "approved" : "rejected", by: "Karim" } : p) }));
    setProof(null);
    toast(ok ? "Paiement validé ✓" : "Paiement rejeté");
  };
  const validateReport = (id, ok) => {
    setData((d) => ({ ...d, reports: d.reports.map((r) => r.id === id ? { ...r, state: ok ? "approved" : "flagged" } : r) }));
    toast(ok ? "Rapport validé ✓" : "Rapport signalé");
  };

  // recompute derived badges
  const badges = {
    paiements: data.payments.filter(p => p.state === "pending").length || null,
    messages: data.unread || null,
  };

  let screen, key = tab;
  if (detail?.type === "student") {
    const s = data.students.find((x) => x.id === detail.id);
    screen = <ScreenStudent student={s} back={back} go={go} openChat={() => openChat(s.id.replace("s", "t"))} toast={toast} />;
    key = "student-" + detail.id;
  } else if (detail?.type === "chat") {
    const t = data.threads.find((x) => x.id === detail.id) || data.threads[0];
    screen = <ScreenChat thread={t} back={back} toast={toast} />;
    key = "chat-" + t.id;
  } else if (detail?.type === "rapports") {
    screen = <ScreenRapports data={data} back={back} validateReport={validateReport} toast={toast} />;
    key = "rapports";
  } else if (tab === "home") {
    screen = <ScreenHome data={data} go={(t) => t === "rapports" ? openRapports() : go(t)} openStudent={openStudent} />;
  } else if (tab === "dossiers") {
    screen = <ScreenDossiers data={data} openStudent={openStudent} />;
  } else if (tab === "paiements") {
    screen = <ScreenPaiements data={data} validate={validate} openProof={setProof} />;
  } else if (tab === "messages") {
    screen = <ScreenMessages data={data} openChat={openChat} />;
  } else {
    screen = <ScreenProfil data={data} go={(t) => t === "rapports" ? openRapports() : go(t)} toast={toast} />;
  }

  const isChat = detail?.type === "chat";
  const showTabs = !detail;

  return (
    <div className="scr">
      <StatusBar />
      <div className={"scr-inner " + (detail ? "detail" : "fade")} key={key} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {screen}
      </div>
      {showTabs && <BottomTabs active={tab} onChange={go} badges={badges} />}

      {proof && (
        <div className="sheet-ov" onClick={() => setProof(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="row" style={{ marginBottom: 14 }}>
              <Avatar name={proof.student} kind="student" size={40} />
              <div className="grow"><div className="t1">{proof.student}</div><div className="t2">{proof.type} · {fmtFCFA(proof.amount)} FCFA</div></div>
              <div className="iconbtn-g" onClick={() => setProof(null)}><Icon d={ICONS.x} s={18} /></div>
            </div>
            <div className="proof" style={{ height: 280, marginBottom: 14 }}>
              <div style={{ textAlign: "center" }}>
                <Icon d={ICONS.doc} s={44} style={{ opacity: .5 }} />
                <div className="t2" style={{ marginTop: 8 }}>{proof.proof}</div>
                <div className="t3">{proof.method}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button className="pbtn danger" style={{ flex: 1 }} onClick={() => validate(proof.id, false)}><Icon d={ICONS.x} s={17} /> Rejeter</button>
              <button className="pbtn mint" style={{ flex: 1.4 }} onClick={() => validate(proof.id, true)}><Icon d={ICONS.check} s={17} sw={2.6} /> Valider le paiement</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <Toast msg={toastMsg} />}
    </div>
  );
}

/* ============================================================
   Device stage — scale phone to fit viewport
   ============================================================ */
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
        <span className="stage-hint">Joda · Staff mobile — 390 × 844{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}</span>
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
