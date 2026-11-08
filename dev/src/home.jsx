// ═════════════════════════════════════════════════════════════
// Base : le centre de contrôle de ta partie.
// En quelques secondes : ton farm, tes 5 objectifs, la prochaine action,
// tes items, tes quêtes, ta semaine (boss compris) et ton rang.
// ═════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import * as A from "./actions.js";
import { Icon, Count, reduceMotion } from "./ui.jsx";
import { GBar, ItemSlot, Emblem, BossArt, Grade, KillDots, Glyph } from "./hud.jsx";
import { TopBar, Meter, Status, Sec, pseudoOf } from "./client.jsx";
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

let booted = false; // le compteur ne défile qu'à l'ouverture de l'app
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
    <div className={"page home" + (night ? " at-night" : "")}>
      <TopBar ctx={ctx} title="Base" sub={L.cap(L.fmtDay(ctx.todayK))} />
      {night ? <Night ctx={ctx} night={night} /> : <Today ctx={ctx} d={d} boot={boot} />}
      {!night && <Objectives ctx={ctx} di={di} />}
      <NowCard ctx={ctx} d={d} night={night} />
      {!night && (
        <>
          {plan && <PlanCard ctx={ctx} plan={plan} />}
          <Inventory ctx={ctx} d={d} />
          <Quests ctx={ctx} />
          <Week ctx={ctx} />
          <RankLine ctx={ctx} />
          {!plan && <CoachBar ctx={ctx} />}
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Le farm du jour : le chiffre qui compte, la jauge, le rythme
// ═════════════════════════════════════════════════════════════
function Today({ ctx, d, boot }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const t = L.dayTot(d);
  const tk = t.k || (d.legacy?.kcal ?? 0);
  const p = L.pace(todayK, now, S);
  const nowM = L.nowDayMin(now);
  const wakeM = d.sleep?.wake ? L.dayMin(L.hm(d.sleep.wake)) : Math.min(nowM, L.dayMin("08:00"));
  const endM = L.dayMin(L.hm(p.end));
  const ideal = (m) => S.kcal * L.clamp((m - wakeM) / (endM - wakeM || 1), 0, 1);
  const expNow = ideal(nowM), ahead = tk - expNow;
  const late = L.isLate(todayK, now);
  let pace;
  if (tk >= S.kcal) pace = { cls: "ok", txt: tk - S.kcal >= 50 ? `+${fint(tk - S.kcal)} au-dessus` : "Objectif atteint" };
  else if (p.frac < 0.04) pace = { cls: "", txt: "La partie commence" };
  else pace = ahead >= 120 ? { cls: "ok", txt: `+${fint(ahead)} d'avance` } : ahead <= -150 ? { cls: "late", txt: `${fint(-ahead)} de retard` } : { cls: "", txt: "Dans le rythme" };
  const ph = G.phaseOf(now);
  const e1 = ideal(L.dayMin("14:00")) / S.kcal, e2 = ideal(L.dayMin("19:00")) / S.kcal;
  const camp = !late && tk < S.kcal - 250 && (p.sinceLast == null ? now.getHours() >= 10 && !d.entries.length : p.sinceLast >= 180);
  const tag = tk >= S.kcal ? "Objectif atteint. Tout le reste, c'est du bonus."
    : late ? `Il te manquait ${fint(S.kcal - tk)} kcal. Demain, on rattrape.`
    : `Il te manque ${fint(S.kcal - tk)} kcal${p.remaining > 0 && p.hoursLeft > 0.5 ? `, environ ${Math.max(1, Math.round(p.hoursLeft / 3))} repas` : ""}.`;
  return (
    <button className="today hero" onClick={() => ctx.go("food")} aria-label={`Farm du jour : ${fint(tk)} sur ${fint(S.kcal)} kcal. ${pace.txt}. Voir le journal.`}>
      <span className="today-k">
        <span className="kick">{G.PHASES[ph].n}</span>
        <span className={"pace " + pace.cls}>{pace.txt}</span>
      </span>
      <span className="today-n">
        <Glyph n="coin" size={22} className="today-coin" />
        <b className="hero-big"><Count v={tk} from0={boot} /></b>
        <span>/ {fint(S.kcal)} kcal</span>
      </span>
      <Meter v={tk} max={S.kcal} marks={[e1, e2]} mark={tk < S.kcal && p.frac >= 0.04 && !late ? expNow / S.kcal : null} label={`${fint(tk)} sur ${fint(S.kcal)} kcal`} />
      <span className="phl" aria-hidden="true">
        <span className={ph === "early" ? "on" : ""} style={{ width: `${(e1 * 100).toFixed(1)}%` }}>Early</span>
        <span className={ph === "mid" ? "on" : ""} style={{ width: `${((e2 - e1) * 100).toFixed(1)}%` }}>Mid</span>
        <span className={ph === "late" ? "on" : ""}>Late</span>
      </span>
      <span className="today-s">{tag}{camp && <em className="camp"><Icon n="hourglass" size={13} sw={2} /> Camp réapparu : ça fait un moment que tu n'as pas mangé.</em>}</span>
    </button>
  );
}

// ── La nuit : le recall ──
function Night({ ctx, night }) {
  const { S } = ctx;
  const now = new Date(ctx.now);
  const h = Math.max(0, (now - new Date(night.bed)) / 3.6e6);
  return (
    <section className="today hero night" aria-label={`Recall en cours depuis ${L.hm(night.bed)}`}>
      <span className="today-k"><span className="kick">Recall en cours depuis {L.hm(night.bed)}</span></span>
      <span className="today-n"><Glyph n="moon" size={22} className="today-coin moon" /><b className="hero-big">{fH(h)}</b><span>/ {fdec(S.sleep)} h</span></span>
      <Meter v={h} max={S.sleep} tone="green" label={`Régénération : ${fH(h)} sur ${fdec(S.sleep)} h`} />
      <span className="today-s">Tes PV se régénèrent. Le reste attendra demain.</span>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Objectifs du jour : 5 lignes, chacune avec sa condition et son état
// ═════════════════════════════════════════════════════════════
const OBJ_C = { gold: "#E2BC6E", prot: "#E8853A", sleep: "#3DD68C", crea: "#3CB4E6", train: "#E84057" };
function Objectives({ ctx, di }) {
  const { S, todayK } = ctx;
  const tr = L.trainingStatus(todayK);
  const d = di.d;
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const sess = di.ws[0];
  const R = {
    gold: { c: `objectif ${fint(S.kcal)} kcal`, v: <>{fint(di.t.k)}<small> / {fint(S.kcal)}</small></>, pct: di.t.k / S.kcal, go: () => ctx.go("food") },
    prot: { c: `objectif ${fint(S.prot)} g`, v: <>{fint(di.t.p)}<small> / {fint(S.prot)} g</small></>, pct: di.t.p / S.prot, go: () => ctx.go("food") },
    sleep: { c: `objectif ${fdec(S.sleep)} h`, v: di.sh != null ? fH(di.sh) : <small>à noter</small>, pct: di.sh != null ? di.sh / S.sleep : 0, go: () => ctx.open({ type: "sleep", k: todayK }) },
    crea: { c: "5 g par jour", v: di.kill.crea ? "prise" : <small>à prendre</small>, pct: 0, go: () => (autoCrea && !d.h.creatine ? ctx.say("Créatine déjà comptée dans ton shaker") : A.toggleHabit(ctx, todayK, "creatine", "Créatine")) },
    train: { c: tr.due && !di.ws.length ? `séance ${tr.next} prévue, ou routine posture` : "une séance ou la routine posture", v: sess ? `séance ${sess.session || "faite"}` : d.h.posture ? "posture" : <small>{tr.due ? `séance ${tr.next}` : "repos"}</small>, pct: 0, go: () => (di.ws.length || tr.due ? ctx.go("sport") : ctx.open({ type: "posture" })) },
  };
  return (
    <Sec title="Objectifs du jour" className="obj" label="Objectifs du jour"
      right={<><b>{di.kills}</b> / 5{di.kills >= 2 && <em className="kname">{G.KILL_NAMES[di.kills]}</em>}</>}>
      <ul className="ol">
        {G.KILLS.map((k) => {
          const r = R[k.id], on = di.kill[k.id];
          return (
            <li key={k.id}>
              <button className={"o" + (on ? " on" : "")} style={{ "--oc": OBJ_C[k.id] }} onClick={r.go} aria-label={`${k.n} : ${on ? "validé" : "pas encore"}. Condition : ${r.c}.`}>
                <span className="o-ic"><Glyph n={k.ic} size={16} /></span>
                <span className="o-n">{k.id === "gold" ? "Calories" : k.n}<small>{r.c}</small></span>
                <span className="o-v">{r.v}</span>
                <Status done={on} pct={r.pct} />
              </button>
            </li>
          );
        })}
      </ul>
    </Sec>
  );
}

// ═════════════════════════════════════════════════════════════
// Maintenant : la prochaine action
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
    if (pm) main = { id: "eat", tone: "sun", title: `${pm.label}, prévu à ${pm.time.replace(":", " h ")}`, text: pm.idea ? `${pm.idea}, environ ${fint(pm.kcal)} kcal.` : `Vise environ ${fint(pm.kcal)} kcal.`, target: pm.kcal };
  }
  if (!main && canEat) main = { id: "eat", tone: "sun", title: "Prochain repas", text: `Vise environ ${fint(Math.round(mealTarget / 50) * 50)} kcal.`, target: mealTarget };
  if (!main) main = acts.find((a) => DEMOTE.has(a.id)) || acts[0];
  if (!main) return null;
  // « Journée bouclée » seulement quand les 5 objectifs ET les quêtes sont faits
  if (QUIET.has(main.id) && main.id !== "sleeping") {
    const di = G.dayInfo(todayK);
    const left = G.quests(todayK).filter((x) => !x.done);
    const miss = G.KILLS.filter((k) => !di.kill[k.id]).map((k) => (k.id === "gold" ? "calories" : k.n.toLowerCase()));
    if (di.kills === 5 && !left.length) main = { ...main, id: "done", title: "Journée bouclée", text: "Pentakill et quêtes faites. Profite de ta soirée." };
    else if (di.kills === 5) main = { ...main, id: "done", title: "Pentakill", text: `Objectifs faits. Reste la quête « ${left[0].t} » : ${left[0].d.charAt(0).toLowerCase() + left[0].d.slice(1)} (+${left[0].xp} XP).` };
    else if (main.id !== "chill") main = { ...main, id: "fed", title: di.kill.gold ? "Calories atteintes" : main.title, text: `Il te manque encore : ${miss.join(", ")}.` };
  }
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
    <section className={`now ping-${PING[tone] || "farm"}` + (QUIET.has(main.id) ? " quiet" : "")} aria-label="Maintenant">
      <div className="now-h">
        <span className="now-ic" aria-hidden="true"><Glyph n={ACT_IC[main.id] || "spark"} size={18} fallback={<Icon n={ACT_IC[main.id] || "spark"} size={18} />} /></span>
        <div className="now-tx">
          <span className="now-k">Maintenant</span>
          <h2 className="now-t">{main.title}</h2>
          {main.text && <p className="now-s">{main.text}</p>}
        </div>
      </div>
      {fav ? (
        <div className="now-act col">
          <button className="now-fav" onClick={() => A.addItems(ctx, todayK, fav.f.items, fav.f.name)} aria-label={`Ajouter ${fav.f.name}, ${fint(fav.k)} kcal`}>
            <span className="nf-tx"><span className="nf-n">{fav.f.name}</span><span className="nf-k">{fint(fav.k)} kcal en un appui</span></span>
            <span className="nf-plus"><Icon n="plus" size={18} sw={2.2} /></span>
          </button>
          <button className="now-alt" onClick={run.eat}><Icon n="pen" size={14} /> Autre repas</button>
        </div>
      ) : main.id === "sleeping" ? (
        <div className="now-act"><button className="now-btn ghost" onClick={cancelNight}>Annuler, je ne dors pas encore</button></div>
      ) : run[main.id] ? (
        <div className="now-act"><button className={"now-btn" + (main.id === "bed" || main.id === "wake" ? " moon" : "")} onClick={run[main.id]}>{(main.id === "bed" || main.id === "wake") && <Icon n={main.id === "bed" ? "recall" : "sun"} size={17} />}{BTN[main.id]}</button></div>
      ) : null}
      {next.length > 0 && (
        <div className="now-next">
          <span className="now-nl">Ensuite</span>
          {next.map((a) => <button key={a.id} className="nx" onClick={run[a.id]}><Icon n={ACT_IC[a.id]} size={14} />{a.title}</button>)}
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
    <Sec title="Ta journée, réorganisée" right={<><Icon n="spark" size={13} /> Coach</>} className="plan">
      {plan.summary && <p className="plan-sum">{plan.summary}</p>}
      <div className="plan-tags">
        {plan.bedtime && <span className="ptag moon"><Icon n="moon" size={13} /> Coucher vers {L.hFr(bt.min)}</span>}
        {TRAIN_TXT[plan.training] && <span className="ptag"><Icon n="dumbbell" size={13} /> {TRAIN_TXT[plan.training]}</span>}
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
                <span className="pm-k">{m.done ? <Icon n="check" size={15} sw={2.4} /> : `~${fint(m.kcal)}`}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="plan-btns">
        <button className="pill-btn" onClick={() => ctx.open({ type: "coach" })}>Changer encore</button>
        <button className="pill-btn ghost" onClick={reset}>Revenir au plan normal</button>
      </div>
    </Sec>
  );
}

// ═════════════════════════════════════════════════════════════
// Inventaire : tes rituels deviennent des items à stacks.
// La rareté (couleur du cadre) monte avec les stacks.
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
  const done = list.filter((r) => stOf(r.id).done).length + (S.water > 0 && w >= S.water ? 1 : 0);
  const total = list.length + (S.water > 0 ? 1 : 0);
  return (
    <Sec title="Inventaire" right={<><b>{done}</b> / {total} aujourd'hui</>} className="inv" label="Inventaire">
      <div className="inv-grid">
        {list.map((r) => <ItemSlot key={r.id} r={r} st={stOf(r.id)} onTap={() => tap(r)} onHold={() => ctx.open({ type: "item", id: r.id })} />)}
        {S.water > 0 && (
          <ItemSlot r={WATER} st={{ done: w >= S.water, risk: false, s: 0 }} count={w ? `${fdec(w)} L` : null} sub="Eau"
            onTap={() => A.addWater(ctx, todayK, 0.5)} onHold={() => ctx.open({ type: "item", id: "water" })} />
        )}
      </div>
      <p className="hint">Un appui : fait ou pas fait. Appui long : la fiche de l'item. Le cadre change de couleur avec tes stacks.</p>
    </Sec>
  );
}

// ═════════════════════════════════════════════════════════════
// Quêtes du jour
// ═════════════════════════════════════════════════════════════
function Quests({ ctx }) {
  const q = G.quests(ctx.todayK);
  const n = q.filter((x) => x.done).length;
  return (
    <Sec title="Quêtes du jour" right={<><b>{n}</b> / {q.length}</>} className="quests" label="Quêtes du jour">
      <ul className="ql">
        {q.map((x) => (
          <li key={x.id} className={"qst" + (x.done ? " on" : "")}>
            <span className="qst-c" aria-hidden="true">{x.done && <Icon n="check" size={12} sw={2.8} />}</span>
            <span className="qst-tx"><b>{x.t}</b><span>{x.d}</span></span>
            <span className="qst-xp">+{x.xp} XP</span>
          </li>
        ))}
      </ul>
    </Sec>
  );
}

// ═════════════════════════════════════════════════════════════
// Ta semaine : 7 parties et le boss
// ═════════════════════════════════════════════════════════════
function Week({ ctx }) {
  const { todayK } = ctx;
  const ws = L.weekStartKey(todayK);
  const days = Array.from({ length: 7 }, (_, i) => { const k = L.addDays(ws, i); return { k, di: k <= todayK ? G.dayInfo(k) : null }; });
  let w = 0, l = 0;
  days.forEach(({ k, di }) => { if (!di || !L.hasFood(di.d)) return; if (di.win) w++; else if (k < todayK) l++; });
  const b = G.boss(todayK);
  return (
    <Sec title="Ta semaine" right={<><b>{w}</b> {w > 1 ? "victoires" : "victoire"} · <b>{l}</b> {l > 1 ? "défaites" : "défaite"}</>} className="wks" label="Ta semaine">
      <div className="wks-row">
        {days.map(({ k, di }) => {
          const fut = !di, today = k === todayK;
          const fed = di && L.hasFood(di.d);
          const r = fut ? "fut" : di.win ? "w" : today ? "cur" : fed ? "l" : "none";
          return (
            <button key={k} className={"wk r-" + r + (today ? " today" : "")} disabled={fut || !di.has} onClick={() => ctx.open({ type: "match", k })}
              aria-label={`${L.fmtDay(k, { weekday: "long" })} : ${fut ? "à venir" : r === "w" ? "victoire" : r === "l" ? "défaite" : r === "cur" ? "en cours" : "rien de noté"}${di && di.has ? `, note ${di.grade}` : ""}`}>
              <span className="wk-d">{L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
              <span className="wk-t">{di && di.has ? di.grade : ""}</span>
            </button>
          );
        })}
      </div>
      <button className={"bossc" + (b.dead ? " dead" : b.enraged ? " rage" : "")} onClick={() => ctx.open({ type: "boss" })} aria-label={`Boss de la semaine, ${b.n} : ${b.dead ? "vaincu" : `${fint(b.left)} PV restants`}`}>
        <span className="bossc-art"><BossArt id={b.id} size={48} dead={b.dead} /></span>
        <span className="bossc-m">
          <span className="bossc-top"><span className="bossc-n">{b.n}</span><span className="bossc-hp">{b.dead ? "Vaincu" : `${fint(b.left)} PV`}</span></span>
          <Meter v={b.left} max={b.hp} tone="red" label={`${fint(b.left)} PV sur ${fint(b.hp)}`} />
          <span className="bossc-s">{G.bossNeed(b)}</span>
        </span>
      </button>
    </Sec>
  );
}

// ═════════════════════════════════════════════════════════════
// Classé : ton rang selon ton poids (et la prochaine pesée)
// ═════════════════════════════════════════════════════════════
function RankLine({ ctx }) {
  const { S, todayK } = ctx;
  const rk = G.rank();
  const wk = L.nextWeighK(todayK, S);
  const weighed = L.getWeights()[todayK] != null;
  const inD = L.daysBetween(todayK, wk);
  const next = weighed ? "Pesée du jour notée." : inD <= 0 ? "Pesée prévue aujourd'hui." : `Prochaine pesée dans ${inD} jour${inD > 1 ? "s" : ""}.`;
  const go = () => ctx.go("profile", undefined, "rank");
  if (!rk) {
    return (
      <Sec title="Classé" className="rank">
        <button className="rankc" onClick={go}>
          <span className="rankc-e"><Emblem tier={0} size={56} dim /></span>
          <span className="rankc-m">
            <span className="rankc-n">Non classé</span>
            <span className="rankc-s">Note une pesée pour lancer ton classement. Ton rang suit ton poids jusqu'à {fdec(S.goalW)} kg, le rang Challenger.</span>
          </span>
        </button>
      </Sec>
    );
  }
  const last = rk.last;
  const ch = rk.cur.step >= G.STEPS;
  return (
    <Sec title="Classé" right={<>{fdec(last.sm, 1)} kg en moyenne</>} className="rank">
      <button className="rankc" onClick={go} aria-label={`Rang ${rk.cur.name}, ${rk.cur.lp} LP. Voir le classement.`}>
        <span className="rankc-e"><Emblem tier={rk.cur.tier} size={60} /></span>
        <span className="rankc-m">
          <span className="rankc-top"><span className="rankc-n">{rk.cur.name}</span><span className="rankc-lp">{rk.cur.lp} LP</span></span>
          <Meter v={ch ? 100 : rk.cur.lp} max={100} label={`${rk.cur.lp} LP sur 100`} />
          <span className="rankc-s">
            {last.dLP ? <>Dernière pesée {fdec(last.w)} kg : <b className={last.dLP > 0 ? "up" : "down"}>{last.dLP > 0 ? "+" : ""}{last.dLP} LP</b>. </> : null}
            {ch ? "Tu as atteint ton poids visé." : rk.promoAt ? <>Promotion vers le {short(rk.promoAt)} à ce rythme. </> : rk.rate != null && rk.rate <= 0.03 ? "Ça stagne : un shaker de plus par jour relance la prise. " : null}
            {next}
          </span>
        </span>
      </button>
    </Sec>
  );
}

// ═════════════════════════════════════════════════════════════
// Le coach : « ta journée change ? »
// ═════════════════════════════════════════════════════════════
function CoachBar({ ctx }) {
  return (
    <button className="cbar" onClick={() => ctx.open({ type: "coach" })}>
      <span className="cbar-ic"><Icon n="chat" size={18} /></span>
      <span className="cbar-tx"><b>Ta journée change ?</b><span>Sortie, service du soir, pas faim : ton coach réorganise tout.</span></span>
      <span className="cbar-go"><Icon n="right" size={18} /></span>
    </button>
  );
}
