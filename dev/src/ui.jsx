import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";

export const reduceMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const buzz = (ms = 8) => { try { if (navigator.userActivation?.hasBeenActive && navigator.vibrate) navigator.vibrate(ms); } catch {} };

// ─────────────────────────────────────────────────────────────
// Icônes (traits simples, 24 px)
// ─────────────────────────────────────────────────────────────
const P = {
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></>,
  bowl: <><path d="M3 11.5h18a9 9 0 0 1-18 0Z" /><path d="M9 7.5c0-1.4 1.2-1.6 1.2-3M13.5 7.5c0-1.4 1.2-1.6 1.2-3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  chart: <path d="M4 19.5V12M10 19.5V5.5M16 19.5v-5M3 19.5h18M20 19.5V9" />,
  chat: <path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L4 19.5l1-4.4a8 8 0 1 1 15.5-3.6Z" />,
  sliders: <><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="17" r="2" /></>,
  left: <path d="M15 18l-6-6 6-6" />,
  right: <path d="M9 18l6-6-6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  camera: <><path d="M4 8.5h3l1.8-2.8h6.4L17 8.5h3V19H4Z" /><circle cx="12" cy="13.5" r="3.3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />,
  pen: <path d="M4 20h4L19.5 8.5l-4-4L4 16v4Z" />,
  clip: <><path d="M9 3.5h6v3H9z" /><path d="M7 5H5v15.5h14V5h-2" /><path d="M8.5 11h7M8.5 15h5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  book: <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Zm0 12a3 3 0 0 1 3-3h11" />,
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></>,
  scale: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 10a3.5 3.5 0 0 1 7 0" /><path d="m12 10 1.4-1.8" /></>,
};
export function Icon({ n, size = 22, sw = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
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
export function Count({ v, dec = 0 }) {
  const x = useCount(v);
  return <>{dec ? L.fdec(x, dec) : L.fint(x)}</>;
}

// ─────────────────────────────────────────────────────────────
// Le viseur : 3 anneaux (calories, protéines, sommeil)
// ─────────────────────────────────────────────────────────────
const RINGS = [
  { key: "kcal", r: 108, color: "var(--sun)" },
  { key: "prot", r: 87, color: "var(--flesh)" },
  { key: "sleep", r: 66, color: "var(--moon)" },
];
export function Reticle({ values, children, size = 248, onRing }) {
  const [shown, setShown] = useState(reduceMotion() ? values : { kcal: 0, prot: 0, sleep: 0 });
  useEffect(() => { const id = requestAnimationFrame(() => setShown(values)); return () => cancelAnimationFrame(id); }, [values.kcal, values.prot, values.sleep]);
  const all = values.kcal >= 1 && values.prot >= 1 && values.sleep >= 1;
  const C = 130, sw = 15;
  return (
    <div className={"reticle" + (all ? " bull" : "")} style={{ width: size, height: size }}>
      <svg viewBox="0 0 260 260" width={size} height={size} role="img" aria-label={`Calories ${Math.round(values.kcal * 100)} %, protéines ${Math.round(values.prot * 100)} %, sommeil ${Math.round(values.sleep * 100)} %`}>
        <circle cx={C} cy={C} r="124" fill="none" stroke="var(--line-2)" strokeWidth="1" strokeDasharray="2 6" />
        {[0, 90, 180, 270].map((a) => (
          <line key={a} x1={C} y1="0" x2={C} y2="12" stroke="var(--mu)" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${a} ${C} ${C})`} />
        ))}
        {RINGS.map(({ key, r, color }) => {
          const c = 2 * Math.PI * r, v = Math.min(1, shown[key] || 0);
          return (
            <g key={key} onClick={onRing ? () => onRing(key) : undefined} style={{ cursor: onRing ? "pointer" : "default" }}>
              <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeOpacity=".14" strokeWidth={sw} />
              <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${C} ${C})`}
                className={"ring-arc" + ((values[key] || 0) >= 1 ? " full" : "")} style={{ "--glow": color }} />
            </g>
          );
        })}
      </svg>
      <div className="reticle-center">{children}</div>
    </div>
  );
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
