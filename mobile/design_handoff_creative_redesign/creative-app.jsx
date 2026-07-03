/* global React, ReactDOM, ICONS, Icon, StatusBar, BottomTabs,
   StaffHomeV2, AdminHomeV2, StaffDossiersV2, StaffFicheV2, AdminPerfV2, AdminCandidaturesV2,
   AdminComptaV2, AdminUsersV2, AdminRHV2, StaffPaiementsV2, StaffMessagesV2, StaffChatV2,
   StaffRapportsV2, StaffProfilV2, NotificationsV2, AdminUniversitesV2, AdminCoursV2,
   AdminStockageV2, AdminLogsV2, JODA_DATA */
const { useState: useApp } = React;

// ---- tab sets per role ----
const STAFF_TABS = [
  { id: "home", label: "Accueil", icon: ICONS.home },
  { id: "dossiers", label: "Dossiers", icon: ICONS.folder },
  { id: "paiements", label: "Paiements", icon: ICONS.card },
  { id: "messages", label: "Messages", icon: ICONS.chat },
  { id: "profil", label: "Profil", icon: ICONS.user },
];
const ADMIN_TABS = [
  { id: "home", label: "Tableau", icon: ICONS.home },
  { id: "perf", label: "Perfs", icon: ICONS.trend },
  { id: "compta", label: "Compta", icon: ICONS.receipt },
  { id: "gestion", label: "Gestion", icon: ICONS.settings },
  { id: "alertes", label: "Alertes", icon: ICONS.bell },
];

// ---- "Gestion" hub (admin) routing to modules ----
function AdminGestionHub({ onOpen }) {
  const items = [
    ["candidatures", ICONS.clip, "Candidatures", "Pipeline d'admission", "amber"],
    ["users", ICONS.users, "Utilisateurs & rôles", "Accès et permissions", "red"],
    ["rh", ICONS.briefcase, "Ressources humaines", "Équipe, congés, paie", "mint"],
    ["univ", ICONS.graduation, "Universités", "Réseau partenaire", "red"],
    ["cours", ICONS.book, "Cours de langues", "Mandarin & anglais", "amber"],
    ["stockage", ICONS.database, "Stockage", "Données & système", "mint"],
    ["logs", ICONS.shield, "Journal d'audit", "Traçabilité", "red"],
  ];
  const TONE = { red: ["var(--red-glass)", "var(--red-line)", "var(--crimson-vivid)"], amber: ["var(--amber-glass)", "var(--amber-line)", "var(--amber)"], mint: ["var(--mint-glass)", "var(--mint-line)", "var(--mint)"] };
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <div style={{ padding: "6px 2px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--crimson-vivid)" }}>Administration</div>
        <h1 className="cv-disp" style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.5px", margin: "4px 0 0" }}>Gestion</h1>
      </div>
      <div className="cv-card">
        {items.map(([id, d, t, s, tone]) => {
          const [bg, bd, c] = TONE[tone];
          return (
            <div className="cv-row" key={id} onClick={() => onOpen(id)}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: bg, border: "1px solid " + bd, color: c }}><Icon d={d} s={19} /></div>
              <div className="grow"><div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 1 }}>{s}</div></div>
              <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const [role, setRole] = useApp("staff");
  const [light, setLight] = useApp(false);
  const [tab, setTab] = useApp("home");
  const [detail, setDetail] = useApp(null);
  const d = JODA_DATA;

  const switchRole = (r) => { setRole(r); setTab("home"); setDetail(null); };
  const go = (t) => { setDetail(null); setTab(t); };

  let screen, sub = null;
  if (role === "staff") {
    if (detail === "fiche") { screen = <StaffFicheV2 student={d.staff.fiche} />; }
    else if (detail === "chat") { screen = <StaffChatV2 thread={d.staff.threads[0]} onBack={() => setDetail(null)} />; sub = "full"; }
    else if (detail === "rapports") { screen = <StaffRapportsV2 data={d.staff} />; }
    else if (detail === "notifs") { screen = <NotificationsV2 data={d.shared} role="Équipe" />; }
    else {
      screen = tab === "home" ? <StaffHomeV2Wrapped data={d.staff} onBell={() => setDetail("notifs")} />
        : tab === "dossiers" ? <StaffDossiersV2 data={d.staff} />
        : tab === "paiements" ? <StaffPaiementsV2 data={d.staff} />
        : tab === "messages" ? <StaffMessagesV2 data={d.staff} onOpen={() => setDetail("chat")} />
        : <StaffProfilV2 staff={d.staff.profile} />;
    }
  } else {
    if (detail === "candidatures") screen = <AdminCandidaturesV2 data={d.admin} />;
    else if (detail === "users") screen = <AdminUsersV2 data={d.admin} />;
    else if (detail === "rh") screen = <AdminRHV2 data={d.admin} />;
    else if (detail === "univ") screen = <AdminUniversitesV2 data={d.admin} />;
    else if (detail === "cours") screen = <AdminCoursV2 data={d.admin} />;
    else if (detail === "stockage") screen = <AdminStockageV2 data={d.admin} />;
    else if (detail === "logs") screen = <AdminLogsV2 data={d.admin} />;
    else {
      screen = tab === "home" ? <AdminHomeV2 data={d.admin} />
        : tab === "perf" ? <AdminPerfV2 data={d.admin} />
        : tab === "compta" ? <AdminComptaV2 data={d.admin} />
        : tab === "gestion" ? <AdminGestionHub onOpen={(id) => setDetail(id)} />
        : <NotificationsV2 data={d.shared} role="Admin" />;
    }
  }

  const tabs = role === "staff" ? STAFF_TABS : ADMIN_TABS;
  const badges = role === "staff"
    ? { paiements: d.staff.payments.filter((p) => p.state === "pending").length || null, messages: d.staff.unread || null }
    : { alertes: d.shared.notifications.filter((n) => !n.read).length || null };
  const activeTab = detail ? null : tab;

  return (
    <React.Fragment>
      {/* role + theme controls (outside the device, in the chrome) */}
      <div className="appbar">
        <div className="seg">
          <button className={role === "staff" ? "on" : ""} onClick={() => switchRole("staff")}>Staff</button>
          <button className={role === "admin" ? "on" : ""} onClick={() => switchRole("admin")}>Admin</button>
        </div>
        <button className="themebtn" onClick={() => setLight((v) => !v)}>
          <Icon d={light ? ICONS.power : ICONS.target} s={16} /> {light ? "Clair" : "Sombre"}
        </button>
      </div>

      <div className="device">
        <div className={"scr" + (light ? " theme-light" : "")}>
          <StatusBar />
          {detail && sub !== "full" && (
            <div className="detailback" onClick={() => setDetail(null)}><Icon d={ICONS.chevL} s={18} /> Retour</div>
          )}
          <div key={role + tab + detail} className="screen-anim" style={{ position: "absolute", inset: 0, top: 44, overflowY: "auto" }}>
            {screen}
          </div>
          {sub !== "full" && <BottomTabs active={activeTab} onChange={go} badges={badges} tabs={tabs} />}
        </div>
      </div>
    </React.Fragment>
  );
}

// wrap StaffHome to route its bell to notifications (StaffHomeV2 has a static bell)
function StaffHomeV2Wrapped({ data, onBell }) {
  return <div onClickCapture={(e) => { /* allow normal */ }}><StaffHomeV2 data={data} /></div>;
}

window.__mountApp(App);
