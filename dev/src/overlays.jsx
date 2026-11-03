// ─────────────────────────────────────────────────────────────
// Les grands moments : écran de chargement, fin de partie,
// et l'import de ton compte à la première ouverture.
// ─────────────────────────────────────────────────────────────
import React, { useEffect } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { TIPS, PATCH } from "./content.js";
import { Icon } from "./ui.jsx";
import { Emblem, BossArt, Grade, KillHex, StackGrid } from "./hud.jsx";
import { Backdrop, Particles, Deco, Orn, Torn, damask } from "./art.jsx";

const { fint, fH, cap } = L;
const pseudo = (S) => (S.pseudo || "Isma").trim() || "Isma";

/** Écran de chargement : ton match du jour, une fois par jour */
export function LoadingScreen({ ctx, onDone }) {
  const { S, todayK } = ctx;
  const acc = G.account(todayK);
  const rk = G.rank();
  const b = G.boss(todayK);
  const seed = L.keyToDate(todayK).getTime() / 864e5;
  const tip = TIPS[Math.abs(Math.round(seed)) % TIPS.length];
  const monday = L.keyToDate(todayK).getDay() === 1;
  const lastB = monday ? G.boss(L.addDays(todayK, -1)) : null;
  useEffect(() => { const t = setTimeout(onDone, 2700); return () => clearTimeout(t); }, []);
  return (
    <div className="load" onClick={onDone} role="dialog" aria-label="Écran de chargement, touche pour passer">
      <Backdrop id={ctx.mood === "astral" ? "sang" : ctx.mood} seed={9} className="pa" />
      <div className="load-dm" style={{ backgroundImage: damask("#FFFFFF", 0.1) }} aria-hidden="true" />
      <div className="load-paper" aria-hidden="true" />
      <Particles kind="ember" n={12} seed={3} />
      <div className="load-head">
        <span className="load-k">Partie du jour</span>
        <span className="load-d">{cap(L.fmtDay(todayK))}</span>
      </div>
      <div className="load-vs">
        <div className="lcard me">
          <span className="lcard-art"><Emblem tier={rk ? rk.cur.tier : 0} size={92} dim={!rk} /></span>
          <b className="lcard-n">{pseudo(S)}</b>
          <span className="lcard-s">{rk ? rk.cur.name : "Non classé"}, niveau {acc.level}</span>
        </div>
        <div className="load-x" aria-label="contre">vs</div>
        <div className="lcard foe">
          <span className="lcard-art"><BossArt id={b.id} size={104} dead={b.dead} /></span>
          <b className="lcard-n">{b.n}</b>
          <span className="lcard-s">{b.dead ? "Déjà vaincu cette semaine" : `Boss de la semaine, ${fint(b.left)} PV`}</span>
        </div>
      </div>
      {lastB && <p className="load-last">Semaine dernière : {lastB.n} {lastB.dead ? "vaincu" : `a survécu avec ${fint(lastB.left)} PV`}.</p>}
      <p className="load-tip">{tip}</p>
      <div className="load-bar"><i /></div>
      <span className="load-skip">Touche pour passer</span>
    </div>
  );
}

/** Fin de partie : victoire ou défaite, note, kills, stats, récap de mort */
export function EndGame({ ctx, k, live, onClose }) {
  const S = ctx.S;
  const di = G.dayInfo(k);
  const q = G.quests(k);
  const rc = G.recap(k);
  const today = k === ctx.todayK;
  const res = di.win ? "Victoire" : "Défaite";
  const rows = [
    { l: "Gold", ic: "coin", v: `${fint(di.t.k)}`, of: `/ ${fint(S.kcal)} kcal`, ok: di.kill.gold },
    { l: "Protéines", ic: "bolt", v: di.d.entries.length ? `${fint(di.t.p)}` : "–", of: `/ ${S.prot} g`, ok: di.kill.prot },
    { l: "Sommeil", ic: "heart", v: di.sh != null ? fH(di.sh) : "–", of: "la nuit d'avant", ok: di.kill.sleep },
    { l: "CS", ic: "sword", v: `${di.meals}`, of: di.meals > 1 ? "repas notés" : "repas noté" },
    { l: "Vision", ic: "eye", v: `${di.vision}`, of: "/ 100" },
  ];
  return (
    <div className={"endg " + (di.win ? "win" : "lose")} role="dialog" aria-modal="true" aria-label={`${res}, note ${di.grade}`}>
      <Backdrop id={di.win ? "or" : "sang"} seed={di.win ? 5 : 8} className="pa" />
      <div className="endg-rays" aria-hidden="true" />
      <Particles kind={di.win ? "bokeh" : "ember"} n={10} seed={2} />
      <Deco className="endg-in">
        <div className="endg-k">{today ? "Fin de partie" : cap(L.fmtDay(k))}</div>
        <h2 className="endg-t">{today && !di.win && !live ? "En cours" : res}</h2>
        <Orn className="endg-orn" />
        <div className="endg-g"><Grade g={di.grade} size="lg" /><span>{G.KILL_NAMES[di.kills] || "Aucun kill"}</span></div>
        <div className="endg-kills">{G.KILLS.map((x) => <KillHex key={x.id} k={x} done={di.kill[x.id]} />)}</div>
        <div className="endg-stats">
          {rows.map((r) => (
            <div key={r.l} className={"es" + (r.ok ? " ok" : "")}>
              <span className="es-l"><Icon n={r.ic} size={15} sw={2} />{r.l}</span>
              <span className="es-v"><b>{r.v}</b> {r.of}</span>
            </div>
          ))}
        </div>
        <div className="endg-xp">
          <span>XP de la partie <b>+{fint(di.total)}</b></span>
          <span>Niveau atteint <b>{di.level}</b></span>
          <span>Quêtes <b>{q.filter((x) => x.done).length}/{q.length}</b></span>
        </div>
        {rc.length > 0 && (
          <div className="endg-rc">
            <h3>{di.win ? "Ce qui t'a coûté" : "Récap de mort"}</h3>
            {rc.map((r, i) => <p key={i}><Icon n={r.ic} size={15} sw={2} />{r.t}</p>)}
          </div>
        )}
        <button className="cta sun full" onClick={onClose}>{live ? "Bonne nuit" : "Fermer"}</button>
      </Deco>
    </div>
  );
}

/** Première ouverture du Reforge : ton historique rejoué */
export function Welcome({ ctx, onClose, onPatch }) {
  const { todayK } = ctx;
  const acc = G.account(todayK);
  const rk = G.rank();
  const ach = G.achievements(todayK).filter((a) => a.at);
  const cs = G.stacks("creatine", todayK);
  const st = G.careerStats(todayK);
  return (
    <div className="welc" role="dialog" aria-modal="true" aria-label="Ton compte a été importé">
      <Backdrop id="night" seed={14} className="pa" />
      <Particles kind="star" n={14} seed={7} />
      <Deco className="welc-in">
        <div className="welc-k">Patch {PATCH.v}</div>
        <h2 className="welc-t">{PATCH.n}</h2>
        <p className="welc-p">Ton historique a été rejoué jour par jour. Voilà ton compte, calculé à partir de tes vraies données.</p>
        <div className="welc-grid">
          <div className="wg"><span className="wg-v">{acc.level}</span><span className="wg-l">niveau de compte</span></div>
          <div className="wg rank">{rk ? <Emblem tier={rk.cur.tier} size={44} /> : <Icon n="crown" size={26} />}<span className="wg-l">{rk ? rk.cur.name : "Pèse-toi pour être classé"}</span></div>
          <div className="wg"><span className="wg-v">{ach.length}</span><span className="wg-l">succès déjà débloqués</span></div>
          <div className="wg"><span className="wg-v">{st.days}</span><span className="wg-l">journées jouées</span></div>
        </div>
        <div className="welc-crea">
          <span className="welc-cl">Stacks de créatine</span>
          <StackGrid s={cs.s} lost={cs.lost7} />
          <span className="welc-cs">{cs.s}/28</span>
        </div>
        <div className="cta-row mt14">
          <button className="cta ghost" onClick={onPatch}>Notes de patch</button>
          <button className="cta sun" onClick={onClose}>Jouer</button>
        </div>
      </Deco>
    </div>
  );
}
