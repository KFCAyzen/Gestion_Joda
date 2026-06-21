/* global React, Icon, ICONS, Avatar, Chip, IconBox, PHeader, fmtFCFA */
/* ============================================================
   Staff screens — B : Paiements · Messages · Chat · Rapports · Profil
   ============================================================ */
const { useState: useStateB, useRef: useRefB, useEffect: useEffectB } = React;

/* ============ PAIEMENTS (validation queue) ============ */
function ScreenPaiements({ data, validate, openProof }) {
  const [tab, setTab] = useStateB("pending");
  const pending = data.payments.filter((p) => p.state === "pending");
  const treated = data.payments.filter((p) => p.state !== "pending");
  const list = tab === "pending" ? pending : treated;
  const total = pending.reduce((s, p) => s + p.amount, 0);
  return (
    <React.Fragment>
      <PHeader eyebrow="Comptabilité" title="Paiements" />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        {/* summary */}
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div className="eyebrow" style={{ color: "#ffd9a0" }}>En attente de validation</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }} className="amt">{fmtFCFA(total)}</div>
            <Chip variant="due" label={pending.length + " déclarations"} />
          </div>
          <div className="t3" style={{ marginTop: 2 }}>FCFA · à vérifier puis valider</div>
        </div>

        <div className="seg2" style={{ marginBottom: 12 }}>
          <div className={"fchip" + (tab === "pending" ? " on" : "")} onClick={() => setTab("pending")}>En attente <span className="cnt">· {pending.length}</span></div>
          <div className={"fchip" + (tab === "treated" ? " on" : "")} onClick={() => setTab("treated")}>Traités <span className="cnt">· {treated.length}</span></div>
        </div>

        <div className="stack" style={{ gap: 11 }}>
          {list.map((p) => (
            <div key={p.id} className="glass" style={{ padding: 14 }}>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <Avatar name={p.student} kind="student" size={42} />
                <div className="grow">
                  <div className="t1 ell">{p.student}</div>
                  <div className="t2 ell">{p.type}{p.tranche ? " · T" + p.tranche : ""}</div>
                  <div className="t3" style={{ marginTop: 3 }}><Icon d={ICONS.clock} s={12} style={{ verticalAlign: -2, marginRight: 4 }} />Déclaré {p.ago} · {p.method}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }} className="amt">{fmtFCFA(p.amount)}</div>
                  <div className="t3">FCFA</div>
                </div>
              </div>
              {p.state === "pending" ? (
                <React.Fragment>
                  <div className="litem" style={{ padding: "11px 0 2px", cursor: "pointer" }} onClick={() => openProof(p)}>
                    <div className="proof" style={{ width: 46, height: 46 }}><Icon d={ICONS.doc} s={20} /></div>
                    <div className="grow"><div className="t2">Justificatif joint</div><div className="t3">{p.proof}</div></div>
                    <Icon d={ICONS.chevR} s={18} style={{ color: "var(--ink35)" }} />
                  </div>
                  <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
                    <button className="pbtn sm danger" style={{ flex: 1 }} onClick={() => validate(p.id, false)}><Icon d={ICONS.x} s={16} /> Rejeter</button>
                    <button className="pbtn sm mint" style={{ flex: 1.4 }} onClick={() => validate(p.id, true)}><Icon d={ICONS.check} s={16} sw={2.6} /> Valider</button>
                  </div>
                </React.Fragment>
              ) : (
                <div style={{ marginTop: 11 }}>
                  <Chip variant={p.state === "approved" ? "done" : "ghost"} label={p.state === "approved" ? "Validé · " + p.by : "Rejeté"} />
                </div>
              )}
            </div>
          ))}
          {!list.length && <div style={{ textAlign: "center", padding: 40, color: "var(--ink35)" }}>Rien ici. ✦</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ MESSAGES (conversation list) ============ */
function ScreenMessages({ data, openChat }) {
  const [q, setQ] = useStateB("");
  const list = data.threads.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <React.Fragment>
      <PHeader eyebrow={data.unread + " non lus"} title="Messages"
        right={<div className="iconbtn-g"><Icon d={ICONS.dots} s={18} /></div>} />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="search" style={{ marginBottom: 12 }}>
          <Icon d={ICONS.search} s={18} />
          <input placeholder="Rechercher une conversation…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="glass listcard">
          {list.map((t) => (
            <div key={t.id} className="litem" onClick={() => openChat(t.id)}>
              <div style={{ position: "relative" }}>
                <Avatar name={t.name} kind="student" size={48} />
                {t.online && <span style={{ position: "absolute", right: 0, bottom: 1, width: 12, height: 12, borderRadius: 6, background: "var(--mint)", border: "2px solid #160409" }} />}
              </div>
              <div className="grow">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="t1 ell" style={{ flex: 1 }}>{t.name}</div>
                  <div className="t3" style={{ flexShrink: 0 }}>{t.time}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <div className="t2 ell" style={{ flex: 1, color: t.unread ? "#fff" : "var(--ink50)", fontWeight: t.unread ? 600 : 400 }}>{t.last}</div>
                  {t.unread ? <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--crimson-vivid)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "grid", placeItems: "center" }}>{t.unread}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ CHAT (thread) ============ */
function ScreenChat({ thread, back, toast }) {
  const [msgs, setMsgs] = useStateB(thread.messages);
  const [txt, setTxt] = useStateB("");
  const endRef = useRefB(null);
  useEffectB(() => { endRef.current?.parentNode?.scrollTo({ top: 99999 }); }, [msgs]);
  const send = () => {
    const v = txt.trim(); if (!v) return;
    setMsgs((m) => [...m, { from: "out", text: v, time: "maintenant" }]);
    setTxt("");
  };
  return (
    <React.Fragment>
      <div className="phead" style={{ paddingBottom: 12 }}>
        <div className="backbtn" onClick={back}><Icon d={ICONS.chevL} s={20} /></div>
        <Avatar name={thread.name} kind="student" size={42} />
        <div className="left" style={{ marginLeft: 2 }}>
          <div className="t1" style={{ fontSize: 15.5 }}>{thread.name}</div>
          <div className="t3" style={{ color: thread.online ? "var(--mint)" : "var(--ink50)" }}>{thread.online ? "En ligne" : "Vu " + thread.time}</div>
        </div>
        <div className="iconbtn-g"><Icon d={ICONS.phone} s={17} /></div>
      </div>
      <div className="chat-body">
        <div className="daypill">Aujourd'hui</div>
        {msgs.map((m, i) => (
          <div key={i} className={"bub " + m.from}>
            {m.text}
            <div className="tm">{m.time}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <input className="ci" placeholder="Votre message…" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="send" onClick={send}><Icon d={ICONS.send2} s={19} fill="currentColor" /></button>
      </div>
    </React.Fragment>
  );
}

/* ============ RAPPORTS (validation des rapports employés) ============ */
function ScreenRapports({ data, back, validateReport, toast }) {
  const [tab, setTab] = useStateB("pending");
  const pending = data.reports.filter((r) => r.state === "pending");
  const treated = data.reports.filter((r) => r.state !== "pending");
  const list = tab === "pending" ? pending : treated;
  return (
    <React.Fragment>
      <PHeader back={back} eyebrow="Ressources humaines" title="Rapports" sm />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="glass strong" style={{ marginBottom: 13 }}>
          <div className="eyebrow" style={{ color: "#ffb3b3" }}>Rapports journaliers · équipe</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
            <div><div style={{ fontSize: 30, fontWeight: 600 }}>{pending.length}</div><div className="t3">en attente de validation</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 16, fontWeight: 600, color: "var(--mint)" }}>{data.reportsTotalHours}h</div><div className="t3">cumulées aujourd'hui</div></div>
          </div>
        </div>

        <div className="seg2" style={{ marginBottom: 12 }}>
          <div className={"fchip" + (tab === "pending" ? " on" : "")} onClick={() => setTab("pending")}>En attente <span className="cnt">· {pending.length}</span></div>
          <div className={"fchip" + (tab === "treated" ? " on" : "")} onClick={() => setTab("treated")}>Validés <span className="cnt">· {treated.length}</span></div>
        </div>

        <div className="stack" style={{ gap: 11 }}>
          {list.map((r) => (
            <div key={r.id} className="glass" style={{ padding: 14 }}>
              <div className="row">
                <Avatar name={r.employee} kind="agent" size={42} />
                <div className="grow">
                  <div className="t1 ell">{r.employee}</div>
                  <div className="t2 ell">{r.poste}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Chip variant="ghost" label={r.date} />
                  <div className="t3" style={{ marginTop: 4 }}><Icon d={ICONS.clock} s={12} style={{ verticalAlign: -2, marginRight: 3 }} />{r.hours}h</div>
                </div>
              </div>
              <div style={{ marginTop: 11, padding: "11px 13px", background: "rgba(255,255,255,.04)", border: "1px solid var(--glass-line)", borderRadius: 12 }}>
                <div className="t3" style={{ marginBottom: 4 }}>Activités</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink70)" }}>{r.activities}</div>
                {r.note && <React.Fragment><div className="t3" style={{ margin: "9px 0 4px" }}>Observations</div><div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink50)" }}>{r.note}</div></React.Fragment>}
              </div>
              {r.state === "pending" ? (
                <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
                  <button className="pbtn sm danger" style={{ flex: 1 }} onClick={() => validateReport(r.id, false)}><Icon d={ICONS.flag} s={15} /> Signaler</button>
                  <button className="pbtn sm mint" style={{ flex: 1.4 }} onClick={() => validateReport(r.id, true)}><Icon d={ICONS.check} s={16} sw={2.6} /> Valider</button>
                </div>
              ) : (
                <div style={{ marginTop: 11 }}><Chip variant="done" label="Validé" /></div>
              )}
            </div>
          ))}
          {!list.length && <div style={{ textAlign: "center", padding: 40, color: "var(--ink35)" }}>Tout est traité. ✦</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ PROFIL ============ */
function ScreenProfil({ data, go, toast }) {
  const s = data.staff;
  const Row = ({ tone, d, label, sub, right, onClick, danger }) => (
    <div className="litem" onClick={onClick} style={onClick ? {} : { cursor: "default" }}>
      <IconBox tone={tone} size={38} d={d} is={17} />
      <div className="grow"><div className="t1" style={{ fontSize: 14, color: danger ? "var(--crimson-vivid)" : "#fff" }}>{label}</div>{sub && <div className="t3">{sub}</div>}</div>
      {right !== undefined ? right : <Icon d={ICONS.chevR} s={17} style={{ color: "var(--ink35)" }} />}
    </div>
  );
  const Toggle = ({ on }) => (
    <div style={{ width: 42, height: 25, borderRadius: 99, background: on ? "linear-gradient(135deg,#ff5a5f,#d11a2a)" : "var(--track)", padding: 3, display: "flex", justifyContent: on ? "flex-end" : "flex-start", transition: "all .2s" }}>
      <div style={{ width: 19, height: 19, borderRadius: 99, background: "#fff" }} />
    </div>
  );
  return (
    <React.Fragment>
      <PHeader eyebrow="Mon espace" title="Profil" />
      <div className="scr-body" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 13 }}>
          {/* identity */}
          <div className="glass strong" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name={s.name} kind="staff" size={62} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{s.name}</div>
              <div className="t2">{s.role}</div>
              <div style={{ marginTop: 7 }}><Chip variant="live" label={s.agency} /></div>
            </div>
          </div>

          {/* stats */}
          <div className="kgrid">
            <div className="kpi"><div className="kv">{s.stats.dossiers}</div><div className="kl">Dossiers suivis</div></div>
            <div className="kpi"><div className="kv" style={{ color: "var(--mint)" }}>{s.stats.rate}%</div><div className="kl">Taux d'aboutissement</div></div>
          </div>

          {/* RH / validation */}
          <div className="seclbl"><span className="s">Validation & équipe</span></div>
          <div className="glass listcard">
            <Row tone="red" d={ICONS.clip} label="Valider les rapports" sub={data.reports.filter(r => r.state === "pending").length + " en attente"}
              right={<span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "var(--crimson-vivid)", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{data.reports.filter(r => r.state === "pending").length}</span>}
              onClick={() => go("rapports")} />
            <Row tone="amber" d={ICONS.wallet} label="Paiements à valider" sub={data.payments.filter(p => p.state === "pending").length + " déclarations"} onClick={() => go("paiements")} />
            <Row tone="blue" d={ICONS.users} label="Mon équipe" sub={s.stats.team + " agents"} onClick={() => toast("Écran équipe à venir")} />
          </div>

          {/* préférences */}
          <div className="seclbl"><span className="s">Préférences</span></div>
          <div className="glass listcard">
            <Row tone="ghost" d={ICONS.bell} label="Notifications" right={<Toggle on />} />
            <Row tone="ghost" d={ICONS.moon} label="Thème sombre" right={<Toggle on />} />
            <Row tone="ghost" d={ICONS.globe} label="Langue" right={<span className="t2">Français</span>} onClick={() => toast("Choix de langue")} />
          </div>

          {/* compte */}
          <div className="seclbl"><span className="s">Compte</span></div>
          <div className="glass listcard">
            <Row tone="ghost" d={ICONS.lock} label="Sécurité & mot de passe" onClick={() => toast("Sécurité")} />
            <Row tone="ghost" d={ICONS.shield} label="Confidentialité" onClick={() => toast("Confidentialité")} />
            <Row tone="red" d={ICONS.logout} label="Se déconnecter" danger right={<span />} onClick={() => toast("Déconnexion simulée")} />
          </div>
          <div style={{ textAlign: "center", color: "var(--ink35)", fontSize: 11, padding: "4px 0 8px" }}>Joda Company · Staff v1.0</div>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { ScreenPaiements, ScreenMessages, ScreenChat, ScreenRapports, ScreenProfil });
