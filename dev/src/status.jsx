// ═════════════════════════════════════════════════════════════
// Status : l'état de la machine en un coup d'œil.
// La prochaine action, 4 systèmes, les alertes, le protocole, la semaine.
// ═════════════════════════════════════════════════════════════
import React from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import * as A from "./actions.js";
import { Icon } from "./ui.jsx";
import { Header, Sec, St, Bar, Spark, lvl, sign } from "./kit.jsx";

const { fint, fdec, fH } = L;

export function Status({ ctx }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const night = L.store.get("night", null);
  const sys = E.systems(todayK, now);
  const al = E.alerts(todayK, now);
  const states = [sys.fuel.st, sys.rec.st, sys.mass.st, sys.train.st];
  const nOk = states.filter((s) => s === "ok").length, nW = states.filter((s) => s === "warn").length, nC = states.filter((s) => s === "crit").length;
  const date = L.cap(L.fmtDay(todayK, { weekday: "long", day: "numeric", month: "long" }));
  return (
    <div className="page">
      <Header ctx={ctx} title="Status" sub={`${date} · ${L.hm(now)}`} />
      <div className="sum" aria-label="Résumé">
        <span><i className="dot ok" />{nOk} nomina{nOk > 1 ? "ux" : "l"}</span>
        {nW > 0 && <span><i className="dot warn" />{nW} à surveiller</span>}
        {nC > 0 && <span><i className="dot crit" />{nC} critique{nC > 1 ? "s" : ""}</span>}
        {al.length > 0 && <span className="dim">{al.length} alerte{al.length > 1 ? "s" : ""}</span>}
      </div>

      {night ? <Night ctx={ctx} night={night} now={now} /> : <Next ctx={ctx} now={now} />}

      <div className="sys-grid">
        <FuelSys ctx={ctx} f={sys.fuel} />
        <SleepSys ctx={ctx} r={sys.rec} />
        <MassSys ctx={ctx} m={sys.mass} />
        <TrainSys ctx={ctx} t={sys.train} />
      </div>

      {al.length > 0 && (
        <Sec code="!" title="Alertes" right={`${al.length}`}>
          <div className="alerts">
            {al.map((a) => <div key={a.id} className={"al " + a.lv}><div><b>{a.t}</b><span>{a.s}</span></div></div>)}
          </div>
        </Sec>
      )}

      <Protocol ctx={ctx} />
      <Week ctx={ctx} />
    </div>
  );
}

// ── La prochaine action : une seule, avec son bouton
function Next({ ctx, now }) {
  const { S, todayK } = ctx;
  const a = L.focusActions(todayK, now, S)[0];
  if (!a || ["done", "fed", "chill", "sleeping"].includes(a.id)) {
    return a ? <div className="next"><div className="next-tx"><div className="next-k">Prochaine action</div><div className="next-t">{a.title}</div><div className="next-s">{a.text}</div></div></div> : null;
  }
  let btn = null;
  const fav = a.id === "eat" && a.target ? L.bestFav(a.target) : null;
  switch (a.id) {
    case "bed": btn = <button className="btn sleep" onClick={() => A.startNight(ctx)}><Icon n="moon" size={16} /> Mode nuit</button>; break;
    case "weigh": btn = <button className="btn" onClick={() => ctx.console("poids ")}>Noter</button>; break;
    case "light": btn = <button className="btn" onClick={() => A.setHabit(ctx, todayK, "light", true)}>Fait</button>; break;
    case "crea": btn = <button className="btn" onClick={() => A.setHabit(ctx, todayK, "creatine", true)}>Prise</button>; break;
    case "water": btn = <button className="btn" onClick={() => A.addWater(ctx, todayK, 0.5)}>+0,5 L</button>; break;
    case "logNight": btn = <button className="btn" onClick={() => ctx.open({ type: "sleep", k: todayK })}>Noter</button>; break;
    case "posture": btn = <button className="btn" onClick={() => ctx.open({ type: "posture" })}><Icon n="play" size={15} /> Lancer</button>; break;
    case "train": btn = <button className="btn" onClick={() => ctx.go("sport")}>Voir</button>; break;
    case "photo": btn = <button className="btn" onClick={() => ctx.go("lab")}>Photo</button>; break;
    case "eat": case "prot": btn = fav && Math.abs(L.itemsTot(fav.f.items).k - a.target) < a.target * 0.45
      ? <button className="btn" onClick={() => A.addItems(ctx, todayK, fav.f.items, fav.f.name)}><Icon n="plus" size={15} sw={2.4} /> {fint(fav.k)}</button>
      : <button className="btn" onClick={() => ctx.console("")}>Noter</button>; break;
    default: break;
  }
  return (
    <div className={"next" + (a.tone === "moon" ? " moon" : "")}>
      <div className="next-tx">
        <div className="next-k">Prochaine action</div>
        <div className="next-t">{a.title}</div>
        <div className="next-s">{fav && btn && a.id === "eat" ? `${fav.f.name} : ${fint(fav.k)} kcal en un appui.` : a.text}</div>
      </div>
      {btn}
    </div>
  );
}

function Night({ ctx, night, now }) {
  const h = (now - new Date(night.bed)) / 3.6e6;
  return (
    <section className="nightp" aria-label="Mode nuit">
      <div className="pnl-h"><span className="lbl" style={{ color: "var(--sleep)" }}>Mode nuit depuis {L.hm(night.bed)}</span><St s="idle" label="En charge" /></div>
      <div className="big xl"><b>{fH(h)}</b><span>/ {fdec(ctx.S.sleep)} h</span></div>
      <div style={{ marginTop: 12 }}><Bar v={h} max={ctx.S.sleep} tone="sleep" /></div>
      <div className="btn-row">
        <button className="btn ghost" onClick={() => { const u = L.snapKey("night"); L.store.del("night"); ctx.say("Mode nuit annulé", { undo: u }); }}>Annuler</button>
        <button className="btn sleep" onClick={() => A.wakeNow(ctx)}><Icon n="sun" size={16} /> Je suis levé</button>
      </div>
    </section>
  );
}

// ── Les 4 systèmes
function Sys({ code, name, st, onClick, children, line }) {
  return (
    <button className={"sys " + st} onClick={onClick} aria-label={`${name} : ${E.stName(st)}. ${line}`}>
      <div className="sys-h"><span className="sys-n"><b>{code}</b>{name}</span><i className={"dot " + st} /></div>
      {children}
      <div className="sys-l">{line}</div>
    </button>
  );
}
function FuelSys({ ctx, f }) {
  return (
    <Sys code="01" name="Carburant" st={f.st} line={f.line} onClick={() => ctx.go("fuel")}>
      <div className="big"><b>{fint(f.v)}</b><span>/ {fint(f.goal)}</span></div>
      <Bar v={f.v} max={f.goal} mark={f.st !== "idle" && f.v < f.goal ? f.expected : null} proj={f.proj?.end} label={`${fint(f.v)} kcal sur ${fint(f.goal)}`} />
      <div className="sys-sub"><span>Prot. <b>{fint(f.prot)}</b>/{fint(f.protGoal)} g</span></div>
    </Sys>
  );
}
function SleepSys({ ctx, r }) {
  const vals = Array.from({ length: 7 }, (_, i) => { const k = L.addDays(ctx.todayK, i - 6); const n = r.nights.find((x) => x.k === k); return n ? n.h : null; });
  return (
    <Sys code="02" name="Récup" st={r.st} line={r.line} onClick={() => ctx.open({ type: "sleep", k: ctx.todayK })}>
      <div className="big"><b>{r.v != null ? fH(r.v) : "–"}</b></div>
      <div className="sys-sub"><span>Cette nuit</span><span>visé <b>{fdec(r.goal)} h</b></span></div>
      <Spark values={vals} goal={r.goal} bars min={0} max={Math.max(r.goal + 1.5, ...vals.filter((x) => x != null))} color={(v) => (v >= r.goal ? "var(--sleep)" : v >= r.goal - 1 ? "var(--warn)" : "var(--crit)")} h={24} />
    </Sys>
  );
}
function MassSys({ ctx, m }) {
  const mt = m.mt;
  const pts = mt ? mt.list.slice(-10).map(([, v]) => v) : [];
  return (
    <Sys code="03" name="Masse" st={m.st} line={m.line} onClick={() => ctx.go("lab")}>
      <div className="big"><b>{mt ? fdec(mt.latest[1], 1) : "–"}</b><span>kg</span></div>
      <div className="sys-sub"><span>Tendance</span><b>{mt?.rate != null ? `${sign(mt.rate, 2)} kg/sem` : "–"}</b></div>
      {pts.length >= 2 ? <Spark values={pts} color="var(--mass)" h={24} dots /> : <div style={{ height: 24 }} />}
    </Sys>
  );
}
function TrainSys({ ctx, t }) {
  const { tr, rd } = t;
  return (
    <Sys code="04" name="Entraînement" st={t.st} line={t.line} onClick={() => ctx.go("sport")}>
      <div className="big"><b>{tr.wk}</b><span>/ 3 séances</span></div>
      <Bar v={rd.pct} max={100} tone="train" thin label={`Forme ${rd.pct} %`} />
      <div className="sys-sub"><span>Forme <b>{rd.pct} %</b></span><span>{rd.adv.t}</span></div>
    </Sys>
  );
}

// ── Le protocole du jour
function Protocol({ ctx }) {
  const { S, todayK } = ctx;
  const d = L.getDay(todayK);
  const rit = L.activeRituals(S);
  const w = d.water || 0;
  const done = rit.filter((r) => L.ritualDone(r.id, d, S)).length + (w >= S.water ? 1 : 0);
  return (
    <Sec code="05" title="Protocole" right={`${done}/${rit.length + 1}`}>
      <div className="proto">
        {rit.map((r) => {
          const on = L.ritualDone(r.id, d, S);
          const h = E.habit(r.id, todayK);
          return (
            <button key={r.id} className={"chk" + (on ? " on" : "")} onClick={() => (r.id === "posture" && !on ? ctx.open({ type: "posture" }) : A.setHabit(ctx, todayK, r.id))} aria-pressed={on}>
              <span className="chk-b"><Icon n="check" size={12} sw={3} /></span>
              <span className="chk-tx"><span className="chk-n">{r.label}</span><span className="chk-s">{on ? (h.run > 1 ? `${h.run} j d'affilée` : "fait") : h.run > 0 ? `série ${h.run} j · à faire` : "à faire"}</span></span>
            </button>
          );
        })}
        <button className={"chk water" + (w >= S.water ? " on" : "")} onClick={() => A.addWater(ctx, todayK, 0.5)} aria-label={`Eau : ${fdec(w, 2)} litres sur ${fdec(S.water)}. Ajouter 0,5 L`}>
          <span className="chk-b"><Icon n={w >= S.water ? "check" : "plus"} size={12} sw={3} /></span>
          <span className="chk-tx"><span className="chk-n">Eau</span><span className="chk-s">{fdec(w, 2)}/{fdec(S.water)} L</span></span>
        </button>
      </div>
    </Sec>
  );
}

// ── La semaine : 7 jours × 5 mesures
function Week({ ctx }) {
  const { S, todayK } = ctx;
  const m = L.weekMatrix(todayK, S);
  const rows = [["kcal", "Calories"], ["prot", "Protéines"], ["sleep", "Sommeil"], ["train", "Séance"], ["rit", "Protocole"]];
  const wa = L.weekAverages(todayK, S);
  return (
    <Sec code="06" title="Semaine" right={wa.kcal != null ? `moy. ${fint(wa.kcal)} kcal` : ""}>
      <div className="pnl" style={{ marginTop: 0 }}>
        <div className="mx" role="table" aria-label="Ta semaine">
          <span />
          {m.map((x) => <span key={x.k} className={"mx-d" + (x.today ? " today" : "")}>{L.keyToDate(x.k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>)}
          {rows.map(([id, n]) => (
            <React.Fragment key={id}>
              <span className="mx-r">{n}</span>
              {m.map((x) => <span key={x.k} className={"mx-c " + (x.future ? "fut" : id === "train" ? (x.train ? "l3" : "") : lvl(x[id])) + (x.today ? " today" : "")} title={x[id] != null ? `${Math.round(x[id] * 100)} %` : ""} />)}
            </React.Fragment>
          ))}
        </div>
        <div className="legend"><span><i style={{ background: "rgba(61,220,132,.7)" }} />≥ 95 %</span><span><i style={{ background: "rgba(255,176,32,.6)" }} />80–95 %</span><span><i style={{ background: "rgba(255,79,79,.5)" }} />&lt; 80 %</span></div>
      </div>
    </Sec>
  );
}
