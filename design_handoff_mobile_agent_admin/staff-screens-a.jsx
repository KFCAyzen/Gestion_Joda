/* global React, Icon, ICONS, Avatar, Chip, IconBox, Ring, MiniRing, PHeader */
/* ============================================================
   Staff screens — A : Accueil · Dossiers · Fiche étudiant
   ============================================================ */
const { useState: useStateScreen } = React;

function fmtFCFA(n) { return n.toLocaleString("fr-FR"); }

/* ============ ACCUEIL (dashboard) ============ */
function ScreenHome({ data, go, openStudent }) {
  const { staff, kpis, todoPayments, todoReports, recentDossiers } = data;
  return (
    <React.Fragment>
      <PHeader
        eyebrow="Tableau de bord"
        title={"Bonjour, " + staff.first}
        right={
          <div className="hrow">
            <div className="bell" onClick={() => go("notif")}><Icon d={ICONS.bell} s={19} /><span className="dot" /></div>
            <Avatar name={staff.name} kind="staff" size={42} />
          </div>
        }
      />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 13 }}>
          {/* hero — activité du jour */}
          <div className="glass strong" style={{ overflow: "hidden", position: "relative" }}>
            <Icon d={ICONS.trend} s={140} sw={1} style={{ position: "absolute", top: -30, right: -24, color: "rgba(255,255,255,.05)" }} />
            <div className="eyebrow" style={{ color: "#ffb3b3" }}>Activité du jour</div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 12 }}>
              <Ring pct={kpis.dayPct} size={104} stroke={11} gid="homeR">
                <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{kpis.dayPct}<span style={{ fontSize: 14, color: "var(--ink50)" }}>%</span></div>
                <div style={{ fontSize: 9.5, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: 1.1, marginTop: 2 }}>Traité</div>
              </Ring>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{kpis.handledToday} actions sur {kpis.targetToday}</div>
                <div className="t2" style={{ marginTop: 3 }}>Dossiers, paiements & rapports traités aujourd'hui.</div>
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <Chip variant="live" label={kpis.pending + " en attente"} />
                  <Chip variant="done" label={kpis.handledToday + " faits"} />
                </div>
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="kgrid">
            <div className="kpi">
              <div className="kv">{kpis.activeDossiers}</div>
              <div className="kl">Dossiers actifs</div>
              <div className="ktrend up">▲ +{kpis.dossiersTrend} cette semaine</div>
            </div>
            <div className="kpi">
              <div className="kv amt">{fmtFCFA(kpis.collectedMonth)}</div>
              <div className="kl">FCFA encaissés (mois)</div>
              <div className="ktrend up">▲ +{kpis.collectTrend}%</div>
            </div>
            <div className="kpi">
              <div className="kv" style={{ color: "var(--amber)" }}>{kpis.paymentsToValidate}</div>
              <div className="kl">Paiements à valider</div>
              <div className="ktrend down">À traiter aujourd'hui</div>
            </div>
            <div className="kpi">
              <div className="kv" style={{ color: "var(--crimson-vivid)" }}>{kpis.reportsToValidate}</div>
              <div className="kl">Rapports à valider</div>
              <div className="ktrend down">Équipe · {kpis.team} agents</div>
            </div>
          </div>

          {/* À valider — paiements */}
          <div className="seclbl"><span className="s">À valider — paiements</span><span className="a" onClick={() => go("paiements")}>Tout voir</span></div>
          <div className="glass listcard">
            {todoPayments.slice(0, 2).map((p) => (
              <div key={p.id} className="litem" onClick={() => go("paiements")}>
                <IconBox tone="amber" size={42} d={ICONS.card} />
                <div className="grow">
                  <div className="t1 ell">{p.student}</div>
                  <div className="t2 ell">{p.type} · déclaré {p.ago}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="t1 amt">{fmtFCFA(p.amount)}</div>
                  <div className="t3">FCFA</div>
                </div>
              </div>
            ))}
          </div>

          {/* À valider — rapports */}
          <div className="seclbl"><span className="s">À valider — rapports employés</span><span className="a" onClick={() => go("rapports")}>Tout voir</span></div>
          <div className="glass listcard">
            {todoReports.slice(0, 2).map((r) => (
              <div key={r.id} className="litem" onClick={() => go("rapports")}>
                <Avatar name={r.employee} kind="agent" size={42} />
                <div className="grow">
                  <div className="t1 ell">{r.employee}</div>
                  <div className="t2 ell">{r.poste} · {r.hours}h · {r.date}</div>
                </div>
                <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />
              </div>
            ))}
          </div>

          {/* Dossiers récents */}
          <div className="seclbl"><span className="s">Dossiers récents</span><span className="a" onClick={() => go("dossiers")}>Tout voir</span></div>
          <div className="glass listcard">
            {recentDossiers.slice(0, 3).map((d) => (
              <div key={d.id} className="litem" onClick={() => openStudent(d.id)}>
                <Avatar name={d.name} kind="student" size={42} />
                <div className="grow">
                  <div className="t1 ell">{d.name}</div>
                  <div className="t2 ell">{d.program}</div>
                </div>
                <Chip variant={d.chip} label={d.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ DOSSIERS (list) ============ */
const DOSSIER_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "now", label: "À traiter" },
  { id: "review", label: "En revue" },
  { id: "done", label: "Complets" },
];
function ScreenDossiers({ data, openStudent }) {
  const [f, setF] = useStateScreen("all");
  const [q, setQ] = useStateScreen("");
  const list = data.dossiers.filter((d) => {
    const okF = f === "all" || d.bucket === f;
    const okQ = !q || (d.name + " " + d.program).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });
  const counts = { now: data.dossiers.filter(d => d.bucket === "now").length, review: data.dossiers.filter(d => d.bucket === "review").length };
  return (
    <React.Fragment>
      <PHeader eyebrow={data.dossiers.length + " étudiants suivis"} title="Dossiers"
        right={<div className="iconbtn-g"><Icon d={ICONS.filter} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="search" style={{ marginBottom: 10 }}>
          <Icon d={ICONS.search} s={18} />
          <input placeholder="Rechercher un étudiant…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg2" style={{ marginBottom: 12 }}>
          {DOSSIER_FILTERS.map((x) => (
            <div key={x.id} className={"fchip" + (f === x.id ? " on" : "")} onClick={() => setF(x.id)}>
              {x.label}{counts[x.id] ? <span className="cnt">· {counts[x.id]}</span> : null}
            </div>
          ))}
        </div>
        <div className="stack" style={{ gap: 11 }}>
          {list.map((d) => (
            <div key={d.id} className="glass" style={{ padding: 14, cursor: "pointer" }} onClick={() => openStudent(d.id)}>
              <div className="row">
                <Avatar name={d.name} kind="student" size={46} />
                <div className="grow">
                  <div className="t1 ell">{d.name}</div>
                  <div className="t2 ell">{d.program}</div>
                </div>
                <Chip variant={d.chip} label={d.status} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <div className="pbar" style={{ flex: 1 }}><span style={{ width: d.pct + "%" }} /></div>
                <div className="t3" style={{ whiteSpace: "nowrap" }}>Étape {d.step}/6</div>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 11 }}>
                <span className="t3"><Icon d={ICONS.doc} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{d.docs}</span>
                <span className="t3"><Icon d={ICONS.wallet} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{d.pay}</span>
                <span className="t3"><Icon d={ICONS.pin} s={13} style={{ verticalAlign: -2, marginRight: 4 }} />{d.dest}</span>
              </div>
            </div>
          ))}
          {!list.length && <div style={{ textAlign: "center", padding: 40, color: "var(--ink35)" }}>Aucun dossier.</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ FICHE ÉTUDIANT (detail) ============ */
function ScreenStudent({ student, back, go, openChat, toast }) {
  const s = student;
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={"Dossier · " + s.ref} title={s.name} sm
        right={<div className="iconbtn-g"><Icon d={ICONS.dots} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 13 }}>
          {/* hero */}
          <div className="glass strong" style={{ overflow: "hidden", position: "relative" }}>
            <Icon d={ICONS.plane} s={120} sw={1} style={{ position: "absolute", top: -22, right: -16, color: "rgba(255,255,255,.05)" }} />
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Ring pct={s.pct} size={92} stroke={10} gid="stuR">
                <div style={{ fontSize: 22, fontWeight: 600 }}>{s.pct}<span style={{ fontSize: 12, color: "var(--ink50)" }}>%</span></div>
                <div style={{ fontSize: 8.5, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: 1 }}>Dossier</div>
              </Ring>
              <div style={{ flex: 1 }}>
                <div className="eyebrow">Destination</div>
                <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{s.dest}</div>
                <div className="t2">{s.program}</div>
                <div style={{ marginTop: 10 }}><Chip variant="live" label={"Étape " + s.step + " / 6 · " + s.stepLabel} /></div>
              </div>
            </div>
          </div>

          {/* quick actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="pbtn sm" style={{ flex: 1 }} onClick={openChat}><Icon d={ICONS.chat} s={16} /> Message</button>
            <button className="pbtn sm glass" style={{ flex: 1 }} onClick={() => toast("Appel simulé")}><Icon d={ICONS.phone} s={16} /> Appeler</button>
          </div>

          {/* milestones */}
          <div className="seclbl"><span className="s">Parcours</span></div>
          <div className="glass">
            <div className="stack" style={{ gap: 0 }}>
              {s.milestones.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < s.milestones.length - 1 ? 16 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0,
                      background: m.state === "done" ? "var(--mint-glass)" : m.state === "now" ? "linear-gradient(135deg,#ff5a5f,#d11a2a)" : "var(--glass)",
                      border: "1px solid " + (m.state === "done" ? "var(--mint-line)" : m.state === "now" ? "transparent" : "var(--glass-line)"),
                      color: m.state === "done" ? "var(--mint)" : "#fff" }}>
                      {m.state === "done" ? <Icon d={ICONS.check} s={13} sw={3} /> : <span style={{ fontSize: 11, fontWeight: 700, color: m.state === "now" ? "#fff" : "var(--ink35)" }}>{i + 1}</span>}
                    </div>
                    {i < s.milestones.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: m.state === "done" ? "var(--mint-line)" : "var(--glass-line)", marginTop: 2 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 1 }}>
                    <div className="t1" style={{ fontSize: 13.5, color: m.state === "pending" ? "var(--ink50)" : "#fff" }}>{m.label}</div>
                    {m.state === "now" && <div className="t3" style={{ color: "#ffb3b3", marginTop: 1 }}>En cours</div>}
                    {m.date && <div className="t3" style={{ marginTop: 1 }}>{m.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* documents */}
          <div className="seclbl"><span className="s">Documents · {s.docsDone}/{s.docsTotal}</span><span className="a">Gérer</span></div>
          <div className="glass listcard">
            {s.docs.map((d, i) => (
              <div key={i} className="litem">
                <IconBox tone={d.ok ? "mint" : "ghost"} size={38} d={ICONS.doc} is={17} />
                <div className="grow"><div className="t1" style={{ fontSize: 13.5 }}>{d.name}</div></div>
                {d.ok ? <Chip variant="done" label="Reçu" /> : <Chip variant="ghost" label="Manquant" />}
              </div>
            ))}
          </div>

          {/* paiements */}
          <div className="seclbl"><span className="s">Paiements</span><span className="a" onClick={() => go("paiements")}>Détails</span></div>
          <div className="glass">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div><div className="t3">Total encaissé</div><div style={{ fontSize: 21, fontWeight: 600 }} className="amt">{fmtFCFA(s.paid)} <span style={{ fontSize: 12, color: "var(--ink50)" }}>FCFA</span></div></div>
              <div style={{ textAlign: "right" }}><div className="t3">Restant</div><div style={{ fontSize: 16, fontWeight: 600, color: "var(--amber)" }} className="amt">{fmtFCFA(s.due)}</div></div>
            </div>
            <div className="pbar" style={{ marginTop: 12 }}><span style={{ width: Math.round(s.paid / (s.paid + s.due) * 100) + "%" }} /></div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { ScreenHome, ScreenDossiers, ScreenStudent, fmtFCFA });
