// ─────────────────────────────────────────────────────────────
// Les pièces du jeu : items, emblèmes de rang, boss, portrait,
// barres de PV et de mana, kills, stacks, annonces.
// Tous les dessins sont originaux (SVG), rien n'est copié du jeu.
// ─────────────────────────────────────────────────────────────
import React, { useId, useRef } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { Icon, buzz } from "./ui.jsx";

const uid = () => useId().replace(/[^a-zA-Z0-9]/g, "");
export function shade(hex, f = 0.42) {
  const h = String(hex || "#888888").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

// ═════════════════════════════════════════════════════════════
// Dessins d'items (48 × 48)
// ═════════════════════════════════════════════════════════════
export function ItemArt({ id, color = "#C8AA6E", size = 40, letter = "?" }) {
  const u = uid();
  const A = `url(#a${u})`, B = `url(#b${u})`;
  const ink = "#06101C";
  const rays = (n, r1, r2, w) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), px = -s * w, py = c * w;
    return `M${24 + c * r1 + px},${24 + s * r1 + py} L${24 + c * r2},${24 + s * r2} L${24 + c * r1 - px},${24 + s * r1 - py}Z`;
  }).join(" ");
  const art = {
    creatine: (
      <>
        <path d="M19.5 5.5h9v4.2l-1 1.1v4.4l7 9.4a9.4 9.4 0 0 1-7.6 14.9h-6.6A9.4 9.4 0 0 1 12.6 24.6l7-9.4v-4.4l-1-1.1Z" fill={ink} stroke={A} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M15.3 27.4h17.4l1.3 1.9a6.6 6.6 0 0 1-5.4 10.4h-9.2a6.6 6.6 0 0 1-5.4-10.4Z" fill={A} />
        <path d="M24 15.8l3.4 4.7-3.4 4.8-3.4-4.8Z" fill="#fff" opacity=".92" />
        <circle cx="20" cy="33" r="1.6" fill="#fff" opacity=".7" /><circle cx="27" cy="35.5" r="1.1" fill="#fff" opacity=".55" />
      </>
    ),
    light: (
      <>
        <path d={rays(8, 10.5, 21, 3.1)} fill={A} />
        <circle cx="24" cy="24" r="8.6" fill={A} stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" />
        <circle cx="21.2" cy="21.2" r="2.4" fill="#fff" opacity=".75" />
      </>
    ),
    minox: (
      <>
        <path d="M33.5 5.5a5.6 5.6 0 0 1 5.6 5.6v3.6H27.9v-3.6a5.6 5.6 0 0 1 5.6-5.6Z" fill={A} />
        <path d="M30.6 14.7h5.8v3.2l-1.8 12.6h-2.2l-1.8-12.6Z" fill={ink} stroke={A} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M18 24.5c3.8 4.7 5.7 7.7 5.7 10.3a5.7 5.7 0 0 1-11.4 0c0-2.6 1.9-5.6 5.7-10.3Z" fill={A} />
        <path d="M15.6 34.2a2.4 2.4 0 0 0 2.4 2.4" stroke="#fff" strokeOpacity=".8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    ),
    posture: (
      <>
        <path d="M24 3v42" stroke={color} strokeOpacity=".35" strokeWidth="1.4" strokeDasharray="2 3" />
        <circle cx="24" cy="9.5" r="4.6" fill={A} />
        <path d="M24 15.5v15" stroke={A} strokeWidth="4.4" strokeLinecap="round" />
        <path d="M14.5 18.6h19" stroke={A} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M24 30.5l-5.2 12.5M24 30.5l5.2 12.5" stroke={A} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M37.5 16.5l3.5-3.5 3.5 3.5M41 13v12" stroke="#fff" strokeOpacity=".85" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    spf: (
      <>
        <path d="M24 4.5 39.5 10v10.8c0 9.2-6.6 16-15.5 18.7C15.1 36.8 8.5 30 8.5 20.8V10Z" fill={A} stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" />
        <circle cx="24" cy="20.5" r="5" fill={ink} />
        <path d={rays(8, 7.4, 11, 1.4)} fill={ink} transform="translate(0 -3.5)" />
      </>
    ),
    water: (
      <>
        <path d="M20 4.5h8M21 4.5v8.6a12.6 12.6 0 1 0 6 0V4.5" fill={ink} stroke={A} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M13.3 27.5h21.4a10.8 10.8 0 0 1-21.4 0Z" fill={A} />
        <circle cx="19.5" cy="32" r="1.7" fill="#fff" opacity=".7" /><circle cx="26" cy="35" r="1.2" fill="#fff" opacity=".55" /><circle cx="24.5" cy="22.5" r="1" fill={color} />
      </>
    ),
    weigh: (
      <>
        <path d="M24 25v19" stroke={A} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M18 44h12" stroke={A} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M6.5 15.5S13 6.5 24 6.5s17.5 9 17.5 9-6.5 9-17.5 9-17.5-9-17.5-9Z" fill={A} />
        <circle cx="24" cy="15.5" r="5.2" fill={ink} /><circle cx="22.4" cy="13.8" r="1.6" fill="#fff" />
      </>
    ),
    rune: (
      <>
        <path d="M24 4 41.5 14v20L24 44 6.5 34V14Z" fill={A} stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" />
        <path d="M24 9.5 36.8 16.8v14.4L24 38.5 11.2 31.2V16.8Z" fill={ink} opacity=".82" />
        <text x="24" y="30.6" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize="16" fill={color}>{String(letter || "?").slice(0, 1).toUpperCase()}</text>
      </>
    ),
  };
  return (
    <svg className="iart" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={"a" + u} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" /><stop offset=".38" stopColor={color} /><stop offset="1" stopColor={shade(color)} /></linearGradient>
        <radialGradient id={"b" + u} cx=".5" cy=".42" r=".6"><stop offset="0" stopColor={color} stopOpacity=".5" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill={B} />
      {art[id] || art.rune}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Emblème de rang (un blason par palier, plus orné en montant)
// ═════════════════════════════════════════════════════════════
export function Emblem({ tier = 0, size = 56, dim }) {
  const u = uid();
  const T = G.TIERS[Math.max(0, Math.min(9, tier))];
  const shield = "M50 9 L79 22 L79 50 C79 70 67 83 50 92 C33 83 21 70 21 50 L21 22 Z";
  const wingS = "M23 33 C11 31 5 41 6 55 C11 49 16 47 23 50 Z";
  const wingL = "M23 27 C6 21 -2 39 1 62 C8 51 15 48 23 52 Z M23 47 C12 48 6 57 7 69 C12 61 17 58 23 60 Z";
  const wing = tier >= 5 ? wingL : wingS;
  return (
    <svg className={"emblem" + (dim ? " dim" : "")} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={"f" + u} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={T.c1} /><stop offset="1" stopColor={T.c2} /></linearGradient>
        <linearGradient id={"g" + u} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F7EFDC" /><stop offset=".45" stopColor="#C8AA6E" /><stop offset="1" stopColor="#4A3516" /></linearGradient>
        <radialGradient id={"h" + u} cx=".5" cy=".3" r=".7"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".35" stopColor={T.c1} /><stop offset="1" stopColor={T.c2} /></radialGradient>
      </defs>
      {tier === 9 && <g opacity=".75">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 50 L48 2 L52 2 Z" fill={T.c1} transform={`rotate(${i * 30} 50 50)`} />)}</g>}
      {tier >= 2 && (
        <g fill={`url(#f${u})`} stroke={`url(#g${u})`} strokeWidth="1.6" strokeLinejoin="round">
          <path d={wing} />
          <path d={wing} transform="translate(100 0) scale(-1 1)" />
        </g>
      )}
      {tier >= 7 && <path d="M33 17 L36 4 L43 13 L50 1 L57 13 L64 4 L67 17 Z" fill={`url(#g${u})`} stroke="#2A1D08" strokeWidth="1" />}
      <path d={shield} fill="#071220" stroke={`url(#g${u})`} strokeWidth="4.5" strokeLinejoin="round" />
      <path d={shield} fill={`url(#f${u})`} transform="translate(50 51) scale(.76) translate(-50 -51)" />
      <path d="M50 22 L66 30 L66 50 C66 63 59 71 50 77 C41 71 34 63 34 50 L34 30 Z" fill="#000" opacity=".22" />
      <path d="M50 31 L62 50 L50 71 L38 50 Z" fill={`url(#h${u})`} stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="1.2" />
      <path d="M50 31 L56 50 L50 71" fill="#FFFFFF" opacity=".16" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Les boss de la semaine (masques originaux)
// ═════════════════════════════════════════════════════════════
export function BossArt({ id = "meta", size = 64, dead }) {
  const u = uid();
  const eye = { meta: "#FF8A3D", estomac: "#7CFFB2", flemme: "#B9A6FF", veilleur: "#FFE27A" }[id] || "#FF5A6E";
  const feat = {
    meta: (
      <>
        <path d="M30 16 C33 6 39 9 40 2 C45 9 47 4 50 0 C53 4 55 9 60 2 C61 9 67 6 70 16 Z" fill="#FF7A3D" opacity=".9" />
        <path d="M32 46 L44 50 L32 52 Z M68 46 L56 50 L68 52 Z" fill={eye} />
        <path d="M34 66 L40 61 L45 67 L50 61 L55 67 L60 61 L66 66 L60 72 L40 72 Z" fill="#FF7A3D" opacity=".85" />
      </>
    ),
    estomac: (
      <>
        <circle cx="38" cy="47" r="5" fill={eye} /><circle cx="62" cy="47" r="5" fill={eye} />
        <path d="M34 67 H66" stroke="#E8D9C2" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M38 62 V72 M44 62 V72 M50 62 V72 M56 62 V72 M62 62 V72" stroke="#E8D9C2" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    flemme: (
      <>
        <path d="M30 48 C33 43 43 43 46 48 Z M54 48 C57 43 67 43 70 48 Z" fill={eye} />
        <path d="M30 47 C34 51 42 51 46 47 M54 47 C58 51 66 51 70 47" stroke="#0A0306" strokeWidth="3" fill="none" />
        <path d="M40 68 C44 64 48 72 52 67 C55 64 58 69 61 67" stroke={eye} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <text x="72" y="30" fontFamily="Cinzel, serif" fontWeight="900" fontSize="11" fill={eye} opacity=".85">z</text>
      </>
    ),
    veilleur: (
      <>
        <circle cx="38" cy="47" r="9" fill="#120509" stroke={eye} strokeWidth="2.4" /><circle cx="62" cy="47" r="9" fill="#120509" stroke={eye} strokeWidth="2.4" />
        <circle cx="38" cy="47" r="4" fill={eye} /><circle cx="62" cy="47" r="4" fill={eye} />
        <path d="M46 60 L50 68 L54 60 Z" fill={eye} />
        <path d="M54 22 A8 8 0 1 1 46 30 A6 6 0 1 0 54 22 Z" fill={eye} opacity=".85" />
      </>
    ),
  };
  return (
    <svg className={"bossart" + (dead ? " dead" : "")} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={"s" + u} cx=".5" cy=".35" r=".7"><stop offset="0" stopColor="#4A1220" /><stop offset="1" stopColor="#12050A" /></radialGradient>
        <linearGradient id={"r" + u} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF6B7D" /><stop offset="1" stopColor="#7A1424" /></linearGradient>
      </defs>
      <path d="M26 34 C14 26 10 13 14 4 C20 15 28 21 36 25 Z" fill={`url(#r${u})`} />
      <path d="M74 34 C86 26 90 13 86 4 C80 15 72 21 64 25 Z" fill={`url(#r${u})`} />
      <path d="M50 16 C74 16 86 33 86 53 C86 75 70 91 50 91 C30 91 14 75 14 53 C14 33 26 16 50 16 Z" fill={`url(#s${u})`} stroke={`url(#r${u})`} strokeWidth="3" />
      {feat[id] || feat.meta}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Portrait du champion : anneau d'XP de la partie et niveau
// ═════════════════════════════════════════════════════════════
export function Portrait({ level, pct, size = 62, letter = "I", onClick, label }) {
  const r = size / 2 - 3.5, c = 2 * Math.PI * r;
  return (
    <button className="portrait" style={{ width: size, height: size }} onClick={onClick} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="pt-track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="pt-xp" strokeDasharray={c} strokeDashoffset={c * (1 - L.clamp(pct, 0, 1))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="pt-in"><span className="pt-l">{letter}</span></span>
      <span className="pt-lvl">{level}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════
// Barres de jeu (PV, mana, boss, XP, LP)
// ═════════════════════════════════════════════════════════════
export function GBar({ kind, v, max, text, ic, onClick, label, ticks = 10 }) {
  const pct = max > 0 ? L.clamp(v / max, 0, 1) : 0;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={"gbar " + kind} onClick={onClick} aria-label={label || text}>
      {ic && <span className="gbar-ic"><Icon n={ic} size={14} sw={2.2} /></span>}
      <span className="gbar-track" style={{ "--ticks": ticks }}>
        <i className="gbar-fill" style={{ width: `${pct * 100}%` }} />
        <span className="gbar-t">{text}</span>
      </span>
    </Tag>
  );
}

// ═════════════════════════════════════════════════════════════
// Kills (hexagones) et petits points de kills
// ═════════════════════════════════════════════════════════════
export function KillHex({ k, done, pct = 0, onClick, val }) {
  return (
    <button className={"khex" + (done ? " on" : "")} onClick={onClick} aria-label={`${k.n} : ${done ? "fait" : val || "à faire"}`}>
      <span className="khex-b">
        <span className="khex-in">
          <i className="khex-fill" style={{ height: `${(done ? 1 : L.clamp(pct, 0, 1)) * 100}%` }} />
          <Icon n={k.ic} size={21} sw={2} />
        </span>
      </span>
      <span className="khex-l">{k.n}</span>
      {val && <span className="khex-v">{val}</span>}
    </button>
  );
}
export function KillDots({ kill }) {
  return <span className="kdots" aria-hidden="true">{G.KILLS.map((k) => <i key={k.id} className={kill[k.id] ? "on" : ""} />)}</span>;
}
export function Grade({ g, size }) {
  const cls = { "S+": "sp", S: "s", A: "a", B: "b", C: "c", D: "d" }[g] || "d";
  return <span className={"grade g-" + cls + (size ? " " + size : "")} aria-label={`Note ${g}`}>{g}</span>;
}

// ═════════════════════════════════════════════════════════════
// Emplacement d'item : appui = fait / pas fait, appui long = fiche
// ═════════════════════════════════════════════════════════════
export function useHold(onHold, onTap, ms = 430) {
  const t = useRef(null), start = useRef(null), held = useRef(false);
  const clear = () => { clearTimeout(t.current); t.current = null; };
  return {
    onPointerDown: (e) => {
      held.current = false; start.current = { x: e.clientX, y: e.clientY }; clear();
      if (onHold) t.current = setTimeout(() => { held.current = true; t.current = null; buzz(12); onHold(); }, ms);
    },
    onPointerMove: (e) => { if (start.current && (Math.abs(e.clientX - start.current.x) > 9 || Math.abs(e.clientY - start.current.y) > 9)) { clear(); start.current = null; } },
    onPointerUp: clear,
    onPointerCancel: () => { clear(); start.current = null; },
    onPointerLeave: clear,
    onClick: (e) => { if (held.current) { held.current = false; e.preventDefault(); return; } onTap && onTap(); },
    onContextMenu: (e) => e.preventDefault(),
  };
}
export function ItemSlot({ r, st, onTap, onHold, sub, count, big }) {
  const h = useHold(onHold, onTap);
  const n = count ?? st.s;
  return (
    <button className={"islot" + (st.done ? " on" : "") + (st.risk ? " risk" : "") + (big ? " big" : "")} style={{ "--ic": r.color }} {...h}
      aria-label={`${r.label}${st.done ? ", fait aujourd'hui" : ", à faire"}${st.s ? `, ${st.s} stack${st.s > 1 ? "s" : ""}` : ""}. Appui long pour la fiche.`}>
      <span className="islot-f"><span className="islot-in"><ItemArt id={r.art || r.id} color={r.color} size={big ? 46 : 36} letter={r.label} /></span></span>
      {n !== "" && n != null && n !== 0 && <span className="islot-n">{n}</span>}
      {st.risk && <span className="islot-pip" aria-hidden="true">!</span>}
      <span className="islot-l">{sub ?? r.label}</span>
    </button>
  );
}

/** Grille de stacks (comme dans la vidéo : des croix quand tu en perds) */
export function StackGrid({ s, max = G.STACK_MAX, lost = 0, cols = 7 }) {
  return (
    <div className="sgrid" style={{ "--cols": cols }} role="img" aria-label={`${s} stacks sur ${max}`}>
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < s ? "on" + (i === s - 1 ? " last" : "") : i < s + lost ? "lost" : ""} />)}
    </div>
  );
}

/** Petite pièce d'or pour les chiffres de calories */
export function Coin({ size = 16 }) {
  const u = uid();
  return (
    <svg className="coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={"c" + u} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1C4" /><stop offset=".5" stopColor="#E0B85C" /><stop offset="1" stopColor="#8A6420" /></linearGradient></defs>
      <circle cx="12" cy="12" r="10" fill={`url(#c${u})`} stroke="#5A3F12" strokeWidth="1" />
      <path d="M12 6.6 15.8 12 12 17.4 8.2 12Z" fill="#7A5518" opacity=".85" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Les annonces plein écran (kills, boss, promotion, niveau…)
// ═════════════════════════════════════════════════════════════
export function Announcer({ a }) {
  if (!a) return null;
  return (
    <div key={a.id} className={"ann t-" + (a.tone || "gold") + (a.big ? " big" : "")} role="status" aria-live="polite">
      <div className="ann-glow" aria-hidden="true" />
      {a.art && <div className="ann-art">{a.art}</div>}
      {a.kicker && <div className="ann-k">{a.kicker}</div>}
      <div className="ann-row">
        <span className="ann-wing" aria-hidden="true" />
        <div className="ann-t">{a.t}</div>
        <span className="ann-wing r" aria-hidden="true" />
      </div>
      {a.s && <div className="ann-s">{a.s}</div>}
    </div>
  );
}
