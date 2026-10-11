import React, { useState, useEffect } from "react";
import * as L from "./lib.js";
import * as A from "./actions.js";
import { Icon, Count, reduceMotion } from "./ui.jsx";

const { fint, fdec, fH } = L;

/** Salutation de l'en-tête (accueil) */
export function greeting(now, night) {
  const h = now.getHours();
  if (night) return (now - new Date(night.bed)) / 3.6e6 >= 3 ? "Bonjour" : "Bonne nuit";
  return h >= 5 && h < 12 ? "Bonjour" : h >= 12 && h < 18 ? "Bon après-midi" : h >= 18 && h < 23 ? "Bonsoir" : "Il est tard";
}

export function Home({ ctx }) {
  const d = L.getDay(ctx.todayK);
  const night = L.store.get("night", null);
  const plan = L.getPlan(ctx.todayK);
  return (
    <div className={"page home" + (night ? " at-night" : "")}>
      <Dial ctx={ctx} d={d} night={night} />
      <Readouts ctx={ctx} d={d} night={night} />
      <NowCard ctx={ctx} d={d} night={night} />
      {!night && (
        <>
          {plan && <PlanCard ctx={ctx} plan={plan} />}
          <Rituals ctx={ctx} d={d} />
          {!plan && <CoachBar ctx={ctx} />}
          <WeekMatrix ctx={ctx} />
          <Trajectory ctx={ctx} />
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Le cadran : ta journée sur 24 h (minuit en haut)
//  · couronne : nuit, repas, séance, maintenant, coucher visé
//  · anneau : calories, un segment par repas, et le repère « où tu devrais en être »
//  · anneau fin : protéines
// À l'ouverture de l'app, il s'allume comme un tableau de bord.
// ═════════════════════════════════════════════════════════════
const C = 160;
const R = { tickOut: 155, lane: 139, num: 124, kcal: 104, prot: 87.5 };
const rad = (a) => (a * Math.PI) / 180;
const P = (a, r) => [C + r * Math.sin(rad(a)), C - r * Math.cos(rad(a))];
const f1 = (n) => Math.round(n * 10) / 10;
function arc(a0, a1, r) {
  const sw = a1 - a0;
  if (sw <= 0.05) return "";
  if (sw >= 359.95) {
    const [x0, y0] = P(a0, r), [x1, y1] = P(a0 + 180, r);
    return `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 1 1 ${f1(x1)} ${f1(y1)}A${r} ${r} 0 1 1 ${f1(x0)} ${f1(y0)}`;
  }
  const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r);
  return `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 ${sw > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
}
const minA = (m) => (m / 1440) * 360;
const span = (from, to) => { const a0 = minA(from); let a1 = minA(to); if (a1 <= a0) a1 += 360; return [a0, a1]; };
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A1 = hex(a), B1 = hex(b); return `rgb(${A1.map((v, i) => Math.round(v + (B1[i] - v) * t)).join(",")})`; };

let ignited = false; // une seule fois par ouverture de l'app
function useIgnition(ms = 1250) {
  const [t, setT] = useState(() => (ignited || reduceMotion() ? 1 : 0));
  useEffect(() => {
    ignited = true;
    if (t >= 1) return;
    const t0 = performance.now();
    let raf;
    const step = (x) => { const v = Math.min(1, (x - t0) / ms); setT(v); if (v < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

const TICKS = Array.from({ length: 96 }, (_, i) => {
  const kind = i % 24 === 0 ? 4 : i % 12 === 0 ? 3 : i % 4 === 0 ? 2 : 1;
  return { a: i * 3.75, r0: [0, 151.5, 148.5, 145.5, 142][kind], op: [0, 0.16, 0.34, 0.55, 0.95][kind], w: kind === 4 ? 1.8 : kind >= 2 ? 1.3 : 1 };
});
const NUMS = [["00", 0], ["06", 90], ["12", 180], ["18", 270]];

function Dial({ ctx, d, night }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const t = useIgnition();
  const [from0] = useState(t < 1);
  const D = L.dialData(todayK, now, S);
  const tk = D.t.k || D.legacy;
  const tickP = ease(t / 0.55), handP = ease(t / 0.7), ringP = ease((t - 0.15) / 0.85);
  const nowA = minA(D.now);
  const handA = nowA * handP;

  // calories : un segment par repas (dégradé du bleu du matin au violet du soir)
  const segs = [];
  let acc = 0;
  const parts = D.meals.length ? D.meals : D.legacy ? [{ k: D.legacy }] : [];
  parts.forEach((m, i) => {
    const sw = (m.k / S.kcal) * 360;
    if (sw <= 0 || acc >= 360) return;
    const a0 = acc, a1 = Math.min(360, acc + sw);
    acc = a1;
    segs.push({ a0, a1, c: mix("#4F8DFF", "#A274FF", parts.length > 1 ? i / (parts.length - 1) : 0) });
  });
  const shown = acc * ringP;
  const gap = segs.length > 1 ? 1.6 : 0;
  const ghostA = D.expected != null && !night && D.frac > 0.03 ? Math.min(359, (D.expected / S.kcal) * 360) : null;
  const protA = Math.min(1, D.t.p / S.prot) * 360 * ringP;

  // couronne
  const sleep = D.sleep && !night ? span(D.sleep.from, D.sleep.to) : null;
  const nightArc = night ? span(D.night.from, D.now) : null;
  const awake = !night && D.wakeAt != null ? span(D.wakeAt, D.now) : null;
  const toBed = !night ? span(D.now, D.bed) : null;
  const showToBed = toBed && toBed[1] - toBed[0] < 220;
  const train = D.train ? [minA(D.train.from), minA(D.train.from + D.train.len)] : null;
  const moon = !night ? P(minA(D.bed), R.lane) : null;

  // centre
  let chip = null;
  if (!night) {
    if (tk >= S.kcal) chip = { cls: "ok", txt: tk - S.kcal >= 50 ? `+${fint(tk - S.kcal)} au-dessus` : "Objectif atteint" };
    else if (ghostA == null) chip = { cls: "", txt: `${fint(S.kcal - tk)} à manger` };
    else {
      const diff = tk - D.expected;
      chip = diff >= 120 ? { cls: "ok", txt: `+${fint(diff)} d'avance` } : diff <= -150 ? { cls: "late", txt: `−${fint(-diff)} de retard` } : { cls: "", txt: "Dans le rythme" };
    }
  }
  const nightH = night ? (now - new Date(night.bed)) / 3.6e6 : 0;
  const label = night
    ? `Nuit en cours depuis ${L.hm(night.bed)}`
    : `Calories : ${fint(tk)} sur ${fint(S.kcal)}. Protéines : ${fint(D.t.p)} grammes. Touche pour voir ta journée.`;

  return (
    <button className={"dial" + (night ? " night" : "") + (t < 1 ? " booting" : "")} onClick={() => (night ? null : ctx.go("food"))} aria-label={label}>
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <defs>
          <radialGradient id="dFace" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#16204A" stopOpacity=".55" />
            <stop offset="70%" stopColor="#0A0F26" stopOpacity=".7" />
            <stop offset="100%" stopColor="#060918" stopOpacity=".85" />
          </radialGradient>
          <linearGradient id="dBezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".075" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity=".02" />
          </linearGradient>
          <linearGradient id="dSleep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7E62FF" />
            <stop offset="100%" stopColor="#C3A8FF" />
          </linearGradient>
          <filter id="dGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" /></filter>
          <mask id="dMoon"><rect width="320" height="320" fill="#fff" />{moon && <circle cx={moon[0] + 2.6} cy={moon[1] - 2} r="4.6" fill="#000" />}</mask>
        </defs>

        <circle cx={C} cy={C} r="146" fill="none" stroke="url(#dBezel)" strokeWidth="20" />
        <circle cx={C} cy={C} r="135.5" fill="url(#dFace)" stroke="rgba(255,255,255,.06)" />
        {TICKS.map((k, i) => {
          const lit = i / 96 <= tickP ? 1 : 0.12;
          const [x0, y0] = P(k.a, k.r0), [x1, y1] = P(k.a, R.tickOut);
          return <line key={i} x1={f1(x0)} y1={f1(y0)} x2={f1(x1)} y2={f1(y1)} stroke="#DCE4FF" strokeOpacity={k.op * lit} strokeWidth={k.w} strokeLinecap="round" />;
        })}
        {NUMS.map(([n, a]) => { const [x, y] = P(a, R.num); return <text key={n} x={f1(x)} y={f1(y)} className="d-num" textAnchor="middle" dominantBaseline="central" opacity={tickP}>{n}</text>; })}

        {/* couronne : la journée */}
        <circle cx={C} cy={C} r={R.lane} fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="6" />
        {awake && <path d={arc(awake[0], awake[0] + (awake[1] - awake[0]) * handP, R.lane)} fill="none" stroke="rgba(220,228,255,.16)" strokeWidth="6" />}
        {showToBed && <path d={arc(toBed[0], toBed[1], R.lane)} fill="none" stroke="#A88BFF" strokeOpacity=".55" strokeWidth="2" strokeDasharray="1.5 4.5" strokeLinecap="round" opacity={handP} />}
        {sleep && <path d={arc(sleep[0], sleep[0] + (sleep[1] - sleep[0]) * ringP, R.lane)} fill="none" stroke="url(#dSleep)" strokeWidth="6" strokeLinecap="round" />}
        {nightArc && <path className="d-nightarc" d={arc(nightArc[0], nightArc[1], R.lane)} fill="none" stroke="url(#dSleep)" strokeWidth="6" strokeLinecap="round" />}
        {train && <path d={arc(train[0], train[1], R.lane)} fill="none" stroke="#FF8A3D" strokeWidth="6" strokeLinecap="round" opacity={ringP} />}
        {D.planned.map((m, i) => { const [x, y] = P(minA(m.at), R.lane); return <circle key={"p" + i} cx={f1(x)} cy={f1(y)} r="3.6" fill="#060918" stroke="#8FB4FF" strokeWidth="1.4" opacity={ringP} />; })}
        {D.meals.map((m, i) => {
          const [x, y] = P(minA(m.at), R.lane);
          return <circle key={"m" + i} cx={f1(x)} cy={f1(y)} r={f1(2.8 + Math.min(3.2, m.k / 300))} fill={segs[i]?.c || "#4F8DFF"} stroke="#050817" strokeWidth="1.6" opacity={ringP} />;
        })}
        {moon && <circle cx={f1(moon[0])} cy={f1(moon[1])} r="5.4" fill="#B9A2FF" mask="url(#dMoon)" opacity={handP} />}

        {/* aiguille : maintenant */}
        {(() => {
          const [x0, y0] = P(handA, 131.5), [x1, y1] = P(handA, 146.5), [tx, ty] = P(handA, 156);
          const [la, lb] = [P(handA - 2.4, 160.5), P(handA + 2.4, 160.5)];
          return (
            <g className="d-hand">
              <line x1={f1(x0)} y1={f1(y0)} x2={f1(x1)} y2={f1(y1)} stroke="#fff" strokeWidth="5" strokeOpacity=".35" filter="url(#dGlow)" />
              <line x1={f1(x0)} y1={f1(y0)} x2={f1(x1)} y2={f1(y1)} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d={`M${f1(tx)} ${f1(ty)}L${f1(la[0])} ${f1(la[1])}L${f1(lb[0])} ${f1(lb[1])}Z`} fill="#fff" />
            </g>
          );
        })()}

        {/* calories */}
        <g className="d-core">
        <circle cx={C} cy={C} r={R.kcal} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="13" />
        {ghostA != null && acc < ghostA && <path d={arc(acc, ghostA, R.kcal)} fill="none" stroke="#FFB547" strokeOpacity=".16" strokeWidth="13" opacity={ringP} />}
        <g filter="url(#dGlow)" opacity=".55">
          {segs.map((s, i) => { const a1 = Math.min(s.a1, shown); return a1 > s.a0 && <path key={i} d={arc(s.a0, Math.max(s.a0, a1 - (s.a1 <= shown && i < segs.length - 1 ? gap : 0)), R.kcal)} fill="none" stroke={s.c} strokeWidth="13" />; })}
        </g>
        {segs.map((s, i) => { const a1 = Math.min(s.a1, shown); return a1 > s.a0 && <path key={i} d={arc(s.a0, Math.max(s.a0, a1 - (s.a1 <= shown && i < segs.length - 1 ? gap : 0)), R.kcal)} fill="none" stroke={s.c} strokeWidth="13" />; })}
        {ghostA != null && (() => {
          const [x0, y0] = P(ghostA, 93), [x1, y1] = P(ghostA, 115);
          return <line x1={f1(x0)} y1={f1(y0)} x2={f1(x1)} y2={f1(y1)} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity={ringP} className="d-ghost" />;
        })()}

        {/* protéines */}
        <circle cx={C} cy={C} r={R.prot} fill="none" stroke="rgba(255,138,61,.12)" strokeWidth="3.5" />
        {protA > 0.5 && <path d={arc(0, protA, R.prot)} fill="none" stroke="#FF8A3D" strokeOpacity=".9" strokeWidth="3.5" strokeLinecap="round" />}
        </g>
      </svg>

      <div className="d-center">
        {night ? (
          <>
            <span className="d-k">Nuit en cours</span>
            <span className="d-big">{fH(nightH)}</span>
            <span className="d-sub">depuis {L.hm(night.bed)}</span>
          </>
        ) : (
          <>
            <span className="d-big"><Count v={tk} from0={from0} /></span>
            <span className="d-sub">sur {fint(S.kcal)} kcal</span>
            {chip && <span className={"d-chip " + chip.cls}>{chip.txt}</span>}
          </>
        )}
      </div>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════
// Trois lectures sous le cadran
// ═════════════════════════════════════════════════════════════
function Readouts({ ctx, d, night }) {
  const { S, todayK } = ctx;
  const t = L.dayTot(d);
  const h = L.daySleepH(d);
  const bt = L.bedTarget(todayK);
  const tr = L.trainingStatus(todayK);
  const nextDay = tr.wk >= 3 ? "lundi" : tr.moved === "tomorrow" || !tr.due ? "demain" : "aujourd'hui";
  const sess = tr.todayW
    ? { v: tr.todayW.session || "✓", s: "faite", done: true }
    : tr.due ? { v: tr.next, s: "aujourd'hui", hot: true }
    : { v: tr.wk >= 3 ? "Repos" : tr.next, s: tr.wk >= 3 ? "semaine bouclée" : nextDay };
  const openSleep = () => (night ? null : ctx.open({ type: "sleep", k: todayK }));
  return (
    <div className="ro">
      <button className="ro-i c-prot" onClick={() => ctx.go("food")}>
        <span className="ro-l">Protéines</span>
        <span className="ro-v"><Count v={t.p} from0={false} /><small> g</small></span>
        <span className="ro-s">{t.p >= S.prot ? "objectif atteint" : `sur ${S.prot} g`}</span>
      </button>
      <button className="ro-i c-moon" onClick={openSleep}>
        <span className="ro-l">Nuit</span>
        <span className="ro-v">{night ? L.hm(night.bed) : h != null ? fH(h) : "–"}</span>
        <span className="ro-s">{night ? "téléphone posé" : `coucher ${L.hFr(bt.min)}`}</span>
      </button>
      <button className="ro-i c-train" onClick={() => ctx.go("sport")}>
        <span className="ro-l">Séance <span className="ro-pips" aria-label={`${tr.wk} séances sur 3 cette semaine`}>{[0, 1, 2].map((i) => <i key={i} className={i < tr.wk ? "on" : ""} />)}</span></span>
        <span className={"ro-v" + (sess.hot ? " hot" : "")}>{sess.v}{sess.done && <Icon n="check" size={15} sw={3} />}</span>
        <span className="ro-s">{sess.s}</span>
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Maintenant : la prochaine chose à faire, en un appui
// ═════════════════════════════════════════════════════════════
const ACT_IC = { wake: "sun", sleeping: "moon", bed: "moon", weigh: "scale", light: "sun", logNight: "moon", eat: "fork", prot: "bolt", train: "dumbbell", crea: "pill", water: "drop", done: "spark", fed: "flame", chill: "spark" };
const RITUAL_ACTS = new Set(["light", "crea", "water"]);
const DEMOTE = new Set(["crea", "water"]); // déjà dans les rituels, juste en dessous
const QUIET = new Set(["chill", "done", "fed", "sleeping"]);
function NowCard({ ctx, d, night }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const acts = L.focusActions(todayK, now, S);
  const p = L.pace(todayK, now, S);
  const late = !night && L.isLate(todayK, now);
  const mealTarget = L.clamp(p.perMeal, 350, 1100);
  const canEat = !night && !late && p.remaining > 250;
  let main = acts.find((a) => !DEMOTE.has(a.id) && !QUIET.has(a.id)) || null;
  if (!main && !night && !late) {
    const nm = L.nowDayMin(now);
    const pm = L.plannedMeals(todayK).find((m) => !m.done && m.at >= nm - 90);
    if (pm) main = { id: "eat", tone: "sun", title: `${pm.label}, prévu à ${pm.time.replace(":", "\u00a0h\u00a0")}`, text: pm.idea ? `${pm.idea}, environ ${fint(pm.kcal)} kcal.` : `Vise environ ${fint(pm.kcal)} kcal.`, target: pm.kcal };
  }
  if (!main && canEat) main = { id: "eat", tone: "sun", title: "Prochain repas", text: `Vise environ ${fint(Math.round(mealTarget / 50) * 50)} kcal.`, target: mealTarget };
  if (!main) main = acts.find((a) => DEMOTE.has(a.id)) || acts[0];
  if (!main) return null;
  const fav = main.id === "eat" && canEat ? L.bestFav(main.target ?? mealTarget) : null;
  const shaker = L.quickShaker(), shTot = L.itemsTot(shaker);
  const run = {
    wake: () => A.wakeNow(ctx),
    bed: () => A.startNight(ctx),
    weigh: () => ctx.go("progress", undefined, "weight"),
    light: () => A.toggleHabit(ctx, todayK, "light", "Lumière du jour"),
    logNight: () => ctx.open({ type: "sleep", k: todayK }),
    prot: () => A.addItems(ctx, todayK, shaker, "Shaker"),
    train: () => ctx.go("sport"),
    crea: () => A.toggleHabit(ctx, todayK, "creatine", "Créatine"),
    water: () => A.addWater(ctx, todayK, 0.5),
    eat: () => ctx.open({ type: "add", k: todayK }),
  };
  const BTN = { wake: "Je suis levé", bed: "Je pose le téléphone", weigh: "Noter mon poids", light: "C'est fait", logNight: "Noter ma nuit", prot: `Shaker whey + lait, +${fint(shTot.p)} g`, train: "Voir mes charges", crea: "C'est fait", water: "+0,5 L d'eau", eat: "Noter un repas" };
  const next = acts.filter((a) => a !== main && a.id !== main.id && !RITUAL_ACTS.has(a.id) && !QUIET.has(a.id) && run[a.id]).slice(0, 2);
  const cancelNight = () => { const u = L.snapKey("night"); L.store.del("night"); ctx.say("Nuit annulée", { undo: u }); };
  const tone = main.tone || "sun";
  return (
    <section className={`now t-${tone}` + (QUIET.has(main.id) ? " quiet" : "")}>
      <div className="now-h">
        <span className="now-ic"><Icon n={ACT_IC[main.id] || "spark"} size={20} sw={2} /></span>
        <div className="now-tx">
          <h2 className="now-t">{main.title}</h2>
          {main.text && <p className="now-s">{main.text}</p>}
        </div>
      </div>
      {fav ? (
        <div className="now-act col">
          <button className="now-fav" onClick={() => A.addItems(ctx, todayK, fav.f.items, fav.f.name)} aria-label={`Ajouter ${fav.f.name}, ${fint(fav.k)} kcal`}>
            <span className="nf-tx"><span className="nf-n">{fav.f.name}</span><span className="nf-k">{fint(fav.k)} kcal, ajouté en un appui</span></span>
            <span className="nf-plus"><Icon n="plus" size={18} sw={2.6} /></span>
          </button>
          <button className="now-alt" onClick={run.eat}><Icon n="pen" size={14} sw={2} /> Autre repas</button>
        </div>
      ) : main.id === "sleeping" ? (
        <div className="now-act"><button className="now-btn ghost" onClick={cancelNight}>Annuler, je ne dors pas encore</button></div>
      ) : run[main.id] ? (
        <div className="now-act"><button className={"now-btn" + (main.id === "bed" || main.id === "wake" ? " moon" : "")} onClick={run[main.id]}>{(main.id === "bed" || main.id === "wake") && <Icon n={main.id === "bed" ? "moon" : "sun"} size={18} sw={2} />}{BTN[main.id]}</button></div>
      ) : null}
      {next.length > 0 && (
        <div className="now-next">
          <span className="now-nl">Ensuite</span>
          {next.map((a) => <button key={a.id} className="nx" onClick={run[a.id]}><Icon n={ACT_IC[a.id]} size={14} sw={2} />{a.title}</button>)}
        </div>
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Plan du coach (quand ta journée a été réorganisée)
// ═════════════════════════════════════════════════════════════
const TRAIN_TXT = { today: "Séance aujourd'hui", tomorrow: "Séance décalée à demain", rest: "Repos aujourd'hui" };
function PlanCard({ ctx, plan }) {
  const k = ctx.todayK;
  const meals = L.plannedMeals(k);
  const nm = L.nowDayMin(new Date(ctx.now));
  const bt = L.bedTarget(k);
  const reset = () => { const undo = L.snapKey("plan:" + k); L.setPlan(k, null); ctx.say("Retour au plan normal", { undo }); };
  return (
    <section className="card plan">
      <div className="sec-h"><h2>Ta journée, réorganisée</h2><span className="sec-r"><Icon n="spark" size={13} sw={2} /> Coach</span></div>
      {plan.summary && <p className="plan-sum">{plan.summary}</p>}
      <div className="plan-tags">
        {plan.bedtime && <span className="ptag moon"><Icon n="moon" size={13} sw={2} /> Coucher vers {L.hFr(bt.min)}</span>}
        {TRAIN_TXT[plan.training] && <span className="ptag"><Icon n="dumbbell" size={13} sw={2} /> {TRAIN_TXT[plan.training]}</span>}
      </div>
      {meals.length > 0 && (
        <div className="plan-meals">
          {meals.map((m, i) => {
            const past = !m.done && nm > m.at + 90, cur = !m.done && nm >= m.at - 30 && nm <= m.at + 90;
            return (
              <div key={i} className={"pm" + (m.done ? " done" : "") + (cur ? " now" : "") + (past ? " past" : "")}>
                <span className="pm-t">{m.time}</span>
                <span className="pm-dot" />
                <span className="pm-main"><span className="pm-l">{m.label}</span>{m.idea && <span className="pm-i">{m.idea}</span>}</span>
                <span className="pm-k">{m.done ? <Icon n="check" size={15} sw={2.6} /> : `~${fint(m.kcal)}`}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="plan-btns">
        <button className="pill-btn" onClick={() => ctx.open({ type: "coach" })}>Changer encore</button>
        <button className="pill-btn ghost" onClick={reset}>Revenir au plan normal</button>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Rituels : un appui chacun, avec ta série de jours
// ═════════════════════════════════════════════════════════════
function WaterRing({ v }) {
  const r = 25, c = 2 * Math.PI * r;
  return (
    <svg className="rit-ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(79,182,255,.16)" strokeWidth="2.5" />
      {v > 0 && <circle cx="28" cy="28" r={r} fill="none" stroke="#4FB6FF" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 28 28)" />}
    </svg>
  );
}
function Rituals({ ctx, d }) {
  const { S, todayK } = ctx;
  const list = L.activeRituals(S);
  if (!list.length) return null;
  const doneN = list.filter((r) => L.ritualDone(r.id, d, S)).length;
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const tap = (r) => {
    if (r.id === "water") return A.addWater(ctx, todayK, 0.5);
    if (r.id === "creatine" && autoCrea && !d.h.creatine) return ctx.say("Créatine déjà comptée dans ton shaker");
    A.toggleHabit(ctx, todayK, r.id, r.label);
  };
  return (
    <section className="rits" aria-label="Rituels du jour">
      <div className="sec-h"><h2>Rituels</h2><span className="sec-r"><b>{doneN}/{list.length}</b> aujourd'hui</span></div>
      <div className="rit-row">
        {list.map((r) => {
          const on = L.ritualDone(r.id, d, S);
          const st = L.ritualStreak(r.id, todayK, S);
          const w = r.id === "water" ? Math.min(1, (d.water || 0) / S.water) : null;
          return (
            <button key={r.id} className={"rit" + (on ? " on" : "") + (r.id === "water" ? " water" : "")} style={{ "--rc": r.color }} onClick={() => tap(r)} aria-pressed={on}
              aria-label={`${r.label}${r.id === "water" ? ` : ${fdec(d.water || 0)} litre sur ${fdec(S.water)}` : on ? ", fait" : ""}${st >= 2 ? `, ${st} jours d'affilée` : ""}`}>
              <span className="rit-c">
                {w != null && <WaterRing v={w} />}
                <Icon n={r.ic} size={22} sw={1.9} />
                {st >= 2 && <span className={"rit-s" + (on ? "" : " risk")} title={on ? `${st} jours d'affilée` : `${st} jours d'affilée : fais-le aujourd'hui pour garder ta série`}>{st} j</span>}
              </span>
              <span className="rit-l">{r.id === "water" ? `${fdec(d.water || 0)} L` : r.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Barre du coach : « ta journée change ? »
// ═════════════════════════════════════════════════════════════
const CHIPS = ["Ce soir je sors", "Je bosse ce soir", "Je me suis levé tard", "J'ai pas faim", "Pas de salle aujourd'hui"];
function CoachBar({ ctx }) {
  const [txt, setTxt] = useState("");
  const ask = (m) => { const q = (m ?? txt).trim(); if (!q) return; setTxt(""); ctx.open({ type: "coach", ask: q }); };
  return (
    <section className="cbar">
      <div className="cbar-in">
        <span className="cbar-ic"><Icon n="spark" size={17} sw={1.9} /></span>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ta journée change ?" aria-label="Message au coach" enterKeyHint="send" />
        <button className="cbar-go" onClick={() => ask()} disabled={!txt.trim()} aria-label="Envoyer"><Icon n="right" size={18} sw={2.4} /></button>
      </div>
      <div className="cbar-chips">
        {CHIPS.map((c) => <button key={c} className="chip" onClick={() => ask(c)}>{c}</button>)}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Ta semaine en matrice : une ligne par objectif, une colonne par jour
// ═════════════════════════════════════════════════════════════
const ROWS = [
  { id: "kcal", l: "Calories", c: "#4F8DFF" },
  { id: "prot", l: "Protéines", c: "#FF8A3D" },
  { id: "sleep", l: "Sommeil", c: "#A88BFF" },
  { id: "train", l: "Séance", c: "#3ED2F2" },
  { id: "rit", l: "Rituels", c: "#5BE7A9" },
];
const lvl = (v) => (v == null ? 0 : v >= 1 ? 4 : v >= 0.85 ? 3 : v >= 0.6 ? 2 : v > 0 ? 1 : 0);
const pctTxt = (v) => (v == null ? "rien" : `${Math.round(v * 100)} %`);
function WeekMatrix({ ctx }) {
  const { S, todayK } = ctx;
  const cols = L.weekMatrix(todayK, S);
  const a = L.weekAverages(todayK, S);
  return (
    <section className="card wm">
      <div className="sec-h"><h2>Ta semaine</h2><span className="sec-r"><b>{Math.round(a.score * 100)} %</b> de régularité</span></div>
      <div className="wm-body">
        <div className="wm-labels" aria-hidden="true">
          <span className="wm-d" />
          {ROWS.map((r) => <span key={r.id} className="wm-l">{r.l}</span>)}
        </div>
        {cols.map((c) => {
          const day = L.keyToDate(c.k);
          return (
            <button key={c.k} className={"wm-col" + (c.today ? " today" : "") + (c.future ? " fut" : "")} disabled={c.future} onClick={() => ctx.go("food", c.k)}
              aria-label={`${L.fmtDay(c.k, { weekday: "long" })} : calories ${pctTxt(c.kcal)}, protéines ${pctTxt(c.prot)}, sommeil ${pctTxt(c.sleep)}${c.train ? ", séance faite" : ""}`}>
              <span className="wm-d">{day.toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
              {ROWS.map((r) => <span key={r.id} className={"wm-c " + (c.future ? "lf" : "l" + lvl(c[r.id]))} style={{ "--c": r.c }} />)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Trajectoire : ton poids, ton rythme et le prochain palier
// ═════════════════════════════════════════════════════════════
function Spark({ list, rate, milestone }) {
  const W = 300, H = 84, pad = 8;
  const last = list[list.length - 1];
  const t0 = L.keyToDate(list[0][0]).getTime(), tl = L.keyToDate(last[0]).getTime();
  const mT = milestone ? L.keyToDate(milestone.k).getTime() : null;
  let ahead = rate != null ? 42 : 0;
  if (mT && (mT - tl) / 864e5 <= 84) ahead = Math.max(ahead, (mT - tl) / 864e5 + 6);
  const tEnd = tl + ahead * 864e5;
  const proj = rate != null ? last[1] + (rate * ahead) / 7 : last[1];
  const showM = mT && mT <= tEnd;
  const vals = [...list.map(([, v]) => v), proj, ...(showM ? [milestone.w] : [])];
  const lo = Math.min(...vals) - 0.3, hi = Math.max(...vals) + 0.3;
  const xT = (ms) => pad + ((ms - t0) / (tEnd - t0 || 1)) * (W - 2 * pad);
  const y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad - 12);
  const pts = list.map(([k, v]) => [xT(L.keyToDate(k).getTime()), y(v)]);
  const lx = pts[pts.length - 1];
  const m = showM ? [xT(mT), y(milestone.w)] : null;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id="spA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3ED2F2" stopOpacity=".3" /><stop offset="100%" stopColor="#3ED2F2" stopOpacity="0" /></linearGradient>
        <linearGradient id="spP" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3ED2F2" /><stop offset="100%" stopColor="#5BE7A9" /></linearGradient>
      </defs>
      {pts.length > 1 && <path d={`M${pts[0][0]},${H} L${pts.map((q) => q.join(",")).join(" L")} L${lx[0]},${H} Z`} fill="url(#spA)" />}
      {rate != null && <line x1={lx[0]} y1={lx[1]} x2={W - pad} y2={y(proj)} stroke="url(#spP)" strokeWidth="1.8" strokeDasharray="3 5" strokeLinecap="round" opacity=".85" />}
      {pts.length > 1 && <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke="#3ED2F2" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={i === pts.length - 1 ? 3.8 : 2.4} fill={i === pts.length - 1 ? "#fff" : "#3ED2F2"} />)}
      {m && (
        <g>
          <circle cx={m[0]} cy={m[1]} r="7" fill="#5BE7A9" opacity=".18" />
          <circle cx={m[0]} cy={m[1]} r="3.6" fill="#5BE7A9" />
          <text x={m[0]} y={m[1] - 11} textAnchor={m[0] > W - 40 ? "end" : "middle"} className="sp-l">{fint(milestone.w)} kg</text>
        </g>
      )}
    </svg>
  );
}
function Trajectory({ ctx }) {
  const { S, todayK } = ctx;
  const tj = L.weightTrajectory(todayK, S);
  const wk = L.nextWeighK(todayK, S);
  const wkTxt = wk === todayK ? "aujourd'hui" : wk === L.addDays(todayK, 1) ? "demain" : L.fmtDay(wk, { weekday: "long" });
  const go = () => ctx.go("progress", undefined, "weight");
  if (!tj) {
    return (
      <button className="card traj" onClick={go}>
        <div className="sec-h"><h2>Trajectoire</h2></div>
        <p className="traj-n">Pèse-toi le {L.fmtDay(wk, { weekday: "long" })} matin : ta courbe et ton rythme de prise apparaîtront ici.</p>
      </button>
    );
  }
  const { latest, first, rate, milestone } = tj;
  const gain = latest[1] - first[1];
  const short = (k) => L.fmtDay(k, { day: "numeric", month: "short" }).replace(".", "");
  let note;
  if (milestone) note = <>À ce rythme, <b>{fint(milestone.w)} kg</b> vers le {short(milestone.k)}.</>;
  else if (rate != null) note = <>Ça stagne : un shaker de plus par jour relance la prise.</>;
  else note = <>Encore une pesée et ton rythme s'affiche.</>;
  return (
    <button className="card traj" onClick={go} aria-label={`Poids : ${fdec(latest[1])} kilos. Voir le détail.`}>
      <div className="sec-h">
        <h2>Trajectoire</h2>
        {rate != null && <span className={"rate" + (rate > 0.05 ? " up" : "")}>{rate >= 0 ? "+" : ""}{fdec(rate, 2)} kg/sem</span>}
      </div>
      <div className="traj-top">
        <span className="traj-w">{fdec(latest[1])}<small> kg</small></span>
        {tj.list.length > 1 && <span className="traj-g">{gain >= 0 ? "+" : ""}{fdec(gain)} kg depuis le {short(first[0])}</span>}
      </div>
      {tj.list.length > 1 && <Spark list={tj.list.slice(-10)} rate={rate} milestone={milestone} />}
      <p className="traj-n">{note} Prochaine pesée : {wkTxt}.</p>
    </button>
  );
}
