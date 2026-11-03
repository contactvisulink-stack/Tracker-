// ═════════════════════════════════════════════════════════════
// Les affiches : le haut de chaque onglet, peint comme un poster d'événement.
// Base : le ciel suit l'heure de ta journée. Farm : affiche de jour de match.
// Arène : damas et cramoisi. Profil : cadre art déco et or.
// ═════════════════════════════════════════════════════════════
import React from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { Icon, Count } from "./ui.jsx";
import { Portrait, GBar, Emblem, Coin, StackGrid } from "./hud.jsx";
import { Backdrop, Ridges, Particles, Moon, Deco, Orn, Torn, Doodles, damask, skyFor } from "./art.jsx";

const { fint, fdec, fH } = L;
export const pseudoOf = (S) => (S.pseudo || "Isma").trim() || "Isma";
/** Skin Graffiti : des tags dessinés sur l'affiche */
const Tags = ({ ctx, seed }) => (ctx.mood === "neon" ? <Doodles seed={seed} n={9} area="scatter" /> : null);
const seedOf = (k) => Number(String(k).replace(/\D/g, "").slice(-4)) || 7;

/** La barre du haut, posée sur l'affiche : ton médaillon, le coach, les runes */
export function TopBar({ ctx, center }) {
  const { S, todayK } = ctx;
  const di = G.dayInfo(todayK);
  const name = pseudoOf(S);
  return (
    <div className="tbar">
      <Portrait level={di.level} pct={di.lvlPct} size={46} letter={name[0]} onClick={() => ctx.go("profile")} label={`${name}, niveau ${di.level} de la partie. Voir ton profil.`} />
      <div className="tbar-c">{center}</div>
      <div className="tbar-r">
        <button className="round-btn glass" onClick={() => ctx.open({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={19} /></button>
        <button className="round-btn glass" onClick={() => ctx.open({ type: "settings" })} aria-label="Runes et réglages"><Icon n="rune" size={20} /></button>
      </div>
    </div>
  );
}

const DateStamp = ({ k, name }) => {
  const dt = L.keyToDate(k);
  const wd = dt.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  const mo = dt.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
  return (
    <div className="stamp">
      <div className="stamp-d">{wd} {dt.getDate()} {mo}</div>
      {name && <div className="stamp-n hud-n">{name}</div>}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// Base, de jour : le farm sous un ciel qui suit l'heure
// ═════════════════════════════════════════════════════════════
export function PosterHome({ ctx, d, boot }) {
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
  let chip;
  if (tk >= S.kcal) chip = { cls: "ok", txt: tk - S.kcal >= 50 ? `+${fint(tk - S.kcal)} au-dessus` : "Objectif atteint" };
  else if (p.frac < 0.04) chip = { cls: "", txt: "La partie commence" };
  else chip = ahead >= 120 ? { cls: "ok", txt: `+${fint(ahead)} d'avance` } : ahead <= -150 ? { cls: "late", txt: `${fint(-ahead)} de retard` } : { cls: "", txt: "Dans le rythme" };
  const ph = G.phaseOf(now);
  const late = L.isLate(todayK, now);
  const e1 = ideal(L.dayMin("14:00")), e2 = ideal(L.dayMin("19:00"));
  const di = G.dayInfo(todayK);
  const m = G.mana(todayK, now);
  const rk = G.rank();
  const sk = G.streak(todayK);
  const name = pseudoOf(S);
  const sky = ctx.mood === "astral" ? skyFor(now) : ctx.mood;
  const tag = tk >= S.kcal ? "Objectif atteint. Tout le reste, c'est du bonus."
    : late ? `Il te manquait ${fint(S.kcal - tk)} gold. Demain, on rattrape.`
    : <>Il te manque <b>{fint(S.kcal - tk)}</b> gold{p.remaining > 0 && p.hoursLeft > 0.5 ? `, environ ${Math.max(1, Math.round(p.hoursLeft / 3))} repas` : ""}.</>;
  const camp = !late && tk < S.kcal - 250 && (p.sinceLast == null ? now.getHours() >= 10 && !d.entries.length : p.sinceLast >= 180);
  const pct = (v) => `${(L.clamp(v / S.kcal, 0, 1) * 100).toFixed(1)}%`;
  return (
    <section className={"poster hero p-home sky-" + sky} aria-label={`Farm du jour : ${fint(tk)} sur ${fint(S.kcal)} kcal. ${chip.txt}.`}>
      <Backdrop id={sky} seed={seedOf(todayK)} className="pa" />
      <Tags ctx={ctx} seed={7} />
      <Particles kind={sky === "night" || sky === "dawn" ? "star" : sky === "dusk" ? "ember" : "dust"} n={12} seed={seedOf(todayK)} />
      <TopBar ctx={ctx} center={<DateStamp k={todayK} name={name} />} />
      <div className="ph-head">
        <h1 className="ph-title"><span className="metal">{G.PHASES[ph].n}</span></h1>
        <p className="ph-tag">{tag}</p>
      </div>
      <button className="ph-stage" onClick={() => ctx.go("food")} aria-label={`${fint(tk)} gold. Voir ton farm.`}>
        <Ridges id={sky} seed={23} part="back" className="rg-back" />
        <span className="hero-big"><Count v={tk} from0={boot} /></span>
        <Ridges id={sky} seed={23} part="front" className="rg-front" />
      </button>
      <div className="ph-foot">
        <div className="ph-of">
          <span><Coin size={15} /> sur <b>{fint(S.kcal)}</b> gold</span>
          <span className={"ph-chip " + chip.cls}>{chip.txt}</span>
          {camp && <span className="ph-chip camp"><Icon n="hourglass" size={13} sw={2.2} />Camp réapparu</span>}
        </div>
        <div className="phb" aria-hidden="true">
          <div className="phb-t">
            <i className="phb-f" style={{ width: pct(tk) }} />
            <i className="phb-x" style={{ left: pct(e1) }} /><i className="phb-x" style={{ left: pct(e2) }} />
            {tk < S.kcal && p.frac >= 0.04 && !late && <i className="phb-m" style={{ left: pct(expNow) }} />}
          </div>
          <div className="phb-l">
            <span className={ph === "early" ? "on" : ""} style={{ width: pct(e1) }}>Early</span>
            <span className={ph === "mid" ? "on" : ""} style={{ width: `calc(${pct(e2)} - ${pct(e1)})` }}>Mid</span>
            <span className={ph === "late" ? "on" : ""}>Late</span>
          </div>
        </div>
        <div className="ph-stats">
          <button className="ph-stat hp" onClick={() => ctx.open({ type: "sleep", k: todayK })} aria-label={`Points de vie, ton sommeil : ${di.sh != null ? fH(di.sh) : "pas noté"}`}>
            <span className="ps-v"><Icon n="heart" size={14} sw={2.2} />{di.sh != null ? fH(di.sh) : "À noter"}</span><span className="ps-l">PV, ta nuit</span>
          </button>
          <button className="ph-stat mana" onClick={() => ctx.go("sport")} aria-label={`Mana : ${m.cur} sur ${m.max}. Voir l'Arène.`}>
            <span className="ps-v"><Icon n="crystal" size={14} sw={2.2} />{m.cur}</span><span className="ps-l">mana sur {m.max}</span>
          </button>
          <div className={"ph-stat streak" + (sk.ready ? " flash" : "")} title="Le Flash sauve ta série une fois par semaine">
            <span className="ps-v"><Icon n="flame" size={14} sw={2.2} />{sk.n}</span><span className="ps-l">{sk.ready ? "série, Flash prêt" : `série, Flash ${sk.inDays} j`}</span>
          </div>
          <button className="ph-stat rank" onClick={() => ctx.go("profile", undefined, "rank")} aria-label={rk ? `Rang ${rk.cur.name}, ${rk.cur.lp} LP` : "Non classé"}>
            <span className="ps-v"><Emblem tier={rk ? rk.cur.tier : 0} size={18} dim={!rk} />{rk ? rk.cur.name : "–"}</span><span className="ps-l">{rk ? `${rk.cur.lp} LP` : "non classé"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Base, la nuit : le recall sous la lune (elle se remplit avec ta nuit)
// ═════════════════════════════════════════════════════════════
export function PosterNight({ ctx, night }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const h = Math.max(0, (now - new Date(night.bed)) / 3.6e6);
  const pct = L.clamp(h / S.sleep, 0, 1);
  const sky = ctx.mood === "astral" ? "night" : ctx.mood;
  return (
    <section className={"poster hero p-home p-night sky-" + sky} aria-label={`Recall en cours depuis ${L.hm(night.bed)}`}>
      <Backdrop id={sky} seed={31} className="pa" />
      <Tags ctx={ctx} seed={14} />
      <Particles kind="firefly" n={10} seed={4} />
      <div className="pn-moon"><Moon size={132} frac={0.12 + pct * 0.88} /></div>
      <TopBar ctx={ctx} center={<DateStamp k={todayK} name={pseudoOf(S)} />} />
      <div className="ph-head">
        <h1 className="ph-title"><span className="metal">Recall</span></h1>
        <p className="ph-tag">Recall en cours depuis {L.hm(night.bed)}</p>
      </div>
      <div className="ph-stage">
        <Ridges id={sky} seed={23} part="back" className="rg-back" />
        <span className="hero-big">{fH(h)}</span>
        <Ridges id={sky} seed={23} part="front" className="rg-front" />
      </div>
      <div className="ph-foot">
        <GBar kind="hp" ic="heart" v={h} max={S.sleep} text={<><em>PV</em>{Math.round(pct * 100)} %</>} label={`Régénération : ${fH(h)} sur ${fdec(S.sleep)} h`} />
        <p className="pn-s">Tes PV se régénèrent. Objectif {fdec(S.sleep)} h. Le reste attendra demain.</p>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Farm : l'affiche du jour de match, toi contre le boss de la semaine
// ═════════════════════════════════════════════════════════════
export function PosterFarm({ ctx, k, setK, label, children }) {
  const { S, todayK } = ctx;
  const d = L.getDay(k), t = L.dayTot(d);
  const isToday = k === todayK;
  const b = G.boss(todayK);
  const art = ctx.mood === "braise" ? "braise" : ctx.mood === "astral" ? "dusk" : ctx.mood;
  return (
    <section className="poster p-farm" aria-label={`Farm, ${label} : ${fint(t.k)} sur ${fint(S.kcal)} kcal`}>
      <Backdrop id={art} seed={13} className="pa" />
      <Tags ctx={ctx} seed={21} />
      <Particles kind="ember" n={16} seed={8} />
      <div className="pf-paper" aria-hidden="true"><span className="pf-word">FARM</span></div>
      <TopBar ctx={ctx} />
      <div className="pf-main">
        <div className="daynav">
          <button className="dn-b" onClick={() => setK(L.addDays(k, -1))} aria-label="Jour précédent"><Icon n="left" size={18} /></button>
          <div className="daynav-t">{label}</div>
          <button className="dn-b" disabled={isToday} onClick={() => setK(L.addDays(k, 1))} aria-label="Jour suivant"><Icon n="right" size={18} /></button>
        </div>
        {!isToday && <button className="link small pf-back" onClick={() => setK(todayK)}>Revenir à aujourd'hui</button>}
        <div className="pf-num"><Count v={t.k} /></div>
        <div className="pf-of"><Coin size={14} /> sur {fint(S.kcal)} gold</div>
        <div className="pf-vs"><span>vs</span>{b.n}</div>
        <dl className="pf-list">
          <div className={t.p >= S.prot ? "ok" : ""}><dt>Protéines</dt><dd>{fint(t.p)}<small> / {fint(S.prot)} g</small></dd></div>
          <div><dt>Glucides</dt><dd>{fint(t.c)}<small> g</small></dd></div>
          <div><dt>Lipides</dt><dd>{fint(t.f)}<small> g</small></dd></div>
          <div><dt>CS</dt><dd>{d.entries.length}</dd></div>
        </dl>
      </div>
      <div className="pf-bars">{children}</div>
      <Torn seed={5} className="pf-torn" />
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Arène : damas cramoisi, ta mana de séance en grand
// ═════════════════════════════════════════════════════════════
export function PosterArene({ ctx }) {
  const { todayK } = ctx;
  const now = new Date(ctx.now);
  const tr = L.trainingStatus(todayK);
  const m = G.mana(todayK, now);
  const adv = G.manaAdvice(m);
  const cs = G.stacks("creatine", todayK);
  const kick = tr.todayW ? `${tr.todayW.title} faite` : tr.due ? `Séance ${tr.next} aujourd'hui` : "Repos aujourd'hui";
  const script = tr.todayW ? "sort lancé" : `séance ${tr.next}`;
  const dm = ctx.mood === "sang" ? "#FF8A8A" : "#FFFFFF";
  return (
    <section className="poster p-arene" aria-label={`Arène : ${kick}. Mana ${m.cur} sur ${m.max}.`}>
      <Backdrop id={ctx.mood === "sang" ? "sang" : ctx.mood === "astral" ? "night" : ctx.mood} seed={21} className="pa" />
      <Tags ctx={ctx} seed={28} />
      <div className="pr-damask" style={{ backgroundImage: damask(dm, 0.22) }} aria-hidden="true" />
      <div className="pr-cut" aria-hidden="true" />
      <Particles kind="ember" n={8} seed={12} />
      <TopBar ctx={ctx} />
      <div className="pr-head">
        <div className="pr-k">{kick}</div>
        <h1 className="pr-title"><span className="metal">Arène</span></h1>
        <span className="pr-script" aria-hidden="true">{script}</span>
      </div>
      <div className="pr-mana mana-p">
        <div className="pr-num"><span>{m.cur}</span><small>/ {m.max} mana</small></div>
        <GBar kind="mana big" ic="crystal" v={m.cur} max={m.max} text={<><em>Mana</em>{m.cur} / {m.max}</>} label={`Mana ${m.cur} sur ${m.max}`} />
        <p className="pr-adv"><b>{adv.t}.</b> {adv.s}</p>
        <button className="pr-crea" onClick={() => ctx.open({ type: "item", id: "creatine" })} aria-label={`Créatine : ${cs.s} stacks sur 28, mana max plus ${m.max - 100}`}>
          <span><b>Créatine</b> +{m.max - 100} mana max, {cs.s}/28</span>
          <StackGrid s={cs.s} lost={cs.lost7} cols={14} />
        </button>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Profil : ta carte d'invocateur, façon art déco
// ═════════════════════════════════════════════════════════════
export function PosterProfil({ ctx }) {
  const { S, todayK } = ctx;
  const acc = G.account(todayK);
  const rk = G.rank();
  const wr = G.winrate(todayK, 30);
  const sk = G.streak(todayK);
  const name = pseudoOf(S);
  return (
    <section className="poster p-profil" aria-label={`${name}, niveau de compte ${acc.level}`}>
      <Backdrop id={ctx.mood === "astral" ? "night" : ctx.mood === "or" ? "or" : ctx.mood} seed={17} className="pa" />
      <Tags ctx={ctx} seed={35} />
      <div className="po-rays" aria-hidden="true" />
      <Particles kind="bokeh" n={12} seed={6} />
      <TopBar ctx={ctx} />
      <Deco className="po-card">
        <div className="po-lvl">Niveau de compte {acc.level}</div>
        <h1 className="po-name"><span className="metal">{name}</span></h1>
        <div className="po-title">{G.currentTitle(S, todayK)}</div>
        <GBar kind="xp" v={acc.into} max={acc.need} text={`${fint(acc.into)} / ${fint(acc.need)} XP`} ticks={5} />
        <Orn className="po-orn" />
      </Deco>
      <div className="po-emb"><Emblem tier={rk ? rk.cur.tier : 0} size={104} dim={!rk} /></div>
      <div className="po-stats">
        <div><b>{rk ? rk.cur.name : "Non classé"}</b><span>{rk ? `${rk.cur.lp} LP` : "pèse-toi"}</span></div>
        <div><b>{wr.pct != null ? `${Math.round(wr.pct * 100)} %` : "–"}</b><span>winrate 30 j, {wr.w} V {wr.l} D</span></div>
        <div><b>{sk.n}</b><span>{sk.ready ? "série, Flash prêt" : `série, Flash dans ${sk.inDays} j`}</span></div>
      </div>
      <div className="po-btns">
        <button className="pill-btn" onClick={() => ctx.open({ type: "codex" })}><Icon n="book" size={15} /> Codex</button>
        <button className="pill-btn" onClick={() => ctx.open({ type: "patch" })}><Icon n="scroll" size={15} /> Notes de patch</button>
      </div>
    </section>
  );
}
