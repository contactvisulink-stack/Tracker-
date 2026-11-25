// ═════════════════════════════════════════════════════════════
// Aujourd'hui : l'essentiel, et seulement l'essentiel.
// ═════════════════════════════════════════════════════════════
import React from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import * as A from "./actions.js";
import { Icon } from "./ui.jsx";
import { Title, Sec, N, Cap, Ring, Area, Chip, sign, greet } from "./kit.jsx";

const { fint, fdec, fH } = L;
const STC = { ok: "ok", warn: "warn", crit: "crit", idle: "" };

export function Status({ ctx }) {
  const { todayK } = ctx;
  const now = new Date(ctx.now);
  const night = L.store.get("night", null);
  const sys = E.systems(todayK, now);
  const al = E.alerts(todayK, now).filter((a) => a.lv !== "info").slice(0, 2);
  const date = L.cap(L.fmtDay(todayK, { weekday: "long", day: "numeric", month: "long" }));
  return (
    <div className="page">
      <Title ctx={ctx} kicker={date} title={`${greet(now)}, ${(ctx.S.pseudo || "Isma").trim() || "Isma"}`} />
      {night ? <Night ctx={ctx} night={night} now={now} /> : <Hero ctx={ctx} sys={sys} />}
      {!night && <Next ctx={ctx} now={now} />}
      {al.map((a) => (
        <div key={a.id} className={"banner " + a.lv} role="status">
          <span className="banner-ic"><Icon n={a.lv === "crit" ? "flag" : "info"} size={16} /></span>
          <span><b>{a.t}</b><span>{a.s}</span></span>
        </div>
      ))}
      <Protocol ctx={ctx} />
      <div className="tiles">
        <MassTile ctx={ctx} m={sys.mass} />
        <FormTile ctx={ctx} t={sys.train} />
      </div>
    </div>
  );
}

// ── La carte du jour : calories en grand, puis protéines, sommeil, séances
function Hero({ ctx, sys }) {
  const f = sys.fuel, r = sys.rec, t = sys.train;
  const pr = f.proj;
  return (
    <button className="card hero t-fuel" onClick={() => ctx.go("fuel")} aria-label={`Calories : ${fint(f.v)} sur ${fint(f.goal)}. ${f.line}`}>
      <div className="hero-top"><span className="hero-l"><Icon n="flame" size={15} /> Calories</span><Chip s={STC[f.st]}>{f.v >= f.goal ? "Objectif atteint" : f.st === "idle" ? "Début de journée" : `${f.v - f.expected >= 0 ? "En avance" : "En retard"} · ${sign(f.v - f.expected)}`}</Chip></div>
      <div className="hero-n"><b className="grad-fuel"><N v={f.v} /></b><span>/ {fint(f.goal)} kcal</span></div>
      <Cap v={f.v} max={f.goal} mark={f.st !== "idle" && f.v < f.goal ? f.expected : null} proj={pr?.end} h={12} />
      <p className="hero-s">{f.v >= f.goal ? "C'est bon pour aujourd'hui." : pr ? <>À ce rythme, tu finis vers <b>{fint(pr.end)} kcal</b>. Il manque {fint(f.goal - f.v)} kcal.</> : `Il manque ${fint(f.goal - f.v)} kcal.`}</p>
      <div className="minis">
        <span className="mini"><Ring v={f.prot} max={f.protGoal} tone="prot" size={40} sw={4.5} /><span><b>{fint(f.prot)}<small> g</small></b><em>Protéines</em></span></span>
        <span className="mini"><Ring v={r.v || 0} max={r.goal} tone="sleep" size={40} sw={4.5} /><span><b>{r.v != null ? fH(r.v) : "–"}</b><em>Sommeil</em></span></span>
        <span className="mini"><Ring v={t.tr.wk} max={3} tone="train" size={40} sw={4.5} /><span><b>{t.tr.wk}<small> / 3</small></b><em>Séances</em></span></span>
      </div>
    </button>
  );
}

// ── La prochaine action
function Next({ ctx, now }) {
  const { S, todayK } = ctx;
  const a = L.focusActions(todayK, now, S)[0];
  if (!a || ["done", "fed", "chill", "sleeping"].includes(a.id)) return null;
  const fav = (a.id === "eat" || a.id === "prot") && a.target ? L.bestFav(a.target) : null;
  const favOk = fav && Math.abs(L.itemsTot(fav.f.items).k - a.target) < a.target * 0.45;
  const MAP = {
    bed: ["moon", "sleep", "Mode nuit", () => A.startNight(ctx)],
    weigh: ["scale", "mass", "Noter", () => ctx.console("poids ")],
    light: ["sun", "fuel", "Fait", () => A.setHabit(ctx, todayK, "light", true)],
    crea: ["pill", "mass", "Prise", () => A.setHabit(ctx, todayK, "creatine", true)],
    water: ["drop", "mass", "+0,5 L", () => A.addWater(ctx, todayK, 0.5)],
    logNight: ["moon", "sleep", "Noter", () => ctx.open({ type: "sleep", k: todayK })],
    posture: ["posture", "train", "Lancer", () => ctx.open({ type: "posture" })],
    train: ["dumbbell", "train", "Voir", () => ctx.go("sport")],
    photo: ["camera", "prot", "Photo", () => ctx.go("lab")],
    eat: ["fork", "fuel", favOk ? `+ ${fint(fav.k)}` : "Noter", () => (favOk ? A.addItems(ctx, todayK, fav.f.items, fav.f.name) : ctx.console(""))],
    prot: ["bolt", "prot", favOk ? `+ ${fint(fav.k)}` : "Noter", () => (favOk ? A.addItems(ctx, todayK, fav.f.items, fav.f.name) : ctx.console(""))],
  };
  const m = MAP[a.id] || ["spark", "fuel", "OK", () => {}];
  return (
    <div className="card next">
      <span className={"bub t-" + m[1]}><Icon n={m[0]} size={20} /></span>
      <span className="next-tx">
        <span className="next-k">À faire maintenant</span>
        <b>{a.title}</b>
        <span>{favOk ? `${fav.f.name}, en un appui.` : a.text}</span>
      </span>
      <button className="btn" onClick={m[3]}>{m[2]}</button>
    </div>
  );
}

function Night({ ctx, night, now }) {
  const h = (now - new Date(night.bed)) / 3.6e6;
  return (
    <section className="card hero t-sleep" aria-label="Mode nuit">
      <div className="hero-top"><span className="hero-l"><Icon n="moon" size={15} /> Mode nuit depuis {L.hm(night.bed)}</span><Chip>en charge</Chip></div>
      <div className="hero-n"><b className="grad-sleep">{fH(h)}</b><span>/ {fdec(ctx.S.sleep)} h</span></div>
      <Cap v={h} max={ctx.S.sleep} tone="sleep" h={12} />
      <div className="btn-row">
        <button className="btn ghost" onClick={() => { const u = L.snapKey("night"); L.store.del("night"); ctx.say("Mode nuit annulé", { undo: u }); }}>Annuler</button>
        <button className="btn sleep" onClick={() => A.wakeNow(ctx)}><Icon n="sun" size={16} /> Je suis levé</button>
      </div>
    </section>
  );
}

// ── Le protocole : des boutons ronds, un appui
const PIC = { light: "sun", creatine: "pill", minox: "dropper", posture: "posture", spf: "shield" };
function Protocol({ ctx }) {
  const { S, todayK } = ctx;
  const d = L.getDay(todayK);
  const rit = L.activeRituals(S);
  const w = d.water || 0;
  const done = rit.filter((r) => L.ritualDone(r.id, d, S)).length + (w >= S.water ? 1 : 0);
  return (
    <Sec title="Protocole" right={`${done} sur ${rit.length + 1}`}>
      <div className="proto">
        {rit.map((r) => {
          const on = L.ritualDone(r.id, d, S);
          const run = E.habit(r.id, todayK).run;
          return (
            <button key={r.id} className={"tog" + (on ? " on" : "")} aria-pressed={on} onClick={() => (r.id === "posture" && !on ? ctx.open({ type: "posture" }) : A.setHabit(ctx, todayK, r.id))}>
              <span className="tog-c"><Icon n={on ? "check" : PIC[r.id] || "check"} size={on ? 22 : 21} sw={on ? 2.6 : 1.7} /></span>
              <span className="tog-n">{r.label}</span>
              <span className="tog-s">{run > 1 ? `${run} j` : on ? "fait" : "à faire"}</span>
            </button>
          );
        })}
        <button className={"tog water" + (w >= S.water ? " on" : "")} onClick={() => A.addWater(ctx, todayK, 0.5)} aria-label={`Eau : ${fdec(w, 2)} litres sur ${fdec(S.water)}. Ajouter 0,5 L`}>
          <span className="tog-c" style={{ "--fill": `${Math.min(100, (w / S.water) * 100)}%` }}><Icon n={w >= S.water ? "check" : "drop"} size={21} sw={w >= S.water ? 2.6 : 1.7} /></span>
          <span className="tog-n">Eau</span>
          <span className="tog-s">{fdec(w, 1)}/{fdec(S.water, 1)} L</span>
        </button>
      </div>
    </Sec>
  );
}

function MassTile({ ctx, m }) {
  const mt = m.mt;
  return (
    <button className="card tile" onClick={() => ctx.go("lab")} aria-label={`Poids : ${m.line}`}>
      <span className="tile-l">Poids</span>
      <span className="tile-n"><b>{mt ? fdec(mt.latest[1], 1) : "–"}</b><small>kg</small></span>
      <Chip s={mt?.rate == null ? "" : mt.rate >= 0.15 ? "ok" : mt.rate >= 0 ? "warn" : "crit"}>{mt?.rate != null ? `${sign(mt.rate, 2)} kg/sem` : "à peser"}</Chip>
      {mt && mt.list.length >= 2 ? <Area values={mt.list.slice(-10).map(([, v]) => v)} tone="mass" h={40} w={150} /> : <span style={{ height: 40 }} />}
    </button>
  );
}
function FormTile({ ctx, t }) {
  const { tr, rd } = t;
  return (
    <button className="card tile" onClick={() => ctx.go("sport")} aria-label={`Forme ${rd.pct} %. ${t.line}`}>
      <span className="tile-l">Forme</span>
      <span className="tile-n"><b>{rd.pct}</b><small>%</small></span>
      <Chip s={STC[rd.adv.lv]}>{rd.adv.t}</Chip>
      <span className="tile-s">{tr.todayW ? `${tr.todayW.title} faite` : tr.due ? `Séance ${tr.next} aujourd'hui` : `Séance ${tr.next} ensuite`}</span>
      <Cap v={rd.pct} max={100} tone="train" h={6} />
    </button>
  );
}
