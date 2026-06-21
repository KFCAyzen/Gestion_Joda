/* global React, Icon, ICONS, Avatar, Chip, IconBox, MiniRing, PHeader, fmtFCFA, compact */
/* ============================================================
   Admin screens — B : Plus hub + modules réels
   Utilisateurs · RH · Candidatures · Logs · Communication · Newsletter · Universités
   ============================================================ */
const { useState: useStateAdminB } = React;

/* ============ PLUS (hub des modules) — reflète les sections du menu web ============ */
function AdminPlus({ data, go, toast }) {
  const sections = [
    { label: "Opérations", mods: [
      { id: "candidatures", t: "Candidatures", d: "Demandes en cours", icon: ICONS.fileclock, tone: "amber", badge: data.candidatures.filter(c => c.bucket === "todo").length },
      { id: "etudiants", t: "Étudiants", d: "Profils & dossiers", icon: ICONS.graduation, tone: "blue" },
      { id: "dossiers", t: "Dossiers", d: "Bourses en cours", icon: ICONS.filearchive, tone: "ghost" },
    ]},
    { label: "Communication", mods: [
      { id: "communication", t: "Messagerie", d: "Échanges étudiants", icon: ICONS.chat, tone: "mint", badge: data.threads.reduce((s,t)=>s+(t.unread||0),0) },
      { id: "newsletter", t: "Newsletter", d: "Campagnes e-mail", icon: ICONS.newspaper, tone: "amber" },
    ]},
    { label: "Ressources", mods: [
      { id: "universites", t: "Universités", d: "Partenaires", icon: ICONS.building, tone: "ghost" },
      { id: "frais", t: "Frais", d: "Paiements & tranches", icon: ICONS.card, tone: "blue" },
      { id: "cours", t: "Cours de langues", d: "Mandarin & Anglais", icon: ICONS.book, tone: "mint" },
    ]},
    { label: "RH", mods: [
      { id: "rh", t: "Ressources humaines", d: "Employés, congés, paie, rapports", icon: ICONS.briefcase, tone: "red", badge: data.rh.pendingReports, wide: true },
    ]},
    { label: "Administration", mods: [
      { id: "utilisateurs", t: "Utilisateurs", d: "Comptes & rôles", icon: ICONS.users, tone: "blue" },
      { id: "logs", t: "Logs d'activités", d: "Traçabilité", icon: ICONS.fileclock, tone: "ghost" },
      { id: "config", t: "Config. frais", d: "Tranches & pénalités", icon: ICONS.settings, tone: "amber" },
    ]},
    { label: "Système", mods: [
      { id: "stockage", t: "Stockage", d: "Base & fichiers", icon: ICONS.database, tone: "ghost", wide: true },
    ]},
  ];
  return (
    <React.Fragment>
      <PHeader eyebrow="Tous les modules" title="Plus"
        right={<Avatar name={data.admin.name} kind="staff" size={42} />} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="glass strong" style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16 }}>
          <Avatar name={data.admin.name} kind="staff" size={54} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 600 }}>{data.admin.name}</div><div className="t2">{data.admin.role}</div></div>
          <Chip variant="live" label="Admin" />
        </div>
        {sections.map((sec) => (
          <div key={sec.label} style={{ marginBottom: 18 }}>
            <div className="s" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ink50)", marginBottom: 10 }}>{sec.label}</div>
            <div className="modgrid">
              {sec.mods.map((m) => (
                <div key={m.id} className="modcard" onClick={() => go(m.id)} style={m.wide ? { gridColumn: "1 / -1", minHeight: 0, flexDirection: "row", alignItems: "center" } : {}}>
                  {m.wide ? (
                    <React.Fragment>
                      <IconBox tone={m.tone} size={42} d={m.icon} is={20} />
                      <div style={{ flex: 1 }}><div className="mt">{m.t}</div><div className="md">{m.d}</div></div>
                      {m.badge ? <span className="mbadge">{m.badge}</span> : <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />}
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <IconBox tone={m.tone} size={40} d={m.icon} is={19} />
                        {m.badge ? <span className="mbadge">{m.badge}</span> : <Icon d={ICONS.chevR} s={17} style={{ color: "var(--ink35)" }} />}
                      </div>
                      <div><div className="mt">{m.t}</div><div className="md">{m.d}</div></div>
                    </React.Fragment>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="glass listcard" style={{ marginBottom: 8 }}>
          <div className="litem" onClick={() => toast("Déconnexion simulée")}>
            <IconBox tone="red" size={38} d={ICONS.logout} is={17} />
            <div className="grow"><div className="t1" style={{ fontSize: 14, color: "var(--crimson-vivid)" }}>Se déconnecter</div></div>
            <span />
          </div>
        </div>
        <div style={{ textAlign: "center", color: "var(--ink35)", fontSize: 11, padding: "6px 0 8px" }}>Joda Company · Admin v1.0</div>
      </div>
    </React.Fragment>
  );
}

/* ============ UTILISATEURS ============ */
const UROLE = {
  super_admin: { v: "live", l: "Super admin" }, admin: { v: "role", l: "Admin" },
  supervisor: { v: "purple", l: "Superviseur" }, agent: { v: "done", l: "Agent" }, user: { v: "ghost", l: "Utilisateur" },
};
function AdminUsers({ data, back, regenPin, toggleActive, toast }) {
  const [tab, setTab] = useStateAdminB("comptes");
  const [q, setQ] = useStateAdminB("");
  const list = data.users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={data.users.length + " comptes"} title="Utilisateurs" sm
        right={<div className="iconbtn-g" onClick={() => toast("Créer un compte")}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 12 }}>
          {[["comptes", "Comptes"], ["roles", "Rôles & permissions"]].map(([id, l]) => <div key={id} className={"fchip" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</div>)}
        </div>
        {tab === "comptes" ? (
          <React.Fragment>
            <div className="search" style={{ marginBottom: 12 }}>
              <Icon d={ICONS.search} s={18} /><input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="stack" style={{ gap: 11 }}>
              {list.map((u) => (
                <div key={u.id} className="glass" style={{ padding: 14, opacity: u.active ? 1 : .6 }}>
                  <div className="row">
                    <div style={{ position: "relative" }}>
                      <Avatar name={u.name} kind={["admin","super_admin","supervisor"].includes(u.role) ? "staff" : "agent"} size={46} />
                      <span style={{ position: "absolute", right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, background: u.active ? "var(--mint)" : "var(--ink35)", border: "2px solid #160409" }} />
                    </div>
                    <div className="grow"><div className="t1 ell">{u.name}</div><div className="t2 ell">@{u.username}</div></div>
                    <Chip variant={UROLE[u.role].v} label={UROLE[u.role].l} />
                  </div>
                  {u.mustChange && <div className="t3" style={{ marginTop: 8, color: "var(--amber)" }}><Icon d={ICONS.alert} s={12} style={{ verticalAlign: -2 }} /> Doit changer son mot de passe</div>}
                  <div className="divider" style={{ margin: "12px -14px" }} />
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="presence"><Icon d={ICONS.key} s={14} style={{ color: "var(--ink50)" }} /><span className="t3">PIN rapport</span> <span style={{ fontFamily: "monospace", letterSpacing: 2, fontSize: 12, color: "var(--ink70)" }}>{u.hasPin ? "••••••" : "—"}</span></div>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button className="pbtn sm glass" style={{ width: "auto", padding: "0 11px", height: 33 }} onClick={() => toast("Réinitialiser le mot de passe de " + u.name.split(" ")[0])}><Icon d={ICONS.refresh} s={13} /> MDP</button>
                      <button className="pbtn sm glass" style={{ width: "auto", padding: "0 11px", height: 33, color: u.active ? "var(--crimson-vivid)" : "var(--mint)" }} onClick={() => toggleActive(u.id)}><Icon d={ICONS.power} s={13} /> {u.active ? "Désactiver" : "Activer"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </React.Fragment>
        ) : (
          <div className="stack" style={{ gap: 11 }}>
            <div className="t3" style={{ lineHeight: 1.45 }}>Permissions accordées par rôle. Touchez un rôle pour ajuster ses accès.</div>
            {Object.entries(UROLE).map(([role, r]) => (
              <div key={role} className="glass" style={{ padding: 14, cursor: "pointer" }} onClick={() => toast("Permissions : " + r.l)}>
                <div className="row">
                  <IconBox tone={role === "agent" ? "mint" : ["admin","super_admin"].includes(role) ? "red" : role === "supervisor" ? "blue" : "ghost"} size={40} d={ICONS.shieldKey} />
                  <div className="grow"><div className="t1">{r.l}</div><div className="t2">{data.rolePerms[role]} permissions actives</div></div>
                  <Icon d={ICONS.chevR} s={17} style={{ color: "var(--ink35)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

/* ============ RH ============ */
const RH_TABS = [["employes", "Employés"], ["conges", "Congés"], ["paie", "Paie"], ["rapports", "Rapports"], ["evals", "Évals"]];
function AdminRH({ data, back, go, validateReport, toast }) {
  const [tab, setTab] = useStateAdminB("employes");
  const rh = data.rh;
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Ressources humaines" title="RH" sm />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        {/* stat row */}
        <div className="kgrid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 13 }}>
          {[["Actifs", rh.activeCount], ["Congés", rh.pendingLeaves], ["Paie", rh.payslips], ["Rapports", rh.pendingReports]].map(([k, v], i) => (
            <div key={i} className="glass flat" style={{ padding: "11px 6px", textAlign: "center", borderRadius: 12 }}><div style={{ fontSize: 19, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 9.5, color: "var(--ink50)", marginTop: 2 }}>{k}</div></div>
          ))}
        </div>
        <div className="seg2" style={{ marginBottom: 13 }}>
          {RH_TABS.map(([id, l]) => <div key={id} className={"fchip" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</div>)}
        </div>

        {tab === "employes" && (
          <div className="glass listcard">
            {rh.employees.map((e) => (
              <div key={e.id} className="litem">
                <Avatar name={e.name} kind="agent" size={42} />
                <div className="grow"><div className="t1 ell">{e.name}</div><div className="t2 ell">{e.matricule} · {e.poste}</div></div>
                <div style={{ textAlign: "right" }}>
                  <Chip variant={e.statut === "actif" ? "done" : e.statut === "suspendu" ? "due" : "inactive"} label={e.statut} />
                  <div className="t3" style={{ marginTop: 4 }}>{compact(e.salaire)} F</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "conges" && (
          <div className="stack" style={{ gap: 11 }}>
            {rh.leaves.map((l) => (
              <div key={l.id} className="glass" style={{ padding: 14 }}>
                <div className="row">
                  <IconBox tone="blue" size={40} d={ICONS.cal} />
                  <div className="grow"><div className="t1 ell">{l.name}</div><div className="t2">{l.type} · {l.days} jours</div><div className="t3">{l.from} → {l.to}</div></div>
                  <Chip variant={l.status === "en_attente" ? "due" : l.status === "approuve" ? "done" : "inactive"} label={l.status === "en_attente" ? "En attente" : l.status === "approuve" ? "Approuvé" : "Refusé"} />
                </div>
                {l.status === "en_attente" && (
                  <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
                    <button className="pbtn sm danger" style={{ flex: 1 }} onClick={() => toast("Congé refusé")}><Icon d={ICONS.x} s={15} /> Refuser</button>
                    <button className="pbtn sm mint" style={{ flex: 1.3 }} onClick={() => toast("Congé approuvé")}><Icon d={ICONS.check} s={15} sw={2.6} /> Approuver</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {tab === "paie" && (
          <div className="glass listcard">
            {rh.payslipsList.map((p, i) => (
              <div key={i} className="litem">
                <IconBox tone="mint" size={40} d={ICONS.receipt} />
                <div className="grow"><div className="t1 ell">{p.name}</div><div className="t2">{p.month} · {p.ref}</div></div>
                <div style={{ textAlign: "right" }}><div className="t1 amt" style={{ fontSize: 14 }}>{compact(p.net)} F</div><div className="t3">net</div></div>
              </div>
            ))}
          </div>
        )}
        {tab === "rapports" && (
          <React.Fragment>
            <div className="glass" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{rh.reports.filter(r => r.state === "pending").length}</div><div className="t3">rapports à valider</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 15, fontWeight: 600, color: "var(--mint)" }}>{rh.reportsHours}h</div><div className="t3">aujourd'hui</div></div>
            </div>
            <div className="stack" style={{ gap: 11 }}>
              {rh.reports.map((r) => (
                <div key={r.id} className="glass" style={{ padding: 14 }}>
                  <div className="row">
                    <Avatar name={r.employee} kind="agent" size={40} />
                    <div className="grow"><div className="t1 ell">{r.employee}</div><div className="t2 ell">{r.poste}</div></div>
                    <div style={{ textAlign: "right" }}><Chip variant="ghost" label={r.date} /><div className="t3" style={{ marginTop: 4 }}><Icon d={ICONS.clock} s={11} style={{ verticalAlign: -2 }} /> {r.hours}h</div></div>
                  </div>
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,.04)", border: "1px solid var(--glass-line)", borderRadius: 11, fontSize: 12.5, lineHeight: 1.45, color: "var(--ink70)" }}>{r.activities}</div>
                  {r.state === "pending" ? (
                    <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
                      <button className="pbtn sm danger" style={{ flex: 1 }} onClick={() => validateReport(r.id, false)}><Icon d={ICONS.flag} s={14} /> Signaler</button>
                      <button className="pbtn sm mint" style={{ flex: 1.3 }} onClick={() => validateReport(r.id, true)}><Icon d={ICONS.check} s={15} sw={2.6} /> Valider</button>
                    </div>
                  ) : <div style={{ marginTop: 10 }}><Chip variant="done" label="Validé" /></div>}
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
        {tab === "evals" && (
          <div className="glass listcard">
            {rh.evals.map((e, i) => (
              <div key={i} className="litem" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div className="row">
                  <span className="pos" style={{ width: 20, fontWeight: 700, color: "var(--ink50)" }}>{i + 1}</span>
                  <Avatar name={e.name} kind="agent" size={38} />
                  <div className="grow"><div className="t1 ell">{e.name}</div><div className="t3">{e.dept}</div></div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--mint)" }}>{e.index}</div>
                </div>
                <div className="row" style={{ justifyContent: "space-between", paddingLeft: 28 }}>
                  <span className="stars">{[1,2,3,4,5].map((n) => <Icon key={n} d={ICONS.starF} s={12} fill={n <= Math.round(e.rating) ? "#fbbf24" : "none"} style={{ color: n <= Math.round(e.rating) ? "#fbbf24" : "rgba(255,255,255,.2)" }} sw={1.5} />)}</span>
                  <span className="t3">{e.evals} évals · {e.reports} rapports</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

/* ============ CANDIDATURES ============ */
const CAND_STATUS = {
  en_attente: { v: "due", l: "En attente" }, document_recu: { v: "done", l: "Doc. reçu" },
  document_manquant: { v: "live", l: "Doc. manquant" }, en_cours: { v: "ghost", l: "En cours" },
};
function AdminCandidatures({ data, back, openStudent }) {
  const [f, setF] = useStateAdminB("todo");
  const buckets = [["todo", "À traiter"], ["all", "Toutes"]];
  const list = data.candidatures.filter((c) => f === "all" || c.bucket === "todo");
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={data.candidatures.length + " demandes"} title="Candidatures" sm
        right={<div className="iconbtn-g"><Icon d={ICONS.filter} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 12 }}>
          {buckets.map(([id, l]) => <div key={id} className={"fchip" + (f === id ? " on" : "")} onClick={() => setF(id)}>{l}</div>)}
        </div>
        <div className="glass listcard">
          {list.map((c) => (
            <div key={c.id} className="litem" onClick={() => openStudent && openStudent(c.id)}>
              <Avatar name={c.name} kind="student" size={42} />
              <div className="grow"><div className="t1 ell">{c.name}</div><div className="t2 ell">{c.program}</div><div className="t3">Déposée {c.ago}</div></div>
              <Chip variant={CAND_STATUS[c.status].v} label={CAND_STATUS[c.status].l} />
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ LOGS D'ACTIVITÉS ============ */
const LOG_STYLE = {
  create: "#34d9a8", delete: "#ef4444", validate: "#22c55e", reject: "#fb7185",
  update: "#60a5fa", login: "#818cf8", logout: "rgba(255,255,255,.35)", upload: "#2dd4bf",
  payment: "#a78bfa", accounting: "#fbbf24", config: "rgba(255,255,255,.45)",
};
const LOG_ROLE = { super_admin: "purple", admin: "role", agent: "done", supervisor: "purple", user: "ghost" };
function AdminLogs({ data, back }) {
  const [filter, setFilter] = useStateAdminB("all");
  const cats = [["all", "Tout"], ["payment", "Paiements"], ["validate", "Validations"], ["update", "Modifs"], ["login", "Connexions"]];
  const list = data.logs.filter((l) => filter === "all" || l.type === filter);
  const grouped = {};
  list.forEach((l) => { (grouped[l.day] ||= []).push(l); });
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Activités sensibles" title="Logs d'activités" sm
        right={<div className="iconbtn-g"><Icon d={ICONS.search} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 12 }}>
          {cats.map(([id, l]) => <div key={id} className={"fchip" + (filter === id ? " on" : "")} onClick={() => setFilter(id)}>{l}</div>)}
        </div>
        {Object.entries(grouped).map(([day, logs]) => (
          <div key={day} style={{ marginBottom: 13 }}>
            <div className="daylabel" style={{ paddingLeft: 2 }}>{day}</div>
            <div className="glass">
              {logs.map((l, i) => (
                <div key={i} className="log">
                  <div className="ldot"><span className="d" style={{ background: LOG_STYLE[l.type] || "rgba(255,255,255,.4)" }} />{i < logs.length - 1 && <span style={{ flex: 1, width: 1, background: "var(--glass-line)", marginTop: 4 }} />}</div>
                  <div className="lbody">
                    <div className="row" style={{ gap: 7, marginBottom: 2 }}>
                      <span className="t1" style={{ fontSize: 12.5 }}>{l.actor}</span>
                      <Chip variant={LOG_ROLE[l.role]} label={l.role === "super_admin" ? "S.admin" : l.role} />
                    </div>
                    <div className="lt" style={{ fontSize: 12.5 }}>{l.desc}</div>
                  </div>
                  <div className="ltime">{l.time}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ============ COMMUNICATION (messagerie étudiants) ============ */
function AdminComm({ data, back, openChat }) {
  const [q, setQ] = useStateAdminB("");
  const list = data.threads.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={data.threads.reduce((s,t)=>s+(t.unread||0),0) + " non lus"} title="Messagerie" sm
        right={<div className="iconbtn-g"><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="search" style={{ marginBottom: 12 }}><Icon d={ICONS.search} s={18} /><input placeholder="Rechercher une conversation…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="glass listcard">
          {list.map((t) => (
            <div key={t.id} className="litem" onClick={() => openChat(t.id)}>
              <div style={{ position: "relative" }}>
                <Avatar name={t.name} kind="student" size={48} />
                {t.online && <span style={{ position: "absolute", right: 0, bottom: 1, width: 12, height: 12, borderRadius: 6, background: "var(--mint)", border: "2px solid #160409" }} />}
              </div>
              <div className="grow">
                <div className="row" style={{ gap: 8 }}><div className="t1 ell" style={{ flex: 1 }}>{t.name}</div><div className="t3">{t.time}</div></div>
                <div className="row" style={{ gap: 8, marginTop: 3 }}><div className="t2 ell" style={{ flex: 1, color: t.unread ? "#fff" : "var(--ink50)", fontWeight: t.unread ? 600 : 400 }}>{t.last}</div>{t.unread ? <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--crimson-vivid)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "grid", placeItems: "center" }}>{t.unread}</span> : null}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* chat */
function AdminChat({ thread, back }) {
  const [msgs, setMsgs] = useStateAdminB(thread.messages);
  const [txt, setTxt] = useStateAdminB("");
  const send = () => { const v = txt.trim(); if (!v) return; setMsgs((m) => [...m, { from: "out", text: v, time: "maintenant" }]); setTxt(""); };
  return (
    <React.Fragment>
      <div className="phead" style={{ paddingBottom: 12 }}>
        <div className="backbtn" onClick={back}><Icon d={ICONS.chevL} s={20} /></div>
        <Avatar name={thread.name} kind="student" size={42} />
        <div className="left" style={{ marginLeft: 2 }}><div className="t1" style={{ fontSize: 15.5 }}>{thread.name}</div><div className="t3" style={{ color: thread.online ? "var(--mint)" : "var(--ink50)" }}>{thread.online ? "En ligne" : "Vu " + thread.time}</div></div>
      </div>
      <div className="chat-body">
        <div className="daypill">Aujourd'hui</div>
        {msgs.map((m, i) => <div key={i} className={"bub " + m.from}>{m.text}<div className="tm">{m.time}</div></div>)}
      </div>
      <div className="composer">
        <input className="ci" placeholder="Votre message…" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="send" onClick={send}><Icon d={ICONS.send2} s={19} fill="currentColor" /></button>
      </div>
    </React.Fragment>
  );
}

/* ============ NEWSLETTER ============ */
function AdminNewsletter({ data, back, toast }) {
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Campagnes e-mail" title="Newsletter" sm
        right={<div className="iconbtn-g" onClick={() => toast("Nouvelle campagne")}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div className="eyebrow" style={{ color: "#ffd9a0" }}>Composer une campagne</div>
          <button className="pbtn" style={{ marginTop: 12 }} onClick={() => toast("Éditeur d'e-mail")}><Icon d={ICONS.mail} s={16} /> Rédiger un e-mail</button>
        </div>
        <div className="seclbl"><span className="s">Audiences</span></div>
        <div className="glass listcard">
          {data.newsletter.audiences.map((a, i) => (
            <div key={i} className="litem" onClick={() => toast("Audience : " + a.label)}>
              <IconBox tone="blue" size={38} d={ICONS.users} is={17} />
              <div className="grow"><div className="t1" style={{ fontSize: 14 }}>{a.label}</div><div className="t3">{a.count} destinataires</div></div>
              <Icon d={ICONS.chevR} s={17} style={{ color: "var(--ink35)" }} />
            </div>
          ))}
        </div>
        <div className="seclbl" style={{ marginTop: 16 }}><span className="s">Campagnes récentes</span></div>
        <div className="stack" style={{ gap: 11 }}>
          {data.newsletter.campaigns.map((c, i) => (
            <div key={i} className="glass" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row" style={{ gap: 10 }}><IconBox tone="amber" size={36} d={ICONS.newspaper} is={16} /><div><div className="t1" style={{ fontSize: 14 }}>{c.title}</div><div className="t3">{c.date} · {c.audience}</div></div></div>
                <Chip variant={c.status === "Envoyée" ? "done" : c.status === "Programmée" ? "due" : "ghost"} label={c.status} />
              </div>
              {c.status === "Envoyée" && <div style={{ display: "flex", gap: 18, marginTop: 11 }}><span className="t3"><Icon d={ICONS.users} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{c.sent} envoyés</span><span className="t3"><Icon d={ICONS.eye} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{c.open}% ouverture</span></div>}
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ UNIVERSITÉS ============ */
function AdminUniv({ data, back, toast }) {
  const [q, setQ] = useStateAdminB("");
  const list = data.universities.filter((u) => !q || (u.name + " " + u.country).toLowerCase().includes(q.toLowerCase()));
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={data.universities.length + " partenaires"} title="Universités" sm
        right={<div className="iconbtn-g" onClick={() => toast("Ajouter")}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="search" style={{ marginBottom: 12 }}><Icon d={ICONS.search} s={18} /><input placeholder="Rechercher une université…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="stack" style={{ gap: 11 }}>
          {list.map((u) => (
            <div key={u.id} className="glass" style={{ padding: 14, cursor: "pointer" }} onClick={() => toast(u.name)}>
              <div className="agency">
                <div className="flag">{u.flag}</div>
                <div className="grow" style={{ flex: 1, minWidth: 0 }}><div className="t1 ell">{u.name}</div><div className="t2 ell">{u.city}, {u.country}</div></div>
                <Chip variant={u.active ? "done" : "inactive"} label={u.active ? "Actif" : "Suspendu"} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <span className="t3"><Icon d={ICONS.graduation} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{u.programs} programmes</span>
                <span className="t3"><Icon d={ICONS.users} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{u.students} étudiants</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ Generic placeholder for secondary modules ============ */
function AdminSimple({ title, eyebrow, icon, lines, back }) {
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={eyebrow} title={title} sm />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="glass" style={{ textAlign: "center", padding: "40px 22px" }}>
          <IconBox tone="ghost" size={56} d={icon} is={26} style={{ margin: "0 auto 14px" }} />
          <div className="t1">{title}</div>
          <div className="t2" style={{ marginTop: 6, lineHeight: 1.5 }}>{lines}</div>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { AdminPlus, AdminUsers, AdminRH, AdminCandidatures, AdminLogs, AdminComm, AdminChat, AdminNewsletter, AdminUniv, AdminSimple });
