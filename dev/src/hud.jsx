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

// Les dessins (items, emblèmes, boss, pièce, glyphes) sont dans glyphs.jsx
export { ItemArt, Emblem, BossArt, Coin, Glyph } from "./glyphs.jsx";
import { Glyph, ItemArt } from "./glyphs.jsx";

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
      {ic && <span className="gbar-ic"><Glyph n={ic} size={15} fallback={<Icon n={ic} size={14} sw={2.2} />} /></span>}
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
export function KillCard({ k, done, pct = 0, onClick, val, mini }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={"kcard k-" + k.id + (done ? " on" : "") + (mini ? " mini" : "")} style={{ "--kp": done ? 1 : L.clamp(pct, 0, 1) }} onClick={onClick} aria-label={`${k.n} : ${done ? "fait" : val || "à faire"}`}>
      <span className="kcard-f">
        <i className="kcard-fill" />
        <span className="kcard-ic"><Glyph n={k.ic} size={mini ? 18 : 24} /></span>
        {val && <span className="kcard-v">{val}</span>}
      </span>
      <span className="kcard-n">{k.n}</span>
    </Tag>
  );
}
export const KillHex = (p) => <KillCard {...p} mini />;
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
  const rar = G.itemRarity(st.s || 0);
  return (
    <button className={"islot r-" + rar.id + (st.done ? " on" : "") + (st.risk ? " risk" : "") + (big ? " big" : "")} style={{ "--ic": r.color, "--rc": rar.c }} {...h}
      aria-label={`${r.label}${st.done ? ", fait aujourd'hui" : ", à faire"}${st.s ? `, ${st.s} stack${st.s > 1 ? "s" : ""}, ${rar.n.toLowerCase()}` : ""}. Appui long pour la fiche.`}>
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

// ═════════════════════════════════════════════════════════════
// Les annonces plein écran (kills, boss, promotion, niveau…)
// ═════════════════════════════════════════════════════════════
export function Announcer({ a }) {
  if (!a) return null;
  return (
    <div key={a.id} className={"ann t-" + (a.tone || "gold") + (a.big ? " big" : "")} role="status" aria-live="polite">
      <div className="ann-band" aria-hidden="true" />
      {a.art && <div className="ann-art">{a.art}</div>}
      {a.kicker && <div className="ann-k">{a.kicker}</div>}
      <div className="ann-t">{a.t}</div>
      {a.s && <div className="ann-s">{a.s}</div>}
    </div>
  );
}
