// ═════════════════════════════════════════════════════════════
// Analyse : ta vraie maintenance, la courbe de poids, la régularité,
// ce que tes données disent, tes photos.
// ═════════════════════════════════════════════════════════════
import React, { useState } from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import * as A from "./actions.js";
import { Icon, GramInput } from "./ui.jsx";
import { Header, Sec, St, sign, shortDay } from "./kit.jsx";
import { GlowUp } from "./glowup.jsx";

const { fint, fdec } = L;

export function Lab({ ctx }) {
  return (
    <div className="page">
      <Header ctx={ctx} title="Analyse" sub="Ce que disent tes données" />
      <Energy ctx={ctx} />
      <Mass ctx={ctx} />
      <Regularity ctx={ctx} />
      <Findings ctx={ctx} />
      <Averages ctx={ctx} />
      <Sec code="G" title="Photos"><GlowUp ctx={ctx} /></Sec>
    </div>
  );
}

// ── Bilan énergétique : la maintenance calculée sur tes vrais chiffres
function Energy({ ctx }) {
  const { S, todayK } = ctx;
  const en = E.energy(todayK);
  const [rate, setRate] = useState(0.35);
  if (!en.ok) {
    return (
      <Sec code="E" title="Ta vraie maintenance">
        <div className="pnl" style={{ marginTop: 0 }}>
          <div className="pnl-h"><span className="lbl">Calcul en attente</span><St s="idle" /></div>
          <p className="muted" style={{ fontSize: 14 }}>Les calculateurs en ligne devinent ta maintenance. Ici, on la mesure : ce que tu manges, comparé à ce que fait ta balance. Il manque encore :</p>
          <div className="en-need">
            <div><span>Pesées (sur {en.windowDays} j)</span><b>{en.weighs} / 3{en.need.weighs ? ` · encore ${en.need.weighs}` : " ✓"}</b></div>
            <div><span>Écart entre la 1re et la dernière</span><b>{en.span} / 14 j{en.need.span ? "" : " ✓"}</b></div>
            <div><span>Jours de repas notés</span><b>{en.days} / 10{en.need.days ? ` · encore ${en.need.days}` : " ✓"}</b></div>
          </div>
        </div>
      </Sec>
    );
  }
  const errR = en.err != null ? Math.round(en.err / 50) * 50 : null;
  const need = en.forRate(rate);
  const curRate = ((S.kcal - en.tdee) / 7700) * 7;
  return (
    <Sec code="E" title="Ta vraie maintenance" right={`fiabilité ${en.conf}`}>
      <div className="pnl" style={{ marginTop: 0 }}>
        <div className="pnl-h"><span className="lbl">Maintenance mesurée</span><St s={en.conf === "bonne" ? "ok" : en.conf === "moyenne" ? "warn" : "idle"} label={`${en.weighs} pesées · ${en.days} jours`} /></div>
        <div className="big xl"><b>{fint(en.tdee)}</b><span>kcal/j{errR ? ` ± ${fint(errR)}` : ""}</span></div>
        <div className="en-grid">
          <div><span className="lbl">Mangé en moyenne</span><b>{fint(en.intake)}<small> kcal/j</small></b></div>
          <div><span className="lbl">Poids</span><b className={en.rate >= 0 ? "c-ok" : "c-crit"}>{sign(en.rate, 2)}<small> kg/sem</small></b></div>
        </div>
        <div className="formula">maintenance = mangé − variation de poids × 7 700<br /><b>{fint(en.intake)}</b> − ({sign(en.rate / 7, 3)} kg/j × 7 700) = <b>{fint(en.tdee)}</b> kcal</div>

        <div className="lbl" style={{ marginTop: 14 }}>Pour prendre</div>
        <div className="seg small" style={{ marginTop: 6 }}>
          {[0.25, 0.35, 0.5].map((r) => <button key={r} className={rate === r ? "on" : ""} onClick={() => setRate(r)}>+{fdec(r, 2)} kg/sem</button>)}
        </div>
        <div className="en-res">
          <div className="big md"><b>{fint(need)}</b><span>kcal par jour</span></div>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>Ton objectif actuel, {fint(S.kcal)} kcal, donne environ <b className="mono" style={{ color: "var(--tx)" }}>{sign(curRate, 2)} kg/sem</b> si tu l'atteins chaque jour.</p>
          {Math.abs(need - S.kcal) >= 100 && <button className="btn sm" style={{ marginTop: 10 }} onClick={() => { const u = L.snapKey("settings"); L.setSettings({ kcal: need }); ctx.say(`Objectif : ${fint(need)} kcal par jour`, { undo: u }); }}>Mettre {fint(need)} kcal comme objectif</button>}
        </div>
        <p className="hint">Calcul sur les {en.windowDays} derniers jours. Les jours non notés ne comptent pas : si tu oublies de noter des repas, la maintenance paraît plus basse qu'elle n'est. Une balance bouge de ±1 kg selon l'eau : plus tu as de pesées, plus le chiffre est fiable.</p>
      </div>
    </Sec>
  );
}

// ── Masse : courbe, tendance, projection, pesées
function Mass({ ctx }) {
  const { S, todayK } = ctx;
  const mt = E.massTrend(todayK);
  const has = L.getWeights()[todayK];
  const [v, setV] = useState(has ?? null);
  return (
    <Sec code="M" title="Masse" right={mt ? `objectif ${fdec(S.goalW)} kg` : ""}>
      <div className="pnl" style={{ marginTop: 0 }}>
        {mt ? (
          <>
            <div className="pnl-h"><span className="lbl">Dernière pesée · {shortDay(mt.latest[0]).toLowerCase()}</span><span className="mono muted" style={{ fontSize: 12 }}>{mt.rate != null ? `${sign(mt.rate, 2)} kg/sem` : "tendance : 2 pesées sur 7 j"}</span></div>
            <div className="big xl"><b>{fdec(mt.latest[1], 1)}</b><span>kg · {sign(mt.total, 1)} depuis le début</span></div>
            <WeightChart mt={mt} k={todayK} goal={S.goalW} />
            <div className="en-grid">
              <div><span className="lbl">Reste</span><b>{fdec(Math.max(0, S.goalW - mt.latest[1]), 1)}<small> kg</small></b></div>
              <div><span className="lbl">Objectif atteint vers</span><b>{mt.goalAt ? L.fmtDay(mt.goalAt, { month: "short", year: "numeric" }) : "–"}</b></div>
            </div>
          </>
        ) : <p className="muted">Pas encore de pesée. Note ton poids : la tendance démarre à la deuxième.</p>}
        <div className="w-in">
          <GramInput unit="kg" value={v} onChange={setV} />
          <button className="btn" disabled={!v || v < 30 || v > 200} onClick={() => A.setWeight(ctx, todayK, v)}>{has ? "Corriger" : "Noter"}</button>
        </div>
        <p className="hint">Même balance, le matin, à jeun, après les toilettes. Jour de pesée : {L.fmtDay(L.nextWeighK(todayK, S), { weekday: "long" })}.</p>
        {mt && mt.list.length > 0 && (
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th>Date</th><th>Poids</th><th>Écart</th><th /></tr></thead>
            <tbody>
              {mt.list.slice(-6).reverse().map(([k, w], i, arr) => {
                const prev = arr[i + 1];
                return (
                  <tr key={k}>
                    <td>{shortDay(k)}</td><td>{fdec(w, 1)} kg</td><td className={prev ? (w >= prev[1] ? "c-ok" : "c-crit") : ""}>{prev ? sign(w - prev[1], 1) : "–"}</td>
                    <td><button className="link small" onClick={() => { const u = L.snapKey("iwt", true); const ww = { ...L.getWeights() }; delete ww[k]; L.setWeights(ww); ctx.say("Pesée supprimée", { undo: u }); }} aria-label={`Supprimer la pesée du ${k}`}><Icon n="close" size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 12 }} role="img" aria-label="Courbe de poids">
      {ticks.map((t, i) => <g key={i}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} stroke="var(--line)" /><text x={pl - 4} y={Y(t) + 3} textAnchor="end" fontSize="9" fill="var(--dim)" fontFamily="var(--fm)">{fdec(t, 1)}</text></g>)}
      <line x1={X(k)} x2={X(k)} y1={pt} y2={H - pb} stroke="var(--line-2)" strokeDasharray="2 3" />
      {projEnd != null && projDays > 0 && <line className="pj" x1={X(last[0])} y1={Y(last[1])} x2={Xd(xMax)} y2={Y(projEnd)} stroke="var(--acc)" />}
      <polyline className="ln" points={pts.map(([kk, v]) => `${X(kk)},${Y(v)}`).join(" ")} stroke="var(--mass)" />
      {pts.map(([kk, v]) => <circle key={kk} cx={X(kk)} cy={Y(v)} r="2.6" fill="var(--bg-1)" stroke="var(--mass)" strokeWidth="1.5" />)}
      <text x={pl} y={H - 4} fontSize="9" fill="var(--dim)" fontFamily="var(--fm)">{shortDay(x0)}</text>
      <text x={X(k)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--dim)" fontFamily="var(--fm)">auj.</text>
      {projDays > 0 && <text x={W - pr} y={H - 4} textAnchor="end" fontSize="9" fill="var(--acc)" fontFamily="var(--fm)">+4 sem.</text>}
    </svg>
  );
}

// ── Régularité : 5 semaines
function Regularity({ ctx }) {
  const h = E.heat(ctx.todayK, 5);
  const cls = (v, id) => (v === undefined ? "fut" : v == null ? "" : id === "train" ? "l3" : v >= 0.95 ? "l3" : v >= 0.8 ? "l2" : "l1");
  return (
    <Sec code="R" title="Régularité" right="5 semaines">
      <div className="pnl" style={{ marginTop: 0 }}>
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
    <Sec code="C" title="Constats" right="42 derniers jours">
      <div className="box">
        {!f.length && <div className="empty-l">Pas encore assez de données pour des constats fiables. Il faut au moins 4 jours de chaque côté d'une comparaison.</div>}
        {f.map((x) => (
          <div key={x.id} className="fd">
            <span className="fd-v">{sign(x.v)}<small>{x.unit === "min" ? "min de sommeil" : "kcal / jour"}</small></span>
            <span><span className="fd-t">{x.t}</span><span className="fd-s" style={{ display: "block" }}>{x.s}</span></span>
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
    <Sec code="Ø" title="Moyennes" right="jours terminés">
      <div className="pnl" style={{ marginTop: 0, paddingTop: 6 }}>
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
