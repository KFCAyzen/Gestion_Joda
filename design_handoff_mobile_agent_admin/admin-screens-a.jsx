/* global React, Icon, ICONS, Avatar, Chip, IconBox, Ring, MiniRing, PHeader, fmtFCFA */
/* ============================================================
   Admin screens — A : Tableau de bord (opérationnel) · Performances · Comptabilité
   Aligné sur les modules web réels (AdminOperationalDashboard,
   PerformanceHistory, LivreComptable).
   ============================================================ */
const { useState: useStateAdmin } = React;

function compact(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (Math.abs(n) >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

/* ============ TABLEAU DE BORD (opérationnel) ============ */
const DASH_VIEWS = [["hier", "Hier"], ["aujourdhui", "Aujourd'hui"], ["semaine", "Semaine"], ["mois", "Mois"]];
const JBADGE = {
  valider: { cls: "valider", label: "À valider" },
  examiner: { cls: "examiner", label: "Prêt à examiner" },
  admission: { cls: "admission", label: "Admission" },
  visa: { cls: "visa", label: "Visa" },
};
const JICON = {
  payment: { tone: "ibox amber", d: ICONS.card },
  doc: { tone: "ibox mint", d: ICONS.doc },
  dossier: { tone: "ibox blue", d: ICONS.checkc },
  student: { tone: "ibox blue", d: ICONS.user },
  alert: { tone: "ibox red", d: ICONS.alert },
};
function AdminHome({ data, go }) {
  const [view, setView] = useStateAdmin("aujourdhui");
  const k = data.dash;
  const journal = k.journal[view] || [];
  const grouped = {};
  journal.forEach((e) => { (grouped[e.period] ||= []).push(e); });
  return (
    <React.Fragment>
      <PHeader
        eyebrow="Vue d'ensemble · Joda Company"
        title="Tableau de bord"
        right={
          <div className="hrow">
            <div className="bell" onClick={() => go("notifications")}><Icon d={ICONS.bell} s={19} /><span className="dot" /></div>
            <Avatar name={data.admin.name} kind="staff" size={42} />
          </div>
        }
      />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 13 }}>
          {DASH_VIEWS.map(([id, l]) => (
            <div key={id} className={"fchip" + (view === id ? " on" : "")} onClick={() => setView(id)}>{l}</div>
          ))}
        </div>

        {/* operational stats */}
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ paddingRight: 14, borderRight: "1px solid var(--glass-line)" }}>
              <div className="ol" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: "var(--ink35)" }}>À TRAITER</div>
              <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1, marginTop: 4 }}>{k.aTraiter}</div>
              <div style={{ fontSize: 11, color: "var(--ink50)", marginTop: 4 }}>dossiers en attente</div>
            </div>
            <div style={{ paddingLeft: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: "var(--ink35)" }}>DOSSIERS OUVERTS</div>
              <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1, marginTop: 4 }}>{k.dossiersOuverts}</div>
              <div style={{ fontSize: 11, color: "var(--mint)", marginTop: 4 }}>+{k.dossiersGrowth} ce mois</div>
            </div>
          </div>
          <div className="divider" style={{ margin: "14px -16px" }} />
          <div className="ol" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: "var(--ink35)" }}>ENCAISSÉ CE MOIS</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1.5, marginTop: 4 }} className="amt">{compact(k.encaisseMois)}</div>
            <div style={{ fontSize: 12, color: "var(--ink50)", paddingBottom: 4 }}>FCFA <span style={{ color: k.encaisseGrowth >= 0 ? "var(--mint)" : "var(--crimson-vivid)", fontWeight: 600 }}>{k.encaisseGrowth > 0 ? "+" : ""}{k.encaisseGrowth}% vs M-1</span></div>
          </div>
        </div>

        {/* flux 7 jours */}
        <div className="glass" style={{ marginBottom: 13 }}>
          <div className="seclbl" style={{ margin: "0 0 8px" }}><span className="s">Flux 7 jours</span><span className="t3">candidatures</span></div>
          <BarChart accentToday bars={k.flux} />
        </div>

        {/* top universités */}
        <div className="glass" style={{ marginBottom: 16 }}>
          <div className="s" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ink50)", marginBottom: 12 }}>Top 3 universités · semaine</div>
          {k.topUniv.map((u, i) => (
            <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="t2" style={{ color: "#fff" }}>{u.name}</span>
                <span className="t1" style={{ fontSize: 13 }}>{u.count}</span>
              </div>
              <div className="pbar"><span style={{ width: Math.round(u.count / k.topUniv[0].count * 100) + "%" }} /></div>
            </div>
          ))}
        </div>

        {/* journal d'activité */}
        <div className="seclbl"><span className="s">Journal d'activité</span><span className="a" onClick={() => go("logs")}>Tout voir</span></div>
        <div className="glass">
          {Object.keys(grouped).length === 0 && <div style={{ textAlign: "center", padding: 26, color: "var(--ink35)", fontSize: 13 }}>Aucune activité sur cette période.</div>}
          {Object.entries(grouped).map(([period, entries]) => (
            <div key={period}>
              <div className="daylabel">{period}</div>
              {entries.map((e, i) => {
                const ic = JICON[e.icon] || JICON.dossier;
                const bdg = e.badge ? JBADGE[e.badge] : null;
                return (
                  <div key={i} className={"jentry" + (e.alert ? " alert" : "")}>
                    <span className="jt">{e.time}</span>
                    <span className={"ji " + ic.tone.replace("ibox ", "")} style={{ background: "transparent" }}>
                      <span className={"ibox " + ic.tone.split(" ")[1]} style={{ width: 26, height: 26 }}><Icon d={ic.d} s={14} /></span>
                    </span>
                    <div className="jbody">
                      <div className="jdesc">{e.desc}</div>
                      {(bdg || e.amount) && (
                        <div className="jmeta">
                          {e.amount && <span className="jamt">{fmtFCFA(e.amount)} F</span>}
                          {bdg && <span className={"jbadge " + bdg.cls}>{bdg.label}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* bar chart */
function BarChart({ bars, accentToday, accentLast }) {
  const m = Math.max(...bars.map((b) => b.v), 1);
  return (
    <div className="barchart">
      {bars.map((b, i) => {
        const active = accentToday ? b.today : accentLast ? i === bars.length - 1 : true;
        return (
          <div key={i} className="barcol">
            <div className={"bar" + (active ? "" : " muted")} style={{ height: Math.max(4, (b.v / m) * 100) + "%" }}>
              {b.top && <span className="bv">{b.top}</span>}
            </div>
            <span className="bl" style={b.today ? { color: "#fff", fontWeight: 700 } : {}}>{b.l}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============ PERFORMANCES ============ */
const PERF_MODES = [["agents", "Par agent"], ["employes", "Employés"], ["jour", "Journalier"]];
const PERF_PERIODS = [["semaine", "Sem."], ["mois", "Mois"], ["trimestre", "Trim."], ["annee", "Année"]];
const ROLE_VAR = { agent: "role", supervisor: "purple", user: "ghost", admin: "live", super_admin: "live" };
function scoreClass(s) { return s >= 70 ? ["sc-hi", "sc-hi-t"] : s >= 40 ? ["sc-mid", "sc-mid-t"] : ["sc-lo", "sc-lo-t"]; }
function Stars({ v }) {
  return <span className="stars">{[1,2,3,4,5].map((n) => <Icon key={n} d={ICONS.starF} s={13} fill={n <= Math.round(v) ? "#fbbf24" : "none"} style={{ color: n <= Math.round(v) ? "#fbbf24" : "rgba(255,255,255,.2)" }} sw={1.5} />)}</span>;
}
function AdminPerf({ data, openAgent, toast }) {
  const [mode, setMode] = useStateAdmin("agents");
  const [period, setPeriod] = useStateAdmin("mois");
  return (
    <React.Fragment>
      <PHeader eyebrow="Indicateurs de l'équipe" title="Performances" sm
        right={<div className="iconbtn-g" onClick={() => toast("Export Word généré")}><Icon d={ICONS.download} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 8 }}>
          {PERF_MODES.map(([id, l]) => <div key={id} className={"fchip" + (mode === id ? " on" : "")} onClick={() => setMode(id)}>{l}</div>)}
        </div>
        <div className="seg2" style={{ marginBottom: 13 }}>
          {PERF_PERIODS.map(([id, l]) => <div key={id} className={"fchip" + (period === id ? " on" : "")} onClick={() => setPeriod(id)} style={{ height: 28, fontSize: 11.5 }}>{l}</div>)}
        </div>

        {mode === "agents" && (
          <React.Fragment>
            <div className="glass strong" style={{ marginBottom: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div className="eyebrow" style={{ color: "#8bf0d2" }}>Revenu encaissé · {period}</div><div className="amt" style={{ fontSize: 24, fontWeight: 600, marginTop: 5 }}>{fmtFCFA(data.perf.revenue)} <span style={{ fontSize: 12, color: "var(--ink50)" }}>F</span></div></div>
              <div style={{ textAlign: "right" }}><div className="t3">En validation</div><div style={{ fontSize: 15, fontWeight: 600, color: "var(--amber)" }}>{data.perf.enValidation}</div></div>
            </div>
            <div className="stack" style={{ gap: 11 }}>
              {data.agents.map((a) => {
                const [bar, txt] = scoreClass(a.score);
                return (
                  <div key={a.id} className="glass" style={{ padding: 14, cursor: "pointer" }} onClick={() => openAgent(a.id)}>
                    <div className="row">
                      <div style={{ position: "relative" }}>
                        <Avatar name={a.name} kind="agent" size={44} />
                        <span className="medal" style={{ position: "absolute", bottom: -4, right: -4, fontSize: 15 }}>{["🥇","🥈","🥉"][a.rank - 1] || ""}</span>
                      </div>
                      <div className="grow">
                        <div className="t1 ell">{a.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                          <Chip variant={ROLE_VAR[a.role]} label={a.roleLabel} />
                          <span className="t3"><Icon d={ICONS.users} s={11} style={{ verticalAlign: -2 }} /> {a.students}</span>
                          <span className="t3"><Icon d={ICONS.filearchive} s={11} style={{ verticalAlign: -2 }} /> {a.dossiers}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}><div className={txt} style={{ fontSize: 19, fontWeight: 700 }}>{a.score}</div><div className="t3">/100</div></div>
                    </div>
                    <div className="scbar"><span className={bar} style={{ width: a.score + "%" }} /></div>
                    <div className="scbrk">
                      {[["Revenu", a.b.revenue], ["Activité", a.b.activity], ["Rapidité", a.b.speed], ["Dossier", a.b.dossier]].map(([kk, vv], i) => (
                        <div key={i} className="b"><div className="k">{kk}</div><div className="v">{vv}%</div></div>
                      ))}
                    </div>
                    <div className="typ3">
                      <div className="c"><div className="k" style={{ color: "#cdbcff" }}>Bourse</div><div className="n">{a.t.bourse.c} pay.</div><div className="a">{compact(a.t.bourse.a)}</div></div>
                      <div className="c"><div className="k" style={{ color: "var(--crimson-vivid)" }}>Mandarin</div><div className="n">{a.t.mandarin.c} pay.</div><div className="a">{compact(a.t.mandarin.a)}</div></div>
                      <div className="c"><div className="k" style={{ color: "#bcd6ff" }}>Anglais</div><div className="n">{a.t.anglais.c} pay.</div><div className="a">{compact(a.t.anglais.a)}</div></div>
                    </div>
                    {(a.s.validation || a.s.attente || a.s.retard) > 0 && (
                      <div className="alerttags">
                        {a.s.validation > 0 && <span className="atag val"><Icon d={ICONS.checkc} s={11} /> {a.s.validation} en validation</span>}
                        {a.s.attente > 0 && <span className="atag att"><Icon d={ICONS.clock} s={11} /> {a.s.attente} en attente</span>}
                        {a.s.retard > 0 && <span className="atag ret"><Icon d={ICONS.alert} s={11} /> {a.s.retard} en retard</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        )}

        {mode === "employes" && (
          <React.Fragment>
            <div className="glass strong" style={{ marginBottom: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div className="eyebrow" style={{ color: "#8bf0d2" }}>Indice de performance moyen</div><div style={{ fontSize: 24, fontWeight: 600, marginTop: 5 }}>{data.perf.avgIndex}<span style={{ fontSize: 13, color: "var(--ink50)" }}> / 100</span></div></div>
              <MiniRing size={56} stroke={6} pct={data.perf.avgIndex} color="#34d9a8"><span style={{ fontSize: 12, fontWeight: 700, color: "var(--mint)" }}>{data.perf.avgIndex}</span></MiniRing>
            </div>
            <div className="t3" style={{ marginBottom: 10, lineHeight: 1.4 }}>Indice basé sur les notations (étoiles) et les rapports journaliers soumis.</div>
            <div className="glass listcard">
              {data.employeesPerf.map((e, i) => {
                const [bar, txt] = scoreClass(e.index);
                return (
                  <div key={i} className="litem" style={{ flexDirection: "column", alignItems: "stretch", gap: 9 }}>
                    <div className="row">
                      <span className="pos" style={{ width: 22, fontWeight: 700, color: "var(--ink50)" }}>{e.rank}</span>
                      <Avatar name={e.name} kind="agent" size={38} />
                      <div className="grow"><div className="t1 ell">{e.name}</div><div className="t3">{e.dept}</div></div>
                      <div className={txt} style={{ fontWeight: 700, fontSize: 16 }}>{e.index}</div>
                    </div>
                    <div className="scbar" style={{ marginTop: 0 }}><span className={bar} style={{ width: e.index + "%" }} /></div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="t3" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{e.evals > 0 ? <React.Fragment><Stars v={e.rating} /> {e.rating}/5</React.Fragment> : "Pas de notation"}</span>
                      <span className="t3">{e.reports} rapports · {e.hours}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        )}

        {mode === "jour" && (
          <div className="stack" style={{ gap: 11 }}>
            {data.perf.daily.map((d, i) => (
              <div key={i} className="glass" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 11 }}>
                  <div className="t1" style={{ fontSize: 13.5 }}>{d.date}</div>
                  <Chip variant="live" label={fmtFCFA(d.total) + " F"} />
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <div style={{ flex: 1 }} className="glass flat" style={{ background: "rgba(96,165,250,.1)", border: "1px solid rgba(96,165,250,.25)", borderRadius: 12, padding: 10 }}>
                    <div className="t3" style={{ color: "#bcd6ff" }}><Icon d={ICONS.book} s={12} style={{ verticalAlign: -2 }} /> Cours de langues</div>
                    <div className="t3">{d.courses.c} paiements</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#bcd6ff" }}>{compact(d.courses.a)}</div>
                  </div>
                  <div style={{ flex: 1, background: "var(--mint-glass)", border: "1px solid var(--mint-line)", borderRadius: 12, padding: 10 }}>
                    <div className="t3" style={{ color: "var(--mint)" }}><Icon d={ICONS.doc} s={12} style={{ verticalAlign: -2 }} /> Procédures</div>
                    <div className="t3">{d.proc.c} paiements</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mint)" }}>{compact(d.proc.a)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

/* ============ AGENT DETAIL ============ */
function AdminAgent({ agent, back, toast }) {
  const a = agent;
  const [bar, txt] = scoreClass(a.score);
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow={a.roleLabel} title={a.name} sm />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 13 }}>
          <div className="glass strong" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Ring pct={a.score} size={92} stroke={10} gid="agR">
              <div className={txt} style={{ fontSize: 22, fontWeight: 700 }}>{a.score}</div>
              <div style={{ fontSize: 8.5, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: 1 }}>Score</div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 8 }}><Avatar name={a.name} kind="agent" size={34} /><Chip variant={ROLE_VAR[a.role]} label={a.roleLabel} /></div>
              <div className="t2" style={{ marginTop: 10 }}>{a.students} étudiants · {a.dossiers} dossiers</div>
              <div className="t3" style={{ marginTop: 3 }}>Délai moyen de validation : {a.avgDays}j</div>
            </div>
          </div>
          <div className="scbrk" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {[["Revenu", a.b.revenue], ["Activité", a.b.activity], ["Rapidité", a.b.speed], ["Dossier", a.b.dossier]].map(([kk, vv], i) => (
              <div key={i} className="glass" style={{ padding: "12px 4px", textAlign: "center" }}><div className="k" style={{ fontSize: 8.5, color: "var(--ink35)", fontWeight: 700, textTransform: "uppercase" }}>{kk}</div><div className={txt} style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{vv}%</div></div>
            ))}
          </div>
          <div className="glass">
            <div className="ledger-bal" style={{ marginBottom: 10 }}><span className="t1" style={{ fontSize: 14 }}>Revenu encaissé</span><span className="amt" style={{ fontWeight: 700 }}>{fmtFCFA(a.revenue)} F</span></div>
            <div className="typ3" style={{ borderTop: "none", marginTop: 0 }}>
              <div className="c"><div className="k" style={{ color: "#cdbcff" }}>Bourse</div><div className="a">{compact(a.t.bourse.a)}</div></div>
              <div className="c"><div className="k" style={{ color: "var(--crimson-vivid)" }}>Mandarin</div><div className="a">{compact(a.t.mandarin.a)}</div></div>
              <div className="c"><div className="k" style={{ color: "#bcd6ff" }}>Anglais</div><div className="a">{compact(a.t.anglais.a)}</div></div>
            </div>
          </div>
          <button className="pbtn glass" onClick={() => toast("Détail journalier")}><Icon d={ICONS.cal} s={16} /> Voir le détail journalier</button>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ COMPTABILITÉ (livre comptable) ============ */
const LEDGER_VIEWS = [["jour", "Jour"], ["semaine", "Sem."], ["mois", "Mois"], ["trimestre", "Trim."], ["annee", "Année"]];
function AdminCompta({ data, toast }) {
  const [view, setView] = useStateAdmin("mois");
  const [filter, setFilter] = useStateAdmin("tout");
  const c = data.compta;
  const rows = c.rows.filter((r) => filter === "tout" || (filter === "entrees" ? r.kind === "in" : r.kind === "out"));
  return (
    <React.Fragment>
      <PHeader eyebrow="Livre comptable" title="Comptabilité"
        right={<div className="iconbtn-g" onClick={() => toast("Nouvelle écriture")}><Icon d={ICONS.plus} s={19} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="seg2" style={{ marginBottom: 13 }}>
          {LEDGER_VIEWS.map(([id, l]) => <div key={id} className={"fchip" + (view === id ? " on" : "")} onClick={() => setView(id)} style={{ height: 30 }}>{l}</div>)}
        </div>

        {/* solde */}
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div className="eyebrow">Solde du mois</div>
          <div className="bignum amt" style={{ marginTop: 8, color: c.solde >= 0 ? "var(--mint)" : "var(--crimson-vivid)" }}>{c.solde >= 0 ? "+" : "−"}{fmtFCFA(Math.abs(c.solde))} <span className="cur">FCFA</span></div>
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, background: "var(--mint-glass)", border: "1px solid var(--mint-line)", borderRadius: 12, padding: "10px 12px" }}>
              <div className="t3" style={{ color: "var(--mint)" }}><Icon d={ICONS.arrowDown} s={12} style={{ verticalAlign: -2 }} /> Entrées</div>
              <div className="amt" style={{ fontSize: 15, fontWeight: 700, color: "var(--mint)" }}>{compact(c.entrees)}</div>
            </div>
            <div style={{ flex: 1, background: "var(--red-glass)", border: "1px solid var(--red-line)", borderRadius: 12, padding: "10px 12px" }}>
              <div className="t3" style={{ color: "var(--crimson-vivid)" }}><Icon d={ICONS.arrowUp} s={12} style={{ verticalAlign: -2 }} /> Sorties</div>
              <div className="amt" style={{ fontSize: 15, fontWeight: 700, color: "var(--crimson-vivid)" }}>{compact(c.sorties)}</div>
            </div>
          </div>
        </div>

        {c.toValidate > 0 && (
          <div className="glass" style={{ marginBottom: 13, display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--amber-line)" }}>
            <IconBox tone="amber" size={40} d={ICONS.alert} />
            <div className="grow"><div className="t1">{c.toValidate} sorties à valider</div><div className="t2">Dépenses en attente de validation</div></div>
            <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />
          </div>
        )}

        <div className="seg2" style={{ marginBottom: 12 }}>
          {[["tout", "Tout"], ["entrees", "Entrées"], ["sorties", "Sorties"]].map(([id, l]) => <div key={id} className={"fchip" + (filter === id ? " on" : "")} onClick={() => setFilter(id)}>{l}</div>)}
        </div>

        <div className="glass">
          {rows.map((r, i) => (
            <div key={i} className="lrow">
              <span className={"lk " + r.kind}><Icon d={r.kind === "in" ? ICONS.arrowDown : ICONS.arrowUp} s={15} /></span>
              <div className="lg">
                <div className="t1 ell" style={{ fontSize: 13.5 }}>{r.desc}</div>
                <div className="t3">{r.time} · {r.cat}{r.needsValidation ? " · à valider" : ""}</div>
              </div>
              <span className={"la " + r.kind}>{r.kind === "in" ? "+" : "−"}{fmtFCFA(r.montant)}</span>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { AdminHome, AdminPerf, AdminAgent, AdminCompta, BarChart, compact });
