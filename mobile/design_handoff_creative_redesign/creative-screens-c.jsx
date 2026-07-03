/* global React, Icon, ICONS, Avatar, IconBox, CVRing, Sparkline, Donut, CVBars, CountUp */
// =====================================================================
// JODA — Creative admin drill-downs (Wave 3)
// Comptabilité · Utilisateurs & rôles · RH
// =====================================================================
const { useState: useCV3 } = React;
function fmtF(n) { return Number(n).toLocaleString("fr-FR"); }

function Head3({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 2px 16px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--crimson-vivid)" }}>{eyebrow}</div>
        <h1 className="cv-disp" style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-.5px", margin: "4px 0 0" }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}
function HBtn({ d }) {
  return <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}><Icon d={d} s={18} /></div>;
}

// ===================== COMPTABILITÉ =====================
function AdminComptaV2({ data }) {
  const c = data.compta;
  const [p, setP] = useCV3("mois");
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head3 eyebrow="Trésorerie · Joda" title="Comptabilité" right={<HBtn d={ICONS.download} />} />

      <div className="cv-pills" style={{ marginBottom: 13 }}>
        {[["sem", "Sem."], ["mois", "Mois"], ["trim", "Trim."], ["an", "Année"]].map(([id, l]) => (
          <button key={id} className={p === id ? "on" : ""} onClick={() => setP(id)}>{l}</button>
        ))}
      </div>

      {/* hero balance */}
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div className="cv-hero-eye">Solde de trésorerie</div>
        <div className="cv-disp" style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1, marginTop: 6 }}>
          <CountUp to={c.solde / 1000000} fmt={(n) => n.toFixed(2).replace(".", ",")} />M <span style={{ fontSize: 15, color: "rgba(255,255,255,.7)" }}>FCFA</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, padding: "11px 13px", borderRadius: 14, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.18)" }}>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: "#9af0d4" }}>▲</span> Entrées</div>
            <div className="cv-disp" style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>{fmtF(c.entrees)}</div>
          </div>
          <div style={{ flex: 1, padding: "11px 13px", borderRadius: 14, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.18)" }}>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: "#ffb3b3" }}>▼</span> Sorties</div>
            <div className="cv-disp" style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>{fmtF(c.sorties)}</div>
          </div>
        </div>
      </div>

      {c.toValidate > 0 && (
        <div className="cv-tile accent" style={{ marginBottom: 13, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
          <Icon d={ICONS.alert} s={20} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.toValidate} dépenses à valider</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.8)" }}>Action requise avant clôture</div>
          </div>
          <Icon d={ICONS.chevR} s={18} />
        </div>
      )}

      <div className="cv-sec"><h3>Journal des opérations</h3><span className="cv-all">Exporter</span></div>
      <div className="cv-card">
        {c.rows.map((r, i) => (
          <div className="cv-row" key={i}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center",
              background: r.kind === "in" ? "var(--mint-glass)" : "var(--red-glass)", border: "1px solid " + (r.kind === "in" ? "var(--mint-line)" : "var(--red-line)"),
              color: r.kind === "in" ? "var(--mint)" : "var(--crimson-vivid)" }}>
              <Icon d={r.kind === "in" ? ICONS.trend : ICONS.card} s={17} />
            </div>
            <div className="grow">
              <div style={{ fontSize: 13.5, fontWeight: 600 }} className="ell">{r.desc}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2, display: "flex", alignItems: "center", gap: 7 }}>
                <span>{r.cat}</span><span style={{ opacity: .5 }}>·</span><span>{r.time}</span>
                {r.needsValidation && <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--amber)", padding: "1px 6px", borderRadius: 999, background: "var(--amber-glass)", border: "1px solid var(--amber-line)" }}>À VALIDER</span>}
              </div>
            </div>
            <div className="cv-disp" style={{ fontSize: 14, fontWeight: 600, color: r.kind === "in" ? "var(--mint)" : "var(--text)" }}>
              {r.kind === "in" ? "+" : "−"}{fmtF(r.montant)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== UTILISATEURS & RÔLES =====================
const ROLE_META = {
  super_admin: { label: "Super admin", color: "#ff5a5f" },
  admin: { label: "Admin", color: "#fbbf24" },
  supervisor: { label: "Superviseur", color: "#a78bfa" },
  agent: { label: "Agent", color: "#34d9a8" },
  user: { label: "Utilisateur", color: "#60a5fa" },
};
function AdminUsersV2({ data }) {
  const users = data.users || [];
  const perms = data.rolePerms;
  const counts = {};
  users.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
  const roleOrder = ["super_admin", "admin", "supervisor", "agent", "user"];
  const segments = roleOrder.filter((r) => counts[r]).map((r) => ({ label: ROLE_META[r].label, v: counts[r], color: ROLE_META[r].color }));
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head3 eyebrow="Accès & permissions" title="Utilisateurs" right={<HBtn d={ICONS.plus} />} />

      {/* donut of role distribution */}
      <div className="cv-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 18, marginBottom: 13 }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Donut segments={segments} size={104} stroke={16} />
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div className="cv-disp" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}><CountUp to={users.length} /></div>
            <div style={{ fontSize: 9, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: ".08em" }}>membres</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {segments.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: i ? "1px solid var(--glass-line)" : "none" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink70)" }}>{s.label}</span>
              <span className="cv-disp" style={{ fontSize: 13, fontWeight: 600 }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* permission matrix bars */}
      <div className="cv-sec"><h3>Permissions par rôle</h3></div>
      <div className="cv-card" style={{ padding: 16, marginBottom: 4 }}>
        {roleOrder.map((r, i) => (
          <div key={r} style={{ marginBottom: i < roleOrder.length - 1 ? 13 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ROLE_META[r].color }} />{ROLE_META[r].label}
              </span>
              <span className="cv-disp" style={{ fontSize: 12.5, color: "var(--ink50)" }}>{perms[r]}/42</span>
            </div>
            <div className="cv-meter"><span style={{ "--w": Math.round(perms[r] / 42 * 100) + "%", width: Math.round(perms[r] / 42 * 100) + "%", background: "linear-gradient(90deg," + ROLE_META[r].color + "88," + ROLE_META[r].color + ")", animationDelay: (i * 0.08) + "s" }} /></div>
          </div>
        ))}
      </div>

      <div className="cv-sec"><h3>Membres</h3><span className="cv-all">Tout voir</span></div>
      <div className="stack" style={{ gap: 9 }}>
        {users.slice(0, 5).map((u) => (
          <div key={u.id || u.name} className="cv-tile" style={{ padding: 13, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={u.name} kind="agent" size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cv-disp" style={{ fontSize: 14.5, fontWeight: 600 }} className="ell">{u.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>@{u.username || u.matricule || "—"}</div>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, color: ROLE_META[u.role] ? ROLE_META[u.role].color : "var(--ink70)",
              background: "var(--surface)", border: "1px solid var(--glass-line)" }}>
              {ROLE_META[u.role] ? ROLE_META[u.role].label : u.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== RH =====================
function AdminRHV2({ data }) {
  const rh = data.rh;
  const [tab, setTab] = useCV3("equipe");
  const payroll = rh.employees.filter((e) => e.statut === "actif").reduce((s, e) => s + e.salaire, 0);
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head3 eyebrow="Ressources humaines" title="Équipe" right={<HBtn d={ICONS.plus} />} />

      {/* bento summary */}
      <div className="cv-bento" style={{ marginBottom: 13 }}>
        <div className="cv-tile">
          <div className="cv-ic"><Icon d={ICONS.users} s={16} /></div>
          <div className="cv-k">Effectif actif</div>
          <div className="cv-n cv-disp"><CountUp to={rh.activeCount} /></div>
          <div className="cv-sub">{rh.employees.length} au total</div>
        </div>
        <div className="cv-tile accent">
          <div className="cv-ic"><Icon d={ICONS.card} s={16} /></div>
          <div className="cv-k">Masse salariale</div>
          <div className="cv-n cv-disp"><CountUp to={payroll / 1000} fmt={(n) => Math.round(n)} />K</div>
          <div className="cv-sub">net · ce mois</div>
        </div>
        <div className="cv-tile">
          <div className="cv-ic" style={{ color: "var(--amber)" }}><Icon d={ICONS.cal} s={16} /></div>
          <div className="cv-k">Congés en attente</div>
          <div className="cv-n cv-disp" style={{ color: "var(--amber)" }}><CountUp to={rh.pendingLeaves} /></div>
        </div>
        <div className="cv-tile">
          <div className="cv-ic" style={{ color: "var(--crimson-vivid)" }}><Icon d={ICONS.doc} s={16} /></div>
          <div className="cv-k">Rapports à valider</div>
          <div className="cv-n cv-disp" style={{ color: "var(--crimson-vivid)" }}><CountUp to={rh.pendingReports} /></div>
        </div>
      </div>

      <div className="cv-pills" style={{ marginBottom: 13 }}>
        {[["equipe", "Équipe"], ["conges", "Congés"], ["paie", "Paie"]].map(([id, l]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      {tab === "equipe" && (
        <div className="stack" style={{ gap: 9 }}>
          {rh.employees.map((e) => {
            const sm = e.statut === "actif" ? { c: "var(--mint)", bg: "var(--mint-glass)", bd: "var(--mint-line)", t: "Actif" }
              : e.statut === "suspendu" ? { c: "var(--crimson-vivid)", bg: "var(--red-glass)", bd: "var(--red-line)", t: "Suspendu" }
              : { c: "var(--ink50)", bg: "var(--surface)", bd: "var(--glass-line)", t: "Inactif" };
            return (
              <div key={e.id} className="cv-tile" style={{ padding: 13, display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={e.name} kind="agent" size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cv-disp" style={{ fontSize: 14.5, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{e.poste} · {e.matricule}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: sm.c, background: sm.bg, border: "1px solid " + sm.bd }}>{sm.t}</span>
                  <div className="cv-disp" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 5 }}>{fmtF(e.salaire)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "conges" && (
        <div className="stack" style={{ gap: 9 }}>
          {rh.leaves.map((l) => {
            const ap = l.status === "approuve";
            return (
              <div key={l.id} className="cv-tile" style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <Avatar name={l.name} kind="agent" size={38} />
                  <div style={{ flex: 1 }}>
                    <div className="cv-disp" style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{l.type} · {l.days} jours</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, color: ap ? "var(--mint)" : "var(--amber)", background: ap ? "var(--mint-glass)" : "var(--amber-glass)", border: "1px solid " + (ap ? "var(--mint-line)" : "var(--amber-line)") }}>{ap ? "Approuvé" : "En attente"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 11, fontSize: 12, color: "var(--ink70)" }}>
                  <Icon d={ICONS.cal} s={13} /> {l.from} → {l.to}
                </div>
                {!ap && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, height: 38, borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#34d9a8,#0e9f74)" }}>Approuver</button>
                    <button style={{ flex: 1, height: 38, borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "var(--ink70)", background: "var(--surface)", border: "1px solid var(--glass-line)" }}>Refuser</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "paie" && (
        <div className="cv-card">
          {rh.payslipsList.map((p, i) => (
            <div className="cv-row" key={i}>
              <IconBox tone="mint" size={42} d={ICONS.receipt} />
              <div className="grow">
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{p.month} · {p.ref}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="cv-disp" style={{ fontSize: 14, fontWeight: 600 }}>{fmtF(p.net)}</div>
                <div style={{ fontSize: 11, color: "var(--crimson-vivid)", fontWeight: 600, marginTop: 2 }}>PDF</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AdminComptaV2, AdminUsersV2, AdminRHV2 });
