import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
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

let booted = false; // l'animation d'ouverture ne se joue qu'une fois par ouverture de l'app
function useBoot() {
  const [first] = useState(() => !booted && !reduceMotion());
  useEffect(() => { booted = true; }, []);
  return first;
}
function useWidth(ref, fallback = 320) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width)));
    upd();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return w;
}

export function Home({ ctx }) {
  const d = L.getDay(ctx.todayK);
  const night = L.store.get("night", null);
  const plan = L.getPlan(ctx.todayK);
  const boot = useBoot();
  return (
    <div className={"page home" + (night ? " at-night" : "") + (boot ? " boot" : "")}>
      {night ? <NightHero ctx={ctx} night={night} /> : <Hero ctx={ctx} d={d} boot={boot} />}
      <NowCard ctx={ctx} d={d} night={night} />
      {!night && (
        <>
          {plan && <PlanCard ctx={ctx} plan={plan} />}
          <div className="bento">
            <ProtTile ctx={ctx} d={d} />
            <WaterTile ctx={ctx} d={d} />
            <SleepTile ctx={ctx} d={d} />
            <TrainTile ctx={ctx} />
          </div>
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
// Le carburant du jour : le gros chiffre en néon et la courbe de ta journée
// (en marches : une marche par repas) face à la ligne du rythme idéal
// ═════════════════════════════════════════════════════════════
const hhmm = (m) => { const t = ((Math.round(m) + 300) % 1440 + 1440) % 1440; return `${Math.floor(t / 60)}\u00a0h`; };
function Hero({ ctx, d, boot }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const t = L.dayTot(d);
  const tk = t.k || (d.legacy?.kcal ?? 0);
  const p = L.pace(todayK, now, S);
  const ref = useRef(null);
  const W = useWidth(ref);
  const H = 128, padT = 14, padB = 8;
  // axe du temps : minutes depuis 5 h du matin (le début de ta journée)
  const nowM = L.nowDayMin(now);
  const wakeM = d.sleep?.wake ? L.dayMin(L.hm(d.sleep.wake)) : Math.min(nowM, L.dayMin("08:00"));
  const endM = L.dayMin(L.hm(p.end));
  const meals = d.entries.map((e) => ({ m: L.dayMin(e.t), k: L.entryTot(e).k })).sort((a, b) => a.m - b.m);
  const planned = L.plannedMeals(todayK).filter((m) => !m.done).map((m) => ({ m: m.at, k: m.kcal }));
  const x0 = Math.min(wakeM, meals[0]?.m ?? wakeM);
  const x1 = Math.max(endM, nowM + 25, (meals[meals.length - 1]?.m ?? 0) + 25, ...planned.map((q) => q.m + 20));
  const top = Math.max(S.kcal, tk) * 1.1;
  const X = (m) => 4 + ((m - x0) / (x1 - x0 || 1)) * (W - 8);
  const Y = (v) => H - padB - (v / top) * (H - padT - padB);
  // la courbe en marches
  let cum = 0;
  const pts = [[X(x0), Y(0)]];
  meals.forEach((ml) => {
    const x = X(Math.max(x0, ml.m));
    pts.push([x, Y(cum)]);
    cum += ml.k;
    pts.push([Math.min(x + 7, X(x1)), Y(cum)]);
  });
  const nowX = X(Math.min(nowM, x1));
  pts.push([Math.max(nowX, pts[pts.length - 1][0]), Y(cum)]);
  const path = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const ideal = (m) => S.kcal * L.clamp((m - wakeM) / (endM - wakeM || 1), 0, 1);
  const expNow = ideal(nowM);
  const ahead = tk - expNow;
  let chip;
  if (tk >= S.kcal) chip = { cls: "ok", txt: tk - S.kcal >= 50 ? `+${fint(tk - S.kcal)} au-dessus` : "Objectif atteint" };
  else if (p.frac < 0.04) chip = { cls: "", txt: "La journée commence" };
  else chip = ahead >= 120 ? { cls: "ok", txt: `+${fint(ahead)} d'avance` } : ahead <= -150 ? { cls: "late", txt: `−${fint(-ahead)} de retard` } : { cls: "", txt: "Dans le rythme" };
  const ticks = [0, 1, 2, 3].map((i) => x0 + ((x1 - x0) * i) / 3);
  return (
    <section className="hero" aria-label={`Calories : ${fint(tk)} sur ${fint(S.kcal)}. ${chip.txt}.`}>
      <span className="hero-spin" aria-hidden="true" />
      <button className="hero-in" onClick={() => ctx.go("food")}>
        <div className="hero-top">
          <span className="hero-k">Carburant du jour</span>
          <span className={"hero-chip " + chip.cls}>{chip.txt}</span>
        </div>
        <div className="hero-num">
          <span className="hero-big"><Count v={tk} from0={boot} /></span>
          <span className="hero-of">/ {fint(S.kcal)} kcal</span>
        </div>
        <div className="hero-sub">
          {tk >= S.kcal ? "Le plus dur est fait aujourd'hui." : <>Encore <b>{fint(S.kcal - tk)}</b> kcal{p.remaining > 0 && p.hoursLeft > 0.5 ? `, environ ${Math.max(1, Math.round(p.hoursLeft / 3))} repas` : ""}.</>}
        </div>
        <div className="hero-chart" ref={ref}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <defs>
              <linearGradient id="hcA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C7CFF" stopOpacity=".42" /><stop offset="100%" stopColor="#4F8DFF" stopOpacity="0" /></linearGradient>
              <linearGradient id="hcL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4F8DFF" /><stop offset="55%" stopColor="#9B6BFF" /><stop offset="100%" stopColor="#FF5FD2" /></linearGradient>
              <filter id="hcG" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="4" /></filter>
            </defs>
            <line x1="0" x2={W} y1={Y(S.kcal)} y2={Y(S.kcal)} stroke="rgba(255,255,255,.14)" strokeDasharray="2 5" />
            <text x={W - 2} y={Y(S.kcal) - 5} textAnchor="end" className="hc-goal">{fint(S.kcal)}</text>
            <line x1={X(wakeM)} y1={Y(0)} x2={X(endM)} y2={Y(S.kcal)} stroke="rgba(214,224,255,.38)" strokeWidth="1.4" strokeDasharray="4 5" />
            <path d={area} fill="url(#hcA)" className="hc-area" />
            <path d={path} fill="none" stroke="url(#hcL)" strokeWidth="6" opacity=".55" filter="url(#hcG)" className="hc-line" pathLength="1" />
            <path d={path} fill="none" stroke="url(#hcL)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" className="hc-line" pathLength="1" />
            {planned.map((q, i) => <circle key={"p" + i} cx={X(q.m)} cy={Y(ideal(q.m))} r="4" fill="#0B0F26" stroke="#B9C8FF" strokeWidth="1.5" strokeDasharray="2 2" />)}
            {Math.abs(ahead) >= 120 && tk < S.kcal && p.frac >= 0.04 && (
              <line x1={nowX + 9} x2={nowX + 9} y1={Y(cum)} y2={Y(expNow)} stroke={ahead > 0 ? "#5BE7A9" : "#FFB547"} strokeWidth="2.4" strokeLinecap="round" opacity=".9" />
            )}
            <line x1={nowX} x2={nowX} y1={padT - 6} y2={H} stroke="rgba(255,255,255,.18)" strokeDasharray="2 3" />
            {meals.map((ml, i) => { const x = X(Math.max(x0, ml.m)); let c = 0; for (let j = 0; j <= i; j++) c += meals[j].k; return <circle key={i} cx={Math.min(x + 7, X(x1))} cy={Y(c)} r="3.4" fill="#fff" className="hc-dot" />; })}
            <circle cx={nowX} cy={Y(cum)} r="5" fill="#fff" className="hc-now" />
          </svg>
          <div className="hero-axis">{ticks.map((m, i) => <span key={i}>{i === 0 && d.sleep?.wake ? `Réveil ${L.hm(d.sleep.wake)}` : hhmm(m)}</span>)}</div>
        </div>
      </button>
    </section>
  );
}

function NightHero({ ctx, night }) {
  const now = new Date(ctx.now);
  const h = (now - new Date(night.bed)) / 3.6e6;
  const S = ctx.S;
  const pct = L.clamp(h / S.sleep, 0, 1);
  return (
    <section className="hero night" aria-label={`Nuit en cours depuis ${L.hm(night.bed)}`}>
      <span className="hero-spin" aria-hidden="true" />
      <div className="hero-in">
        <div className="hero-top"><span className="hero-k">Nuit en cours</span><span className="hero-chip moon">depuis {L.hm(night.bed)}</span></div>
        <div className="hero-num"><span className="hero-big">{fH(h)}</span></div>
        <div className="hero-sub">Objectif {fdec(S.sleep)} h. Le reste attendra demain.</div>
        <div className="night-bar"><span style={{ width: `${pct * 100}%` }} /></div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Les tuiles : protéines, eau, sommeil, séance
// ═════════════════════════════════════════════════════════════
function Ring({ v, size = 74, sw = 7, color, track }) {
  const r = (size - sw) / 2 - 2, c = 2 * Math.PI * r, p = L.clamp(v, 0, 1);
  return (
    <svg className="t-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={sw} />
      {p > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw + 4} strokeOpacity=".25" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" className="t-arc glow" />}
      {p > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" className="t-arc" />}
    </svg>
  );
}
function ProtTile({ ctx, d }) {
  const { S } = ctx;
  const t = L.dayTot(d);
  const ok = t.p >= S.prot;
  return (
    <button className="tile t-prot" onClick={() => ctx.go("food")} aria-label={`Protéines : ${fint(t.p)} grammes sur ${S.prot}`}>
      <span className="tile-h"><Icon n="bolt" size={15} sw={2.1} />Protéines</span>
      <span className="tile-row">
        <span className="tile-v"><Count v={t.p} from0={false} /><small>g</small></span>
        <Ring v={t.p / S.prot} color="#FF8A3D" track="rgba(255,138,61,.14)" size={58} sw={6} />
      </span>
      <span className="tile-s">{ok ? "Objectif atteint" : `Encore ${fint(S.prot - t.p)} g sur ${S.prot}`}</span>
    </button>
  );
}
function WaterTile({ ctx, d }) {
  const { S, todayK } = ctx;
  const w = d.water || 0;
  const pct = L.clamp(w / S.water, 0, 1);
  return (
    <button className={"tile t-water" + (pct >= 1 ? " full" : "")} onClick={() => A.addWater(ctx, todayK, 0.5)} aria-label={`Eau : ${fdec(w)} litre sur ${fdec(S.water)}. Touche pour ajouter un demi-litre.`}>
      <span className="liquid" style={{ height: `${8 + pct * 80}%` }} aria-hidden="true">
        <svg className="wave w1" viewBox="0 0 200 20" preserveAspectRatio="none"><path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V20 H0Z" /></svg>
        <svg className="wave w2" viewBox="0 0 200 20" preserveAspectRatio="none"><path d="M0 10 Q 25 20 50 10 T 100 10 T 150 10 T 200 10 V20 H0Z" /></svg>
      </span>
      <span className="tile-h"><Icon n="drop" size={15} sw={2.1} />Eau</span>
      <span className="tile-v">{fdec(w)}<small>L</small></span>
      <span className="tile-s">{pct >= 1 ? "Objectif atteint" : `sur ${fdec(S.water)} L, touche +0,5`}</span>
    </button>
  );
}
function SleepTile({ ctx, d }) {
  const { S, todayK } = ctx;
  const h = L.daySleepH(d);
  const bt = L.bedTarget(todayK);
  const nights = Array.from({ length: 7 }, (_, i) => { const k = L.addDays(todayK, i - 6); return { k, h: L.daySleepH(L.getDay(k)) }; });
  return (
    <button className="tile t-sleep" onClick={() => ctx.open({ type: "sleep", k: todayK })} aria-label={`Sommeil : ${h != null ? fH(h) : "pas noté"}. Coucher visé ${L.hFr(bt.min)}.`}>
      <span className="tile-h"><Icon n="moon" size={15} sw={2.1} />Sommeil</span>
      <span className="tile-v">{h != null ? fH(h) : "À noter"}</span>
      <span className="mini-bars" aria-hidden="true">
        {nights.map((n) => <i key={n.k} className={n.k === todayK ? "on" : ""} style={{ height: `${n.h != null ? 18 + L.clamp(n.h / 10, 0, 1) * 82 : 10}%`, opacity: n.h != null ? 1 : 0.35 }} />)}
      </span>
      <span className="tile-s">Coucher visé {L.hFr(bt.min)}</span>
    </button>
  );
}
function TrainTile({ ctx }) {
  const tr = L.trainingStatus(ctx.todayK);
  const prog = L.getProgram().find((p) => p.day === (tr.todayW?.session || tr.next));
  const v = tr.todayW ? `${tr.todayW.session || ""} faite`.trim() : tr.wk >= 3 && !tr.due ? "Repos" : `Séance ${tr.next}`;
  const s = tr.todayW ? "Bien joué, récupère." : tr.due ? `Aujourd'hui, ${prog?.exs.length || 0} exercices prêts` : tr.wk >= 3 ? "Semaine bouclée" : tr.moved === "tomorrow" ? "Décalée à demain" : "Demain";
  return (
    <button className={"tile t-train" + (tr.due ? " hot" : "")} onClick={() => ctx.go("sport")} aria-label={`${v}. ${s}. ${tr.wk} séances sur 3 cette semaine.`}>
      <span className="tile-h"><Icon n="dumbbell" size={15} sw={2.1} />Salle</span>
      <span className="tile-v">{v}{tr.todayW && <Icon n="check" size={18} sw={3} />}</span>
      <span className="segs" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i < tr.wk ? "on" : ""} />)}</span>
      <span className="tile-s">{s}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════
// Maintenant : la prochaine chose à faire, en un appui
// ═════════════════════════════════════════════════════════════
const ACT_IC = { wake: "sun", sleeping: "moon", bed: "moon", weigh: "scale", light: "sun", logNight: "moon", eat: "fork", prot: "bolt", train: "dumbbell", crea: "pill", water: "drop", posture: "posture", photo: "camera", done: "spark", fed: "flame", chill: "spark" };
const RITUAL_ACTS = new Set(["light", "crea", "water"]);
const DEMOTE = new Set(["crea", "water"]); // déjà à portée de main sur l'accueil (rituels, tuile eau)
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
    posture: () => ctx.open({ type: "posture" }),
    photo: () => ctx.go("progress", undefined, "glowup"),
  };
  const BTN = { wake: "Je suis levé", bed: "Je pose le téléphone", weigh: "Noter mon poids", light: "C'est fait", logNight: "Noter ma nuit", prot: `Shaker whey + lait, +${fint(shTot.p)} g`, train: "Voir mes charges", crea: "C'est fait", water: "+0,5 L d'eau", eat: "Noter un repas", posture: "Lancer la routine, 5 min", photo: "Prendre la photo" };
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
    if (r.id === "posture") return ctx.open({ type: "posture" });
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
function CoachBar({ ctx }) {
  return (
    <button className="cbar" onClick={() => ctx.open({ type: "coach" })}>
      <span className="cbar-ic"><Icon n="spark" size={18} sw={1.9} /></span>
      <span className="cbar-tx"><b>Ta journée change ?</b><span>Sortie, service du soir, pas faim : ton coach réorganise tout.</span></span>
      <span className="cbar-go"><Icon n="right" size={18} sw={2.4} /></span>
    </button>
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
