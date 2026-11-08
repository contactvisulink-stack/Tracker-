// ═════════════════════════════════════════════════════════════
// Patch 9 « Le Client » : les pièces communes de l'interface.
// En-tête de page, jauges, anneaux de progression, rareté des items.
// Sobre comme un client de jeu : peu de cadres, de l'espace, l'or en accent.
// ═════════════════════════════════════════════════════════════
import React from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { Icon } from "./ui.jsx";
import { Portrait } from "./hud.jsx";

export const pseudoOf = (S) => (S.pseudo || "Isma").trim() || "Isma";

/** En-tête de page : ton médaillon (niveau), le titre, le coach et les runes */
export function TopBar({ ctx, title, sub, extra }) {
  const { S, todayK } = ctx;
  const acc = G.account(todayK);
  const name = pseudoOf(S);
  return (
    <header className="tb">
      <Portrait level={acc.level} pct={acc.need ? acc.into / acc.need : 0} size={40} letter={name[0]} onClick={() => ctx.go("profile")} label={`${name}, niveau ${acc.level}. Voir ton profil.`} />
      <div className="tb-t">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="tb-r">
        {extra}
        <button className="ib" onClick={() => ctx.open({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={20} /></button>
        <button className="ib" onClick={() => ctx.open({ type: "settings" })} aria-label="Runes et réglages"><Icon n="rune" size={20} /></button>
      </div>
    </header>
  );
}

/** Jauge fine. marks : repères (0 à 1), mark : où tu devrais en être */
export function Meter({ v, max, tone = "gold", marks = [], mark, label }) {
  const f = max > 0 ? L.clamp(v / max, 0, 1) : 0;
  return (
    <div className={"mt " + tone} role="img" aria-label={label || `${Math.round(f * 100)} %`}>
      <i className="mt-f" style={{ width: `${(f * 100).toFixed(1)}%` }} />
      {marks.map((m, i) => <i key={i} className="mt-x" style={{ left: `${(L.clamp(m, 0, 1) * 100).toFixed(1)}%` }} />)}
      {mark != null && <i className="mt-m" style={{ left: `${(L.clamp(mark, 0, 1) * 100).toFixed(1)}%` }} />}
    </div>
  );
}

/** Petit anneau de progression (objectif pas encore validé) ou coche (validé) */
export function Status({ done, pct = 0 }) {
  if (done) return <span className="st-ok" aria-hidden="true"><Icon n="check" size={13} sw={2.6} /></span>;
  const r = 9, c = 2 * Math.PI * r, f = L.clamp(pct, 0, 1);
  return (
    <svg className="st-ring" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={r} className="st-tr" />
      {f > 0 && <circle cx="11" cy="11" r={r} className="st-ar" strokeDasharray={c} strokeDashoffset={c * (1 - f)} transform="rotate(-90 11 11)" />}
    </svg>
  );
}

/** Section : un titre discret, du contenu, de l'espace */
export function Sec({ title, right, className = "", children, label }) {
  return (
    <section className={"sec " + className} aria-label={label || (typeof title === "string" ? title : undefined)}>
      {title && <div className="sec-h"><h2>{title}</h2>{right != null && <span className="sec-r">{right}</span>}</div>}
      {children}
    </section>
  );
}

export const itemRarity = G.itemRarity;
