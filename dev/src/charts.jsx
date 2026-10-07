import React, { useState, useEffect, useId } from "react";
import { reduceMotion } from "./ui.jsx";

/** Anneau en dégradé qui brille (comme « Productivity ») */
export function GradRing({ value, size = 120, stroke = 11, from, to, children, track = "rgba(255,255,255,.07)" }) {
  const id = useId().replace(/:/g, "");
  const [v, setV] = useState(reduceMotion() ? value : 0);
  useEffect(() => { const r = requestAnimationFrame(() => setV(value)); return () => cancelAnimationFrame(r); }, [value]);
  const r = (size - stroke) / 2 - 4, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, v));
  return (
    <div className="gring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={"g" + id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <filter id={"f" + id} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {p > 0 && (
          <>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke} strokeLinecap="round" opacity=".55" filter={`url(#f${id})`}
              strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="arc" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="arc" />
          </>
        )}
      </svg>
      {children && <div className="gring-c">{children}</div>}
    </div>
  );
}

// courbe lisse qui passe par tous les points
const smooth = (pts) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
};

/** Courbe lumineuse avec points (les repas) */
export function GlowLine({ points, height = 64, max, color1 = "#3E7BFF", color2 = "#7FB2FF" }) {
  const id = useId().replace(/:/g, "");
  const W = 320, H = height, pad = 6;
  if (!points.length) return null;
  const t0 = points[0].t.getTime(), t1 = points[points.length - 1].t.getTime();
  const top = Math.max(max || 1, ...points.map((p) => p.v)) * 1.05;
  const xy = points.map((p) => [pad + ((p.t.getTime() - t0) / (t1 - t0 || 1)) * (W - 2 * pad), H - pad - (p.v / top) * (H - 2 * pad)]);
  const path = smooth(xy);
  return (
    <svg className="glowline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={"l" + id} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={color1} stopOpacity=".15" /><stop offset="60%" stopColor={color1} /><stop offset="100%" stopColor={color2} /></linearGradient>
        <linearGradient id={"a" + id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color1} stopOpacity=".28" /><stop offset="100%" stopColor={color1} stopOpacity="0" /></linearGradient>
        <filter id={"b" + id} x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3.5" /></filter>
      </defs>
      <path d={`${path} L${xy[xy.length - 1][0]},${H} L${xy[0][0]},${H} Z`} fill={`url(#a${id})`} />
      <path d={path} fill="none" stroke={`url(#l${id})`} strokeWidth="5" opacity=".7" filter={`url(#b${id})`} vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" stroke={`url(#l${id})`} strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (p.meal || p.now) && (
        <ellipse key={i} cx={xy[i][0]} cy={xy[i][1]} rx={p.now ? 4.2 : 3} ry={p.now ? 4.2 : 3} fill={p.now ? "#fff" : color2} className={p.now ? "now-dot" : ""} />
      ))}
    </svg>
  );
}

/** Vague décorative (sommeil / énergie) */
export function Wave({ amp = 0.5, color = "#7C8CFF" }) {
  const id = useId().replace(/:/g, "");
  const W = 200, H = 56, mid = H / 2, a = 6 + amp * 14;
  const pts = Array.from({ length: 9 }, (_, i) => [(i / 8) * W, mid + Math.sin(i * 1.1 + 0.6) * a * (0.55 + 0.45 * Math.sin(i * 0.7))]);
  const d = smooth(pts);
  return (
    <svg className="wave" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={"w" + id} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={color} stopOpacity="0" /><stop offset="35%" stopColor={color} /><stop offset="100%" stopColor="#C9B8FF" stopOpacity=".9" /></linearGradient>
        <filter id={"wb" + id} x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <path d={d} fill="none" stroke={`url(#w${id})`} strokeWidth="6" opacity=".6" filter={`url(#wb${id})`} />
      <path d={d} fill="none" stroke={`url(#w${id})`} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Barres « pilule » de la semaine */
export function PillBars({ days, sel, onSel, color = "var(--sun)" }) {
  return (
    <div className="pbars">
      {days.map((d) => (
        <button key={d.k} className={"pb" + (d.k === sel ? " sel" : "") + (d.future ? " fut" : "")} onClick={() => !d.future && onSel(d.k)} disabled={d.future} aria-label={`${d.label} : ${d.txt}`}>
          {d.k === sel && !d.future && <span className="pb-tip">{d.txt}</span>}
          <span className="pb-track"><span className="pb-fill" style={{ height: `${Math.min(1, d.v) * 100}%`, background: color }} /></span>
          <span className="pb-l">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Barre fine en dégradé (comme « Storage / Battery ») */
export function ThinBar({ label, pct, from, to, right }) {
  return (
    <div className="tbar">
      <span className="tbar-l">{label}</span>
      <span className="tbar-t"><span className="tbar-f" style={{ width: `${Math.min(1, pct) * 100}%`, background: `linear-gradient(90deg, ${from}, ${to})` }} /></span>
      <span className="tbar-r">{right ?? `${Math.round(pct * 100)} %`}</span>
    </div>
  );
}
