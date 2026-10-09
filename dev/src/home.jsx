import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";
import * as A from "./actions.js";
import { Icon, Count, buzz } from "./ui.jsx";
import { GradRing, GlowLine, Wave, PillBars, ThinBar } from "./charts.jsx";

const { fint, fdec, fH } = L;

export function Home({ ctx }) {
  const d = L.getDay(ctx.todayK);
  return (
    <div className="page dash">
      <GreetCard ctx={ctx} d={d} />
      <PlanCard ctx={ctx} />
      <CaloriesCard ctx={ctx} d={d} />
      <div className="g2">
        <TimerCard ctx={ctx} />
        <WeatherCard ctx={ctx} />
      </div>
      <MissionsCard ctx={ctx} d={d} />
      <div className="g2">
        <SleepCard ctx={ctx} d={d} />
        <ShortcutsCard ctx={ctx} />
      </div>
      <WeekCard ctx={ctx} />
      <AveragesCard ctx={ctx} />
      <UpcomingCard ctx={ctx} />
    </div>
  );
}

function Card({ title, right, className = "", children, onClick }) {
  return (
    <section className={"card " + className} onClick={onClick}>
      {(title || right) && <div className="card-h">{title && <h2 className="card-t">{title}</h2>}{right}</div>}
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function GreetCard({ ctx, d }) {
  const now = new Date(ctx.now), h = now.getHours(), hr = h + now.getMinutes() / 60;
  const night = L.store.get("night", null);
  const nightH = night ? (now - new Date(night.bed)) / 3.6e6 : 0;
  const hello = night && nightH >= 3 ? "Bonjour," : h >= 5 && h < 12 ? "Bonjour," : h >= 12 && h < 18 ? "Bon après-midi," : h >= 18 && h < 23 ? "Bonsoir," : "Il est tard,";
  const R = L.rings(d, ctx.S);
  const bull = R.kcal >= 1 && R.prot >= 1 && R.sleep >= 1;
  const late = !night && L.isLate(ctx.todayK, now);
  const bt = L.bedTarget(ctx.todayK);
  const st = L.sleepStats(ctx.todayK, 7);
  const fallback = h >= 5 && h < 12 ? "Nouvelle journée. Un objectif à la fois." : h >= 12 && h < 18 ? "Reste focus et fais-le." : h >= 18 && h < 23 ? "Termine fort ta journée." : "La journée est finie.";
  let line = bull ? "🎯 Dans le mille : calories, protéines et sommeil atteints." : L.insight(ctx.todayK, ctx.S) || fallback;
  if (night) line = nightH >= 3 ? `Téléphone posé à ${L.hm(night.bed)}. Appuie dès que tu es levé.` : `Téléphone posé à ${L.hm(night.bed)}. Bonne nuit.`;
  else if (late) line = bt.plan ? `Tu avais prévu de te coucher vers ${L.hFr(bt.min)}. C'est le moment.` : st.avgBed != null ? `Ces 7 derniers soirs : couché vers ${L.hFr(st.avgBed)}. Vise ${L.hFr(bt.min)}.` : "Un appui quand tu poses le téléphone, un autre au réveil.";
  return (
    <section className={"card greet" + (night ? " is-night" : "")}>
      <div className="greet-top">
        <div>
          <div className="greet-hello">{hello}</div>
          <div className="greet-name">Isma</div>
        </div>
        <span className="pill">{L.hm(now)}</span>
      </div>
      <p className="greet-line">{line}</p>
      {night ? (
        nightH >= 3
          ? <button className="cta moon greet-cta" onClick={() => A.wakeNow(ctx)}>☀️ Je suis levé</button>
          : <button className="pill-btn ghost greet-cta2" onClick={() => { const u = L.snapKey("night"); L.store.del("night"); ctx.say("Nuit annulée", { undo: u }); }}>Annuler, je ne dors pas encore</button>
      ) : late ? (
        <button className="cta moon greet-cta" onClick={() => A.startNight(ctx)}>🌙 Je pose le téléphone</button>
      ) : (
        <GlowLine points={L.kcalSeries(ctx.todayK, now)} max={ctx.S.kcal * 0.6} />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Le coach : « ce soir je sors » → il réorganise la journée
// ─────────────────────────────────────────────────────────────
const CHIPS = ["Ce soir je sors", "Je bosse ce soir", "Je me suis levé tard", "J'ai pas faim", "Pas de salle aujourd'hui"];
const TRAIN_TXT = { today: "Séance aujourd'hui", tomorrow: "Séance décalée à demain", rest: "Repos aujourd'hui" };
function PlanCard({ ctx }) {
  const k = ctx.todayK;
  const plan = L.getPlan(k);
  const [txt, setTxt] = useState("");
  const ask = (m) => { const q = (m ?? txt).trim(); if (!q) return; setTxt(""); ctx.open({ type: "coach", ask: q }); };
  if (plan) {
    const meals = L.plannedMeals(k);
    const nm = L.nowDayMin(new Date(ctx.now));
    const bt = L.bedTarget(k);
    const reset = () => { const undo = L.snapKey("plan:" + k); L.setPlan(k, null); ctx.say("Retour au plan normal", { undo }); };
    return (
      <Card title="Ta journée, réorganisée" className="plan" right={<button className="pill" onClick={() => ctx.open({ type: "coach" })}><Icon n="chat" size={13} sw={2.2} /> Coach</button>}>
        {plan.summary && <p className="plan-sum">{plan.summary}</p>}
        <div className="plan-tags">
          {plan.bedtime && <span className="ptag moon">🌙 Coucher vers {L.hFr(bt.min)}</span>}
          {TRAIN_TXT[plan.training] && <span className="ptag">🏋️ {TRAIN_TXT[plan.training]}</span>}
        </div>
        {meals.length > 0 && (
          <div className="plan-meals">
            {meals.map((m, i) => {
              const past = !m.done && nm > m.at + 90, now = !m.done && nm >= m.at - 30 && nm <= m.at + 90;
              return (
                <div key={i} className={"pm" + (m.done ? " done" : "") + (now ? " now" : "") + (past ? " past" : "")}>
                  <span className="pm-t">{m.time}</span>
                  <span className="pm-dot" />
                  <span className="pm-main"><span className="pm-l">{m.label}</span>{m.idea && <span className="pm-i">{m.idea}</span>}</span>
                  <span className="pm-k">{m.done ? "✓" : `~${L.fint(m.kcal)}`}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="plan-btns">
          <button className="pill-btn" onClick={() => ctx.open({ type: "coach" })}>Changer encore</button>
          <button className="pill-btn ghost" onClick={reset}>Revenir au plan normal</button>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Ta journée change ?" className="agent">
      <p className="agent-sub">Dis-le à ton coach : il réorganise tes repas, ton coucher et ta séance.</p>
      <div className="agent-in">
        <input className="inp" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ce soir je sors jusqu'à 2 h…" onKeyDown={(e) => e.key === "Enter" && ask()} aria-label="Message au coach" />
        <button className="send" onClick={() => ask()} disabled={!txt.trim()} aria-label="Envoyer"><Icon n="right" size={20} sw={2.4} /></button>
      </div>
      <div className="agent-chips">
        {CHIPS.map((c) => <button key={c} className="chip" onClick={() => ask(c)}>{c}</button>)}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
function CaloriesCard({ ctx, d }) {
  const { S, todayK } = ctx;
  const t = L.dayTot(d);
  const pct = t.k / S.kcal;
  const msg = pct >= 1 ? "Objectif atteint" : pct >= 0.75 ? "Presque là !" : pct >= 0.5 ? "Bien parti !" : pct >= 0.25 ? "C'est lancé" : "On démarre";
  const night = L.store.get("night", null);
  const p = L.pace(todayK, new Date(ctx.now), S);
  const nm = L.nowDayMin(new Date(ctx.now));
  const planned = L.plannedMeals(todayK).find((m) => !m.done && m.at >= nm - 90);
  const target = planned ? planned.kcal : L.clamp(p.perMeal, 350, 1100);
  const fav = !night && p.remaining > 250 && !L.isLate(todayK, new Date(ctx.now)) ? L.bestFav(target) : null;
  return (
    <Card title="Calories" className="cal" right={<button className="pill" onClick={() => ctx.go("food")}>Aujourd'hui <Icon n="chevron" size={13} sw={2.4} /></button>}>
      <div className="cal-body">
        <div className="cal-l">
          <div className="big-num"><Count v={Math.round(pct * 100)} /><span>%</span></div>
          <div className="cal-msg">{msg}</div>
          <div className="cal-stats">
            <div><span>Mangé</span><b><Count v={t.k} /></b></div>
            <div><span>Objectif</span><b>{fint(S.kcal)}</b></div>
          </div>
        </div>
        <GradRing value={pct} size={118} stroke={11} from="#3E7BFF" to="#9A6BFF">
          <div className="ring-in"><b><Count v={Math.max(0, S.kcal - t.k)} /></b><span>restantes</span></div>
        </GradRing>
      </div>
      <ThinBar label="Protéines" pct={t.p / S.prot} from="#FF8A3D" to="#FFB547" right={`${fint(t.p)} / ${S.prot} g`} />
      {fav && (
        <button className="suggest" onClick={() => A.addItems(ctx, todayK, fav.f.items, fav.f.name)}>
          <span className="sg-l"><span className="sg-k">{planned ? `${planned.label} (${planned.time.replace(":", " h ")})` : "Prochain repas"}, vise ~{fint(Math.round(target / 50) * 50)} kcal</span><span className="sg-n">{fav.f.name}</span></span>
          <span className="sg-r">{fint(fav.k)} kcal<span className="sg-plus"><Icon n="plus" size={16} sw={2.6} /></span></span>
        </button>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Minuteur : focus 25 min ou repos à la salle
// ─────────────────────────────────────────────────────────────
const PRESETS = [
  { id: "focus", label: "Focus", sub: "Concentration", s: 25 * 60 },
  { id: "rest", label: "Repos", sub: "Entre deux séries", s: 120 },
  { id: "short", label: "Repos court", sub: "Isolation", s: 90 },
];
let audio = null;
const beep = () => {
  try {
    if (!audio) return;
    [0, 0.28, 0.56].forEach((t) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(0.0001, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.22);
      o.connect(g).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.25);
    });
  } catch {}
};
function TimerCard({ ctx }) {
  const st = L.store.get("timer", { p: 0, end: null, left: null });
  const pr = PRESETS[st.p % PRESETS.length];
  const [, tick] = useState(0);
  const running = !!st.end;
  const left = running ? Math.max(0, Math.round((st.end - Date.now()) / 1000)) : st.left ?? pr.s;
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      tick((x) => x + 1);
      const cur = L.store.get("timer", null);
      if (cur?.end && Date.now() >= cur.end) {
        L.store.set("timer", { p: cur.p, end: null, left: null });
        beep(); buzz(400);
        ctx.say(cur.p === 0 ? "Session focus terminée. Prends 5 min de pause." : "Repos terminé, série suivante 💪");
      }
    }, 250);
    return () => clearInterval(iv);
  }, [running]);
  const start = () => {
    try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {}
    L.store.set("timer", { p: st.p, end: Date.now() + left * 1000, left: null }); buzz(10);
  };
  const pause = () => L.store.set("timer", { p: st.p, end: null, left });
  const reset = () => L.store.set("timer", { p: st.p, end: null, left: null });
  const cycle = () => { if (!running) L.store.set("timer", { p: (st.p + 1) % PRESETS.length, end: null, left: null }); };
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <Card title="Minuteur" className="timer" right={<button className="pill sm" onClick={cycle} disabled={running} aria-label="Changer de minuteur">{pr.label}</button>}>
      <div className="timer-ring">
        <GradRing value={left / pr.s} size={112} stroke={7} from="#FF6A2B" to="#FFC15A">
          <div className="t-num">{mm}:{ss}</div>
          <div className="t-sub">{pr.sub}</div>
        </GradRing>
      </div>
      <div className="timer-btns">
        {running
          ? <button className="pill-btn" onClick={pause}><span className="pause-ic" />Pause</button>
          : <button className="pill-btn" onClick={start}><span className="play-ic" />{st.left != null ? "Reprendre" : "Lancer"}</button>}
        {(running || st.left != null) && <button className="pill-btn ghost" onClick={reset} aria-label="Remettre à zéro">↺</button>}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
function WeatherCard({ ctx }) {
  const w = L.getWeather();
  const k = ctx.todayK;
  const d = L.keyToDate(k);
  const x = w ? L.wmo(w.code, w.day) : null;
  return (
    <Card className="weather">
      <div className="wx-date">{d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
      <div className="wx-day">{L.cap(d.toLocaleDateString("fr-FR", { weekday: "long" }))} · Perth</div>
      {w ? (
        <>
          <div className="wx-now"><span className="wx-ic">{x.ic}</span><span className="wx-t">{Math.round(w.t)}°</span></div>
          <div className="wx-l">{x.label}</div>
          {w.max != null && <div className="wx-hl">Max {Math.round(w.max)}°  Min {Math.round(w.min)}°</div>}
        </>
      ) : <div className="wx-l mt14">Météo indisponible hors connexion</div>}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Missions : la liste de la journée, avec la prochaine action en avant
// ─────────────────────────────────────────────────────────────
function MissionsCard({ ctx, d }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now), hr = now.getHours() + now.getMinutes() / 60;
  const t = L.dayTot(d);
  const night = L.store.get("night", null);
  const top = L.focusActions(todayK, now, S)[0]?.id;
  const tr = L.trainingStatus(todayK);
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const water = d.water || 0;
  const st = L.sleepStats(todayK, 7);
  const rows = [];
  if (night) rows.push({ id: "wake", label: "Je suis levé", sub: `Téléphone posé à ${L.hm(night.bed)}`, done: false, status: { text: "Maintenant", cls: "now" }, act: () => A.wakeNow(ctx) });
  rows.push({ id: "light", label: "Lumière du jour", sub: "10 min dehors après le réveil", done: !!d.h.light, status: d.h.light ? { text: "Fait" } : top === "light" ? { text: "Maintenant", cls: "now" } : { text: "À faire" }, act: () => A.toggleHabit(ctx, todayK, "light", "Lumière du jour") });
  rows.push({ id: "meal", label: "Calories", sub: `${fint(t.k)} / ${fint(S.kcal)} kcal`, done: t.k >= S.kcal, status: t.k >= S.kcal ? { text: "Fait" } : top === "eat" ? { text: "Maintenant", cls: "now" } : t.k > 0 ? { text: "En cours", cls: "prog" } : { text: "À faire" }, act: () => ctx.open({ type: "add", k: todayK }) });
  rows.push({ id: "prot", label: "Protéines", sub: `${fint(t.p)} / ${S.prot} g`, done: t.p >= S.prot, status: t.p >= S.prot ? { text: "Fait" } : top === "prot" ? { text: "Maintenant", cls: "now" } : t.p > 0 ? { text: "En cours", cls: "prog" } : { text: "À faire" }, act: () => ctx.open({ type: "add", k: todayK }) });
  rows.push({ id: "crea", label: "Créatine", sub: autoCrea ? "Comptée dans ton shaker" : "5 g", done: autoCrea || !!d.h.creatine, status: autoCrea || d.h.creatine ? { text: "Fait" } : { text: "À faire" }, act: autoCrea ? null : () => A.toggleHabit(ctx, todayK, "creatine", "Créatine") });
  rows.push({ id: "water", label: "Eau", sub: `${fdec(water)} / ${fdec(S.water)} L · touche pour +0,5 L`, done: water >= S.water, status: water >= S.water ? { text: "Fait" } : water > 0 ? { text: "En cours", cls: "prog" } : { text: "À faire" }, act: () => A.addWater(ctx, todayK, 0.5) });
  rows.push(tr.todayW
    ? { id: "train", label: `Séance ${tr.todayW.session || ""}`.trim(), sub: tr.todayW.title, done: true, status: { text: "Fait" }, act: () => ctx.go("sport") }
    : tr.due ? { id: "train", label: `Séance ${tr.next}`, sub: "Tes charges sont prêtes", done: false, status: top === "train" ? { text: "Maintenant", cls: "now" } : { text: "Aujourd'hui", cls: "prog" }, act: () => ctx.go("sport") }
    : { id: "train", label: "Repos", sub: tr.wk >= 3 ? "Semaine bouclée, 3/3 séances" : tr.moved === "tomorrow" ? `Séance ${tr.next} décalée à demain` : `Séance ${tr.next} demain · ${tr.wk}/3 cette semaine`, done: true, status: { text: "Repos" }, act: () => ctx.go("sport") });
  const isWeigh = L.keyToDate(todayK).getDay() === S.weighDay && L.getWeights()[todayK] == null;
  if (isWeigh) rows.splice(1, 0, { id: "weigh", label: "Pesée", sub: "À jeun, après les toilettes", done: false, status: top === "weigh" ? { text: "Maintenant", cls: "now" } : { text: "Aujourd'hui", cls: "prog" }, act: () => ctx.go("progress", undefined, "weight") });
  const bt = L.bedTarget(todayK);
  if (!night) rows.push({ id: "bed", label: "Poser le téléphone", sub: `${bt.plan ? "Prévu vers" : "Vise"} ${L.hFr(bt.min)}`, done: false, status: top === "bed" ? { text: "Maintenant", cls: "now" } : { text: "Ce soir" }, act: () => (L.isLate(todayK, now) || hr >= 20 || hr < 5 ? A.startNight(ctx) : ctx.say("Ce soir, au moment de dormir 🌙")) });
  const counted = rows.filter((r) => r.id !== "bed" && r.id !== "wake");
  const count = counted.filter((r) => r.done).length, total = counted.length;
  return (
    <Card title="Missions du jour" className="missions" right={<span className="pill sm">{count}/{total}</span>}>
      <div className="mlist">
        {rows.map((r) => (
          <button key={r.id} className={"mrow" + (r.done ? " done" : "") + (r.status.cls === "now" ? " hot" : "")} onClick={r.act || undefined} disabled={!r.act}>
            <span className={"mcheck" + (r.done ? " on" : "")}>{r.done && <Icon n="check" size={13} sw={3} />}</span>
            <span className="mtext"><span className="ml">{r.label}</span><span className="ms">{r.sub}</span></span>
            <span className={"mstat " + (r.status.cls || "")}>{r.status.text}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
function SleepCard({ ctx, d }) {
  const night = L.store.get("night", null);
  const h = L.daySleepH(d), q = d.sleep?.q;
  const energy = q ? ["Très basse", "Basse", "Moyenne", "Bonne", "Au top"][q - 1] : null;
  const ecls = q >= 4 ? "good" : q === 3 ? "mid" : q ? "low" : "";
  const open = () => (night ? A.wakeNow(ctx) : ctx.open({ type: "sleep", k: ctx.todayK }));
  return (
    <Card title="Sommeil" className="sleepc" onClick={open}>
      <div className="sl-main">{night ? "Nuit en cours" : h != null ? fH(h) : "Pas notée"}</div>
      <Wave amp={q ? q / 5 : 0.4} />
      <div className="sl-foot">
        {night ? <><span>Réveillé ?</span><b className="good">Touche ici</b></>
          : energy ? <><span>Énergie</span><b className={ecls}>{energy}</b></>
          : h != null ? <><span>Énergie</span><b className="mid">À noter</b></>
          : <><span>Ta nuit</span><b className="mid">À noter</b></>}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
function ShortcutsCard({ ctx }) {
  const k = ctx.todayK;
  const items = [
    { ic: "pen", l: "Écrire", f: () => ctx.open({ type: "add", k }) },
    { ic: "camera", l: "Photo", f: () => ctx.open({ type: "add", k, mode: "photo" }) },
    { ic: "star", l: "Favoris", f: () => ctx.open({ type: "add", k }) },
    { ic: "clip", l: "Hevy", f: () => ctx.open({ type: "hevy" }) },
    { ic: "scale", l: "Pesée", f: () => ctx.go("progress", undefined, "weight") },
    { ic: "chat", l: "Coach", f: () => ctx.open({ type: "coach" }) },
  ];
  return (
    <Card title="Raccourcis" className="shortcuts">
      <div className="sc-grid">
        {items.map((x) => (
          <button key={x.l} className="sc" onClick={x.f}>
            <span className="sc-ic"><Icon n={x.ic} size={19} /></span>
            <span className="sc-l">{x.l}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
const METRICS = [
  { id: "kcal", l: "Calories", c: "linear-gradient(180deg, #7FA8FF, #3E7BFF)" },
  { id: "prot", l: "Protéines", c: "linear-gradient(180deg, #FFC15A, #FF7A35)" },
  { id: "sleep", l: "Sommeil", c: "linear-gradient(180deg, #C4B5FF, #8B6BFF)" },
];
function WeekCard({ ctx }) {
  const { S, todayK } = ctx;
  const [m, setM] = useState(0);
  const [sel, setSel] = useState(todayK);
  const met = METRICS[m];
  const ws = L.weekStartKey(todayK);
  const days = Array.from({ length: 7 }, (_, i) => {
    const k = L.addDays(ws, i), d = L.getDay(k), t = L.dayTot(d), h = L.daySleepH(d);
    const v = met.id === "kcal" ? t.k / S.kcal : met.id === "prot" ? t.p / S.prot : (h ?? 0) / S.sleep;
    const txt = met.id === "kcal" ? `${fint(t.k)}` : met.id === "prot" ? `${fint(t.p)} g` : h != null ? fH(h) : "–";
    return { k, v, txt, future: k > todayK, label: L.cap(L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")) };
  });
  return (
    <Card title="Cette semaine" className="week" right={<button className="pill" onClick={() => setM((m + 1) % METRICS.length)}>{met.l} <Icon n="chevron" size={13} sw={2.4} /></button>}>
      <PillBars days={days} sel={sel} onSel={setSel} color={met.c} />
      <button className="link small mt8" onClick={() => ctx.go("food", sel)}>Voir le détail du {L.fmtDay(sel, { weekday: "long" })}</button>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
function AveragesCard({ ctx }) {
  const { S, todayK } = ctx;
  const a = L.weekAverages(todayK, S);
  return (
    <Card title="Régularité de la semaine" className="avg">
      <div className="avg-body">
        <GradRing value={a.score} size={104} stroke={8} from="#3ED2F2" to="#3E7BFF">
          <div className="ring-in"><b>{Math.round(a.score * 100)} %</b><span>{a.score >= 0.85 ? "Solide" : a.score >= 0.6 ? "Correct" : "À relancer"}</span></div>
        </GradRing>
        <div className="avg-bars">
          <ThinBar label="Calories" pct={(a.kcal || 0) / S.kcal} from="#3E7BFF" to="#7FA8FF" />
          <ThinBar label="Protéines" pct={(a.prot || 0) / S.prot} from="#FF7A35" to="#FFC15A" />
          <ThinBar label="Sommeil" pct={(a.sleep || 0) / S.sleep} from="#8B6BFF" to="#C4B5FF" />
          <ThinBar label="Séances" pct={a.wk / 3} from="#3ED2F2" to="#8BE9FF" right={`${a.wk}/3`} />
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
function UpcomingCard({ ctx }) {
  const list = L.upcoming(ctx.todayK, ctx.S, new Date(ctx.now));
  return (
    <Card title="À venir" className="upcoming" right={<button className="link small" onClick={() => ctx.go("sport")}>Programme</button>}>
      {list.map((e, i) => {
        const d = L.keyToDate(e.k);
        return (
          <div key={i} className="ev">
            <span className="ev-d"><b>{d.getDate()}</b><span>{d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span></span>
            <span className="ev-t"><span className="ev-n">{e.title}</span><span className="ev-s">{e.sub}</span></span>
            <span className="ev-dot" style={{ background: e.dot, boxShadow: `0 0 10px ${e.dot}` }} />
          </div>
        );
      })}
    </Card>
  );
}
