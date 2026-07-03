/* global React, Icon, ICONS, Avatar, IconBox, Donut, CountUp */
// =====================================================================
// JODA — Creative shared/admin screens (Wave 5)
// Notifications · Universités · Cours · Stockage · Logs (audit)
// =====================================================================
const { useState: useCV5 } = React;
function fmt5(n) { return Number(n).toLocaleString("fr-FR"); }

function Head5({ eyebrow, title, right }) {
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
function HBtn5({ d }) { return <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}><Icon d={d} s={18} /></div>; }

// ===================== NOTIFICATIONS =====================
const NTYPE = {
  payment: { icon: ICONS.card, tone: "mint" },
  alert: { icon: ICONS.alert, tone: "red" },
  dossier: { icon: ICONS.folder, tone: "amber" },
  doc: { icon: ICONS.doc, tone: "ghost" },
  system: { icon: ICONS.database, tone: "ghost" },
};
const TONE = {
  mint: { c: "var(--mint)", bg: "var(--mint-glass)", bd: "var(--mint-line)" },
  red: { c: "var(--crimson-vivid)", bg: "var(--red-glass)", bd: "var(--red-line)" },
  amber: { c: "var(--amber)", bg: "var(--amber-glass)", bd: "var(--amber-line)" },
  ghost: { c: "var(--ink70)", bg: "var(--surface)", bd: "var(--glass-line)" },
};
function NotificationsV2({ data, role = "Admin" }) {
  const [items, setItems] = useCV5(data.notifications);
  const unread = items.filter((n) => !n.read).length;
  const days = [...new Set(items.map((n) => n.day))];
  const markAll = () => setItems((xs) => xs.map((n) => ({ ...n, read: true })));
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head5 eyebrow={role} title="Notifications" right={<HBtn5 d={ICONS.settings} />} />
      <div className="cv-hero" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 16 }}>
        <span className="cv-grain" />
        <div className="cv-disp" style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1 }}><CountUp to={unread} /></div>
        <div style={{ flex: 1 }}>
          <div className="cv-hero-eye">Non lues</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 4 }}>{items.length} notifications au total</div>
        </div>
        <button onClick={markAll} style={{ padding: "8px 13px", borderRadius: 11, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.16)", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Tout lire</button>
      </div>
      {days.map((day) => (
        <div key={day}>
          <div className="cv-sec" style={{ margin: "8px 2px 10px" }}><h3 style={{ fontSize: 12, letterSpacing: ".1em", color: "var(--ink50)", fontWeight: 700 }}>{day}</h3></div>
          <div className="stack" style={{ gap: 9 }}>
            {items.filter((n) => n.day === day).map((n, i) => {
              const t = NTYPE[n.type] || NTYPE.system; const tone = TONE[t.tone];
              return (
                <div key={i} className="cv-tile" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start", opacity: n.read ? .66 : 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: tone.bg, border: "1px solid " + tone.bd, color: tone.c }}><Icon d={t.icon} s={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</span>
                      <span style={{ fontSize: 11, color: "var(--ink35)", flexShrink: 0 }}>{n.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink50)", marginTop: 3, lineHeight: 1.45 }}>{n.body}</div>
                  </div>
                  {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--crimson-vivid)", flexShrink: 0, marginTop: 6 }} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== UNIVERSITÉS =====================
function AdminUniversitesV2({ data }) {
  const u = data.universities;
  const totalStudents = u.reduce((s, x) => s + x.students, 0);
  const totalPrograms = u.reduce((s, x) => s + x.programs, 0);
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head5 eyebrow="Réseau partenaire" title="Universités" right={<HBtn5 d={ICONS.plus} />} />
      <div className="cv-bento" style={{ marginBottom: 13 }}>
        <div className="cv-tile accent"><div className="cv-ic"><Icon d={ICONS.graduation} s={16} /></div><div className="cv-k">Partenaires</div><div className="cv-n cv-disp"><CountUp to={u.length} /></div><div className="cv-sub">{u.filter((x) => x.active).length} actifs</div></div>
        <div className="cv-tile"><div className="cv-ic"><Icon d={ICONS.users} s={16} /></div><div className="cv-k">Étudiants placés</div><div className="cv-n cv-disp"><CountUp to={totalStudents} /></div><div className="cv-sub">{totalPrograms} programmes</div></div>
      </div>
      <div className="cv-sec"><h3>Partenaires</h3><span className="cv-all">Carte</span></div>
      <div className="stack" style={{ gap: 10 }}>
        {u.map((x) => (
          <div key={x.id} className="cv-tile" style={{ padding: 15 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 24, background: "var(--surface)", border: "1px solid var(--glass-line)" }}>{x.flag}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cv-disp" style={{ fontSize: 15, fontWeight: 600 }}>{x.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink50)", marginTop: 2 }}>{x.city} · {x.country}</div>
              </div>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: x.active ? "var(--mint)" : "var(--ink35)", boxShadow: x.active ? "0 0 8px var(--mint)" : "none" }} />
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
              <div style={{ flex: 1, padding: "9px 12px", borderRadius: 12, background: "var(--surface)" }}>
                <div className="cv-disp" style={{ fontSize: 17, fontWeight: 600 }}>{x.students}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink50)" }}>étudiants</div>
              </div>
              <div style={{ flex: 1, padding: "9px 12px", borderRadius: 12, background: "var(--surface)" }}>
                <div className="cv-disp" style={{ fontSize: 17, fontWeight: 600 }}>{x.programs}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink50)" }}>programmes</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== COURS =====================
function AdminCoursV2({ data }) {
  const c = data.cours;
  const langs = [
    { key: "mandarin", label: "Mandarin", flag: "🇨🇳", ...c.mandarin },
    { key: "anglais", label: "Anglais", flag: "🇬🇧", ...c.anglais },
  ];
  const totalRev = langs.reduce((s, l) => s + l.revenue, 0);
  const totalActive = langs.reduce((s, l) => s + l.active, 0);
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head5 eyebrow="Formations linguistiques" title="Cours" right={<HBtn5 d={ICONS.plus} />} />
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div className="cv-hero-eye">Revenu des cours · ce mois</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
          <div className="cv-disp" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px", lineHeight: 1 }}><CountUp to={totalRev / 1000000} fmt={(n) => n.toFixed(1).replace(".", ",")} />M</div>
          <div style={{ fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" }}>{totalActive} inscrits</div>
        </div>
      </div>
      {langs.map((l) => (
        <div key={l.key} style={{ marginBottom: 13 }}>
          <div className="cv-tile" style={{ padding: 15 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", fontSize: 22, background: "var(--surface)", border: "1px solid var(--glass-line)" }}>{l.flag}</div>
              <div style={{ flex: 1 }}>
                <div className="cv-disp" style={{ fontSize: 16, fontWeight: 600 }}>{l.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink50)" }}>{l.active} apprenants actifs</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="cv-disp" style={{ fontSize: 15, fontWeight: 600 }}>{fmt5(l.revenue)}</div>
                <div style={{ fontSize: 10, color: "var(--ink35)" }}>FCFA</div>
              </div>
            </div>
            <div className="stack" style={{ gap: 7 }}>
              {l.students.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 11, background: "var(--surface)" }}>
                  <Avatar name={s.name} kind="student" size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink50)" }}>{s.level} · {s.start}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: s.paid ? "var(--mint)" : "var(--amber)", background: s.paid ? "var(--mint-glass)" : "var(--amber-glass)", border: "1px solid " + (s.paid ? "var(--mint-line)" : "var(--amber-line)") }}>{s.paid ? "Payé" : "En attente"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== STOCKAGE =====================
function AdminStockageV2({ data }) {
  const s = data.storage;
  const pct = Math.round(s.used / s.total * 100);
  const segments = s.buckets.map((b) => ({ label: b.label, v: b.size, color: b.color }));
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head5 eyebrow="Système · données" title="Stockage" right={<HBtn5 d={ICONS.refresh} />} />
      <div className="cv-card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 20, marginBottom: 13 }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Donut segments={segments} size={120} stroke={18} />
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div className="cv-disp" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 10, color: "var(--ink50)" }}>utilisé</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="cv-disp" style={{ fontSize: 20, fontWeight: 600 }}>{s.used} / {s.total} Go</div>
          <div style={{ fontSize: 12, color: "var(--ink50)", marginTop: 3 }}>{fmt5(s.dbRows)} lignes · {s.dbSize} Mo base</div>
          <div style={{ marginTop: 11 }}>
            {segments.map((seg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
                <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink70)" }}>{seg.label}</span>
                <span className="cv-disp" style={{ fontSize: 11.5, fontWeight: 600 }}>{seg.v} Go</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="cv-sec"><h3>Détail par dossier</h3></div>
      <div className="stack" style={{ gap: 9 }}>
        {s.buckets.map((b, i) => (
          <div key={i} className="cv-tile" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--glass-line)", color: b.color }}><Icon d={b.icon} s={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{b.label}</div>
              <div className="cv-meter" style={{ marginTop: 7 }}><span style={{ "--w": Math.round(b.size / s.total * 100) + "%", width: Math.round(b.size / s.total * 100) + "%", background: b.color, animationDelay: (i * 0.1) + "s" }} /></div>
            </div>
            <div className="cv-disp" style={{ fontSize: 14, fontWeight: 600 }}>{b.size} Go</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== LOGS (audit) =====================
const LTYPE = {
  payment: { icon: ICONS.card, c: "var(--mint)" }, accounting: { icon: ICONS.receipt, c: "var(--amber)" },
  validate: { icon: ICONS.checkc, c: "var(--mint)" }, update: { icon: ICONS.edit, c: "var(--ink70)" },
  reject: { icon: ICONS.x, c: "var(--crimson-vivid)" }, login: { icon: ICONS.logout, c: "var(--ink70)" },
  create: { icon: ICONS.plus, c: "var(--mint)" }, delete: { icon: ICONS.x, c: "var(--crimson-vivid)" },
  upload: { icon: ICONS.clip, c: "var(--ink70)" },
};
function AdminLogsV2({ data }) {
  const logs = data.logs;
  const days = [...new Set(logs.map((l) => l.day))];
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <Head5 eyebrow="Traçabilité" title="Journal d'audit" right={<HBtn5 d={ICONS.download} />} />
      <div className="cv-tile" style={{ marginBottom: 14, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <Icon d={ICONS.shield} s={20} style={{ color: "var(--mint)" }} />
        <div style={{ flex: 1, fontSize: 12.5, color: "var(--ink70)", lineHeight: 1.4 }}>Toutes les actions sensibles sont enregistrées et horodatées.</div>
        <div className="cv-disp" style={{ fontSize: 18, fontWeight: 600 }}>{logs.length}</div>
      </div>
      {days.map((day) => (
        <div key={day}>
          <div className="cv-sec" style={{ margin: "8px 2px 10px" }}><h3 style={{ fontSize: 12, letterSpacing: ".1em", color: "var(--ink50)", fontWeight: 700 }}>{day}</h3></div>
          <div className="cv-card">
            {logs.filter((l) => l.day === day).map((l, i) => {
              const t = LTYPE[l.type] || LTYPE.update;
              return (
                <div key={i} className="cv-row" style={{ cursor: "default" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--glass-line)", color: t.c }}><Icon d={t.icon} s={16} /></div>
                  <div className="grow">
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }}><b style={{ fontWeight: 600 }}>{l.actor}</b> <span style={{ color: "var(--ink70)" }}>{l.desc}</span></div>
                    <div style={{ fontSize: 10.5, color: "var(--ink35)", marginTop: 2 }}>{l.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { NotificationsV2, AdminUniversitesV2, AdminCoursV2, AdminStockageV2, AdminLogsV2 });
