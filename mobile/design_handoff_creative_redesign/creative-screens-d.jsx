/* global React, Icon, ICONS, Avatar, IconBox, CVRing, CountUp */
// =====================================================================
// JODA — Creative staff drill-downs (Wave 4)
// Paiements (+proof sheet) · Messages · Chat · Rapports · Profil
// =====================================================================
const { useState: useCV4 } = React;
function fmt4(n) { return Number(n).toLocaleString("fr-FR"); }
function initials(name) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

function Head4({ eyebrow, title, back, right, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 2px 16px" }}>
      {back && <div onClick={onBack} style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)", cursor: "pointer", flexShrink: 0 }}><Icon d={ICONS.chevL} s={20} /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--crimson-vivid)" }}>{eyebrow}</div>
        <h1 className="cv-disp" style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.5px", margin: "4px 0 0" }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

// ===================== PAIEMENTS (+ proof sheet) =====================
function StaffPaiementsV2({ data }) {
  const [proof, setProof] = useCV4(null);
  const [state, setState] = useCV4({});
  const pending = data.payments.filter((p) => (state[p.id] || p.state) === "pending");
  const done = data.payments.filter((p) => (state[p.id] || p.state) !== "pending");
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const act = (id, ok) => { setState((s) => ({ ...s, [id]: ok ? "approved" : "rejected" })); setProof(null); };

  const Card = ({ p, st }) => (
    <div className="cv-tile" style={{ padding: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={p.student} kind="student" size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cv-disp" style={{ fontSize: 15, fontWeight: 600 }}>{p.student}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{p.type}{p.tranche ? " · tranche " + p.tranche : ""} · {p.ago}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="cv-disp" style={{ fontSize: 16, fontWeight: 600 }}>{fmt4(p.amount)}</div>
          <div style={{ fontSize: 10, color: "var(--ink35)" }}>FCFA</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--glass-line)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon d={ICONS.card} s={12} /> {p.method}
        </span>
        <span onClick={() => setProof(p)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--glass-line)", display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", color: "var(--crimson-vivid)" }}>
          <Icon d={ICONS.clip} s={12} /> Justificatif
        </span>
      </div>
      {st === "pending" ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => act(p.id, true)} style={{ flex: 1, height: 40, borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13.5, color: "#fff", background: "linear-gradient(135deg,#ff5a5f,#d11a2a)", boxShadow: "0 8px 18px -8px rgba(226,59,64,.6)" }}>Valider</button>
          <button onClick={() => act(p.id, false)} style={{ width: 90, height: 40, borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 13.5, color: "var(--ink70)", background: "var(--surface)", border: "1px solid var(--glass-line)" }}>Rejeter</button>
        </div>
      ) : (
        <div style={{ marginTop: 11, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: st === "approved" ? "var(--mint)" : "var(--crimson-vivid)" }}>
          <Icon d={st === "approved" ? ICONS.checkc : ICONS.x} s={15} /> {st === "approved" ? "Validé" : "Rejeté"}
        </div>
      )}
    </div>
  );

  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head4 eyebrow="Encaissements" title="Paiements" />
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div className="cv-hero-eye">En attente de validation</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
          <div className="cv-disp" style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-1.5px", lineHeight: 1 }}><CountUp to={totalPending} fmt={(n) => fmt4(Math.round(n))} /></div>
          <div style={{ fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" }}>{pending.length} à traiter</div>
        </div>
      </div>
      {pending.length > 0 && <><div className="cv-sec"><h3>À valider</h3></div><div className="stack" style={{ gap: 10 }}>{pending.map((p) => <Card key={p.id} p={p} st="pending" />)}</div></>}
      {done.length > 0 && <><div className="cv-sec"><h3>Traités</h3></div><div className="stack" style={{ gap: 10 }}>{done.map((p) => <Card key={p.id} p={p} st={state[p.id] || p.state} />)}</div></>}

      {proof && (
        <div onClick={() => setProof(null)} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,.62)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "var(--bg-base)", borderTopLeftRadius: 28, borderTopRightRadius: 28, border: "1px solid var(--glass-line)", borderBottom: "none", padding: "18px 18px 26px", boxShadow: "0 -20px 50px rgba(0,0,0,.5)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--glass-line2)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <Avatar name={proof.student} kind="student" size={42} />
              <div style={{ flex: 1 }}>
                <div className="cv-disp" style={{ fontSize: 16, fontWeight: 600 }}>{proof.student}</div>
                <div style={{ fontSize: 12, color: "var(--ink50)" }}>{proof.type} · {proof.method}</div>
              </div>
              <div className="cv-disp" style={{ fontSize: 18, fontWeight: 600 }}>{fmt4(proof.amount)}</div>
            </div>
            {/* faux receipt */}
            <div style={{ borderRadius: 16, height: 230, border: "1px solid var(--glass-line)", background: "repeating-linear-gradient(135deg, var(--surface) 0 14px, var(--surface-2, rgba(127,127,127,.06)) 14px 28px)", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ textAlign: "center", color: "var(--ink50)" }}>
                <Icon d={ICONS.receipt} s={40} />
                <div style={{ fontSize: 12, marginTop: 8, fontWeight: 600 }}>{proof.proof}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Justificatif transmis par l'étudiant</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
              <button onClick={() => act(proof.id, true)} style={{ flex: 1, height: 50, borderRadius: 15, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14.5, color: "#fff", background: "linear-gradient(135deg,#ff5a5f,#d11a2a)", boxShadow: "0 10px 24px -8px rgba(226,59,64,.6)" }}>Valider le paiement</button>
              <button onClick={() => act(proof.id, false)} style={{ width: 110, height: 50, borderRadius: 15, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--ink70)", background: "var(--surface)", border: "1px solid var(--glass-line)" }}>Rejeter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== MESSAGES (thread list) =====================
function StaffMessagesV2({ data, onOpen }) {
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head4 eyebrow={data.unread + " non lus"} title="Messages"
        right={<div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}><Icon d={ICONS.search} s={18} /></div>} />
      <div className="cv-card">
        {data.threads.map((t) => (
          <div className="cv-row" key={t.id} onClick={() => onOpen && onOpen(t.id)}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar name={t.name} kind="student" size={48} />
              {t.online && <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: "#34d9a8", border: "2.5px solid var(--bg-base)" }} />}
            </div>
            <div className="grow">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="cv-disp" style={{ fontSize: 14.5, fontWeight: t.unread ? 700 : 600 }}>{t.name}</span>
                <span style={{ fontSize: 11, color: t.unread ? "var(--crimson-vivid)" : "var(--ink35)", fontWeight: t.unread ? 600 : 400 }}>{t.time}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3, gap: 8 }}>
                <span className="ell" style={{ fontSize: 12.5, color: t.unread ? "var(--text)" : "var(--ink50)", flex: 1 }}>{t.last}</span>
                {t.unread > 0 && <span style={{ flexShrink: 0, minWidth: 19, height: 19, padding: "0 6px", borderRadius: 999, background: "linear-gradient(135deg,#ff5a5f,#d11a2a)", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{t.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== CHAT =====================
function StaffChatV2({ thread, onBack }) {
  const [msgs, setMsgs] = useCV4(thread.messages);
  const [txt, setTxt] = useCV4("");
  const send = () => { if (!txt.trim()) return; setMsgs((m) => [...m, { from: "out", text: txt, time: "maintenant" }]); setTxt(""); };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--glass-line)", background: "var(--glass)" }}>
        <div onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--glass-line)", cursor: "pointer" }}><Icon d={ICONS.chevL} s={19} /></div>
        <div style={{ position: "relative" }}>
          <Avatar name={thread.name} kind="student" size={40} />
          {thread.online && <span style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "#34d9a8", border: "2.5px solid var(--glass)" }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="cv-disp" style={{ fontSize: 15, fontWeight: 600 }}>{thread.name}</div>
          <div style={{ fontSize: 11.5, color: thread.online ? "var(--mint)" : "var(--ink50)" }}>{thread.online ? "En ligne" : "Hors ligne"}</div>
        </div>
        <Icon d={ICONS.phone} s={19} style={{ color: "var(--ink50)" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === "out" ? "flex-end" : "flex-start", maxWidth: "78%" }}>
            <div style={{ padding: "10px 14px", borderRadius: m.from === "out" ? "18px 18px 5px 18px" : "18px 18px 18px 5px", fontSize: 13.5, lineHeight: 1.4,
              color: m.from === "out" ? "#fff" : "var(--text)",
              background: m.from === "out" ? "linear-gradient(135deg,#ff5a5f,#d11a2a)" : "var(--glass)",
              border: m.from === "out" ? "none" : "1px solid var(--glass-line)",
              boxShadow: m.from === "out" ? "0 8px 18px -8px rgba(226,59,64,.5)" : "0 6px 14px -10px rgba(0,0,0,.4)" }}>{m.text}</div>
            <div style={{ fontSize: 10, color: "var(--ink35)", marginTop: 3, textAlign: m.from === "out" ? "right" : "left" }}>{m.time}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", display: "flex", gap: 9, alignItems: "center", borderTop: "1px solid var(--glass-line)", background: "var(--glass)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, padding: "0 14px", height: 46, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--glass-line)" }}>
          <Icon d={ICONS.clip} s={18} style={{ color: "var(--ink50)" }} />
          <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message…" style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 14, color: "var(--text)", fontFamily: "inherit" }} />
        </div>
        <button onClick={send} style={{ width: 46, height: 46, borderRadius: 14, border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(135deg,#ff5a5f,#d11a2a)", boxShadow: "0 8px 18px -8px rgba(226,59,64,.6)" }}><Icon d={ICONS.send2} s={20} /></button>
      </div>
    </div>
  );
}

// ===================== RAPPORTS =====================
function StaffRapportsV2({ data }) {
  const [st, setSt] = useCV4({});
  const totalHours = data.reports.filter((r) => r.date === "Aujourd'hui").reduce((s, r) => s + r.hours, 0);
  const pending = data.reports.filter((r) => (st[r.id] || r.state) === "pending").length;
  const act = (id, ok) => setSt((s) => ({ ...s, [id]: ok ? "approved" : "flagged" }));
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head4 eyebrow="Activité de l'équipe" title="Rapports" />
      <div className="cv-bento" style={{ marginBottom: 13 }}>
        <div className="cv-tile accent">
          <div className="cv-ic"><Icon d={ICONS.clock} s={16} /></div>
          <div className="cv-k">Heures · aujourd'hui</div>
          <div className="cv-n cv-disp"><CountUp to={totalHours} />h</div>
          <div className="cv-sub">déclarées par l'équipe</div>
        </div>
        <div className="cv-tile">
          <div className="cv-ic" style={{ color: "var(--crimson-vivid)" }}><Icon d={ICONS.doc} s={16} /></div>
          <div className="cv-k">À valider</div>
          <div className="cv-n cv-disp" style={{ color: "var(--crimson-vivid)" }}><CountUp to={pending} /></div>
        </div>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {data.reports.map((r) => {
          const s = st[r.id] || r.state;
          return (
            <div key={r.id} className="cv-tile" style={{ padding: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={r.employee} kind="agent" size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cv-disp" style={{ fontSize: 14.5, fontWeight: 600 }}>{r.employee}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{r.poste} · {r.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="cv-disp" style={{ fontSize: 17, fontWeight: 600 }}>{r.hours}h</div>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--ink70)", lineHeight: 1.5, margin: "11px 0 0" }}>{r.activities}</p>
              {s === "pending" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => act(r.id, true)} style={{ flex: 1, height: 38, borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#ff5a5f,#d11a2a)" }}>Valider</button>
                  <button onClick={() => act(r.id, false)} style={{ width: 100, height: 38, borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "var(--ink70)", background: "var(--surface)", border: "1px solid var(--glass-line)" }}>Signaler</button>
                </div>
              ) : (
                <div style={{ marginTop: 11, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: s === "approved" ? "var(--mint)" : "var(--amber)" }}>
                  <Icon d={s === "approved" ? ICONS.checkc : ICONS.alert} s={15} /> {s === "approved" ? "Validé" : "Signalé"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== PROFIL =====================
function StaffProfilV2({ staff }) {
  const items = [
    [ICONS.user, "Informations personnelles", "Nom, e-mail, téléphone"],
    [ICONS.shield, "Sécurité & mot de passe", "Code PIN, biométrie"],
    [ICONS.bell, "Notifications", "Préférences d'alertes"],
    [ICONS.book, "Aide & support", "FAQ, contacter Joda"],
  ];
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head4 eyebrow="Mon compte" title="Profil" />
      <div className="cv-hero" style={{ marginBottom: 14, textAlign: "center", padding: "26px 20px" }}>
        <span className="cv-grain" />
        <div style={{ width: 84, height: 84, margin: "0 auto", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,.16)", border: "2px solid rgba(255,255,255,.3)", fontSize: 28, fontWeight: 700, fontFamily: "Space Grotesk" }}>{initials(staff.name)}</div>
        <div className="cv-disp" style={{ fontSize: 22, fontWeight: 600, marginTop: 13 }}>{staff.name}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 3 }}>{staff.role}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 11, fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" }}>
          <Icon d={ICONS.briefcase} s={13} /> {staff.agency}
        </div>
      </div>
      <div className="cv-bento" style={{ marginBottom: 14 }}>
        <div className="cv-tile" style={{ textAlign: "center" }}><div className="cv-n cv-disp" style={{ fontSize: 24 }}><CountUp to={staff.stats.dossiers} /></div><div className="cv-k" style={{ marginTop: 4 }}>Dossiers</div></div>
        <div className="cv-tile" style={{ textAlign: "center" }}><div className="cv-n cv-disp" style={{ fontSize: 24 }}><CountUp to={staff.stats.rate} />%</div><div className="cv-k" style={{ marginTop: 4 }}>Réussite</div></div>
      </div>
      <div className="cv-card">
        {items.map(([d, t, s], i) => (
          <div className="cv-row" key={i}>
            <IconBox tone="ghost" size={42} d={d} />
            <div className="grow"><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 1 }}>{s}</div></div>
            <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />
          </div>
        ))}
      </div>
      <button style={{ width: "100%", marginTop: 14, height: 50, borderRadius: 15, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--crimson-vivid)", background: "var(--red-glass)", border: "1px solid var(--red-line)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
        <Icon d={ICONS.logout} s={18} /> Déconnexion
      </button>
    </div>
  );
}

Object.assign(window, { StaffPaiementsV2, StaffMessagesV2, StaffChatV2, StaffRapportsV2, StaffProfilV2 });
