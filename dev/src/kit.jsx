// Les pièces communes : grand titre, sections, capsules de progression, anneaux, courbes
import React, { useId } from "react";
import * as L from "./lib.js";
import { Icon, useCount } from "./ui.jsx";

export function Title({ ctx, kicker, title, children }) {
  return (
    <header className="lt">
      <div className="lt-top">
        <p className="lt-k">{kicker}</p>
        <div className="lt-r">
          <button className="gb" onClick={() => ctx.open({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={19} /></button>
          <button className="gb" onClick={() => ctx.open({ type: "settings" })} aria-label="Réglages"><Icon n="sliders" size={19} /></button>
        </div>
      </div>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function Sec({ title, right, onRight, children, className = "" }) {
  return (
    <section className={"sec " + className} aria-label={title}>
      {title && (
        <div className="sec-h">
          <h2>{title}</h2>
          {right != null && (onRight ? <button className="sec-r link" onClick={onRight}>{right}</button> : <span className="sec-r">{right}</span>)}
        </div>
      )}
      {children}
    </section>
  );
}

/** Nombre qui s'anime jusqu'à sa valeur */
export function N({ v, fmt = L.fint }) {
  const x = useCount(Math.round(v || 0), 700, true);
  return <>{fmt(x)}</>;
}

/** Capsule de progression : dégradé, repère « où tu devrais en être », projection en pointillés */
export function Cap({ v, max, mark, proj, tone = "fuel", label, h }) {
  const f = (x) => `${(L.clamp(max > 0 ? x / max : 0, 0, 1) * 100).toFixed(1)}%`;
  return (
    <div className={"cap t-" + tone} style={h ? { height: h } : undefined} role="img" aria-label={label || `${Math.round((v / max) * 100)} %`}>
      {proj != null && proj > v && <i className="cap-p" style={{ left: f(v), width: `calc(${f(proj)} - ${f(v)})` }} />}
      <i className="cap-f" style={{ width: f(v) }} />
      {mark != null && mark > 0 && mark < max && <i className="cap-m" style={{ left: f(mark) }} />}
    </div>
  );
}

const GRAD = { fuel: ["#FF7A3D", "#FFC05A"], prot: ["#FF4D8D", "#FF9A6B"], sleep: ["#6E7BFF", "#B08CFF"], train: ["#22D3B5", "#8CF5B8"], mass: ["#3FC1FF", "#8B9CFF"], ok: ["#2FD57C", "#9BF2BF"] };
/** Petit anneau (pas de gros cadran : juste un indicateur) */
export function Ring({ v, max, tone = "fuel", size = 44, sw = 5, children }) {
  const id = useId().replace(/:/g, "");
  const r = (size - sw) / 2, c = 2 * Math.PI * r, f = L.clamp(max > 0 ? v / max : 0, 0, 1);
  const [a, b] = GRAD[tone] || GRAD.fuel;
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={sw} />
        {f > 0 && <circle className="ring-a" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ "--c": c }} />}
      </svg>
      {children && <span className="ring-c">{children}</span>}
    </span>
  );
}

/** Courbe avec aire dégradée. values : nombres (null = trou) */
export function Area({ values, tone = "mass", h = 56, w = 300, goal, bars, min: mn, max: mx, dots, labels }) {
  const id = useId().replace(/:/g, "");
  const [a, b] = GRAD[tone] || GRAD.mass;
  const vs = values.filter((x) => x != null);
  if (!vs.length) return <svg className="area" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" />;
  const lo = mn ?? Math.min(...vs, goal ?? Infinity), hi = mx ?? Math.max(...vs, goal ?? -Infinity);
  const span = hi - lo || 1;
  const X = (i) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
  const Y = (v) => h - 3 - ((v - lo) / span) * (h - 8);
  const defs = <defs><linearGradient id={id + "l"} x1="0" x2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient><linearGradient id={id + "a"} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={b} stopOpacity=".35" /><stop offset="1" stopColor={b} stopOpacity="0" /></linearGradient></defs>;
  if (bars) {
    const bw = w / values.length;
    return (
      <svg className="area" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">{defs}
        {goal != null && <line x1="0" x2={w} y1={Y(goal)} y2={Y(goal)} stroke="rgba(255,255,255,.18)" strokeDasharray="2 4" />}
        {values.map((v, i) => (v == null ? <rect key={i} x={i * bw + bw * 0.18} y={h - 4} width={bw * 0.64} height={3} rx="1.5" fill="rgba(255,255,255,.07)" /> : <rect key={i} x={i * bw + bw * 0.18} y={Y(v)} width={bw * 0.64} height={Math.max(3, h - Y(v))} rx={Math.min(5, bw * 0.3)} fill={typeof bars === "function" ? bars(v) : `url(#${id}l)`} />))}
      </svg>
    );
  }
  const pts = values.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
  const line = pts.map((p) => p.join(",")).join(" ");
  return (
    <svg className="area" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">{defs}
      {goal != null && <line x1="0" x2={w} y1={Y(goal)} y2={Y(goal)} stroke="rgba(255,255,255,.18)" strokeDasharray="2 4" />}
      {pts.length > 1 && <polygon points={`${pts[0][0]},${h} ${line} ${pts[pts.length - 1][0]},${h}`} fill={`url(#${id}a)`} />}
      {pts.length > 1 && <polyline points={line} fill="none" stroke={`url(#${id}l)`} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
      {(dots || pts.length === 1) && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.6 : 2.2} fill={i === pts.length - 1 ? b : "rgba(255,255,255,.55)"} />)}
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="7" fill={b} opacity=".22" />}
    </svg>
  );
}

export const Chip = ({ s, children }) => <span className={"pill " + (s || "")}>{children}</span>;
export const lvl = (x) => (x == null ? "" : x >= 0.95 ? "l3" : x >= 0.8 ? "l2" : "l1");
export const sign = (x, d = 0) => `${x >= 0 ? "+" : "−"}${d ? L.fdec(Math.abs(x), d) : L.fint(Math.abs(x))}`;
export const shortDay = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" })).replace(/\./g, "");
export const greet = (d) => { const h = d.getHours(); return h >= 5 && h < 12 ? "Bonjour" : h >= 12 && h < 18 ? "Bon après-midi" : "Bonsoir"; };
