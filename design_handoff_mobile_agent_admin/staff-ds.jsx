/* global React */
/* ============================================================
   Staff Mobile — DS primitives (icons + components)
   Exposed on window for the screen files.
   ============================================================ */
const { useState: useStateDS, useRef: useRefDS, useEffect: useEffectDS } = React;

/* ---------- icons (lucide-style) ---------- */
const Icon = ({ d, s = 22, sw = 2, fill = "none", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const ICONS = {
  home:   ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5", "M9 21v-6h6v6"],
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  wallet: ["M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0", "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5", "M16 13h.01"],
  chat:   ["M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.7L3 21l1.4-4.2A8.4 8.4 0 0 1 3.6 7 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"],
  user:   ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  bell:   ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  chevR:  ["M9 18l6-6-6-6"],
  chevL:  ["M15 18l-6-6 6-6"],
  check:  ["M20 6 9 17l-5-5"],
  checkc: ["M22 11.1V12a10 10 0 1 1-5.9-9.1", "M22 4 12 14.1l-3-3"],
  x:      ["M18 6 6 18", "M6 6l12 12"],
  clock:  ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 7v5l3 2"],
  cal:    ["M8 2v4", "M16 2v4", "M3 9h18", "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"],
  doc:    ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6", "M9 13h6", "M9 17h4"],
  card:   ["M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M2 10h20"],
  plane:  ["M22 2 11 13", "M22 2 15 22l-4-9-9-4 20-7z"],
  send:   ["M22 2 11 13", "M22 2 15 22l-4-9-9-4 20-7z"],
  send2:  ["M14.5 4.5 21 11 4 19l3-8-3-8z"],
  alert:  ["M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "M12 9v4", "M12 17h.01"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  clip:   ["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"],
  users:  ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  trend:  ["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"],
  phone:  ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"],
  filter: ["M22 3H2l8 9.5V19l4 2v-8.5z"],
  dots:   ["M12 12h.01", "M19 12h.01", "M5 12h.01"],
  star:   ["M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19l1-5.8L3.5 9.2l5.9-.9z"],
  mail:   ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "m22 7-10 6L2 7"],
  bookmark:["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"],
  moon:   ["M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"],
  globe:  ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M2 12h20", "M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"],
  lock:   ["M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z", "M8 11V7a4 4 0 0 1 8 0v4"],
  pin:    ["M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z", "M12 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  gradcap:["M22 10 12 5 2 10l10 5 10-5z", "M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5", "M22 10v6"],
  inbox:  ["M22 12h-6l-2 3h-4l-2-3H2", "M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"],
  flag:   ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7"],
  grid:   ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  pie:    ["M21.2 15.9A10 10 0 1 1 8 2.8", "M22 12A10 10 0 0 0 12 2v10z"],
  bars:   ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
  building:["M3 21h18", "M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16", "M9 7h2", "M9 11h2", "M9 15h2", "M16 21V11h3a2 2 0 0 1 2 2v8"],
  megaphone:["M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z", "M14 8a4 4 0 0 1 0 8", "M18 5a8 8 0 0 1 0 14"],
  scroll: ["M8 3H5a2 2 0 0 0-2 2v3", "M3 8v11a2 2 0 0 0 2 2h11", "M8 3h11a2 2 0 0 1 2 2v3", "M16 3v13a2 2 0 0 0 2 2 2 2 0 0 0 2-2V8", "M8 8h6", "M8 12h5"],
  refresh:["M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5"],
  key:    ["M2.5 21.5l4-4", "M6.5 17.5l1.8 1.8", "M9 15l-2.5 2.5", "M14.5 11.5a4.5 4.5 0 1 0-3-3l-3 3", "M16.5 7.5h.01"],
  plus:   ["M12 5v14", "M5 12h14"],
  edit:   ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  download:["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"],
  target: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  award:  ["M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M8.2 13.9 7 22l5-3 5 3-1.2-8.1"],
  eye:    ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  more:   ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  starF:  ["M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19l1-5.8L3.5 9.2l5.9-.9z"],
  arrowDown:["M12 5v14", "M19 12l-7 7-7-7"],
  arrowUp:["M12 19V5", "M5 12l7-7 7 7"],
  trash:  ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"],
  power:  ["M12 2v10", "M18.4 6.6a9 9 0 1 1-12.8 0"],
  shieldKey:["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z", "M12 12v3"],
  receipt:["M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z", "M8 7h8", "M8 11h8", "M8 15h5"],
  briefcase:["M3 7h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z", "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M2 13h20"],
  book:   ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  newspaper:["M4 4h13a1 1 0 0 1 1 1v14a2 2 0 0 0 2 2H5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z", "M18 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2", "M8 8h6", "M8 12h6", "M8 16h4"],
  fileclock:["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6", "M14 3v6h6", "M16 16a4 4 0 1 0 8 0 4 4 0 0 0-8 0z", "M20 14.5V16l1 1"],
  database:["M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z", "M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"],
  settings:["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"],
  graduation:["M22 10 12 5 2 10l10 5 10-5z", "M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5", "M22 10v6"],
  filearchive:["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6", "M12 13v4", "M12 13h.01"],
};

/* ---------- avatar ---------- */
function Avatar({ name = "", size = 44, kind = "agent" }) {
  const init = (() => {
    const p = name.trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "?";
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  })();
  return <div className={"av " + kind} style={{ width: size, height: size, fontSize: size * 0.36 }}>{init}</div>;
}

/* ---------- chip ---------- */
function Chip({ variant = "ghost", label }) {
  return <span className={"chip " + variant}>{variant === "live" && <span className="pt" style={{ background: "currentColor" }} />}{label}</span>;
}

/* ---------- icon box ---------- */
function IconBox({ tone = "ghost", size = 40, d, is = 19, sw = 2, children, style }) {
  return <div className={"ibox " + tone} style={{ width: size, height: size, ...style }}>{d ? <Icon d={d} s={is} sw={sw} /> : children}</div>;
}

/* ---------- progress ring (SVG, crimson gradient) ---------- */
function Ring({ size = 120, stroke = 12, pct, gid = "rg", children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const ctr = size / 2;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5a5f" /><stop offset="1" stopColor="#d11a2a" />
          </linearGradient>
        </defs>
        <circle cx={ctr} cy={ctr} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={ctr} cy={ctr} r={r} stroke={`url(#${gid})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${ctr} ${ctr})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}
function MiniRing({ size = 46, stroke = 5, pct, color = "#ef4444", children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const ctr = size / 2;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle cx={ctr} cy={ctr} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={ctr} cy={ctr} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${ctr} ${ctr})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}

/* ---------- screen header ---------- */
function PHeader({ eyebrow, title, sm, right, back }) {
  return (
    <div className="phead">
      {back && <div className="backbtn" onClick={back}><Icon d={ICONS.chevL} s={20} /></div>}
      <div className="left">
        <div className="eyebrow">{eyebrow}</div>
        <div className={"title" + (sm ? " sm" : "")}>{title}</div>
      </div>
      {right}
    </div>
  );
}

/* ---------- status bar ---------- */
function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <div className="dots">
        <Icon d={["M2 8a10 10 0 0 1 20 0", "M5 11.5a6 6 0 0 1 14 0", "M8.5 15a2.5 2.5 0 0 1 7 0", "M12 18.5h.01"]} s={15} sw={2} />
        <svg width="22" height="12" viewBox="0 0 24 12" fill="none"><rect x="1" y="1" width="20" height="10" rx="3" stroke="#fff" strokeWidth="1.4" opacity=".5"/><rect x="3" y="3" width="15" height="6" rx="1.5" fill="#fff"/><rect x="22" y="4" width="1.6" height="4" rx="1" fill="#fff" opacity=".6"/></svg>
      </div>
    </div>
  );
}

/* ---------- bottom tabs ---------- */
const TABS = [
  { id: "home", label: "Accueil", icon: ICONS.home },
  { id: "dossiers", label: "Dossiers", icon: ICONS.folder },
  { id: "paiements", label: "Paiements", icon: ICONS.wallet },
  { id: "messages", label: "Messages", icon: ICONS.chat },
  { id: "profil", label: "Profil", icon: ICONS.user },
];
function BottomTabs({ active, onChange, badges = {}, tabs = TABS }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <div key={t.id} className={"tab" + (active === t.id ? " on" : "")} onClick={() => onChange(t.id)}>
          <div className="ti">
            <Icon d={t.icon} s={20} sw={active === t.id ? 2.2 : 2} />
            {badges[t.id] ? <span className="badge">{badges[t.id]}</span> : null}
          </div>
          <span className="tl">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- toast ---------- */
function Toast({ msg, tone = "mint" }) {
  return <div className="toast"><span className="ti"><Icon d={ICONS.checkc} s={17} /></span>{msg}</div>;
}

Object.assign(window, {
  Icon, ICONS, Avatar, Chip, IconBox, Ring, MiniRing, PHeader, StatusBar, BottomTabs, Toast, TABS,
});
