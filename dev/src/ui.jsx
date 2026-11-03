import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";

export const reduceMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const buzz = (ms = 8) => { try { if (navigator.userActivation?.hasBeenActive && navigator.vibrate) navigator.vibrate(ms); } catch {} };

// ─────────────────────────────────────────────────────────────
// Icônes au trait (24 px) : géométrie nette, angles vifs, bouts carrés
// ─────────────────────────────────────────────────────────────
const ng = (cx, cy, r, n, rot) => Array.from({ length: n }, (_, i) => { const a = rot + (i * 2 * Math.PI) / n; return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`; });
const oct = (cx, cy, r) => "M" + ng(cx, cy, r, 8, Math.PI / 8).join(" ") + "Z";
const ray = (cx, cy, n, r1, r2s) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n, r2 = r2s[i % r2s.length]; return `M${(cx + r1 * Math.cos(a)).toFixed(2)} ${(cy + r1 * Math.sin(a)).toFixed(2)}L${(cx + r2 * Math.cos(a)).toFixed(2)} ${(cy + r2 * Math.sin(a)).toFixed(2)}`; }).join("");
const STAR = "M" + Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4.2 : 9.8; return `${(12 + r * Math.cos(a)).toFixed(2)},${(12.6 + r * Math.sin(a)).toFixed(2)}`; }).join(" ") + "Z";
const P = {
  target: <><path d={oct(12, 12, 8)} /><path d={oct(12, 12, 4)} /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></>,
  bowl: <><path d="M3 11.5h18l-2.6 6.6-3.4 2.4H9l-3.4-2.4Z" /><path d="M9 7.5c0-1.4 1.2-1.6 1.2-3M13.5 7.5c0-1.4 1.2-1.6 1.2-3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  chart: <path d="M4 19.5V12M10 19.5V5.5M16 19.5v-5M3 19.5h18M20 19.5V9" />,
  chat: <path d="M3.5 4.5h17v11.4h-8.7L7 19.8v-3.9H3.5Z" />,
  sliders: <><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" /><path d="M13 5h4v4h-4ZM7 10h4v4H7ZM15 15h4v4h-4Z" /></>,
  left: <path d="M15 18l-6-6 6-6" />,
  right: <path d="M9 18l6-6-6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  camera: <><path d="M3.6 7.8h3.6l1.8-2.8h6l1.8 2.8h3.6v11.4H3.6Z" /><path d={oct(12, 13.4, 3.4)} /></>,
  search: <><path d={oct(10.8, 10.8, 6.6)} /><path d="m20.4 20.4-4.8-4.8" /></>,
  star: <path d={STAR} />,
  pen: <path d="M4 20h4L19.5 8.5l-4-4L4 16v4Z" />,
  clip: <><path d="M9 3.5h6v3H9z" /><path d="M7 5H5v15.5h14V5h-2" /><path d="M8.5 11h7M8.5 15h5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  book: <path d="M5 4.5h11.5L19 7v12.5H7.5L5 17Zm0 12.5h14" />,
  home: <path d="M3.5 10.2 12 3.6l8.5 6.6v10.2h-5.6v-5.8H9.1v5.8H3.5Z" />,
  scale: <><path d="M4 4h16v16H4Z" /><path d="M8.5 10.5 12 7l3.5 3.5M12 7v5" /></>,
  sun: <><path d={oct(12, 12, 4)} /><path d={ray(12, 12, 8, 6.6, [10.2, 9])} /></>,
  moon: <path d="M20.4 15.1A8.6 8.6 0 1 1 9.6 3.4a7 7 0 0 0 10.8 11.7Z" />,
  drop: <path d="M12 3 18.2 12.6v3.5L15 20.6H9l-3.2-4.5v-3.5Z" />,
  pill: <><path d="M14.2 3.6 20.4 9.8 9.8 20.4 3.6 14.2Z" /><path d="m8.9 8.9 6.2 6.2" /></>,
  dropper: <><path d="m14.2 5.6 4.2 4.2" /><path d="M16.3 7.7 8.6 15.4l-2.9.8.8-2.9 7.7-7.7" /><path d="m15.4 4.4 1.6-1.6 4.2 4.2-1.6 1.6" /><path d="M4.6 18 6 20.2 4.6 21.6 3.2 20.2Z" /></>,
  posture: <><path d="M12 1.8 14 3.8 12 5.8 10 3.8Z" /><path d="M12 6.6v15M7.8 9.4h8.4M8.6 13h6.8M9.4 16.6h5.2M10.2 20.2h3.6" /></>,
  shield: <><path d="M12 2.6 19.6 5.6v7.4L12 21.4 4.4 13V5.6Z" /><path d="M12 8.4v6.2M8.9 11.5h6.2" /></>,
  flame: <path d="M12 1.8 16.8 8.2l-.9 3.2 2.9-1.6 1.1 5.2-2.8 5L12 22.2l-5.1-2.2-2.8-5 2.1-5.6 2.4 2.5-.6-5.3Z" />,
  spark: <path d="M12 2.4 14 10l7.6 2-7.6 2L12 21.6 10 14l-7.6-2L10 10Z" />,
  fork: <><path d="M7 3.5v7.2a2.3 2.3 0 0 0 4.6 0V3.5M9.3 3.5v17" /><path d="M16.8 20.5V3.5c-2 1.2-3 3.6-3 6.7v3.3h3" /></>,
  bolt: <path d="M14.6 2 4.6 13.4h6.3l-1.7 8.6 10.2-11.9h-6.5Z" />,
  undo: <path d="M9 7.5 4.5 12 9 16.5M5 12h9.5a5 5 0 0 1 0 10H12" />,
  play: <path d="M8 5.6v12.8L18.6 12Z" fill="currentColor" />,
  // ── Jeu
  coin: <><path d={oct(12, 12, 9)} /><path d="M12 8 16 12 12 16 8 12Z" /></>,
  heart: <path d="M12 20.6 3.2 11.8V7.4l4.2-4.2L12 7.8l4.6-4.6 4.2 4.2v4.4Z" />,
  crystal: <path d="M12 2.4 19 8.4 12 21.6 5 8.4Z M5 8.4h14M9.4 8.4 12 2.4l2.6 6M9.4 8.4 12 21.6l2.6-13.2" />,
  sword: <path d="M20.6 3.4 9.6 14.4M20.6 3.4h-4.2M20.6 3.4v4.2M6.6 11.6l5.8 5.8M8.4 15.6l-4.6 4.6" />,
  crown: <path d="M3 7.5l4.6 4.6L12 4l4.4 8.1L21 7.5l-1.8 10.5H4.8ZM4.8 21h14.4" />,
  trophy: <path d="M7 3h10v5.4l-2.6 4-1.7.8v3.2l3 3v2.6H8.3v-2.6l3-3v-3.2l-1.7-.8L7 8.4ZM7 4.6H3.6v2.8L7 10.2M17 4.6h3.4v2.8L17 10.2" />,
  scroll: <><path d="M6.5 3.8h11L19.7 6v1.1h-4.4" /><path d="M15.3 6v12.4l-2 1.8H5.6l-2-1.8v-1.3h9.5" /><path d="M6.5 3.8 4.3 6v11M8.4 9h4M8.4 12.6h4" /></>,
  eye: <path d="M2 12l5-5.8h10l5 5.8-5 5.8H7ZM12 9l3 3-3 3-3-3Z" />,
  potion: <path d="M9.4 2.4h5.2M10.4 2.4v5.9l-5.6 7.3v3.3l3.2 3.3h8l3.2-3.3v-3.3l-5.6-7.3V2.4M6 15.4h12" />,
  hourglass: <path d="M5 2.6h14M5 21.4h14M6.6 2.6v2l5.4 7.4-5.4 7.4v2M17.4 2.6v2L12 12l5.4 7.4v2" />,
  rune: <><path d="M12 2.6 20.2 7.3v9.4L12 21.4l-8.2-4.7V7.3Z" /><path d="M12 7v10M8.4 9.5l7.2 5M15.6 9.5l-7.2 5" /></>,
  recall: <path d="M12 3.4a8.6 8.6 0 0 1 8.1 5.6M12 20.6a8.6 8.6 0 0 1-8.1-5.6M17.4 9.6h3.4V6.2M6.6 14.4H3.2v3.4M12 9.2l2.8 2.8-2.8 2.8-2.8-2.8Z" />,
  lock: <path d="M5 10.6h14v10.2H5ZM8.4 10.6V7.6a3.6 3.6 0 0 1 7.2 0v3" />,
  info: <path d="M12 2.6 21.4 12 12 21.4 2.6 12ZM12 10.8v5.2M12 7.6v.8" />,
  flag: <path d="M5.6 21.4V2.8M5.6 3.6h12.6l-2.8 4.3 2.8 4.3H5.6" />,
  map: <><path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5Z" /><path d="M9 4v13.5M15 6.5V20" /></>,
  user: <path d="M12 3.2 15.4 6.6 12 10l-3.4-3.4ZM4.6 20.8l2.4-7h10l2.4 7Z" />,
  swords: <path d="M3.6 3.6 15 15M12.6 17.4l4.8-4.8M15 15l4.8 4.8M20.4 3.6 9 15M6.6 12.6l4.8 4.8M9 15l-4.8 4.8" />,
};
export function Icon({ n, size = 22, sw = 1.7, style }) {
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit="6" aria-hidden="true" style={style}>
      {P[n]}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Chiffres qui défilent
// ─────────────────────────────────────────────────────────────
export function useCount(target, dur = 750, from0 = true) {
  const [v, setV] = useState(from0 && !reduceMotion() ? 0 : target);
  const cur = useRef(from0 ? 0 : target);
  useEffect(() => {
    if (reduceMotion()) { setV(target); cur.current = target; return; }
    const from = cur.current, to = target;
    if (Math.abs(from - to) < 0.5) { setV(to); cur.current = to; return; }
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * e;
      cur.current = val; setV(val);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
export function Count({ v, dec = 0, from0 = true }) {
  const x = useCount(v, 750, from0);
  return <>{dec ? L.fdec(x, dec) : L.fint(x)}</>;
}

/** Mini viseur pour la semaine */
export function MiniTarget({ values, size = 34, today }) {
  const C = 20;
  const rr = [{ r: 16, c: "var(--sun)", v: values.kcal }, { r: 11, c: "var(--flesh)", v: values.prot }, { r: 6, c: "var(--moon)", v: values.sleep }];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {rr.map((x, i) => {
        const c = 2 * Math.PI * x.r;
        return (
          <g key={i}>
            <circle cx={C} cy={C} r={x.r} fill="none" stroke={x.c} strokeOpacity={today ? ".22" : ".12"} strokeWidth="4" />
            <circle cx={C} cy={C} r={x.r} fill="none" stroke={x.c} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, x.v || 0))} transform={`rotate(-90 ${C} ${C})`} />
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Barre avec repère « où tu devrais en être »
// ─────────────────────────────────────────────────────────────
export function PaceBar({ value, goal, expected, color, label, unit }) {
  const pct = Math.min(1, value / goal), mark = expected != null ? Math.min(1, expected / goal) : null;
  return (
    <div className="pbar">
      <div className="pbar-top">
        <span>{label}</span>
        <span className="pbar-val"><b><Count v={value} /></b> / {L.fint(goal)} {unit}</span>
      </div>
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width: `${pct * 100}%`, background: color }} />
        {mark != null && mark > 0.02 && <div className="pbar-mark" style={{ left: `${mark * 100}%` }} title="Où tu devrais en être maintenant" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Panneau qui monte du bas (se ferme en glissant vers le bas)
// ─────────────────────────────────────────────────────────────
export function Sheet({ title, onClose, children, footer, tall }) {
  const [dy, setDy] = useState(0);
  const start = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, []);
  const ts = (e) => { start.current = e.touches[0].clientY; };
  const tm = (e) => { if (start.current == null) return; setDy(Math.max(0, e.touches[0].clientY - start.current)); };
  const te = () => { if (dy > 90) onClose(); setDy(0); start.current = null; };
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className={"sheet" + (tall ? " tall" : "")} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}>
        <div className="sheet-head" onTouchStart={ts} onTouchMove={tm} onTouchEnd={te}>
          <div className="handle" />
          <div className="sheet-title">{title}</div>
          <button className="round-btn" onClick={onClose} aria-label="Fermer"><Icon n="close" size={18} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Confettis (seulement pour les vrais moments)
// ─────────────────────────────────────────────────────────────
export function Confetti({ burst }) {
  const [parts, setParts] = useState([]);
  useEffect(() => {
    if (!burst || reduceMotion()) return;
    const colors = ["var(--sun)", "var(--flesh)", "var(--moon)", "#fff4d6"];
    const n = burst.big ? 46 : 22;
    setParts(Array.from({ length: n }, (_, i) => ({
      id: burst.id + "-" + i, c: colors[i % colors.length],
      x: (Math.random() - 0.5) * (burst.big ? 360 : 220), y: -120 - Math.random() * (burst.big ? 260 : 160),
      r: Math.random() * 720 - 360, d: 0.9 + Math.random() * 0.8, w: 5 + Math.random() * 6,
    })));
    const id = setTimeout(() => setParts([]), 2000);
    return () => clearTimeout(id);
  }, [burst?.id]);
  if (!parts.length) return null;
  return (
    <div className="confetti" style={{ left: burst.x, top: burst.y }} aria-hidden="true">
      {parts.map((p) => <i key={p.id} style={{ background: p.c, width: p.w, height: p.w * 0.45, "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, animationDuration: `${p.d + 0.5}s` }} />)}
    </div>
  );
}

export function Spinner() { return <span className="spinner" />; }
export function Empty({ title, text, children }) {
  return <div className="empty"><div className="empty-t">{title}</div>{text && <div className="muted">{text}</div>}{children}</div>;
}

/** Saisie de grammes */
export function GramInput({ value, onChange, unit = "g" }) {
  const [s, setS] = useState(value == null ? "" : String(value));
  useEffect(() => { if (L.num(s) !== value) setS(value == null ? "" : String(value)); }, [value]);
  return (
    <label className="gram">
      <input inputMode="decimal" value={s} placeholder="?" aria-label="grammes" onFocus={(e) => e.target.select()}
        onChange={(e) => { setS(e.target.value); onChange(L.num(e.target.value)); }} />
      {unit && <span>{unit}</span>}
    </label>
  );
}
