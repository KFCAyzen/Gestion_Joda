/* global React, Icon, ICONS, Avatar, IconBox, CVRing, Sparkline, CountUp */
// =====================================================================
// JODA — Creative drill-down screens (Wave 2)
// Staff Dossiers + Fiche · Admin Performances + Candidatures.
// =====================================================================
const { useState: useCVS } = React;

function fmt(n) { return Number(n).toLocaleString("fr-FR"); }
const JOURNEY = ["Inscription", "Dossier", "Admission", "Visa", "Vol", "Départ"];

function CVHead({ eyebrow, title, back, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 2px 16px" }}>
      {back && <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)", cursor: "pointer", flexShrink: 0 }}><Icon d={ICONS.chevL} s={20} /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--crimson-vivid)" }}>{eyebrow}</div>
        <h1 className="cv-disp" style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.5px", margin: "4px 0 0" }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

const CHIP = {
  live: { bg: "var(--red-glass)", bd: "var(--red-line)", c: "var(--red-text)", t: "À traiter" },
  due: { bg: "var(--amber-glass)", bd: "var(--amber-line)", c: "var(--amber-text)", t: "En revue" },
  done: { bg: "var(--mint-glass)", bd: "var(--mint-line)", c: "var(--mint-text)", t: "Complet" },
};

// ===================== STAFF · DOSSIERS =====================
function StaffDossiersV2({ data }) {
  const [f, setF] = useCVS("all");
  const filters = [["all", "Tous"], ["now", "À traiter"], ["review", "En revue"], ["done", "Complets"]];
  const list = data.dossiers.filter((d) => f === "all" || d.bucket === f);
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <CVHead eyebrow="Suivi des admissions" title="Dossiers"
        right={<div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}><Icon d={ICONS.search} s={18} /></div>} />

      {/* summary strip */}
      <div className="cv-bento" style={{ marginBottom: 14 }}>
        <div className="cv-tile" style={{ padding: 13 }}>
          <div className="cv-k">Actifs</div>
          <div className="cv-n cv-disp" style={{ fontSize: 26 }}><CountUp to={data.dossiers.length} /></div>
        </div>
        <div className="cv-tile" style={{ padding: 13 }}>
          <div className="cv-k">Taux complétion</div>
          <div className="cv-n cv-disp" style={{ fontSize: 26 }}><CountUp to={Math.round(data.dossiers.reduce((a, d) => a + d.pct, 0) / data.dossiers.length)} />%</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 13 }}>
        {filters.map(([id, l]) => (
          <button key={id} onClick={() => setF(id)} style={{ flexShrink: 0, border: "1px solid " + (f === id ? "transparent" : "var(--glass-line)"), background: f === id ? "linear-gradient(135deg,#ff5a5f,#d11a2a)" : "var(--surface)", color: f === id ? "#fff" : "var(--ink70)", fontWeight: 600, fontSize: 12.5, padding: "8px 14px", borderRadius: 999, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      <div className="stack" style={{ gap: 11 }}>
        {list.map((d) => {
          const ch = CHIP[d.chip] || CHIP.live;
          return (
            <div key={d.id} className="cv-tile" style={{ padding: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <CVRing size={56} stroke={6} pct={d.pct} glow={false} gid={"dr" + d.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="cv-disp" style={{ fontSize: 16, fontWeight: 600 }}>{d.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: ch.bg, border: "1px solid " + ch.bd, color: ch.c }}>{ch.t}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink50)", marginTop: 3 }}>{d.program}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11.5, color: "var(--ink70)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon d={ICONS.plane} s={12} /> {d.dest}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon d={ICONS.doc} s={12} /> {d.docs}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon d={ICONS.card} s={12} /> {d.pay}</span>
                  </div>
                </div>
              </div>
              {/* journey mini-stepper */}
              <div style={{ display: "flex", gap: 4, marginTop: 13 }}>
                {JOURNEY.map((s, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < d.step ? "linear-gradient(90deg,#ff7a7e,#d11a2a)" : "var(--track)" }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== STAFF · FICHE ÉTUDIANT =====================
function StaffFicheV2({ student: s }) {
  const done = s.docs.filter((d) => d.ok).length;
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <CVHead eyebrow={"Réf. " + s.ref} title="Fiche étudiant" back
        right={<div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}><Icon d={ICONS.chat} s={18} /></div>} />

      {/* hero */}
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={s.name} kind="student" size={62} />
          <div style={{ flex: 1 }}>
            <div className="cv-disp" style={{ fontSize: 21, fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 3 }}>{s.program}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" }}>
              <Icon d={ICONS.plane} s={13} /> {s.dest}
            </div>
          </div>
          <CVRing size={72} stroke={8} pct={s.pct} gid="ficheR" />
        </div>
      </div>

      {/* journey timeline */}
      <div className="cv-sec"><h3>Parcours</h3><span className="cv-all">Étape {s.step}/6</span></div>
      <div className="cv-card" style={{ padding: "16px 18px" }}>
        {JOURNEY.map((label, i) => {
          const st = i + 1 < s.step ? "done" : i + 1 === s.step ? "now" : "todo";
          return (
            <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", paddingBottom: i < 5 ? 16 : 0, position: "relative" }}>
              {i < 5 && <span style={{ position: "absolute", left: 13, top: 26, bottom: 0, width: 2, background: st === "done" ? "var(--crimson-vivid)" : "var(--track)" }} />}
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", zIndex: 1,
                background: st === "todo" ? "var(--surface)" : "linear-gradient(135deg,#ff5a5f,#d11a2a)",
                border: "1px solid " + (st === "todo" ? "var(--glass-line)" : "transparent"),
                boxShadow: st === "now" ? "0 0 0 4px var(--red-glass)" : "none" }}>
                {st === "done" ? <Icon d={ICONS.check} s={14} style={{ color: "#fff" }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: st === "todo" ? "var(--ink50)" : "#fff" }}>{i + 1}</span>}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 14, fontWeight: st === "now" ? 600 : 500, color: st === "todo" ? "var(--ink50)" : "var(--text)" }}>{label}</div>
                {st === "now" && <div style={{ fontSize: 11.5, color: "var(--crimson-vivid)", fontWeight: 600, marginTop: 2 }}>En cours</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* docs grid */}
      <div className="cv-sec"><h3>Documents</h3><span className="cv-all">{done}/{s.docs.length}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {s.docs.map((d, i) => (
          <div key={i} className="cv-tile" style={{ padding: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center",
              background: d.ok ? "var(--mint-glass)" : "var(--surface)", border: "1px solid " + (d.ok ? "var(--mint-line)" : "var(--glass-line)"),
              color: d.ok ? "var(--mint)" : "var(--ink35)" }}>
              <Icon d={d.ok ? ICONS.check : ICONS.doc} s={16} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: d.ok ? "var(--text)" : "var(--ink50)", lineHeight: 1.2 }}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== ADMIN · PERFORMANCES =====================
function scoreCol(s) { return s >= 70 ? "var(--mint)" : s >= 40 ? "var(--amber)" : "var(--crimson-vivid)"; }
function AdminPerfV2({ data }) {
  const [p, setP] = useCVS("mois");
  const top = data.agents[0];
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <CVHead eyebrow="Indicateurs de l'équipe" title="Performances"
        right={<div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}><Icon d={ICONS.download} s={18} /></div>} />

      <div className="cv-pills" style={{ marginBottom: 13 }}>
        {[["sem", "Sem."], ["mois", "Mois"], ["trim", "Trim."], ["an", "Année"]].map(([id, l]) => (
          <button key={id} className={p === id ? "on" : ""} onClick={() => setP(id)}>{l}</button>
        ))}
      </div>

      {/* podium hero */}
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div className="cv-hero-eye">Revenu encaissé · {p}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
          <div className="cv-disp" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.5px" }}><CountUp to={data.perf.revenue / 1000000} fmt={(n) => n.toFixed(1).replace(".", ",")} />M</div>
          <div style={{ textAlign: "right", paddingBottom: 3 }}>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.7)" }}>En validation</div>
            <div className="cv-disp" style={{ fontSize: 17, fontWeight: 600, color: "#ffd27a" }}>{data.perf.enValidation}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.16)" }}>
          <span style={{ fontSize: 22 }}>🥇</span>
          <Avatar name={top.name} kind="agent" size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{top.name}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.7)" }}>Meilleur agent · {top.students} étudiants</div>
          </div>
          <div className="cv-disp" style={{ fontSize: 22, fontWeight: 600 }}>{top.score}</div>
        </div>
      </div>

      {/* ranked agents with animated score bars */}
      <div className="stack" style={{ gap: 11 }}>
        {data.agents.map((a, i) => (
          <div key={a.id} className="cv-tile" style={{ padding: 15 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="cv-disp" style={{ width: 20, textAlign: "center", fontSize: 14, fontWeight: 700, color: i < 3 ? "var(--amber)" : "var(--ink50)" }}>{a.rank}</span>
              <Avatar name={a.name} kind="agent" size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cv-disp" style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{a.roleLabel} · {a.dossiers} dossiers</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="cv-disp" style={{ fontSize: 19, fontWeight: 700, color: scoreCol(a.score) }}>{a.score}</div>
                <div style={{ fontSize: 9.5, color: "var(--ink35)" }}>/100</div>
              </div>
            </div>
            <div className="cv-meter" style={{ marginTop: 12 }}>
              <span style={{ "--w": a.score + "%", width: a.score + "%", background: "linear-gradient(90deg,#ff7a7e," + scoreCol(a.score) + ")", animationDelay: (i * 0.1) + "s" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12 }}>
              {[["Revenu", a.b.revenue], ["Activité", a.b.activity], ["Rapidité", a.b.speed], ["Dossier", a.b.dossier]].map(([k, v], j) => (
                <div key={j} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 11, background: "var(--surface)" }}>
                  <div style={{ fontSize: 9, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</div>
                  <div className="cv-disp" style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== ADMIN · CANDIDATURES =====================
const CSTAT = {
  document_manquant: { c: "var(--crimson-vivid)", bg: "var(--red-glass)", bd: "var(--red-line)", t: "Document manquant" },
  document_recu: { c: "var(--mint)", bg: "var(--mint-glass)", bd: "var(--mint-line)", t: "Document reçu" },
  en_attente: { c: "var(--amber)", bg: "var(--amber-glass)", bd: "var(--amber-line)", t: "En attente" },
  en_cours: { c: "var(--ink70)", bg: "var(--surface)", bd: "var(--glass-line)", t: "En cours" },
};
function AdminCandidaturesV2({ data }) {
  const [b, setB] = useCVS("todo");
  const list = data.candidatures.filter((c) => b === "all" ? true : c.bucket === b);
  const todo = data.candidatures.filter((c) => c.bucket === "todo").length;
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <CVHead eyebrow="Pipeline d'admission" title="Candidatures" />

      <div className="cv-bento" style={{ marginBottom: 13 }}>
        <div className="cv-tile accent">
          <div className="cv-ic"><Icon d={ICONS.alert} s={16} /></div>
          <div className="cv-k">À traiter</div>
          <div className="cv-n cv-disp"><CountUp to={todo} /></div>
          <div className="cv-sub">action requise</div>
        </div>
        <div className="cv-tile">
          <div className="cv-ic"><Icon d={ICONS.folder} s={16} /></div>
          <div className="cv-k">Total pipeline</div>
          <div className="cv-n cv-disp"><CountUp to={data.candidatures.length} /></div>
          <div className="cv-sub">candidatures</div>
        </div>
      </div>

      <div className="cv-pills" style={{ marginBottom: 13 }}>
        {[["todo", "À traiter"], ["all", "Toutes"]].map(([id, l]) => (
          <button key={id} className={b === id ? "on" : ""} onClick={() => setB(id)}>{l}</button>
        ))}
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {list.map((c) => {
          const st = CSTAT[c.status] || CSTAT.en_cours;
          return (
            <div key={c.id} className="cv-tile" style={{ padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
              <Avatar name={c.name} kind="student" size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cv-disp" style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink50)", marginTop: 2 }}>{c.program}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: st.bg, border: "1px solid " + st.bd, color: st.c }}>{st.t}</span>
                  <span style={{ fontSize: 11, color: "var(--ink35)" }}>{c.ago}</span>
                </div>
              </div>
              <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { StaffDossiersV2, StaffFicheV2, AdminPerfV2, AdminCandidaturesV2 });
