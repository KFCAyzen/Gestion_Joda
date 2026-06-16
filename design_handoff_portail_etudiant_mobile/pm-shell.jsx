/* global React */
const { useId } = React;

// ---------- Icons (Lucide-ish) ----------
const PIc = ({ d, s = 20, sw = 1.8, fill = "none", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const PI = {
  home:    ["M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
  route:   ["M6 19a3 3 0 1 0 0-6h12a3 3 0 1 0 0-6", "M6 7h.01", "M18 19h.01"],
  wallet:  ["M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M16 13h3", "M3 9h18"],
  docs:    ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5", "M9 13h6", "M9 17h4"],
  chat:    ["M21 11.5a8.4 8.4 0 0 1-8.9 8.3 8.4 8.4 0 0 1-3.6-.9L3 20.5l1.6-5.3A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"],
  bell:    ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  plane:   ["M22 2 11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
  check:   ["M20 6 9 17l-5-5"],
  plus:    ["M12 5v14", "M5 12h14"],
  upload:  ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 9l5-5 5 5", "M12 4v12"],
  arrow:   ["M5 12h14", "M13 5l7 7-7 7"],
  chev:    ["M9 6l6 6-6 6"],
  chevDown:["M6 9l6 6 6-6"],
  clock:   ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"],
  lock:    ["M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z", "M8 11V7a4 4 0 0 1 8 0v4"],
  cap:     ["M22 10 12 5 2 10l10 5 10-5z", "M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"],
  send:    ["M22 2 11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
  clip:    ["M21.4 11 12.2 20.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.9-2.9l8.5-8.5"],
  mic:     ["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z", "M19 10v2a7 7 0 0 1-14 0v-2", "M12 19v3"],
  card:    ["M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M2 10h20"],
  phone:   ["M15.5 21a6 6 0 0 1-6-6 6 6 0 0 1-6-6V5a2 2 0 0 1 2-2h2.2a1 1 0 0 1 1 .75l.8 3a1 1 0 0 1-.3 1L9.8 9.3a13 13 0 0 0 4.9 4.9l1.6-1.4a1 1 0 0 1 1-.25l3 .8a1 1 0 0 1 .7 1V16a2 2 0 0 1-2 2z"],
  flame:   ["M12 2s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 1-3 2-5 .8-1.6 0-3 0-3z"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"],
  shield:  ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  ellipsis:["M5 12h.01","M12 12h.01","M19 12h.01"],
  back:    ["M15 6l-6 6 6 6"],
};

// ---------- Progress ring (Apple-fitness flavour) ----------
const Ring = ({ size = 188, stroke = 16, pct = 62, color = "#ff5a5f", color2 = "#d11a2a", track = "rgba(255,255,255,.08)" }) => {
  const gid = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, pct) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={"g" + gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
        <filter id={"f" + gid} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.55" />
        </filter>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#g${gid})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform={`rotate(-90 ${size/2} ${size/2})`} filter={`url(#f${gid})`} />
    </svg>
  );
};

// thin secondary arc ring (for multi-metric)
const MiniRing = ({ size = 54, stroke = 6, pct = 70, color = "#34d9a8" }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct/100)}
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }} />
    </svg>
  );
};

const Avatar = ({ name, bg = "linear-gradient(135deg,#60a5fa,#2563eb)", size = 40 }) => {
  const ini = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return <div className="pav" style={{ width: size, height: size, fontSize: size * 0.38, background: bg }}>{ini}</div>;
};

// ---------- Phone shell ----------
const Phone = ({ children, tab, badge = 2, dark = true }) => (
  <div className="pm" data-screen-label={"Mobile · " + (tab || "")}>
    <div className="pm-bg" />
    <StatusBar />
    <div className="pm-scroll">{children}</div>
    <TabBar active={tab} badge={badge} />
  </div>
);

const StatusBar = () => (
  <div className="pm-status">
    <span>9:41</span>
    <span className="r">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="2.4" height="4" rx="1"/><rect x="3.6" y="5" width="2.4" height="6" rx="1"/><rect x="7.2" y="2.6" width="2.4" height="8.4" rx="1"/><rect x="10.8" y="0" width="2.4" height="11" rx="1" opacity=".4"/></svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M1 5.2a9 9 0 0 1 14 0M3.2 7.4a6 6 0 0 1 9.6 0"/><circle cx="8" cy="9.4" r="1" fill="currentColor" stroke="none"/></svg>
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x="1" y="1" width="20" height="10" rx="3" stroke="currentColor" strokeOpacity=".5"/><rect x="2.5" y="2.5" width="15" height="7" rx="1.6" fill="currentColor"/><rect x="22" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" fillOpacity=".5"/></svg>
    </span>
  </div>
);

const TabBar = ({ active, badge }) => {
  const tabs = [
    { id: "home",     label: "Accueil",   icon: PI.home },
    { id: "parcours", label: "Parcours",  icon: PI.route },
    { id: "docs",     label: "Documents", icon: PI.docs },
    { id: "pay",      label: "Paiements", icon: PI.wallet },
    { id: "chat",     label: "Messages",  icon: PI.chat, badge },
  ];
  return (
    <div className="pm-tabs">
      {tabs.map(t => (
        <div key={t.id} className={"pm-tab" + (t.id === active ? " active" : "")}>
          <div className="tbox"><PIc d={t.icon} s={21} sw={t.id === active ? 2.1 : 1.8} /></div>
          <span>{t.label}</span>
          {t.badge ? <span className="badge">{t.badge}</span> : null}
        </div>
      ))}
    </div>
  );
};

// greeting header used across screens
const PHeader = ({ eyebrow, title, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px 16px" }}>
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <div className="num" style={{ fontSize: 25, fontWeight: 600, marginTop: 3, letterSpacing: "-0.025em" }}>{title}</div>
    </div>
    {right}
  </div>
);

const BellBtn = ({ n = 2 }) => (
  <button className="glass" style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", position: "relative", color: "#fff", background: "rgba(255,255,255,.07)" }}>
    <PIc d={PI.bell} s={19} />
    {n > 0 && <span style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: "50%", background: "var(--red-bright)", border: "1.5px solid #1a0509" }} />}
  </button>
);

Object.assign(window, { PIc, PI, Ring, MiniRing, Avatar, Phone, StatusBar, TabBar, PHeader, BellBtn });
