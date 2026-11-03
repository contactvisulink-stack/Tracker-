import React, { useState, useEffect } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import * as A from "./actions.js";
import { Icon, Count, reduceMotion } from "./ui.jsx";
import { GBar, ItemSlot, Emblem, BossArt, Grade, KillDots, KillCard, Glyph } from "./hud.jsx";
import { PosterHome, PosterNight, pseudoOf } from "./posters.jsx";
import { Deco, Orn, Torn, damask } from "./art.jsx";
import { WATER } from "./gamesheets.jsx";

const { fint, fdec, fH } = L;
export { pseudoOf };
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
// ═════════════════════════════════════════════════════════════
export function Home({ ctx }) {
  const d = L.getDay(ctx.todayK);
  const night = L.store.get("night", null);
  const plan = L.getPlan(ctx.todayK);
  const boot = useBoot();
  const di = G.dayInfo(ctx.todayK);
  return (
    <div className={"page home" + (night ? " at-night" : "") + (boot ? " boot" : "")}>
      {night ? <PosterNight ctx={ctx} night={night} /> : <PosterHome ctx={ctx} d={d} boot={boot} />}
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
        <span className="now-ic" aria-hidden="true"><Glyph n={ACT_IC[main.id] || "spark"} size={19} fallback={<Icon n={ACT_IC[main.id] || "spark"} size={19} sw={2} />} /></span>
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
      <div className="squad">
        {G.KILLS.map((k) => <KillCard key={k.id} k={k} done={di.kill[k.id]} pct={V[k.id].pct} val={V[k.id].val} onClick={V[k.id].go} />)}
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
    <section className="parch quests" aria-label="Quêtes du jour">
      <Torn seed={11} className="parch-edge" />
      <div className="parch-in">
        <div className="parch-h"><h2>Quêtes du jour</h2><span className="parch-n"><b>{n}</b> sur {q.length}</span></div>
        {q.map((x) => (
          <div key={x.id} className={"qst" + (x.done ? " on" : "")}>
            <span className="qst-c" aria-hidden="true">{x.done && <Icon n="check" size={13} sw={3} />}</span>
            <span className="qst-tx"><b>{x.t}</b><span>{x.d}</span></span>
            <span className="qst-xp">+{x.xp} XP</span>
          </div>
        ))}
      </div>
      <Torn seed={12} flip className="parch-edge" />
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Boss de la semaine
// ═════════════════════════════════════════════════════════════
function BossCard({ ctx }) {
  const b = G.boss(ctx.todayK);
  return (
    <button className={"bossc" + (b.dead ? " dead" : b.enraged ? " rage" : "")} onClick={() => ctx.open({ type: "boss" })} aria-label={`Boss de la semaine, ${b.n} : ${b.dead ? "vaincu" : `${fint(b.left)} PV restants`}`}>
      <span className="bossc-dm" style={{ backgroundImage: damask("#FF4B5E", 0.22) }} aria-hidden="true" />
      <span className="bossc-art"><BossArt id={b.id} size={96} dead={b.dead} /></span>
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
      <Deco as="button" className="rankc" onClick={go}>
        <span className="rankc-e"><Emblem tier={0} size={64} dim /></span>
        <span className="rankc-m">
          <span className="rankc-k">Classé</span>
          <span className="rankc-n">Non classé</span>
          <span className="rankc-s">Note une pesée pour lancer ton classement : ton rang suivra ton poids jusqu'à {fdec(S.goalW)} kg, le rang Challenger.</span>
        </span>
      </Deco>
    );
  }
  const last = rk.last;
  const ch = rk.cur.step >= G.STEPS;
  return (
    <Deco as="button" className="rankc" onClick={go} aria-label={`Rang ${rk.cur.name}, ${rk.cur.lp} LP. Voir le classement.`}>
      <span className="rankc-e"><Emblem tier={rk.cur.tier} size={76} /></span>
      <span className="rankc-m">
        <span className="rankc-k">Classé, moyenne {fdec(last.sm, 1)} kg</span>
        <span className="rankc-n">{rk.cur.name}</span>
        <GBar kind="lp" v={ch ? 100 : rk.cur.lp} max={100} text={`${rk.cur.lp} LP`} ticks={4} />
        <span className="rankc-s">
          {last.dLP ? <>Dernière pesée {fdec(last.w)} kg : <b className={last.dLP > 0 ? "up" : "down"}>{last.dLP > 0 ? "+" : ""}{last.dLP} LP</b>. </> : null}
          {ch ? "Tu as atteint ton poids visé." : rk.promoAt ? <>Promotion vers le {short(rk.promoAt)} à ce rythme.</> : rk.rate != null && rk.rate <= 0.03 ? "Ça stagne : un shaker de plus par jour relance la prise." : <>Prochaine pesée : {wk === todayK ? "aujourd'hui" : L.fmtDay(wk, { weekday: "long" })}.</>}
        </span>
      </span>
    </Deco>
  );
}
