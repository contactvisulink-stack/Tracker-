import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import * as A from "./actions.js";
import { Icon, Count, reduceMotion } from "./ui.jsx";
import { Portrait, GBar, KillHex, ItemSlot, Emblem, BossArt, Grade, KillDots, Coin } from "./hud.jsx";
import { WATER } from "./gamesheets.jsx";

const { fint, fdec, fH } = L;
export const pseudoOf = (S) => (S.pseudo || "Isma").trim() || "Isma";
const short = (k) => L.fmtDay(k, { day: "numeric", month: "short" }).replace(".", "");

/** Salutation (gardée pour l'accessibilité et le mode nuit) */
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

// ═════════════════════════════════════════════════════════════
// Le HUD du champion (en-tête de l'accueil)
// ═════════════════════════════════════════════════════════════
export function Hud({ ctx }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const di = G.dayInfo(todayK);
  const night = L.store.get("night", null);
  const m = G.mana(todayK, now);
  const rk = G.rank();
  const sk = G.streak(todayK);
  const name = pseudoOf(S);
  let hpV = 0, hpT = "Nuit pas notée, touche pour l'ajouter";
  if (night) { const hh = Math.max(0, (now - new Date(night.bed)) / 3.6e6); hpV = hh; hpT = `Régénération ${fH(hh)}`; }
  else if (di.sh != null) { hpV = di.sh; hpT = `${fH(di.sh)} / ${fH(S.sleep)}`; }
  return (
    <div className="hud">
      <div className="hud-top">
        <Portrait level={di.level} pct={di.lvlPct} letter={name[0]} onClick={() => ctx.go("profile")} label={`${name}, niveau ${di.level} de la partie. Voir ton profil.`} />
        <div className="hud-id">
          <h1 className="hud-n">{name}</h1>
          <div className="hud-t">{G.currentTitle(S, todayK)}</div>
          <div className="hud-d">{L.cap(L.fmtDay(todayK))}</div>
        </div>
        <div className="top-r">
          <button className="round-btn" onClick={() => ctx.open({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={19} /></button>
          <button className="round-btn" onClick={() => ctx.open({ type: "settings" })} aria-label="Runes et réglages"><Icon n="rune" size={20} /></button>
        </div>
      </div>
      <div className="hud-bars">
        <GBar kind="hp" ic="heart" v={hpV} max={S.sleep} text={<><em>PV</em>{hpT}</>} label={`Points de vie, ton sommeil : ${night ? "nuit en cours" : di.sh != null ? fH(di.sh) : "pas noté"}`} onClick={night ? undefined : () => ctx.open({ type: "sleep", k: todayK })} />
        <GBar kind="mana" ic="crystal" v={m.cur} max={m.max} text={<><em>Mana</em>{m.cur} / {m.max}</>} label={`Mana : ${m.cur} sur ${m.max}. Voir l'Arène.`} onClick={() => ctx.go("sport")} />
      </div>
      <div className="hud-chips">
        <button className="hchip rank" onClick={() => ctx.go("profile", undefined, "rank")} aria-label={rk ? `Rang ${rk.cur.name}, ${rk.cur.lp} LP` : "Non classé"}>
          <Emblem tier={rk ? rk.cur.tier : 0} size={22} dim={!rk} />{rk ? <>{rk.cur.name}<b>{rk.cur.lp} LP</b></> : "Non classé"}
        </button>
        {sk.n > 0 && <span className="hchip streak"><Icon n="flame" size={14} sw={2.2} />{sk.n} {sk.n > 1 ? "victoires" : "victoire"}</span>}
        <span className={"hchip flash" + (sk.ready ? " on" : "")} title="Le Flash sauve ta série une fois par semaine"><Icon n="bolt" size={13} sw={2.2} />{sk.ready ? "Flash prêt" : `Flash dans ${sk.inDays} j`}</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
export function Home({ ctx }) {
  const d = L.getDay(ctx.todayK);
  const night = L.store.get("night", null);
  const plan = L.getPlan(ctx.todayK);
  const boot = useBoot();
  const di = G.dayInfo(ctx.todayK);
  return (
    <div className={"page home" + (night ? " at-night" : "") + (boot ? " boot" : "")}>
      {night ? <NightHero ctx={ctx} night={night} /> : <Hero ctx={ctx} d={d} boot={boot} />}
      <NowCard ctx={ctx} d={d} night={night} />
      {!night && (
        <>
          {plan && <PlanCard ctx={ctx} plan={plan} />}
          <Kills ctx={ctx} di={di} />
          <Inventory ctx={ctx} d={d} />
          <Quests ctx={ctx} />
          <BossCard ctx={ctx} />
          {!plan && <CoachBar ctx={ctx} />}
          <WeekStrip ctx={ctx} />
          <RankCard ctx={ctx} />
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Le farm du jour : ton gold (calories), ta courbe en marches
// face au rythme idéal, les phases de la partie
// ═════════════════════════════════════════════════════════════
const hhmm = (m) => { const t = ((Math.round(m) + 300) % 1440 + 1440) % 1440; return `${Math.floor(t / 60)} h`; };
function Hero({ ctx, d, boot }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const t = L.dayTot(d);
  const tk = t.k || (d.legacy?.kcal ?? 0);
  const p = L.pace(todayK, now, S);
  const ref = useRef(null);
  const W = useWidth(ref);
  const H = 120, padT = 18, padB = 8;
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
  else if (p.frac < 0.04) chip = { cls: "", txt: "La partie commence" };
  else chip = ahead >= 120 ? { cls: "ok", txt: `+${fint(ahead)} gold d'avance` } : ahead <= -150 ? { cls: "late", txt: `−${fint(-ahead)} gold de retard` } : { cls: "", txt: "Dans le rythme" };
  const ticks = [0, 1, 2, 3].map((i) => x0 + ((x1 - x0) * i) / 3);
  // phases : early jusqu'à 14 h, mid jusqu'à 19 h, late ensuite
  const ph = G.phaseOf(now);
  const b14 = L.dayMin("14:00"), b19 = L.dayMin("19:00");
  const bands = [[x0, b14, "early", "Early"], [b14, b19, "mid", "Mid"], [b19, x1, "late", "Late"]].filter(([a, b]) => b > x0 && a < x1);
  const phEnd = ph === "early" ? b14 : ph === "mid" ? b19 : endM;
  const phGoal = Math.round(ideal(phEnd) / 50) * 50;
  const since = p.sinceLast;
  const late = L.isLate(todayK, now);
  const camp = !late && tk < S.kcal - 250 && (since == null ? now.getHours() >= 10 && !d.entries.length : since >= 180);
  return (
    <section className="hero frame" aria-label={`Farm du jour : ${fint(tk)} sur ${fint(S.kcal)} kcal. ${chip.txt}.`}>
      <button className="hero-in" onClick={() => ctx.go("food")}>
        <div className="hero-top">
          <span className="hero-k">Farm du jour</span>
          <span className={"hero-chip " + chip.cls}>{chip.txt}</span>
        </div>
        <div className="hero-num">
          <Coin size={30} />
          <span className="hero-big"><Count v={tk} from0={boot} /></span>
          <span className="hero-of">/ {fint(S.kcal)} kcal</span>
        </div>
        <div className="hero-sub">
          {tk >= S.kcal ? "Objectif atteint. Tout ce que tu farmes en plus, c'est du bonus." : <>Il te manque <b>{fint(S.kcal - tk)}</b> gold{p.remaining > 0 && p.hoursLeft > 0.5 ? `, environ ${Math.max(1, Math.round(p.hoursLeft / 3))} repas` : ""}.</>}
        </div>
        <div className="hero-chart" ref={ref}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <defs>
              <linearGradient id="hcA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E0B85C" stopOpacity=".34" /><stop offset="100%" stopColor="#E0B85C" stopOpacity="0" /></linearGradient>
              <linearGradient id="hcL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8A6420" /><stop offset="55%" stopColor="#E0B85C" /><stop offset="100%" stopColor="#FFF1C4" /></linearGradient>
              <filter id="hcG" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="4" /></filter>
            </defs>
            {bands.map(([a, b, id, lb]) => (
              <g key={id}>
                {id === ph && <rect x={X(Math.max(a, x0))} y={0} width={Math.max(0, X(Math.min(b, x1)) - X(Math.max(a, x0)))} height={H} fill="rgba(10,200,185,.06)" />}
                {a > x0 && <line x1={X(a)} x2={X(a)} y1={4} y2={H} stroke="rgba(200,170,110,.18)" strokeDasharray="1 4" />}
                <text x={X(Math.max(a, x0)) + 4} y={11} className={"hc-ph" + (id === ph ? " on" : "")}>{lb}</text>
              </g>
            ))}
            <line x1="0" x2={W} y1={Y(S.kcal)} y2={Y(S.kcal)} stroke="rgba(240,230,210,.16)" strokeDasharray="2 5" />
            <text x={W - 2} y={Y(S.kcal) - 5} textAnchor="end" className="hc-goal">{fint(S.kcal)}</text>
            <line x1={X(wakeM)} y1={Y(0)} x2={X(endM)} y2={Y(S.kcal)} stroke="rgba(10,200,185,.55)" strokeWidth="1.4" strokeDasharray="4 5" />
            <path d={area} fill="url(#hcA)" className="hc-area" />
            <path d={path} fill="none" stroke="url(#hcL)" strokeWidth="6" opacity=".5" filter="url(#hcG)" className="hc-line" pathLength="1" />
            <path d={path} fill="none" stroke="url(#hcL)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" className="hc-line" pathLength="1" />
            {planned.map((q, i) => <circle key={"p" + i} cx={X(q.m)} cy={Y(ideal(q.m))} r="4" fill="#06101C" stroke="#7FE7DC" strokeWidth="1.5" strokeDasharray="2 2" />)}
            {Math.abs(ahead) >= 120 && tk < S.kcal && p.frac >= 0.04 && (
              <line x1={nowX + 9} x2={nowX + 9} y1={Y(cum)} y2={Y(expNow)} stroke={ahead > 0 ? "#3DD68C" : "#E84057"} strokeWidth="2.4" strokeLinecap="round" opacity=".9" />
            )}
            <line x1={nowX} x2={nowX} y1={padT - 4} y2={H} stroke="rgba(240,230,210,.2)" strokeDasharray="2 3" />
            {meals.map((ml, i) => { const x = X(Math.max(x0, ml.m)); let c = 0; for (let j = 0; j <= i; j++) c += meals[j].k; return <rect key={i} x={Math.min(x + 7, X(x1)) - 3} y={Y(c) - 3} width="6" height="6" transform={`rotate(45 ${Math.min(x + 7, X(x1))} ${Y(c)})`} fill="#FFF1C4" className="hc-dot" />; })}
            <circle cx={nowX} cy={Y(cum)} r="5" fill="#FFF1C4" className="hc-now" />
          </svg>
          <div className="hero-axis">{ticks.map((m, i) => <span key={i}>{i === 0 && d.sleep?.wake ? `Réveil ${L.hm(d.sleep.wake)}` : hhmm(m)}</span>)}</div>
        </div>
      </button>
      <div className="hero-foot">
        <span className="hf"><Icon n="sword" size={14} sw={2.2} /><b>{d.entries.length}</b> CS</span>
        {tk < S.kcal && !late && <span className="hf"><Icon n="flag" size={14} sw={2.2} />{G.PHASES[ph].n}{ph !== "late" ? <> : <b>{fint(phGoal)}</b> à {G.PHASES[ph].end.replace(":00", " h")}</> : null}</span>}
        {camp && <span className="hf camp"><Icon n="hourglass" size={14} sw={2.2} />Camp réapparu</span>}
      </div>
    </section>
  );
}

function NightHero({ ctx, night }) {
  const now = new Date(ctx.now);
  const h = Math.max(0, (now - new Date(night.bed)) / 3.6e6);
  const S = ctx.S;
  const pct = L.clamp(h / S.sleep, 0, 1);
  return (
    <section className="hero frame night" aria-label={`Recall en cours depuis ${L.hm(night.bed)}`}>
      <div className="hero-in">
        <div className="hero-top"><span className="hero-k">Recall en cours</span><span className="hero-chip moon">depuis {L.hm(night.bed)}</span></div>
        <div className="recall-ring" aria-hidden="true"><span style={{ "--p": pct }} /><Icon n="recall" size={30} sw={1.6} /></div>
        <div className="hero-num center"><span className="hero-big">{fH(h)}</span></div>
        <div className="hero-sub center">Tes PV se régénèrent. Objectif {fdec(S.sleep)} h. Le reste attendra demain.</div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Maintenant : la prochaine action, sous forme de ping
// ═════════════════════════════════════════════════════════════
const ACT_IC = { wake: "sun", sleeping: "moon", bed: "recall", weigh: "eye", light: "sun", logNight: "moon", eat: "coin", prot: "bolt", train: "sword", crea: "crystal", water: "potion", posture: "posture", photo: "camera", done: "trophy", fed: "flame", chill: "spark" };
const PING = { sun: "farm", moon: "recall", sky: "vision", flesh: "prot", mint: "heal" };
const RITUAL_ACTS = new Set(["light", "crea", "water"]);
const DEMOTE = new Set(["crea", "water"]);
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
    if (pm) main = { id: "eat", tone: "sun", title: `${pm.label}, prévu à ${pm.time.replace(":", " h ")}`, text: pm.idea ? `${pm.idea}, environ ${fint(pm.kcal)} kcal.` : `Vise environ ${fint(pm.kcal)} kcal.`, target: pm.kcal };
  }
  if (!main && canEat) main = { id: "eat", tone: "sun", title: "Prochain repas", text: `Vise environ ${fint(Math.round(mealTarget / 50) * 50)} kcal.`, target: mealTarget };
  if (!main) main = acts.find((a) => DEMOTE.has(a.id)) || acts[0];
  if (!main) return null;
  const fav = main.id === "eat" && canEat ? L.bestFav(main.target ?? mealTarget) : null;
  const shaker = L.quickShaker(), shTot = L.itemsTot(shaker);
  const run = {
    wake: () => A.wakeNow(ctx),
    bed: () => A.startNight(ctx),
    weigh: () => ctx.go("profile", undefined, "rank"),
    light: () => A.toggleHabit(ctx, todayK, "light", "Lumière du jour"),
    logNight: () => ctx.open({ type: "sleep", k: todayK }),
    prot: () => A.addItems(ctx, todayK, shaker, "Shaker"),
    train: () => ctx.go("sport"),
    crea: () => A.toggleHabit(ctx, todayK, "creatine", "Créatine"),
    water: () => A.addWater(ctx, todayK, 0.5),
    eat: () => ctx.open({ type: "add", k: todayK }),
    posture: () => ctx.open({ type: "posture" }),
    photo: () => ctx.go("profile", undefined, "glowup"),
  };
  const BTN = { wake: "Je suis levé", bed: "Je pose le téléphone", weigh: "Noter mon poids", light: "C'est fait", logNight: "Noter ma nuit", prot: `Shaker whey + lait, +${fint(shTot.p)} g`, train: "Voir mes charges", crea: "C'est fait", water: "+0,5 L d'eau", eat: "Noter un repas", posture: "Lancer la routine, 5 min", photo: "Prendre la photo" };
  const next = acts.filter((a) => a !== main && a.id !== main.id && !RITUAL_ACTS.has(a.id) && !QUIET.has(a.id) && run[a.id]).slice(0, 2);
  const cancelNight = () => { const u = L.snapKey("night"); L.store.del("night"); ctx.say("Recall annulé", { undo: u }); };
  const tone = main.tone || "sun";
  return (
    <section className={`now ping-${PING[tone] || "farm"}` + (QUIET.has(main.id) ? " quiet" : "")}>
      <div className="now-h">
        <span className="now-ic" aria-hidden="true"><Icon n={ACT_IC[main.id] || "spark"} size={19} sw={2} /></span>
        <div className="now-tx">
          <h2 className="now-t">{main.title}</h2>
          {main.text && <p className="now-s">{main.text}</p>}
        </div>
      </div>
      {fav ? (
        <div className="now-act col">
          <button className="now-fav" onClick={() => A.addItems(ctx, todayK, fav.f.items, fav.f.name)} aria-label={`Ajouter ${fav.f.name}, ${fint(fav.k)} kcal`}>
            <span className="nf-tx"><span className="nf-n">{fav.f.name}</span><span className="nf-k">+{fint(fav.k)} gold, en un appui</span></span>
            <span className="nf-plus"><Icon n="plus" size={18} sw={2.6} /></span>
          </button>
          <button className="now-alt" onClick={run.eat}><Icon n="pen" size={14} sw={2} /> Autre repas</button>
        </div>
      ) : main.id === "sleeping" ? (
        <div className="now-act"><button className="now-btn ghost" onClick={cancelNight}>Annuler, je ne dors pas encore</button></div>
      ) : run[main.id] ? (
        <div className="now-act"><button className={"now-btn" + (main.id === "bed" || main.id === "wake" ? " moon" : "")} onClick={run[main.id]}>{(main.id === "bed" || main.id === "wake") && <Icon n={main.id === "bed" ? "recall" : "sun"} size={18} sw={2} />}{BTN[main.id]}</button></div>
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
// Objectifs du jour : 5 kills jusqu'au pentakill
// ═════════════════════════════════════════════════════════════
function Kills({ ctx, di }) {
  const { S, todayK } = ctx;
  const tr = L.trainingStatus(todayK);
  const d = di.d;
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const V = {
    gold: { pct: di.t.k / S.kcal, val: fint(di.t.k), go: () => ctx.go("food") },
    prot: { pct: di.t.p / S.prot, val: `${fint(di.t.p)} g`, go: () => ctx.go("food") },
    sleep: { pct: di.sh != null ? di.sh / S.sleep : 0, val: di.sh != null ? fH(di.sh) : "À noter", go: () => ctx.open({ type: "sleep", k: todayK }) },
    crea: { pct: 0, val: di.kill.crea ? "Prise" : "À prendre", go: () => (autoCrea && !d.h.creatine ? ctx.say("Créatine déjà comptée dans ton shaker") : A.toggleHabit(ctx, todayK, "creatine", "Créatine")) },
    train: { pct: 0, val: di.ws.length ? "Faite" : d.h.posture ? "Posture" : tr.due ? `Séance ${tr.next}` : "Posture", go: () => (di.ws.length || tr.due ? ctx.go("sport") : ctx.open({ type: "posture" })) },
  };
  return (
    <section className="kills" aria-label="Objectifs du jour">
      <div className="sec-h"><h2>Objectifs du jour</h2><span className="sec-r">{di.kills ? <b className="kname">{G.KILL_NAMES[di.kills]}</b> : "0 sur 5"}</span></div>
      <div className="khex-row">
        {G.KILLS.map((k) => <KillHex key={k.id} k={k} done={di.kill[k.id]} pct={V[k.id].pct} val={V[k.id].val} onClick={V[k.id].go} />)}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Inventaire : tes rituels deviennent des items à stacks
// ═════════════════════════════════════════════════════════════
function Inventory({ ctx, d }) {
  const { S, todayK } = ctx;
  const list = L.activeRituals(S);
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const tap = (r) => {
    if (r.id === "posture") return ctx.open({ type: "posture" });
    if (r.id === "creatine" && autoCrea && !d.h.creatine) return ctx.say("Créatine déjà comptée dans ton shaker");
    A.toggleHabit(ctx, todayK, r.id, r.label);
  };
  const w = d.water || 0;
  // le « ! » (stack en danger) n'apparaît qu'en fin de journée, pas dès le réveil
  const hr = new Date(ctx.now).getHours();
  const evening = hr >= 17 || hr < 5;
  const stOf = (id) => { const st = G.stacks(id, todayK); return evening ? st : { ...st, risk: false }; };
  const weighK = L.nextWeighK(todayK, S);
  const weighed = L.getWeights()[todayK] != null;
  const inD = L.daysBetween(todayK, weighK);
  return (
    <section className="inv" aria-label="Inventaire">
      <div className="sec-h"><h2>Inventaire</h2><span className="sec-r">Appui long : la fiche</span></div>
      <div className="inv-grid">
        {list.map((r) => <ItemSlot key={r.id} r={r} st={stOf(r.id)} onTap={() => tap(r)} onHold={() => ctx.open({ type: "item", id: r.id })} />)}
        {S.water > 0 && (
          <ItemSlot r={WATER} st={{ done: w >= S.water, risk: false, s: 0 }} count={w ? Math.round(w / 0.5) : null} sub={`${fdec(w)} L`}
            onTap={() => A.addWater(ctx, todayK, 0.5)} onHold={() => ctx.open({ type: "item", id: "water" })} />
        )}
        <ItemSlot r={{ id: "weigh", art: "weigh", label: "Pesée", color: "#5BE3D0" }} st={{ done: weighed, risk: inD === 0 && !weighed, s: 0 }} count={null}
          sub={weighed ? "Faite" : inD === 0 ? "Aujourd'hui" : `Dans ${inD} j`} onTap={() => ctx.go("profile", undefined, "rank")} onHold={() => ctx.open({ type: "codex", focus: "pesee" })} />
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Quêtes du jour
// ═════════════════════════════════════════════════════════════
function Quests({ ctx }) {
  const q = G.quests(ctx.todayK);
  const n = q.filter((x) => x.done).length;
  return (
    <section className="card quests" aria-label="Quêtes du jour">
      <div className="sec-h"><h2>Quêtes du jour</h2><span className="sec-r"><b>{n}</b> sur {q.length}</span></div>
      {q.map((x) => (
        <div key={x.id} className={"qst" + (x.done ? " on" : "")}>
          <span className="qst-c" aria-hidden="true">{x.done && <Icon n="check" size={12} sw={3} />}</span>
          <span className="qst-tx"><b>{x.t}</b><span>{x.d}</span></span>
          <span className="qst-xp">+{x.xp} XP</span>
        </div>
      ))}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Boss de la semaine
// ═════════════════════════════════════════════════════════════
function BossCard({ ctx }) {
  const b = G.boss(ctx.todayK);
  return (
    <button className={"card bossc" + (b.dead ? " dead" : b.enraged ? " rage" : "")} onClick={() => ctx.open({ type: "boss" })} aria-label={`Boss de la semaine, ${b.n} : ${b.dead ? "vaincu" : `${fint(b.left)} PV restants`}`}>
      <span className="bossc-art"><BossArt id={b.id} size={60} dead={b.dead} /></span>
      <span className="bossc-m">
        <span className="bossc-k">Boss de la semaine{b.enraged ? ", enragé" : ""}</span>
        <span className="bossc-n">{b.n}</span>
        <GBar kind="boss" v={b.left} max={b.hp} text={b.dead ? "Vaincu" : `${fint(b.left)} PV`} ticks={7} />
        <span className="bossc-s">{b.dead ? "Vaincu. Le reste de la semaine, c'est du bonus." : `Il te faut ${fint(b.need)} kcal par jour d'ici dimanche.`}</span>
      </span>
    </button>
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
// Ta semaine en parties : victoire, défaite, note et kills
// ═════════════════════════════════════════════════════════════
function WeekStrip({ ctx }) {
  const { todayK } = ctx;
  const ws = L.weekStartKey(todayK);
  const days = Array.from({ length: 7 }, (_, i) => { const k = L.addDays(ws, i); return { k, di: k <= todayK ? G.dayInfo(k) : null }; });
  let w = 0, l = 0;
  days.forEach(({ k, di }) => { if (!di || !L.hasFood(di.d)) return; if (di.win) w++; else if (k < todayK) l++; });
  return (
    <section className="card wks" aria-label="Ta semaine">
      <div className="sec-h"><h2>Ta semaine</h2><span className="sec-r"><b>{w}</b> V <b>{l}</b> D</span></div>
      <div className="wks-row">
        {days.map(({ k, di }) => {
          const fut = !di, today = k === todayK;
          const fed = di && L.hasFood(di.d);
          const r = fut ? "fut" : di.win ? "w" : today ? "cur" : fed ? "l" : "none";
          return (
            <button key={k} className={"wk" + (today ? " today" : "")} disabled={fut || !di.has} onClick={() => ctx.open({ type: "match", k })}
              aria-label={`${L.fmtDay(k, { weekday: "long" })} : ${fut ? "à venir" : r === "w" ? "victoire" : r === "l" ? "défaite" : r === "cur" ? "en cours" : "rien de noté"}`}>
              <span className="wk-d">{L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
              <span className={"wk-r " + r}>{r === "w" ? "V" : r === "l" ? "D" : r === "cur" ? "…" : ""}</span>
              {di && di.has ? <Grade g={di.grade} size="xs" /> : <span className="grade-ph" />}
              {di && di.has ? <KillDots kill={di.kill} /> : <span className="kdots" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Classé : ton rang selon ton poids
// ═════════════════════════════════════════════════════════════
function RankCard({ ctx }) {
  const { S, todayK } = ctx;
  const rk = G.rank();
  const wk = L.nextWeighK(todayK, S);
  const go = () => ctx.go("profile", undefined, "rank");
  if (!rk) {
    return (
      <button className="card rankc" onClick={go}>
        <Emblem tier={0} size={58} dim />
        <span className="rankc-m">
          <span className="rankc-k">Classé</span>
          <span className="rankc-n">Non classé</span>
          <span className="rankc-s">Note une pesée pour lancer ton classement : ton rang suivra ton poids jusqu'à {fdec(S.goalW)} kg, le rang Challenger.</span>
        </span>
      </button>
    );
  }
  const last = rk.last;
  const ch = rk.cur.step >= G.STEPS;
  return (
    <button className="card rankc" onClick={go} aria-label={`Rang ${rk.cur.name}, ${rk.cur.lp} LP. Voir le classement.`}>
      <Emblem tier={rk.cur.tier} size={64} />
      <span className="rankc-m">
        <span className="rankc-k">Classé, moyenne {fdec(last.sm, 1)} kg</span>
        <span className="rankc-n">{rk.cur.name}</span>
        <GBar kind="lp" v={ch ? 100 : rk.cur.lp} max={100} text={`${rk.cur.lp} LP`} ticks={4} />
        <span className="rankc-s">
          {last.dLP ? <>Dernière pesée {fdec(last.w)} kg : <b className={last.dLP > 0 ? "up" : "down"}>{last.dLP > 0 ? "+" : ""}{last.dLP} LP</b>. </> : null}
          {ch ? "Tu as atteint ton poids visé." : rk.promoAt ? <>Promotion vers le {short(rk.promoAt)} à ce rythme.</> : rk.rate != null && rk.rate <= 0.03 ? "Ça stagne : un shaker de plus par jour relance la prise." : <>Prochaine pesée : {wk === todayK ? "aujourd'hui" : L.fmtDay(wk, { weekday: "long" })}.</>}
        </span>
      </span>
    </button>
  );
}
