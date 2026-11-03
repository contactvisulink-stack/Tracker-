// ─────────────────────────────────────────────────────────────
// Fiches du jeu : item (façon boutique), codex, notes de patch, boss
// ─────────────────────────────────────────────────────────────
import React, { useState } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import * as A from "./actions.js";
import { CODEX, PATCH, patchCount } from "./content.js";
import { Sheet, Icon } from "./ui.jsx";
import { ItemArt, StackGrid, BossArt, GBar } from "./hud.jsx";

const { fint, fdec } = L;

export const WATER = { id: "water", label: "Eau", ic: "drop", hint: "0,5 L par appui", color: "#4FB6FF" };
const INFO = {
  creatine: { type: "Item à stacks", stat: (st) => `+${Math.round((20 * st.s) / G.STACK_MAX)} mana max`, max: "+20 mana max à 28 stacks", pn: "Réservoir", passive: "Chaque jour pris donne 1 stack, jusqu'à 28. Chaque jour raté en retire 1.", effect: "À 28 stacks, ta mana max monte de 20 % : une ou deux reps de plus sur tes séries lourdes.", codex: "creatine" },
  light: { type: "Item à stacks", stat: () => "+50 XP par jour", pn: "Vision", passive: "10 minutes dehors dans l'heure qui suit ton réveil.", effect: "Ton horloge avance : le soir, la fatigue arrive plus tôt.", codex: "lumiere" },
  minox: { type: "Item à stacks", stat: () => "+50 XP par jour", pn: "Pousse lente", passive: "Une application par jour, barbe et moustache.", effect: "Les effets se voient au bout de plusieurs mois, et seulement si tu stackes tous les jours." },
  posture: { type: "Item à stacks", stat: () => "Kill de séance les jours sans salle", pn: "Dos droit", passive: "5 exercices d'une minute, à la maison, sans matériel.", effect: "Tes épaules reviennent en arrière au bout de quelques semaines." },
  spf: { type: "Item à stacks", stat: () => "+50 XP par jour", pn: "Bouclier solaire", passive: "La crème le matin, même quand il fait gris.", effect: "Les UV abîment la peau toute l'année, même à travers les nuages." },
  water: { type: "Consommable", stat: (st, S) => `Objectif ${fdec(S.water)} L par jour`, pn: "Potion", passive: "Chaque appui = 0,5 L.", effect: "La créatine fait entrer l'eau dans tes muscles : sans potions, tu perds de la force.", codex: "eau" },
};
const info = (r) => INFO[r.id] || { type: "Item à stacks, forgé par toi", stat: () => "+50 XP par jour", pn: r.label, passive: r.hint || "Ton item perso : un appui par jour quand c'est fait.", effect: "Comme tous les items à stacks : chaque jour compte." };

export function ItemSheet({ ctx, id }) {
  const { S, todayK } = ctx;
  const r = id === "water" ? WATER : L.allRituals(S).find((x) => x.id === id);
  if (!r) return null;
  const st = G.stacks(id, todayK);
  const inf = info(r);
  const d = L.getDay(todayK);
  const codex = inf.codex && CODEX.find((c) => c.id === inf.codex);
  const act = () => {
    if (id === "posture") return ctx.open({ type: "posture" });
    if (id === "water") return A.addWater(ctx, todayK, 0.5);
    if (id === "creatine" && d.entries.some((e) => e.items.some((i) => i.fid === "creatine")) && !d.h.creatine) return ctx.say("Créatine déjà comptée dans ton shaker");
    A.toggleHabit(ctx, todayK, id, r.label);
  };
  const btn = id === "posture" ? (st.done ? "Refaire la routine" : "Lancer la routine") : id === "water" ? `+0,5 L (${fdec(d.water || 0)} L bus)` : st.done ? "Annuler pour aujourd'hui" : "Fait aujourd'hui";
  return (
    <Sheet title="Fiche d'item" onClose={ctx.close}
      footer={<div className="cta-row">
        {codex && <button className="cta ghost shrink" onClick={() => ctx.open({ type: "codex", focus: codex.id })}>Codex</button>}
        <button className={"cta " + (st.done && id !== "water" && id !== "posture" ? "ghost" : "sun")} onClick={act}>{btn}</button>
      </div>}>
      <div className="tip">
        <div className="tip-h">
          <span className="tip-slot" style={{ "--ic": r.color }}><ItemArt id={r.art || r.id} color={r.color} size={54} letter={r.label} /></span>
          <span className="tip-n"><b>{r.label}</b><small>{inf.type}</small></span>
          {id !== "water" && <span className="tip-s"><b>{st.s}</b><small>stacks</small></span>}
        </div>
        <div className="tip-stats">
          <span>{inf.stat(st, S)}</span>
          {inf.max && <span className="dim">{inf.max}</span>}
        </div>
        <p className="tip-p"><b>Passif : {inf.pn}.</b> {inf.passive}</p>
        <p className="tip-p">{inf.effect}</p>
        {id !== "water" && (
          <>
            <StackGrid s={st.s} lost={st.lost7} cols={14} />
            <div className="tip-meta">
              <span>Série en cours <b>{st.run} j</b></span>
              <span>Meilleure série <b>{st.bestRun} j</b></span>
              {st.risk && <span className="warn">Pas fait aujourd'hui : tu perds 1 stack ce soir</span>}
            </div>
          </>
        )}
        <div className="tip-days" aria-label="Les 14 derniers jours">
          {st.grid.map((g) => <i key={g.k} className={g.done ? "on" : g.pending ? "pend" : ""} title={L.fmtDay(g.k, { day: "numeric", month: "short" })} />)}
        </div>
        <p className="hint">Sur l'accueil : un appui coche ou décoche, un appui long ouvre cette fiche.</p>
      </div>
    </Sheet>
  );
}

/** Le codex : la vidéo, appliquée à tout le reste */
export function CodexSheet({ ctx, focus }) {
  const [open, setOpen] = useState(focus || CODEX[0].id);
  return (
    <Sheet title="Codex" onClose={ctx.close} tall>
      <p className="muted mb10">Comment marche ton corps, expliqué en LoL. Chaque fiche part d'une analogie, puis te dit ce qui se passe en vrai.</p>
      <div className="cdx">
        {CODEX.map((c) => {
          const on = open === c.id;
          return (
            <div key={c.id} className={"cdx-c" + (on ? " on" : "")}>
              <button className="cdx-h" onClick={() => setOpen(on ? null : c.id)} aria-expanded={on}>
                <span className="cdx-ic"><Icon n={c.ic} size={19} sw={1.9} /></span>
                <span className="cdx-n">{c.n}</span>
                <Icon n="chevron" size={17} />
              </button>
              {on && (
                <div className="cdx-b">
                  <p className="cdx-lol">{c.lol}</p>
                  <ul className="cdx-l">{c.lines.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  {c.stacks && <p className="cdx-st"><b>Les stacks.</b> {c.stacks}</p>}
                  <div className="cdx-real"><span>En vrai</span><p>{c.real}</p></div>
                  {c.you && <div className="cdx-you"><span>Pour toi</span><p>{c.you(ctx.S)}</p></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

const TAG = { NOUVEAU: "new", BUFF: "buff", REFONTE: "rework", AJUSTEMENT: "adj" };
function PatchBody({ P, sub }) {
  return (
    <>
      <div className={"patch-h" + (sub ? " sub" : "")}>
        {sub && <span className="patch-v">Patch {P.v}</span>}
        <h3>{P.n}</h3>
        <span>{P.date}, {patchCount(P)} changements</span>
      </div>
      <p className="patch-i">{P.intro}</p>
      {P.sections.map((s) => (
        <section key={s.t} className="patch-s">
          <h4>{s.t}</h4>
          {s.items.map(([tag, txt], i) => (
            <div key={i} className="patch-row"><span className={"ptg " + TAG[tag]}>{tag.toLowerCase()}</span><span>{txt}</span></div>
          ))}
        </section>
      ))}
    </>
  );
}
export function PatchSheet({ ctx }) {
  return (
    <Sheet title={`Patch ${PATCH.v}`} onClose={ctx.close} tall>
      <PatchBody P={PATCH} />
      {PATCH.prev && <PatchBody P={PATCH.prev} sub />}
    </Sheet>
  );
}

export function BossSheet({ ctx }) {
  const { S, todayK } = ctx;
  const b = G.boss(todayK);
  const max = Math.max(S.kcal * 1.2, ...b.per.map((p) => p.v || 0));
  return (
    <Sheet title="Boss de la semaine" onClose={ctx.close}>
      <div className="bs-h">
        <BossArt id={b.id} size={86} dead={b.dead} />
        <div>
          <h3 className="bs-n">{b.n}</h3>
          <p className="muted small">{b.lore}</p>
        </div>
      </div>
      <GBar kind="boss" v={b.left} max={b.hp} text={b.dead ? "Vaincu" : `${fint(b.left)} / ${fint(b.hp)} PV`} ticks={7} />
      <p className="bs-w">{b.weak}</p>
      <div className="bs-days" aria-label="Dégâts par jour">
        {b.per.map((p) => {
          const day = L.keyToDate(p.k).toLocaleDateString("fr-FR", { weekday: "narrow" });
          return (
            <div key={p.k} className={"bs-d" + (p.k === todayK ? " today" : "") + (p.v == null ? " fut" : "")}>
              <span className="bs-bar"><i style={{ height: `${p.v != null ? Math.max(3, (p.v / max) * 100) : 0}%` }} className={p.v != null && p.v >= S.kcal ? "ok" : ""} /></span>
              <span className="bs-l">{day}</span>
            </div>
          );
        })}
      </div>
      <p className="hint">{b.dead ? `Vaincu ${L.fmtDay(b.deadAt, { weekday: "long" })}. Tout ce que tu farmes en plus cette semaine, c'est du bonus.` : `PV = 7 jours de ton objectif. Chaque kcal lui retire 1 PV. Il te faut ${fint(b.need)} kcal par jour d'ici dimanche${b.enraged ? " : il est enragé, c'est serré." : "."}`}</p>
    </Sheet>
  );
}
