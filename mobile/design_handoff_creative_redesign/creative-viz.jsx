/* global React */
// =====================================================================
// JODA — Creative viz primitives (Wave 1)
// Animated, mount-on-reveal data-viz. Self-contained; depends only on React.
// =====================================================================
const { useState: useCV, useEffect: useCVE, useRef: useCVR } = React;

// count-up number
function CountUp({ to, dur = 1100, fmt = (n) => Math.round(n), className, style }) {
  const [v, setV] = useCV(0);
  useCVE(() => {
    let raf, t0;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      setV(to * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <span className={className} style={style}>{fmt(v)}</span>;
}

// animated progress ring with crimson gradient + count
function CVRing({ size = 116, stroke = 12, pct, label, sub, gid = "cvr", glow = true, dur = 1300 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, ctr = size / 2;
  const [off, setOff] = useCV(c);
  useCVE(() => {
    const id = requestAnimationFrame(() => setOff(c * (1 - Math.max(0, Math.min(100, pct)) / 100)));
    return () => cancelAnimationFrame(id);
  }, [pct, c]);
  return (
    <div className={"cv-ringwrap" + (glow ? "" : " noglow")} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff7a7e" /><stop offset="1" stopColor="#d11a2a" />
          </linearGradient>
        </defs>
        <circle cx={ctr} cy={ctr} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle cx={ctr} cy={ctr} r={r} stroke={`url(#${gid})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: `stroke-dashoffset ${dur}ms cubic-bezier(.3,.7,.3,1)` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="cv-disp" style={{ fontSize: size * .27, fontWeight: 600, lineHeight: 1 }}>
            <CountUp to={pct} /><span style={{ fontSize: size * .13, color: "var(--ink50)" }}>%</span>
          </div>
          {label && <div style={{ fontSize: 9.5, color: "var(--ink50)", textTransform: "uppercase", letterSpacing: 1.1, marginTop: 3 }}>{label}</div>}
          {sub && <div style={{ fontSize: 10.5, color: "var(--ink70)", marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// sparkline (draws on mount) + optional area fill
function Sparkline({ points, w = 132, h = 40, gid = "cvGrad", fill = true }) {
  const max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const pts = points.map((p, i) => [i * step, h - 4 - ((p - min) / span) * (h - 8)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  const len = pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
  return (
    <svg className="cv-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7a7e" /><stop offset="1" stopColor="#d11a2a" />
        </linearGradient>
        <linearGradient id={gid + "f"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a5f" stopOpacity=".28" /><stop offset="1" stopColor="#ff5a5f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid}f)`} stroke="none" opacity=".9" />}
      <path className="line" d={line} style={{ "--len": len.toFixed(0) }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.2" fill="#ff5a5f" />
    </svg>
  );
}

// animated donut with legend rows
function Donut({ segments, size = 104, stroke = 16 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, ctr = size / 2;
  const total = segments.reduce((a, s) => a + s.v, 0) || 1;
  const [on, setOn] = useCV(false);
  useCVE(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={ctr} cy={ctr} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
      {segments.map((s, i) => {
        const frac = s.v / total;
        const dash = on ? frac * c : 0;
        const el = (
          <circle key={i} cx={ctr} cy={ctr} r={r} stroke={s.color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${c}`} strokeDashoffset={-acc * c} strokeLinecap="butt"
            style={{ transition: `stroke-dasharray 1s cubic-bezier(.3,.7,.3,1) ${i * 0.12}s` }} />
        );
        acc += frac;
        return el;
      })}
    </svg>
  );
}

// animated bar chart
function CVBars({ bars, todayIdx }) {
  const max = Math.max(...bars.map((b) => b.v)) || 1;
  return (
    <div className="cv-bars">
      {bars.map((b, i) => (
        <div className="c" key={i}>
          <div className={"b" + (i === todayIdx ? " on" : "")}
            style={{ "--h": (b.v / max * 100) + "%", height: (b.v / max * 100) + "%", animationDelay: (i * 0.06) + "s" }} />
          <div className="bl">{b.l}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { CountUp, CVRing, Sparkline, Donut, CVBars });
