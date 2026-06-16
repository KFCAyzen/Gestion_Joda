/* global React, Phone, PHeader, BellBtn, Avatar, PIc, PI */

// ===================================================================
// SCREEN B1 — PAIEMENTS
// ===================================================================
const PAYS = [
  { t: "Procédure bourse · T1", d: "Payé · 15 oct", amt: "100 000", st: "paid" },
  { t: "Procédure bourse · T2", d: "Payé · 02 nov", amt: "100 000", st: "paid" },
  { t: "Cours mandarin · T3",   d: "Dû le 30 nov · 18j", amt: "121 000", st: "due" },
  { t: "Cours mandarin · T4",   d: "Dû le 30 déc", amt: "121 000", st: "wait" },
];

const ScreenPay = () => (
  <Phone tab="pay">
    <div className="pm-body">
      <PHeader eyebrow="Mes paiements" title="Solde" right={<BellBtn n={2} />} />

      {/* balance hero */}
      <div className="glass-strong" style={{ borderRadius: "var(--r-xl)", padding: "20px 20px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -24, right: -24, color: "rgba(255,255,255,.05)" }}><PIc d={PI.wallet} s={120} sw={1} /></div>
        <div className="eyebrow">Reste à régler</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <div className="num" style={{ fontSize: 42, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>242 000</div>
          <div style={{ fontSize: 14, color: "var(--ink-50)", fontWeight: 600 }}>FCFA</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <span className="pchip due"><span className="dot" /> 1 dû bientôt</span>
          <span className="pchip ghost">2 payés · 200 000 F</span>
        </div>
        {/* paid progress */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-50)", marginBottom: 7 }}>
            <span>Réglé 200 000 F</span><span className="num">45%</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div style={{ width: "45%", height: "100%", background: "linear-gradient(90deg,#34d9a8,#1aa97f)", boxShadow: "0 0 12px rgba(52,217,168,.5)" }} />
          </div>
        </div>
      </div>

      {/* tranche list */}
      <div className="eyebrow" style={{ margin: "16px 4px 9px" }}>Échéancier</div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
        {PAYS.map((p, i) => {
          const cfg = p.st === "paid" ? { ic: "mint", I: PI.check } : p.st === "due" ? { ic: "amber", I: PI.clock } : { ic: "ghost", I: PI.lock };
          return (
            <div key={i} className="glass" style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 12,
              border: p.st === "due" ? "1px solid rgba(251,191,36,.3)" : "1px solid var(--glass-line)",
              background: p.st === "due" ? "rgba(251,191,36,.08)" : "var(--glass)" }}>
              <div className={"picon " + cfg.ic}><PIc d={cfg.I} s={18} sw={2.2} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.t}</div>
                <div style={{ fontSize: 11.5, color: p.st === "due" ? "var(--amber)" : "var(--ink-50)", marginTop: 1 }}>{p.d}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontSize: 14.5, fontWeight: 600, color: p.st === "paid" ? "var(--ink-50)" : "#fff" }}>{p.amt}</div>
                <div style={{ fontSize: 10, color: "var(--ink-35)" }}>FCFA</div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="pbtn primary block" style={{ marginTop: 12 }}>
        <PIc d={PI.card} s={18} /> Déclarer un paiement
      </button>
    </div>
  </Phone>
);

// ===================================================================
// SCREEN B2 — MESSAGERIE
// ===================================================================
const ScreenChat = () => (
  <Phone tab="chat" badge={0}>
    {/* custom chat header replaces greeting */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 18px 14px" }}>
      <button className="glass" style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,.07)" }}>
        <PIc d={PI.back} s={20} />
      </button>
      <Avatar name="Solange C" size={42} bg="linear-gradient(135deg,#fb7185,#e11d2a)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15.5, fontWeight: 650 }}>Solange</div>
        <div style={{ fontSize: 11.5, color: "var(--mint)", display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pulse mint-pulse" style={{ width: 6, height: 6 }} /> Ton agent · en ligne
        </div>
      </div>
      <button className="glass" style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,.07)" }}>
        <PIc d={PI.phone} s={18} />
      </button>
    </div>

    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "0 16px", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ink-35)", textTransform: "uppercase", letterSpacing: ".14em", margin: "2px 0 4px" }}>— Hier —</div>

      <div style={{ display: "flex" }}><div className="bub them">Bonjour Marie 👋 Je t'accompagne pour Tsinghua. Voici les 7 documents à préparer.</div></div>

      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 999, background: "rgba(52,217,168,.1)", border: "1px solid rgba(52,217,168,.24)", fontSize: 11, color: "#8bf0d2", fontWeight: 600 }}>
          <PIc d={PI.check} s={12} sw={2.6} /> 5 documents reçus · auto-validés
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div className="bub us">J'ai tout envoyé sauf la lettre de motivation. Je peux l'écrire en anglais ?</div>
      </div>

      {/* attachment from them */}
      <div style={{ display: "flex" }}>
        <div className="bub them" style={{ padding: 8, maxWidth: "80%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 6px 4px 8px" }}>
            <div className="picon red" style={{ width: 38, height: 38 }}><PIc d={PI.docs} s={18} /></div>
            <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>guide-motivation.pdf</div><div style={{ fontSize: 11, color: "var(--ink-50)" }}>240 Ko · PDF</div></div>
          </div>
          <div style={{ padding: "6px 6px 2px", fontSize: 13 }}>Oui, l'anglais est accepté ! Inspire-toi de ce guide 👇</div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ink-35)", textTransform: "uppercase", letterSpacing: ".14em", margin: "4px 0" }}>— Aujourd'hui · 09:15 —</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
        <div className="bub them">Bravo, ton dossier est presque complet 🎉 Je l'examine aujourd'hui.</div>
      </div>

      {/* typing */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
        <Avatar name="Solange C" size={22} bg="linear-gradient(135deg,#fb7185,#e11d2a)" />
        <div className="bub them" style={{ padding: "10px 14px", display: "inline-flex", gap: 4 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-50)", animation: `pm-dot 1.2s ${i * 0.18}s infinite` }} />)}
        </div>
      </div>
    </div>

    {/* composer */}
    <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", gap: 9 }}>
      <button className="glass" style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", color: "var(--ink-70)", background: "rgba(255,255,255,.06)", flexShrink: 0 }}>
        <PIc d={PI.clip} s={19} />
      </button>
      <div className="glass" style={{ flex: 1, height: 46, borderRadius: 23, display: "flex", alignItems: "center", padding: "0 18px", color: "var(--ink-35)", fontSize: 13.5 }}>
        Écris à Solange…
      </div>
      <button className="pbtn primary" style={{ width: 46, height: 46, borderRadius: 23, padding: 0, flexShrink: 0 }}>
        <PIc d={PI.send} s={18} />
      </button>
    </div>
  </Phone>
);

Object.assign(window, { ScreenPay, ScreenChat });
