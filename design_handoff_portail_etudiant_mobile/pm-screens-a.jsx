/* global React, Phone, PHeader, BellBtn, Ring, MiniRing, Avatar, PIc, PI */

// ===================================================================
// SCREEN A1 — ACCUEIL
// ===================================================================
const ScreenHome = () => (
  <Phone tab="home">
    <div className="pm-body">
      <PHeader
        eyebrow="Bonjour 👋"
        title="Marie Diop"
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <BellBtn n={2} />
          <Avatar name="Marie Diop" size={44} bg="linear-gradient(135deg,#60a5fa,#2563eb)" />
        </div>}
      />

      {/* HERO — ring + dossier */}
      <div className="glass-strong" style={{ borderRadius: "var(--r-xl)", padding: "20px 20px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -20, color: "rgba(255,255,255,.05)" }}>
          <PIc d={PI.plane} s={130} sw={1} />
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", position: "relative" }}>
          <div className="ring-wrap" style={{ flexShrink: 0 }}>
            <Ring size={132} stroke={13} pct={62} />
            <div className="ring-center">
              <div className="num" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1 }}>62<span style={{ fontSize: 16, opacity: .6 }}>%</span></div>
              <div style={{ fontSize: 10, color: "var(--ink-50)", textTransform: "uppercase", letterSpacing: ".14em", marginTop: 2 }}>Dossier</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Destination</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 600, marginTop: 2, lineHeight: 1.1 }}>Tsinghua</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-70)", marginTop: 2 }}>Master Ingénierie · Bourse CSC</div>
            <div style={{ display: "flex", gap: 7, marginTop: 13 }}>
              <span className="pchip live"><span className="pulse" /> Étape 3 / 6</span>
            </div>
          </div>
        </div>
        {/* mini-metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 18 }}>
          {[
            { ring: 100, c: "#34d9a8", big: "5/5", lbl: "Inscrit." },
            { ring: 62, c: "#ff5a5f", big: "5/8", lbl: "Documents" },
            { ring: 50, c: "#fbbf24", big: "1", lbl: "Échéance" },
          ].map((m, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--glass-line)", borderRadius: 16, padding: "11px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className="ring-wrap"><MiniRing size={46} stroke={5} pct={m.ring} color={m.c} />
                <div className="ring-center num" style={{ fontSize: 14, fontWeight: 600 }}>{m.big}</div>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-50)", fontWeight: 600 }}>{m.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PROCHAINE ÉTAPE */}
      <div className="glass" style={{ marginTop: 13, padding: "15px 16px", borderLeft: "3px solid var(--red)", display: "flex", gap: 13, alignItems: "center" }}>
        <Avatar name="Solange C" size={42} bg="linear-gradient(135deg,#fb7185,#e11d2a)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ color: "#ffb3b3" }}>En cours · maintenant</div>
          <div style={{ fontSize: 15, fontWeight: 650, marginTop: 1 }}>Examen de ton dossier</div>
          <div style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 2 }}>Solange l'examine · maj il y a 27 min</div>
        </div>
        <PIc d={PI.chev} s={20} style={{ color: "var(--ink-35)" }} />
      </div>

      {/* PROCHAINE ÉCHÉANCE */}
      <div className="glass" style={{ marginTop: 13, padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="eyebrow">Prochaine échéance</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Cours mandarin · T3</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, color: "var(--amber)", fontSize: 12, fontWeight: 600 }}>
              <PIc d={PI.clock} s={14} /> Dû dans 18 jours · 30 nov
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 23, fontWeight: 600 }}>121 000</div>
            <div style={{ fontSize: 11, color: "var(--ink-50)" }}>FCFA</div>
          </div>
        </div>
        <button className="pbtn primary block" style={{ marginTop: 15, height: 46 }}>
          <PIc d={PI.card} s={17} /> Déclarer le paiement
        </button>
      </div>
    </div>
  </Phone>
);

// ===================================================================
// SCREEN A2 — PARCOURS (roadmap)
// ===================================================================
const STEPS = [
  { n: 1, t: "Inscription",        s: "Validée · 15 oct",          st: "done" },
  { n: 2, t: "Documents",          s: "5 / 5 reçus · 12 nov",       st: "done" },
  { n: 3, t: "Examen Joda",        s: "Solange examine — 27 min",   st: "now" },
  { n: 4, t: "Réponse université", s: "≈ 3 semaines",               st: "next" },
  { n: 5, t: "Visa étudiant",      s: "Après admission",            st: "lock" },
  { n: 6, t: "Départ en Chine",    s: "Septembre 2026",             st: "lock" },
];

const StepNode = ({ st, n, last }) => {
  const done = st === "done", now = st === "now";
  const ring = done ? "var(--mint)" : now ? "var(--red-bright)" : "rgba(255,255,255,.16)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 46, flexShrink: 0 }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center",
        background: done ? "rgba(52,217,168,.16)" : now ? "linear-gradient(135deg,#ff5a5f,#d11a2a)" : "rgba(255,255,255,.05)",
        border: `2px solid ${ring}`,
        color: done ? "var(--mint)" : "#fff",
        boxShadow: now ? "0 0 0 5px rgba(239,68,68,.18), 0 8px 20px rgba(239,68,68,.4)" : "none",
      }} className="num">
        {done ? <PIc d={PI.check} s={20} sw={2.6} /> : st === "lock" ? <PIc d={PI.lock} s={16} style={{ opacity: .5 }} /> : <span style={{ fontWeight: 600, fontSize: 16 }}>{n}</span>}
      </div>
      {!last && <div style={{ width: 2, flex: 1, minHeight: 26, marginTop: 4, marginBottom: 4, background: done ? "var(--mint)" : "repeating-linear-gradient(var(--glass-line-2) 0 5px, transparent 5px 10px)" }} />}
    </div>
  );
};

const ScreenParcours = () => (
  <Phone tab="parcours">
    <div className="pm-body">
      <PHeader eyebrow="Mon parcours vers" title="Tsinghua" right={<span className="pchip ghost"><PIc d={PI.cap} s={14} /> CSC</span>} />
      {/* trip summary bar */}
      <div className="glass-strong" style={{ borderRadius: "var(--r-lg)", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ textAlign: "center" }}><div className="num" style={{ fontWeight: 600, fontSize: 16 }}>Bamako</div><div style={{ fontSize: 10, color: "var(--ink-50)" }}>Aujourd'hui</div></div>
          <div style={{ flex: 1, position: "relative", width: 56, display: "grid", placeItems: "center", color: "var(--red-bright)" }}>
            <div style={{ height: 2, width: "100%", background: "repeating-linear-gradient(90deg,var(--red-line) 0 5px,transparent 5px 9px)" }} />
            <PIc d={PI.plane} s={20} style={{ position: "absolute", transform: "rotate(45deg)" }} />
          </div>
          <div style={{ textAlign: "center" }}><div className="num" style={{ fontWeight: 600, fontSize: 16 }}>Pékin</div><div style={{ fontSize: 10, color: "var(--ink-50)" }}>Sept. 2026</div></div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}>
        {STEPS.map((s, i) => {
          const now = s.st === "now";
          return (
            <div key={s.n} style={{ display: "flex", gap: 13, alignItems: "stretch" }}>
              <StepNode st={s.st} n={s.n} last={i === STEPS.length - 1} />
              <div style={{ flex: 1, paddingBottom: i === STEPS.length - 1 ? 0 : 8 }}>
                <div className={now ? "glass-strong" : ""} style={{
                  borderRadius: 16, padding: now ? "12px 14px" : "8px 4px",
                  border: now ? "1px solid var(--red-line)" : "none",
                  background: now ? "var(--red-glass)" : "transparent",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 650, color: s.st === "lock" ? "var(--ink-35)" : "#fff" }}>{s.t}</span>
                    {now && <span className="pchip live"><span className="pulse" /> En cours</span>}
                    {s.st === "done" && <PIc d={PI.check} s={15} sw={2.5} style={{ color: "var(--mint)" }} />}
                  </div>
                  <div style={{ fontSize: 12, color: s.st === "lock" ? "var(--ink-35)" : "var(--ink-70)", marginTop: 2 }}>{s.s}</div>
                  {now && <button className="pbtn glass sm" style={{ marginTop: 11 }}><PIc d={PI.chat} s={15} /> Voir le message de Solange</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </Phone>
);

// ===================================================================
// SCREEN A3 — DOCUMENTS
// ===================================================================
const DOCS = [
  { t: "Passeport",              s: "Reçu · 2,1 Mo",     st: "done" },
  { t: "Photo d'identité",       s: "Reçu · fond blanc",  st: "done" },
  { t: "Relevé de notes",        s: "Reçu · 1,8 Mo",      st: "done" },
  { t: "Diplôme",                s: "Reçu · vérifié",     st: "done" },
  { t: "Lettre de motivation",   s: "Reçu · anglais",     st: "done" },
  { t: "Casier judiciaire",      s: "À téléverser",       st: "todo" },
  { t: "Lettre de recommandation", s: "À téléverser",     st: "todo" },
  { t: "Certificat HSK",         s: "Optionnel",          st: "opt" },
];

const ScreenDocs = () => (
  <Phone tab="docs">
    <div className="pm-body">
      <PHeader eyebrow="Mes documents" title="Dossier" right={<BellBtn n={2} />} />
      {/* progress header */}
      <div className="glass-strong" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="eyebrow">Documents requis</div>
          <div className="num" style={{ fontSize: 15, fontWeight: 600 }}><span style={{ color: "var(--mint)" }}>5</span> / 7</div>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: "71%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#34d9a8,#1aa97f)", boxShadow: "0 0 14px rgba(52,217,168,.5)" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 9 }}>Plus que <b style={{ color: "#fff" }}>2 documents</b> pour soumettre ton dossier complet.</div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
        {DOCS.map((d, i) => {
          const cfg = d.st === "done" ? { ic: "mint", I: PI.check } : d.st === "todo" ? { ic: "red", I: PI.upload } : { ic: "ghost", I: PI.sparkle };
          return (
            <div key={i} className="glass" style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 12, opacity: d.st === "opt" ? .72 : 1 }}>
              <div className={"picon " + cfg.ic} style={{ width: 36, height: 36 }}><PIc d={cfg.I} s={17} sw={2.2} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.t}</div>
                <div style={{ fontSize: 11.5, color: d.st === "todo" ? "#ffb3b3" : "var(--ink-50)" }}>{d.s}</div>
              </div>
              {d.st === "done"
                ? <span className="pchip done">OK</span>
                : d.st === "todo"
                  ? <button className="pbtn primary sm" style={{ height: 32, padding: "0 12px" }}>Ajouter</button>
                  : <span className="pchip ghost">Option</span>}
            </div>
          );
        })}
      </div>
    </div>
  </Phone>
);

Object.assign(window, { ScreenHome, ScreenParcours, ScreenDocs });
