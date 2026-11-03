import React, { useState } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { Icon, Count, buzz } from "./ui.jsx";
import { GlowUp } from "./glowup.jsx";
import { Portrait, Emblem, GBar, Grade, KillDots, Coin } from "./hud.jsx";
import { pseudoOf, PosterProfil } from "./posters.jsx";

const { fint, fdec, fH } = L;
const shortDate = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" }));
const short = (k) => L.fmtDay(k, { day: "numeric", month: "short" }).replace(".", "");
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const TABS = [["rank", "Classé"], ["games", "Parties"], ["ach", "Succès"], ["glowup", "Glow-up"]];

export function Profile({ ctx }) {
  const init = ctx.sub === "weight" ? "rank" : TABS.some(([id]) => id === ctx.sub) ? ctx.sub : "rank";
  const [tab, setTab] = useState(init);
  return (
    <div className="page">
      <PosterProfil ctx={ctx} />
      <div className="seg top-seg">
        {TABS.map(([id, l]) => <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      {tab === "rank" ? <Ranked ctx={ctx} /> : tab === "games" ? <Games ctx={ctx} /> : tab === "ach" ? <Achievements ctx={ctx} /> : <GlowUp ctx={ctx} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Classé : la pesée, les LP, l'échelle des rangs
// ─────────────────────────────────────────────────────────────
function Ranked({ ctx }) {
  const { S, todayK } = ctx;
  const list = L.weightList();
  const rk = G.rank();
  const [inp, setInp] = useState("");
  const todayW = L.getWeights()[todayK];
  const latest = list.length ? list[list.length - 1][1] : null;
  const weighDay = L.keyToDate(todayK).getDay() === S.weighDay;
  const save = () => {
    const v = L.num(inp);
    if (v == null || v < 30 || v > 200) { ctx.say("Écris ton poids, par exemple 52,4"); return; }
    const undo = L.snapKey("iwt", true);
    L.setWeights({ ...L.getWeights(), [todayK]: Math.round(v * 10) / 10 });
    setInp(""); buzz(12); ctx.say(`Pesée notée : ${fdec(v)} kg`, { undo });
  };
  const remove = () => { const undo = L.snapKey("iwt", true); const w = { ...L.getWeights() }; delete w[todayK]; L.setWeights(w); ctx.say("Pesée retirée", { undo }); };
  const rate = rk?.rate;
  let rateTxt = "Il faut deux pesées à au moins une semaine d'écart pour voir ton rythme.";
  if (rate != null) {
    if (rate < 0.1) rateTxt = "Ça stagne : ajoute environ 300 kcal par jour, un shaker en plus suffit.";
    else if (rate < 0.25) rateTxt = "Ça monte doucement : 200 kcal de plus par jour accéléreraient.";
    else if (rate <= 0.6) rateTxt = "Bon rythme. Continue comme ça.";
    else rateTxt = "Ça monte vite : parfait vu d'où tu pars.";
  }
  const ch = rk && rk.cur.step >= G.STEPS;
  return (
    <>
      <section className={"panel rank-hero" + (weighDay && todayW == null ? " glow-sky" : "")}>
        {rk ? (
          <>
            <div className="rh-top">
              <Emblem tier={rk.cur.tier} size={104} />
              <div className="rh-id">
                <div className="rh-k">Classé, poids de forme</div>
                <div className="rh-n">{rk.cur.name}</div>
                <div className="rh-w"><Count v={rk.last.sm} dec={1} /> kg <span className="muted">moyenne des 3 dernières pesées</span></div>
              </div>
            </div>
            <GBar kind="lp" v={ch ? 100 : rk.cur.lp} max={100} text={`${rk.cur.lp} LP`} ticks={4} />
            <p className="rh-s">
              {ch ? "Challenger : tu as atteint ton poids visé." : <>Prochaine division à <b>{fdec(rk.nextKg, 1)} kg</b>, encore {fdec(rk.kgToNext, 1)} kg. {rk.promoAt ? <>À ton rythme, vers le {short(rk.promoAt)}.</> : null}</>}
            </p>
          </>
        ) : (
          <div className="rh-top">
            <Emblem tier={0} size={90} dim />
            <div className="rh-id"><div className="rh-n">Non classé</div><p className="muted small">Ta première pesée lance ton classement. Fer IV au départ, Challenger à {fdec(S.goalW)} kg.</p></div>
          </div>
        )}
        <div className="rh-in">
          <h3>{weighDay && todayW == null ? "C'est le jour de la pesée" : "Pesée"}</h3>
          {todayW != null ? (
            <div className="row-between"><span className="w-ok">✓ {fdec(todayW)} kg</span><button className="link" onClick={remove}>Modifier</button></div>
          ) : (
            <div className="cta-row">
              <input className="inp big-inp" inputMode="decimal" value={inp} onChange={(e) => setInp(e.target.value)} placeholder={latest != null ? fdec(latest) : "52,4"} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Poids en kg" />
              <button className="cta sky" onClick={save}>Noter</button>
            </div>
          )}
          <p className="hint">Une fois par semaine, le {DAYS[S.weighDay]} : même balance, même moment de la journée, avant de manger ou avant ta séance.</p>
        </div>
      </section>

      {rk && <p className="insight-line left">{rateTxt}</p>}

      {rk && <Ladder rk={rk} />}

      {list.length >= 2 && <section className="panel"><h2 className="panel-t">Évolution</h2><WeightChart list={list.slice(-20)} goal={S.goalW} /></section>}

      {rk && (
        <section className="block">
          <div className="block-head"><h3>Historique des LP</h3><span className="count">{rk.series.length} pesées</span></div>
          {[...rk.series].reverse().slice(0, 14).map((p) => (
            <div key={p.k} className="hist-row">
              <span>{shortDate(p.k)}<small>{p.r.name}</small></span>
              <span>{p.dLP !== 0 && <span className={p.dLP > 0 ? "up-txt" : "down-txt"}>{p.dLP > 0 ? "+" : ""}{p.dLP} LP   </span>}<b>{fdec(p.w)} kg</b></span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

/** L'échelle : chaque palier et le poids qui l'ouvre */
function Ladder({ rk }) {
  const at = (step) => rk.start + step * rk.per;
  const rows = G.TIERS.map((t, i) => {
    const from = i < 7 ? at(i * 4) : i === 7 ? at(28) : i === 8 ? at(29) : rk.goal;
    return { t, i, from };
  }).reverse();
  return (
    <section className="panel ladder">
      <div className="sec-h"><h2>L'échelle</h2><span className="sec-r">de {fdec(rk.start, 1)} à {fdec(rk.goal, 1)} kg</span></div>
      {rows.map(({ t, i, from }) => {
        const cur = rk.cur.tier === i, done = rk.cur.tier > i;
        return (
          <div key={t.id} className={"lad" + (cur ? " cur" : "") + (done ? " done" : "")}>
            <Emblem tier={i} size={34} dim={!cur && !done} />
            <span className="lad-n">{t.n}</span>
            <span className="lad-w">{cur ? "Tu es ici" : `dès ${fdec(from, 1)} kg`}</span>
          </div>
        );
      })}
      <p className="hint">Une division tous les {fdec(rk.per, 2)} kg environ. Ton rang suit la moyenne de tes 3 dernières pesées : une pesée isolée ne te fait pas plonger.</p>
    </section>
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
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0AC8B9" stopOpacity=".3" /><stop offset="100%" stopColor="#0AC8B9" stopOpacity="0" /></linearGradient></defs>
        {showGoal && <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--gold-2)" strokeDasharray="4 4" opacity=".7" />}
        <path d={`M${pts[0][0]},${H} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${H} Z`} fill="url(#wg)" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--hex-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill="var(--hex-2)" stroke="var(--abyss)" strokeWidth="1.5" />)}
        <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 10} textAnchor="end" fill="var(--tx)" fontSize="11" fontWeight="600">{fdec(vals[vals.length - 1])} kg</text>
      </svg>
      <div className="row-between item-sub mt6">
        <span>{shortDate(list[0][0])}</span>
        {showGoal && <span style={{ color: "var(--gold-2)" }}>pointillés : Challenger</span>}
        <span>{shortDate(list[list.length - 1][0])}</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Parties : stats, graphes, historique et carrière
// ─────────────────────────────────────────────────────────────
function Games({ ctx }) {
  const { S, todayK } = ctx;
  const [n, setN] = useState(7);
  const keys = Array.from({ length: n }, (_, i) => L.addDays(todayK, i - n + 1));
  const days = keys.map((k) => ({ k, d: L.getDay(k) }));
  const fed = days.filter((x) => L.hasFood(x.d) && x.k !== todayK);
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const avgK = avg(fed.map((x) => L.dayTot(x.d).k));
  const avgP = avg(fed.map((x) => L.dayTot(x.d).p));
  const wr = G.winrate(todayK, n);
  const sl = L.sleepStats(todayK, n);
  const ws = L.getWorkouts().filter((w) => w.date.slice(0, 10) >= keys[0] && w.date.slice(0, 10) <= todayK);
  const wl = L.weightList().filter(([k]) => k >= keys[0] && k <= todayK);
  const dW = wl.length >= 2 ? wl[wl.length - 1][1] - wl[0][1] : null;
  const hist = [...keys].reverse().map((k) => G.dayInfo(k)).filter((di) => di.has);
  const st = G.careerStats(todayK);
  return (
    <>
      <div className="seg small">
        {[7, 30].map((v) => <button key={v} className={n === v ? "on" : ""} onClick={() => setN(v)}>{v} jours</button>)}
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="stat-v gold">{avgK != null ? fint(avgK) : "–"}<small> kcal</small></div><div className="stat-l">gold par jour, sur {fint(S.kcal)}</div></div>
        <div className="stat"><div className="stat-v">{wr.pct != null ? `${Math.round(wr.pct * 100)} %` : "–"}</div><div className="stat-l">winrate, {wr.w} V {wr.l} D</div></div>
        <div className="stat"><div className="stat-v flesh">{avgP != null ? fint(avgP) : "–"}<small> g</small></div><div className="stat-l">de protéines par jour</div></div>
        <div className="stat"><div className="stat-v hp">{sl.avgH != null ? fH(sl.avgH) : "–"}</div><div className="stat-l">{sl.avgBed != null ? `de sommeil, couché vers ${L.nightMinToHM(sl.avgBed)}` : "de sommeil par nuit"}</div></div>
        <div className="stat"><div className="stat-v">{ws.length}</div><div className="stat-l">{n === 30 ? `séances, ${fdec(ws.length / (30 / 7))} par semaine` : "séances sur 3"}</div></div>
        <div className="stat"><div className="stat-v mana">{dW != null ? `${dW >= 0 ? "+" : ""}${fdec(dW)}` : "–"}<small> kg</small></div><div className="stat-l">sur la période</div></div>
      </div>
      <section className="panel"><h2 className="panel-t">Gold par jour</h2><DayBars days={days} value={(d) => L.dayTot(d).k} goal={S.kcal} color="var(--gold-2)" todayK={todayK} /></section>
      <section className="panel"><h2 className="panel-t">Protéines</h2><DayBars days={days} value={(d) => L.dayTot(d).p} goal={S.prot} color="var(--flesh)" todayK={todayK} /></section>
      <section className="panel"><h2 className="panel-t">Heures de sommeil</h2><SleepChart days={days} /></section>
      <section className="block">
        <div className="block-head"><h3>Historique des parties</h3></div>
        {!hist.length && <p className="muted">Rien de noté sur la période.</p>}
        {hist.map((di) => {
          const today = di.k === todayK;
          const r = di.win ? "w" : today ? "cur" : L.hasFood(di.d) ? "l" : "none";
          return (
            <button key={di.k} className={"mrow " + r} onClick={() => ctx.open({ type: "match", k: di.k })}>
              <span className={"mrow-r " + r}>{r === "w" ? "Victoire" : r === "l" ? "Défaite" : r === "cur" ? "En cours" : "Sans farm"}</span>
              <span className="mrow-m">
                <span className="nm">{today ? "Aujourd'hui" : shortDate(di.k)}</span>
                <span className="item-sub">{L.hasFood(di.d) ? <><Coin size={11} /> {fint(di.t.k)}, {fint(di.t.p)} g prot</> : "repas non notés"}{di.sh != null ? `, ${fH(di.sh)} de sommeil` : ""}</span>
              </span>
              <span className="mrow-x"><Grade g={di.grade} size="sm" /><KillDots kill={di.kill} /></span>
            </button>
          );
        })}
      </section>
      <section className="panel career">
        <h2 className="panel-t">Carrière</h2>
        <div className="car-grid">
          <div><b>{fint(st.kcalTot)}</b><span>gold farmé (kcal)</span></div>
          <div><b>{st.protTot >= 1000 ? `${fdec(st.protTot / 1000, 1)} kg` : `${fint(st.protTot)} g`}</b><span>de protéines</span></div>
          <div><b>{st.days}</b><span>journées jouées</span></div>
          <div><b>{st.nights}</b><span>nuits notées{st.nights ? `, ${fH(st.sleepTot / st.nights)} en moyenne` : ""}</span></div>
          <div><b>{st.casts}</b><span>séances</span></div>
          <div><b>{st.prs}</b><span>records perso</span></div>
          <div><b>{st.pentas}</b><span>pentakills</span></div>
          <div><b>{st.bosses}</b><span>boss vaincus</span></div>
          <div><b>{st.bestWin}</b><span>meilleure série</span></div>
          <div><b>{st.dex}</b><span>aliments découverts</span></div>
        </div>
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
            <rect x={i * step + (step - bw) / 2} y={H - bottom - h} width={bw} height={h} rx="1.5" fill={v > 0 ? color : "rgba(240,230,210,.07)"} opacity={v >= goal ? 1 : v > 0 ? (x.k === todayK ? 0.4 : 0.6) : 1} />
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
            <line x1={left} x2={W} y1={y(m)} y2={y(m)} stroke="rgba(240,230,210,.06)" />
            <text x={left - 6} y={y(m) + 3} textAnchor="end" fontSize="9.5" fill="var(--dim)">{L.nightMinToHM(m).replace(":00", " h")}</text>
          </g>
        ))}
        {days.map((x, i) => {
          const s = x.d.sleep;
          if (!s?.bed || !s?.wake) return null;
          const b = L.nightMin(s.bed), w = L.nightMin(s.wake);
          if (w <= b) return null;
          return <rect key={x.k} x={left + i * step + (step - bw) / 2} y={y(b)} width={bw} height={Math.max(3, y(w) - y(b))} rx="2" fill="var(--hp)" opacity=".85" />;
        })}
      </svg>
      <p className="hint">{any ? "Chaque barre va du moment où tu poses le téléphone à ton réveil. Le but : voir les barres remonter petit à petit." : "Tes nuits s'afficheront ici dès que tu utiliseras « Je pose le téléphone » et « Je suis levé »."}</p>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Succès et titres
// ─────────────────────────────────────────────────────────────
function Achievements({ ctx }) {
  const { S, todayK } = ctx;
  const list = G.achievements(todayK);
  const got = list.filter((a) => a.at).length;
  const tl = G.titles(todayK);
  const cats = Object.entries(G.ACH_CATS);
  return (
    <>
      <section className="panel ach-head">
        <div className="ach-n"><b>{got}</b> sur {list.length} succès</div>
        <span className="dex-bar"><i style={{ width: `${(got / list.length) * 100}%` }} /></span>
        <p className="muted small">Calculés en rejouant tout ton historique. Chaque succès rapporte de l'XP de compte.</p>
      </section>
      <section className="panel">
        <h2 className="panel-t">Ton titre</h2>
        <div className="titles">
          {tl.map((t) => (
            <button key={t.id} className={"ttl" + (t.ok ? "" : " locked") + ((S.title || "hardgainer") === t.id ? " on" : "")} disabled={!t.ok}
              onClick={() => { L.setSettings({ title: t.id }); ctx.say(`Titre : ${t.n}`); }}>
              {!t.ok && <Icon n="lock" size={12} sw={2.2} />}{t.n}
            </button>
          ))}
        </div>
        <p className="hint">Les titres se débloquent avec certains succès. Il s'affiche sous ton pseudo.</p>
      </section>
      {cats.map(([cat, label]) => {
        const items = list.filter((a) => a.cat === cat);
        return (
          <section key={cat} className="block">
            <div className="block-head"><h3>{label}</h3><span className="count">{items.filter((a) => a.at).length}/{items.length}</span></div>
            {items.map((a) => (
              <div key={a.id} className={"ach" + (a.at ? " on" : "")}>
                <span className="ach-ic"><Icon n={a.at ? "trophy" : "lock"} size={18} sw={1.9} /></span>
                <span className="ach-m">
                  <b>{a.n}</b>
                  <span>{a.d}</span>
                  {!a.at && a.prog && <span className="ach-p"><i style={{ width: `${Math.min(100, (a.prog[0] / a.prog[1]) * 100)}%` }} /><em>{fint(Math.min(a.prog[0], a.prog[1]))}/{fint(a.prog[1])}</em></span>}
                </span>
                <span className="ach-r">{a.at ? short(a.at) : `+${a.xp} XP`}</span>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
