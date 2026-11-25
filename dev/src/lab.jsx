// ═════════════════════════════════════════════════════════════
// Analyse : ta vraie maintenance, la courbe de poids, la régularité,
// ce que tes données disent, tes photos.
// ═════════════════════════════════════════════════════════════
import React, { useState } from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import * as A from "./actions.js";
import { Icon, GramInput } from "./ui.jsx";
import { Title, Sec, N, Chip, sign, shortDay } from "./kit.jsx";
import { GlowUp } from "./glowup.jsx";

const { fint, fdec } = L;

export function Lab({ ctx }) {
  return (
    <div className="page">
      <Title ctx={ctx} kicker="Ce que disent tes données" title="Analyse" />
      <Energy ctx={ctx} />
      <Mass ctx={ctx} />
      <Regularity ctx={ctx} />
      <Findings ctx={ctx} />
      <Averages ctx={ctx} />
      <Sec title="Photos"><GlowUp ctx={ctx} /></Sec>
    </div>
  );
}

// ── Bilan énergétique : la maintenance calculée sur tes vrais chiffres
function Energy({ ctx }) {
  const { S, todayK } = ctx;
  const en = E.energy(todayK);
  const [rate, setRate] = useState(0.35);
  if (!en.ok) {
    const Row = ({ l, v, need }) => <div className="row"><span className="row-m"><b>{l}</b></span><span className="row-v"><b className={need ? "" : "c-ok"}>{v}</b><span>{need ? `encore ${need}` : "ok"}</span></span></div>;
    return (
      <section className="card hero t-mass" aria-label="Ta vraie maintenance">
        <div className="hero-top"><span className="hero-l"><Icon n="target" size={15} /> Ta vraie maintenance</span><Chip>en attente</Chip></div>
        <p className="hero-s" style={{ marginTop: 6 }}>Les calculateurs en ligne devinent. Ici, on mesure : ce que tu manges, comparé à ce que fait ta balance. Il manque encore :</p>
        <div className="list mt10">
          <Row l="Pesées" v={`${en.weighs} / 3`} need={en.need.weighs} />
          <Row l="Jours entre 1re et dernière" v={`${en.span} / 14`} need={en.need.span} />
          <Row l="Jours de repas notés" v={`${en.days} / 10`} need={en.need.days} />
        </div>
      </section>
    );
  }
  const errR = en.err != null ? Math.round(en.err / 50) * 50 : null;
  const need = en.forRate(rate);
  const curRate = ((S.kcal - en.tdee) / 7700) * 7;
  return (
    <section className="card hero t-mass" aria-label="Ta vraie maintenance">
      <div className="hero-top"><span className="hero-l"><Icon n="target" size={15} /> Ta vraie maintenance</span><Chip s={en.conf === "bonne" ? "ok" : en.conf === "moyenne" ? "warn" : ""}>fiabilité {en.conf}</Chip></div>
      <div className="hero-n"><b className="grad-mass"><N v={en.tdee} /></b><span>kcal/j{errR ? ` ± ${fint(errR)}` : ""}</span></div>
      <div className="kpis">
        <span><em>Mangé / jour</em><b>{fint(en.intake)}</b></span>
        <span><em>Poids / sem.</em><b className={en.rate >= 0 ? "c-ok" : "c-crit"}>{sign(en.rate, 2)} kg</b></span>
        <span><em>Pesées</em><b>{en.weighs}</b></span>
      </div>
      <p className="formula">{fint(en.intake)} mangées − {sign(en.rate / 7, 3)} kg/j × 7 700 = <b>{fint(en.tdee)} kcal</b></p>
      <div className="seg small3 mt10" role="group" aria-label="Prise visée">
        {[0.25, 0.35, 0.5].map((r) => <button key={r} className={rate === r ? "on" : ""} onClick={() => setRate(r)}><b>+{fdec(r, 2)}</b><small>kg / sem</small></button>)}
      </div>
      <div className="res">
        <span><em>À manger chaque jour</em><b className="grad-fuel">{fint(need)} kcal</b></span>
        {Math.abs(need - S.kcal) >= 100 ? <button className="btn" onClick={() => { const u = L.snapKey("settings"); L.setSettings({ kcal: need }); ctx.say(`Objectif : ${fint(need)} kcal par jour`, { undo: u }); }}>Appliquer</button> : <Chip s="ok">déjà ton objectif</Chip>}
      </div>
      <p className="hint">Ton objectif actuel ({fint(S.kcal)} kcal) donne environ {sign(curRate, 2)} kg par semaine si tu l'atteins chaque jour. Calcul sur {en.windowDays} jours : un repas oublié fait paraître ta maintenance plus basse qu'elle n'est.</p>
    </section>
  );
}

// ── Masse : courbe, tendance, projection, pesées
function Mass({ ctx }) {
  const { S, todayK } = ctx;
  const mt = E.massTrend(todayK);
  const has = L.getWeights()[todayK];
  const [v, setV] = useState(has ?? null);
  return (
    <Sec title="Poids" right={`objectif ${fdec(S.goalW)} kg`}>
      <div className="card chartc">
        {mt ? (
          <>
            <div className="chartc-h"><span><em>Dernière pesée · {shortDay(mt.latest[0]).toLowerCase()}</em><b className="big2">{fdec(mt.latest[1], 1)} <small>kg</small></b></span><Chip s={mt.rate == null ? "" : mt.rate >= 0.15 ? "ok" : mt.rate >= 0 ? "warn" : "crit"}>{mt.rate != null ? `${sign(mt.rate, 2)} kg/sem` : "tendance à venir"}</Chip></div>
            <WeightChart mt={mt} k={todayK} />
            <div className="kpis">
              <span><em>Depuis le début</em><b>{sign(mt.total, 1)} kg</b></span>
              <span><em>Reste</em><b>{fdec(Math.max(0, S.goalW - mt.latest[1]), 1)} kg</b></span>
              <span><em>Objectif vers</em><b>{mt.goalAt ? L.fmtDay(mt.goalAt, { month: "short", year: "numeric" }) : "–"}</b></span>
            </div>
          </>
        ) : <p className="muted">Pas encore de pesée. Note ton poids : la tendance démarre à la deuxième.</p>}
        <div className="w-in">
          <GramInput unit="kg" value={v} onChange={setV} />
          <button className="btn" disabled={!v || v < 30 || v > 200} onClick={() => A.setWeight(ctx, todayK, v)}>{has ? "Corriger" : "Noter"}</button>
        </div>
        <p className="hint">Même balance, le matin, à jeun. Prochaine pesée : {L.fmtDay(L.nextWeighK(todayK, S), { weekday: "long" })}.</p>
        {mt && mt.list.length > 0 && (
          <div className="list mt10">
            {mt.list.slice(-5).reverse().map(([k, w], i, arr) => {
              const prev = arr[i + 1];
              return (
                <div key={k} className="row">
                  <span className="row-m"><b>{shortDay(k)}</b></span>
                  <span className="row-v"><b>{fdec(w, 1)} kg</b><span className={prev ? (w >= prev[1] ? "c-ok" : "c-crit") : ""}>{prev ? sign(w - prev[1], 1) : "–"}</span></span>
                  <button className="xb" onClick={() => { const u = L.snapKey("iwt", true); const ww = { ...L.getWeights() }; delete ww[k]; L.setWeights(ww); ctx.say("Pesée supprimée", { undo: u }); }} aria-label={`Supprimer la pesée du ${k}`}><Icon n="close" size={13} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sec>
  );
}

function WeightChart({ mt, k }) {
  const W = 320, H = 130, pl = 30, pr = 6, pt = 8, pb = 18;
  const pts = mt.list.filter(([kk]) => L.daysBetween(kk, k) <= 120);
  if (pts.length < 1) return null;
  const x0 = pts[0][0];
  const projDays = mt.rate != null && mt.rate > 0 ? 28 : 0;
  const xMax = Math.max(L.daysBetween(x0, k), 7) + projDays;
  const last = pts[pts.length - 1];
  const projEnd = mt.rate != null ? last[1] + (mt.rate / 7) * (xMax - L.daysBetween(x0, last[0])) : null;
  const vals = [...pts.map((p) => p[1]), ...(projEnd != null ? [projEnd] : [])];
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const X = (kk) => pl + (L.daysBetween(x0, kk) / xMax) * (W - pl - pr);
  const Xd = (d) => pl + (d / xMax) * (W - pl - pr);
  const Y = (v) => pt + (1 - (v - lo) / (hi - lo || 1)) * (H - pt - pb);
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <svg className="area" viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 10 }} role="img" aria-label="Courbe de poids">
      {ticks.map((t, i) => <g key={i}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,.06)" /><text x={pl - 4} y={Y(t) + 3} textAnchor="end" fontSize="9" fill="var(--dim)" fontFamily="var(--fm)">{fdec(t, 1)}</text></g>)}
      <line x1={X(k)} x2={X(k)} y1={pt} y2={H - pb} stroke="var(--line-2)" strokeDasharray="2 3" />
      <defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8B9CFF" stopOpacity=".35" /><stop offset="1" stopColor="#8B9CFF" stopOpacity="0" /></linearGradient><linearGradient id="wl" x1="0" x2="1"><stop offset="0" stopColor="#3FC1FF" /><stop offset="1" stopColor="#8B9CFF" /></linearGradient></defs>
      {pts.length > 1 && <polygon points={`${X(pts[0][0])},${H - pb} ${pts.map(([kk, v]) => `${X(kk)},${Y(v)}`).join(" ")} ${X(last[0])},${H - pb}`} fill="url(#wg)" />}
      {projEnd != null && projDays > 0 && <line x1={X(last[0])} y1={Y(last[1])} x2={Xd(xMax)} y2={Y(projEnd)} stroke="#FFB547" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />}
      <polyline points={pts.map(([kk, v]) => `${X(kk)},${Y(v)}`).join(" ")} fill="none" stroke="url(#wl)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([kk, v], i) => <circle key={kk} cx={X(kk)} cy={Y(v)} r={i === pts.length - 1 ? 4 : 2.4} fill={i === pts.length - 1 ? "#8B9CFF" : "#0E1016"} stroke="#8B9CFF" strokeWidth="1.6" />)}
      <text x={pl} y={H - 4} fontSize="9" fill="var(--dim)" fontFamily="var(--fm)">{shortDay(x0)}</text>
      <text x={X(k)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--dim)" fontFamily="var(--fm)">auj.</text>
      {projDays > 0 && <text x={W - pr} y={H - 4} textAnchor="end" fontSize="9" fill="#FFB547" fontFamily="var(--fm)">+4 sem.</text>}
    </svg>
  );
}

// ── Régularité : 5 semaines
function Regularity({ ctx }) {
  const h = E.heat(ctx.todayK, 5);
  const cls = (v, id) => (v === undefined ? "fut" : v == null ? "" : id === "train" ? "l3" : v >= 0.95 ? "l3" : v >= 0.8 ? "l2" : "l1");
  return (
    <Sec title="Régularité" right="5 semaines">
      <div className="card chartc">
        <div className="heat">
          {h.rows.map((r) => (
            <React.Fragment key={r.id}>
              <span className="heat-r">{r.n}</span>
              <span className="heat-c">{r.v.map((v, i) => <i key={i} className={cls(v, r.id)} title={`${h.cols[i]}${v != null ? ` : ${Math.round(v * 100)} %` : ""}`} />)}</span>
            </React.Fragment>
          ))}
          <span className="heat-x"><span>{shortDay(h.cols[0]).toLowerCase()}</span><span>aujourd'hui</span></span>
        </div>
        <div className="legend"><span><i style={{ background: "rgba(61,220,132,.75)" }} />≥ 95 %</span><span><i style={{ background: "rgba(255,176,32,.6)" }} />80–95 %</span><span><i style={{ background: "rgba(255,79,79,.5)" }} />&lt; 80 %</span><span><i style={{ background: "var(--bg-2)" }} />rien noté</span></div>
      </div>
    </Sec>
  );
}

// ── Constats tirés de tes données
function Findings({ ctx }) {
  const f = E.findings(ctx.todayK);
  return (
    <Sec title="Constats" right="42 derniers jours">
      <div className="card list">
        {!f.length && <div className="empty">Pas encore assez de données pour des constats fiables. Il faut au moins 4 jours de chaque côté d'une comparaison.</div>}
        {f.map((x) => (
          <div key={x.id} className="row fd">
            <span className="fd-v"><b>{sign(x.v)}</b><small>{x.unit === "min" ? "min" : "kcal/j"}</small></span>
            <span className="row-m"><b>{x.t}</b><span>{x.s}</span></span>
          </div>
        ))}
      </div>
      {f.length > 0 && <p className="hint">Des corrélations, pas des preuves : elles disent où regarder, pas pourquoi.</p>}
    </Sec>
  );
}

// ── Moyennes
function Averages({ ctx }) {
  const { S, todayK } = ctx;
  const a7 = E.averages(todayK, 7), a28 = E.averages(todayK, 28);
  const c = (v, goal) => (v == null ? "" : v >= goal * 0.95 ? "c-ok" : v >= goal * 0.8 ? "c-warn" : "c-crit");
  return (
    <Sec title="Moyennes" right="jours terminés">
      <div className="card chartc">
        <table className="tbl">
          <thead><tr><th /><th>7 j</th><th>28 j</th><th>Visé</th></tr></thead>
          <tbody>
            <tr><td>Calories</td><td className={c(a7.kcal, S.kcal)}>{a7.kcal != null ? fint(a7.kcal) : "–"}</td><td className={c(a28.kcal, S.kcal)}>{a28.kcal != null ? fint(a28.kcal) : "–"}</td><td>{fint(S.kcal)}</td></tr>
            <tr><td>Protéines</td><td className={c(a7.prot, S.prot)}>{a7.prot != null ? `${fint(a7.prot)} g` : "–"}</td><td className={c(a28.prot, S.prot)}>{a28.prot != null ? `${fint(a28.prot)} g` : "–"}</td><td>{fint(S.prot)} g</td></tr>
            <tr><td>Sommeil</td><td className={c(a7.sleep, S.sleep)}>{a7.sleep != null ? L.fH(a7.sleep) : "–"}</td><td className={c(a28.sleep, S.sleep)}>{a28.sleep != null ? L.fH(a28.sleep) : "–"}</td><td>{L.fH(S.sleep)}</td></tr>
            <tr><td>Séances</td><td>{a7.sessions}</td><td>{a28.sessions}</td><td>3 / sem.</td></tr>
            <tr><td>Jours notés</td><td>{a7.days}/7</td><td>{a28.days}/28</td><td /></tr>
          </tbody>
        </table>
      </div>
    </Sec>
  );
}
