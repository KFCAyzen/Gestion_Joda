/* global React, Icon, ICONS, Avatar, Chip, IconBox, Ring, MiniRing, PHeader, fmtFCFA, compact */
/* ============================================================
   Admin screens — C : pages de destination réelles
   Étudiants · Dossiers · Frais · Cours · Config frais · Stockage · Notifications
   ============================================================ */
const { useState: useStateC } = React;

/* shared status maps */
const DOSSIER_ST = {
  en_attente: { v: "due", l: "En attente" },
  document_recu: { v: "done", l: "Doc. reçu" },
  document_manquant: { v: "live", l: "Doc. manquant" },
  en_cours: { v: "ghost", l: "En cours" },
  en_attente_universite: { v: "purple", l: "Attente univ." },
  visa_en_cours: { v: "role", l: "Visa en cours" },
  admission_validee: { v: "done", l: "Admission" },
};
const PAY_ST = {
  paye: { v: "done", l: "Payé", c: "var(--mint)" },
  attente: { v: "due", l: "En attente", c: "var(--amber)" },
  en_validation: { v: "due", l: "À valider", c: "var(--amber)" },
  retard: { v: "live", l: "En retard", c: "var(--crimson-vivid)" },
};

/* ============ ÉTUDIANTS ============ */
function AdminEtudiants({ data, back, openStudent }) {
  const [q, setQ] = useStateC("");
  const list = data.students.filter((s) => !q || (s.name + " " + s.program).toLowerCase().includes(q.toLowerCase()));
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={data.students.length + " étudiants suivis"} title="Étudiants" sm
        right={<div className="iconbtn-g" onClick={() => openStudent && null}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="search" style={{ marginBottom: 12 }}>
          <Icon d={ICONS.search} s={18} /><input placeholder="Rechercher un étudiant…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="glass listcard">
          {list.map((s) => (
            <div key={s.id} className="litem" onClick={() => openStudent(s.id)}>
              <Avatar name={s.name} kind="student" size={44} />
              <div className="grow"><div className="t1 ell">{s.name}</div><div className="t2 ell">{s.program}</div></div>
              <div style={{ textAlign: "right" }}>
                <Chip variant={DOSSIER_ST[s.status].v} label={DOSSIER_ST[s.status].l} />
                <div className="t3" style={{ marginTop: 4 }}>{s.ref}</div>
              </div>
            </div>
          ))}
          {!list.length && <div style={{ textAlign: "center", padding: 36, color: "var(--ink35)" }}>Aucun étudiant.</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ ÉTUDIANT / DOSSIER DETAIL ============ */
function AdminStudentDetail({ student, back, openChat, toast }) {
  const s = student;
  const totalPay = s.paid + s.due;
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={"Dossier · " + s.ref} title={s.name} sm
        right={<div className="iconbtn-g"><Icon d={ICONS.more} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 13 }}>
          <div className="glass strong" style={{ overflow: "hidden", position: "relative" }}>
            <Icon d={ICONS.plane} s={120} sw={1} style={{ position: "absolute", top: -22, right: -16, color: "rgba(255,255,255,.05)" }} />
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Ring pct={s.pct} size={90} stroke={10} gid="stuDR">
                <div style={{ fontSize: 21, fontWeight: 600 }}>{s.pct}<span style={{ fontSize: 12, color: "var(--ink50)" }}>%</span></div>
                <div style={{ fontSize: 8.5, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: 1 }}>Dossier</div>
              </Ring>
              <div style={{ flex: 1 }}>
                <div className="eyebrow">Destination</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{s.dest}</div>
                <div className="t2">{s.program}</div>
                <div style={{ marginTop: 9 }}><Chip variant={DOSSIER_ST[s.status].v} label={"Étape " + s.step + "/6 · " + DOSSIER_ST[s.status].l} /></div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="pbtn sm" style={{ flex: 1 }} onClick={openChat}><Icon d={ICONS.chat} s={16} /> Message</button>
            <button className="pbtn sm glass" style={{ flex: 1 }} onClick={() => toast("Appel simulé")}><Icon d={ICONS.phone} s={16} /> Appeler</button>
          </div>

          {/* milestones */}
          <div className="seclbl"><span className="s">Parcours</span></div>
          <div className="glass">
            {s.milestones.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < s.milestones.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, display: "grid", placeItems: "center", flexShrink: 0,
                    background: m.state === "done" ? "var(--mint-glass)" : m.state === "now" ? "linear-gradient(135deg,#ff5a5f,#d11a2a)" : "var(--glass)",
                    border: "1px solid " + (m.state === "done" ? "var(--mint-line)" : m.state === "now" ? "transparent" : "var(--glass-line)"),
                    color: m.state === "done" ? "var(--mint)" : "#fff" }}>
                    {m.state === "done" ? <Icon d={ICONS.check} s={12} sw={3} /> : <span style={{ fontSize: 10, fontWeight: 700, color: m.state === "now" ? "#fff" : "var(--ink35)" }}>{i + 1}</span>}
                  </div>
                  {i < s.milestones.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 14, background: m.state === "done" ? "var(--mint-line)" : "var(--glass-line)", marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 1 }}>
                  <div className="t1" style={{ fontSize: 13, color: m.state === "pending" ? "var(--ink50)" : "#fff" }}>{m.label}</div>
                  {m.state === "now" && <div className="t3" style={{ color: "#ffb3b3", marginTop: 1 }}>En cours</div>}
                </div>
              </div>
            ))}
          </div>

          {/* documents */}
          <div className="seclbl"><span className="s">Documents · {s.docs.filter(d => d.ok).length}/{s.docs.length}</span></div>
          <div className="glass listcard">
            {s.docs.map((d, i) => (
              <div key={i} className="litem">
                <IconBox tone={d.ok ? "mint" : "ghost"} size={36} d={ICONS.doc} is={16} />
                <div className="grow"><div className="t1" style={{ fontSize: 13.5 }}>{d.name}</div></div>
                <Chip variant={d.ok ? "done" : "ghost"} label={d.ok ? "Reçu" : "Manquant"} />
              </div>
            ))}
          </div>

          {/* paiements */}
          <div className="seclbl"><span className="s">Paiements</span></div>
          <div className="glass">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div><div className="t3">Encaissé</div><div style={{ fontSize: 20, fontWeight: 600 }} className="amt">{fmtFCFA(s.paid)} <span style={{ fontSize: 12, color: "var(--ink50)" }}>F</span></div></div>
              <div style={{ textAlign: "right" }}><div className="t3">Restant</div><div style={{ fontSize: 15, fontWeight: 600, color: s.due > 0 ? "var(--amber)" : "var(--mint)" }} className="amt">{fmtFCFA(s.due)}</div></div>
            </div>
            <div className="pbar" style={{ marginTop: 12 }}><span style={{ width: Math.round(s.paid / totalPay * 100) + "%" }} /></div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ DOSSIERS (par statut workflow) ============ */
function AdminDossiers({ data, back, openStudent }) {
  const [f, setF] = useStateC("all");
  const buckets = [
    ["all", "Tous"], ["document_manquant", "Doc. manquant"], ["en_attente_universite", "Attente univ."], ["visa_en_cours", "Visa"], ["admission_validee", "Admission"],
  ];
  const list = data.students.filter((s) => f === "all" || s.status === f);
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={data.students.length + " dossiers de bourse"} title="Dossiers" sm
        right={<div className="iconbtn-g"><Icon d={ICONS.filter} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 12 }}>
          {buckets.map(([id, l]) => <div key={id} className={"fchip" + (f === id ? " on" : "")} onClick={() => setF(id)}>{l}</div>)}
        </div>
        <div className="stack" style={{ gap: 11 }}>
          {list.map((s) => (
            <div key={s.id} className="glass" style={{ padding: 14, cursor: "pointer" }} onClick={() => openStudent(s.id)}>
              <div className="row">
                <Avatar name={s.name} kind="student" size={44} />
                <div className="grow"><div className="t1 ell">{s.name}</div><div className="t2 ell">{s.dest}</div></div>
                <Chip variant={DOSSIER_ST[s.status].v} label={DOSSIER_ST[s.status].l} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <div className="pbar" style={{ flex: 1 }}><span style={{ width: s.pct + "%" }} /></div>
                <div className="t3" style={{ whiteSpace: "nowrap" }}>Étape {s.step}/6</div>
              </div>
            </div>
          ))}
          {!list.length && <div style={{ textAlign: "center", padding: 36, color: "var(--ink35)" }}>Aucun dossier dans ce statut.</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ FRAIS (paiements & tranches) ============ */
function AdminFrais({ data, back, toast }) {
  const [f, setF] = useStateC("tout");
  const filters = [["tout", "Tout"], ["retard", "En retard"], ["attente", "En attente"]];
  const flat = [];
  data.frais.forEach((stu) => stu.tranches.forEach((tr, i) => flat.push({ student: stu.student, ref: stu.ref, ...tr, key: stu.ref + i })));
  const list = flat.filter((t) => f === "tout" || t.status === f);
  const totals = {
    paye: flat.filter(t => t.status === "paye").reduce((s, t) => s + t.montant, 0),
    retard: flat.filter(t => t.status === "retard").reduce((s, t) => s + t.montant, 0),
  };
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Paiements & tranches" title="Frais" sm
        right={<div className="iconbtn-g" onClick={() => toast("Nouvelle tranche")}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, background: "var(--mint-glass)", border: "1px solid var(--mint-line)", borderRadius: 12, padding: "11px 13px" }}>
              <div className="t3" style={{ color: "var(--mint)" }}>Encaissé</div>
              <div className="amt" style={{ fontSize: 16, fontWeight: 700, color: "var(--mint)" }}>{compact(totals.paye)} F</div>
            </div>
            <div style={{ flex: 1, background: "var(--red-glass)", border: "1px solid var(--red-line)", borderRadius: 12, padding: "11px 13px" }}>
              <div className="t3" style={{ color: "var(--crimson-vivid)" }}>En retard</div>
              <div className="amt" style={{ fontSize: 16, fontWeight: 700, color: "var(--crimson-vivid)" }}>{compact(totals.retard)} F</div>
            </div>
          </div>
        </div>
        <div className="seg2" style={{ marginBottom: 12 }}>
          {filters.map(([id, l]) => <div key={id} className={"fchip" + (f === id ? " on" : "")} onClick={() => setF(id)}>{l}</div>)}
        </div>
        <div className="glass listcard">
          {list.map((t) => (
            <div key={t.key} className="litem">
              <IconBox tone={t.status === "paye" ? "mint" : t.status === "retard" ? "red" : "amber"} size={40} d={ICONS.card} />
              <div className="grow"><div className="t1 ell">{t.student}</div><div className="t2 ell">{t.label} · {t.due}</div></div>
              <div style={{ textAlign: "right" }}>
                <div className="t1 amt" style={{ fontSize: 14, color: PAY_ST[t.status].c }}>{compact(t.montant)} F</div>
                <Chip variant={PAY_ST[t.status].v} label={PAY_ST[t.status].l} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ COURS DE LANGUES ============ */
function AdminCours({ data, back, toast }) {
  const [tab, setTab] = useStateC("mandarin");
  const c = data.cours[tab];
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Mandarin & Anglais" title="Cours de langues" sm
        right={<div className="iconbtn-g" onClick={() => toast("Nouvelle inscription")}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 13 }}>
          {[["mandarin", "🇨🇳 Mandarin"], ["anglais", "🇬🇧 Anglais"]].map(([id, l]) => <div key={id} className={"fchip" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</div>)}
        </div>
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div><div className="eyebrow" style={{ color: "#8bf0d2" }}>Inscrits actifs</div><div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{c.active}</div></div>
            <div style={{ textAlign: "right" }}><div className="t3">Revenu cumulé</div><div className="amt" style={{ fontSize: 16, fontWeight: 700 }}>{compact(c.revenue)} F</div></div>
          </div>
        </div>
        <div className="seclbl"><span className="s">Inscriptions récentes</span></div>
        <div className="glass listcard">
          {c.students.map((st, i) => (
            <div key={i} className="litem">
              <Avatar name={st.name} kind="student" size={42} />
              <div className="grow"><div className="t1 ell">{st.name}</div><div className="t2">{st.level} · démarré {st.start}</div></div>
              <Chip variant={st.paid ? "done" : "due"} label={st.paid ? "Payé" : "En attente"} />
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ CONFIGURATION DES FRAIS ============ */
function AdminConfigFrais({ data, back, toast }) {
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Tranches, pénalités & délais" title="Config. frais" sm />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 12 }}>
          {data.feeConfig.map((fee, i) => (
            <div key={i} className="glass" style={{ padding: 14 }}>
              <div className="row">
                <IconBox tone="amber" size={40} d={ICONS.settings} />
                <div className="grow"><div className="t1">{fee.label}</div><div className="t2">{fee.scope}</div></div>
                <button className="iconbtn-g" onClick={() => toast("Éditer " + fee.label)}><Icon d={ICONS.edit} s={16} /></button>
              </div>
              <div className="divider" style={{ margin: "12px -14px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div><div className="t3">Montant</div><div className="t1 amt" style={{ fontSize: 13.5 }}>{compact(fee.amount)} F</div></div>
                <div><div className="t3">Tranches</div><div className="t1" style={{ fontSize: 13.5 }}>{fee.tranches}×</div></div>
                <div><div className="t3">Pénalité</div><div className="t1" style={{ fontSize: 13.5, color: "var(--crimson-vivid)" }}>{fee.penalty}%</div></div>
              </div>
              <div className="t3" style={{ marginTop: 9 }}><Icon d={ICONS.clock} s={12} style={{ verticalAlign: -2, marginRight: 4 }} />Délai de paiement : {fee.delay} jours</div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ STOCKAGE ============ */
function AdminStockage({ data, back }) {
  const st = data.storage;
  const pct = Math.round(st.used / st.total * 100);
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Base de données & fichiers" title="Stockage" sm />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="glass strong" style={{ marginBottom: 13, textAlign: "center" }}>
          <MiniRing size={120} stroke={12} pct={pct} color={pct > 85 ? "#ef4444" : "#34d9a8"}>
            <div><div style={{ fontSize: 26, fontWeight: 700 }}>{pct}%</div><div className="t3">utilisé</div></div>
          </MiniRing>
          <div className="t2" style={{ marginTop: 10 }}>{st.used} Go sur {st.total} Go</div>
        </div>
        <div className="seclbl"><span className="s">Par catégorie</span></div>
        <div className="glass">
          {st.buckets.map((b, i) => (
            <div key={i} style={{ marginBottom: i < st.buckets.length - 1 ? 14 : 0 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span className="t2" style={{ color: "#fff" }}><Icon d={b.icon} s={13} style={{ verticalAlign: -2, marginRight: 6, color: "var(--ink50)" }} />{b.label}</span>
                <span className="t1" style={{ fontSize: 13 }}>{b.size} Go</span>
              </div>
              <div className="pbar"><span style={{ width: Math.round(b.size / st.total * 100) + "%", background: b.color }} /></div>
            </div>
          ))}
        </div>
        <div className="glass" style={{ marginTop: 13, display: "flex", alignItems: "center", gap: 12 }}>
          <IconBox tone="blue" size={40} d={ICONS.database} />
          <div className="grow"><div className="t1">Base de données</div><div className="t2">{st.dbRows.toLocaleString("fr-FR")} lignes · {st.dbSize} Mo</div></div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ NOTIFICATIONS ============ */
const NOTIF_ICON = {
  payment: { tone: "amber", d: ICONS.card }, doc: { tone: "mint", d: ICONS.doc },
  dossier: { tone: "blue", d: ICONS.checkc }, alert: { tone: "red", d: ICONS.alert }, system: { tone: "ghost", d: ICONS.settings },
};
function AdminNotifications({ data, back, markAllRead }) {
  const grouped = {};
  data.notifications.forEach((n) => { (grouped[n.day] ||= []).push(n); });
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={unread + " non lues"} title="Notifications" sm
        right={<button className="pbtn sm glass" style={{ width: "auto", padding: "0 12px", height: 34 }} onClick={markAllRead}><Icon d={ICONS.check} s={14} /> Tout lire</button>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day} style={{ marginBottom: 13 }}>
            <div className="daylabel" style={{ paddingLeft: 2 }}>{day}</div>
            <div className="glass listcard">
              {items.map((n, i) => {
                const ic = NOTIF_ICON[n.type] || NOTIF_ICON.system;
                return (
                  <div key={i} className="litem" style={{ background: n.read ? "transparent" : "rgba(239,68,68,.06)" }}>
                    <IconBox tone={ic.tone} size={40} d={ic.d} />
                    <div className="grow">
                      <div className="t1" style={{ fontSize: 13.5 }}>{n.title}</div>
                      <div className="t2" style={{ whiteSpace: "normal" }}>{n.body}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span className="t3">{n.time}</span>
                      {!n.read && <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--crimson-vivid)" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { AdminEtudiants, AdminStudentDetail, AdminDossiers, AdminFrais, AdminCours, AdminConfigFrais, AdminStockage, AdminNotifications });
