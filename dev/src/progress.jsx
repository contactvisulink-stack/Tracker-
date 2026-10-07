import React, { useState } from "react";
import * as L from "./lib.js";
import { MiniTarget, Count, buzz } from "./ui.jsx";

const { fint, fdec, fH } = L;
const shortDate = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" }));
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function Progress({ ctx }) {
  const [tab, setTab] = useState(ctx.sub === "weight" ? "weight" : "stats");
  return (
    <div className="page">
      <div className="seg">
        <button className={tab === "stats" ? "on" : ""} onClick={() => setTab("stats")}>Ma progression</button>
        <button className={tab === "weight" ? "on" : ""} onClick={() => setTab("weight")}>Poids</button>
      </div>
      {tab === "stats" ? <Stats ctx={ctx} /> : <Weight ctx={ctx} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function Weight({ ctx }) {
  const { S, todayK } = ctx;
  const list = L.weightList();
  const [inp, setInp] = useState("");
  const todayW = L.getWeights()[todayK];
  const latest = list.length ? list[list.length - 1][1] : null;
  const first = list.length ? list[0][1] : null;
  const rate = L.weeklyRate(list, todayK);
  const weighDay = L.keyToDate(todayK).getDay() === S.weighDay;
  const save = () => {
    const v = L.num(inp);
    if (v == null || v < 30 || v > 200) { ctx.say("Écris ton poids, par exemple 52,4"); return; }
    const undo = L.snapKey("iwt", true);
    L.setWeights({ ...L.getWeights(), [todayK]: Math.round(v * 10) / 10 });
    setInp(""); buzz(12); ctx.say(`Pesée notée : ${fdec(v)} kg`, { undo });
  };
  const remove = () => { const undo = L.snapKey("iwt", true); const w = { ...L.getWeights() }; delete w[todayK]; L.setWeights(w); ctx.say("Pesée retirée", { undo }); };
  const prog = latest != null && first != null && S.goalW > first ? L.clamp((latest - first) / (S.goalW - first), 0, 1) : 0;
  let rateTxt = "Il faut deux pesées à au moins une semaine d'écart pour voir ton rythme.";
  if (rate != null) {
    if (rate < 0.1) rateTxt = "Ça stagne : ajoute environ 300 kcal par jour, un shaker en plus suffit.";
    else if (rate < 0.25) rateTxt = "Ça monte doucement : 200 kcal de plus par jour accéléreraient.";
    else if (rate <= 0.6) rateTxt = "Bon rythme. Continue comme ça.";
    else rateTxt = "Ça monte vite : parfait vu d'où tu pars.";
  }
  return (
    <>
      <section className="panel">
        <div className="w-hero">
          <div><div className="item-sub">Aujourd'hui</div><div className="w-big">{latest != null ? <Count v={latest} dec={1} /> : "–"}<span> kg</span></div></div>
          <div className="w-goal"><div className="item-sub">Objectif</div><div className="w-goal-v">{fdec(S.goalW)} kg</div></div>
        </div>
        <div className="pbar-track"><div className="pbar-fill" style={{ width: `${prog * 100}%`, background: "var(--sky)" }} /></div>
        <div className="row-between mt8 item-sub">
          <span>{latest != null ? `${fdec(Math.max(0, S.goalW - latest))} kg à prendre` : "Note ton poids pour commencer"}</span>
          {first != null && latest != null && <span>{latest - first >= 0 ? "+" : ""}{fdec(latest - first)} kg depuis le début</span>}
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat"><div className="stat-v">{rate != null ? `${rate >= 0 ? "+" : ""}${fdec(rate, 2)}` : "–"}<small> kg/sem</small></div><div className="stat-l">rythme sur 5 semaines</div></div>
        <div className="stat"><div className="stat-v">{list.length}</div><div className="stat-l">pesées, le {DAYS[S.weighDay]} matin</div></div>
      </div>
      <p className="insight-line left">{rateTxt}</p>

      <section className={"panel" + (weighDay && todayW == null ? " glow-sky" : "")}>
        <h2 className="panel-t">{weighDay && todayW == null ? "C'est le jour de la pesée" : "Pesée"}</h2>
        {todayW != null ? (
          <div className="row-between"><span className="w-ok">✓ {fdec(todayW)} kg</span><button className="link" onClick={remove}>Modifier</button></div>
        ) : (
          <div className="cta-row">
            <input className="inp big-inp" inputMode="decimal" value={inp} onChange={(e) => setInp(e.target.value)} placeholder={latest != null ? fdec(latest) : "52,4"} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Poids en kg" />
            <button className="cta sky" onClick={save}>Noter</button>
          </div>
        )}
        <p className="hint">Une fois par semaine, le {DAYS[S.weighDay]} : le matin, à jeun, après les toilettes, même balance.</p>
      </section>

      {list.length >= 2 && <section className="panel"><h2 className="panel-t">Évolution</h2><WeightChart list={list.slice(-20)} goal={S.goalW} /></section>}

      {list.length > 0 && (
        <section className="block">
          <div className="block-head"><h3>Historique</h3></div>
          {[...list].reverse().slice(0, 12).map(([k, v], i, arr) => {
            const prev = arr[i + 1];
            const diff = prev ? Math.round((v - prev[1]) * 10) / 10 : null;
            return (
              <div key={k} className="hist-row">
                <span>{shortDate(k)}</span>
                <span>{diff != null && <span className={diff > 0 ? "up-txt" : diff < 0 ? "down-txt" : "muted"}>{diff > 0 ? "+" : ""}{fdec(diff)}   </span>}<b>{fdec(v)} kg</b></span>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

function WeightChart({ list, goal }) {
  const W = 320, H = 130, P = 8;
  const vals = list.map(([, v]) => v);
  let min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const showGoal = goal <= max + 2;
  if (showGoal) max = Math.max(max, goal + 0.3);
  const t0 = L.keyToDate(list[0][0]).getTime(), t1 = L.keyToDate(list[list.length - 1][0]).getTime();
  const x = (k) => P + ((L.keyToDate(k).getTime() - t0) / (t1 - t0 || 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - min) / (max - min)) * (H - 2 * P - 16);
  const pts = list.map(([k, v]) => [x(k), y(v)]);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6CB8FF" stopOpacity=".32" /><stop offset="100%" stopColor="#6CB8FF" stopOpacity="0" /></linearGradient></defs>
        {showGoal && <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--sun)" strokeDasharray="4 4" opacity=".6" />}
        <path d={`M${pts[0][0]},${H} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${H} Z`} fill="url(#wg)" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--sky)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill="var(--sky)" stroke="var(--ink)" strokeWidth="1.5" />)}
        <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 10} textAnchor="end" fill="var(--tx)" fontSize="11" fontWeight="600">{fdec(vals[vals.length - 1])} kg</text>
      </svg>
      <div className="row-between item-sub mt6">
        <span>{shortDate(list[0][0])}</span>
        {showGoal && <span style={{ color: "var(--sun)" }}>pointillés : objectif</span>}
        <span>{shortDate(list[list.length - 1][0])}</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
function Stats({ ctx }) {
  const { S, todayK } = ctx;
  const [n, setN] = useState(7);
  const keys = Array.from({ length: n }, (_, i) => L.addDays(todayK, i - n + 1));
  const days = keys.map((k) => ({ k, d: L.getDay(k) }));
  const fed = days.filter((x) => L.hasFood(x.d) && x.k !== todayK);
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const avgK = avg(fed.map((x) => L.dayTot(x.d).k));
  const avgP = avg(fed.map((x) => L.dayTot(x.d).p));
  const hit = fed.filter((x) => L.dayTot(x.d).k >= S.kcal).length;
  const sl = L.sleepStats(todayK, n);
  const ws = L.getWorkouts().filter((w) => w.date.slice(0, 10) >= keys[0] && w.date.slice(0, 10) <= todayK);
  const wl = L.weightList().filter(([k]) => k >= keys[0] && k <= todayK);
  const dW = wl.length >= 2 ? wl[wl.length - 1][1] - wl[0][1] : null;
  const hist = [...days].reverse().filter((x) => L.dayHasData(x.d));
  return (
    <>
      <div className="seg small">
        {[7, 30].map((v) => <button key={v} className={n === v ? "on" : ""} onClick={() => setN(v)}>{v} jours</button>)}
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="stat-v" style={{ color: "var(--sun)" }}>{avgK != null ? fint(avgK) : "–"}<small> kcal</small></div><div className="stat-l">par jour, sur {fint(S.kcal)}</div></div>
        <div className="stat"><div className="stat-v" style={{ color: "var(--flesh)" }}>{avgP != null ? fint(avgP) : "–"}<small> g</small></div><div className="stat-l">de protéines par jour</div></div>
        <div className="stat"><div className="stat-v" style={{ color: "var(--moon)" }}>{sl.avgH != null ? fH(sl.avgH) : "–"}</div><div className="stat-l">{sl.avgBed != null ? `de sommeil, couché vers ${L.nightMinToHM(sl.avgBed)}` : "de sommeil par nuit"}</div></div>
        <div className="stat"><div className="stat-v">{hit}<small> / {fed.length}</small></div><div className="stat-l">jours au-dessus de l'objectif</div></div>
        <div className="stat"><div className="stat-v">{ws.length}</div><div className="stat-l">{n === 30 ? `séances, ${fdec(ws.length / (30 / 7))} par semaine` : "séances sur 3"}</div></div>
        <div className="stat"><div className="stat-v" style={{ color: "var(--sky)" }}>{dW != null ? `${dW >= 0 ? "+" : ""}${fdec(dW)}` : "–"}<small> kg</small></div><div className="stat-l">sur la période</div></div>
      </div>
      <section className="panel"><h2 className="panel-t">Calories</h2><DayBars days={days} value={(d) => L.dayTot(d).k} goal={S.kcal} color="var(--sun)" todayK={todayK} /></section>
      <section className="panel"><h2 className="panel-t">Protéines</h2><DayBars days={days} value={(d) => L.dayTot(d).p} goal={S.prot} color="var(--flesh)" todayK={todayK} /></section>
      <section className="panel"><h2 className="panel-t">Heures de sommeil</h2><SleepChart days={days} /></section>
      <section className="block">
        <div className="block-head"><h3>Jour par jour</h3></div>
        {!hist.length && <p className="muted">Rien de noté sur la période.</p>}
        {hist.map(({ k, d }) => {
          const t = L.dayTot(d), sh = L.daySleepH(d), R = L.rings(d, S);
          return (
            <button key={k} className="list-row" onClick={() => ctx.go("food", k)}>
              <span className="row-l"><MiniTarget values={R} size={30} />
                <span><span className="nm">{k === todayK ? "Aujourd'hui" : shortDate(k)}</span>
                  <div className="item-sub">{L.hasFood(d) ? `${fint(t.k)} kcal · ${fint(t.p)} g de protéines` : "repas non notés"}{sh != null ? ` · ${fH(sh)} de sommeil` : ""}</div></span>
              </span>
            </button>
          );
        })}
      </section>
    </>
  );
}

function DayBars({ days, value, goal, color, todayK }) {
  const W = 320, H = 112, top = 8, bottom = 18;
  const vals = days.map((x) => (L.hasFood(x.d) ? value(x.d) : 0));
  const max = Math.max(goal * 1.15, ...vals);
  const step = W / days.length, bw = step * 0.62;
  const y = (v) => H - bottom - (v / max) * (H - top - bottom);
  const lbl = days.length <= 7;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
      <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke={color} strokeDasharray="4 4" opacity=".5" />
      {days.map((x, i) => {
        const v = vals[i], h = Math.max(v > 0 ? 3 : 2, H - bottom - y(v));
        return (
          <g key={x.k}>
            <rect x={i * step + (step - bw) / 2} y={H - bottom - h} width={bw} height={h} rx="3" fill={v > 0 ? color : "rgba(255,255,255,.07)"} opacity={v >= goal ? 1 : v > 0 ? (x.k === todayK ? 0.4 : 0.62) : 1} />
            {(lbl || i % 5 === 0 || i === days.length - 1) && (
              <text x={i * step + step / 2} y={H - 4} textAnchor="middle" fontSize="9.5" fill="var(--dim)">
                {lbl ? L.keyToDate(x.k).toLocaleDateString("fr-FR", { weekday: "narrow" }) : L.keyToDate(x.k).getDate()}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SleepChart({ days }) {
  const W = 320, H = 170, left = 34, top = 6, bottom = 18;
  const T0 = 120, T1 = 1200;
  const y = (m) => top + ((Math.min(Math.max(m, T0), T1) - T0) / (T1 - T0)) * (H - top - bottom);
  const step = (W - left) / days.length, bw = step * 0.56;
  const any = days.some((x) => x.d.sleep?.bed);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
        {[180, 360, 540, 720, 900, 1080].map((m) => (
          <g key={m}>
            <line x1={left} x2={W} y1={y(m)} y2={y(m)} stroke="rgba(255,255,255,.06)" />
            <text x={left - 6} y={y(m) + 3} textAnchor="end" fontSize="9.5" fill="var(--dim)">{L.nightMinToHM(m).replace(":00", " h")}</text>
          </g>
        ))}
        {days.map((x, i) => {
          const s = x.d.sleep;
          if (!s?.bed || !s?.wake) return null;
          const b = L.nightMin(s.bed), w = L.nightMin(s.wake);
          if (w <= b) return null;
          return <rect key={x.k} x={left + i * step + (step - bw) / 2} y={y(b)} width={bw} height={Math.max(3, y(w) - y(b))} rx="4" fill="var(--moon)" opacity=".88" />;
        })}
      </svg>
      <p className="hint">{any ? "Chaque barre va du moment où tu poses le téléphone à ton réveil. Le but : voir les barres remonter petit à petit." : "Tes nuits s'afficheront ici dès que tu utiliseras « Je pose le téléphone » et « Je suis levé »."}</p>
    </>
  );
}
