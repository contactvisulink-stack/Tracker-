import React, { useState } from "react";
import * as L from "./lib.js";
import * as A from "./actions.js";
import { Reticle, MiniTarget, Count, Icon, buzz } from "./ui.jsx";

const { fint, fdec, fH } = L;

export function Focus({ ctx }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const d = L.getDay(todayK);
  const R = L.rings(d, S);
  const acts = L.focusActions(todayK, now, S);
  const night = L.store.get("night", null);
  const p = L.pace(todayK, now, S);
  const all = R.kcal >= 1 && R.prot >= 1 && R.sleep >= 1;
  const left = Math.max(0, S.kcal - R.t.k);
  const tip = L.insight(todayK, S);

  return (
    <div className="page focus">
      <section className="hero">
        <Reticle values={{ kcal: R.kcal, prot: R.prot, sleep: R.sleep }}
          onRing={(key) => (key === "sleep" ? ctx.open({ type: "sleep", k: todayK }) : ctx.go("food"))}>
          {all ? (
            <><div className="rc-big bull-txt">Dans le mille</div><div className="rc-sub">3 sur 3</div></>
          ) : night ? (
            <><div className="rc-moon">🌙</div><div className="rc-sub">nuit en cours</div></>
          ) : left > 0 ? (
            <><div className={"rc-big" + (left >= 1000 ? " long" : "")}><Count v={left} /></div><div className="rc-sub">kcal à manger</div></>
          ) : (
            <><div className="rc-big">✓</div><div className="rc-sub">calories<br />atteintes</div></>
          )}
        </Reticle>
        <div className="legend">
          <button className="lg" onClick={() => ctx.go("food")}>
            <span className="lg-dot" style={{ background: "var(--sun)" }} />
            <span className="lg-l">Calories</span>
            <span className="lg-v"><Count v={R.t.k} /></span>
            <span className="lg-g">sur {fint(S.kcal)}</span>
          </button>
          <button className="lg" onClick={() => ctx.go("food")}>
            <span className="lg-dot" style={{ background: "var(--flesh)" }} />
            <span className="lg-l">Protéines</span>
            <span className="lg-v"><Count v={R.t.p} /> g</span>
            <span className="lg-g">sur {fint(S.prot)} g</span>
          </button>
          <button className="lg" onClick={() => ctx.open({ type: "sleep", k: todayK })}>
            <span className="lg-dot" style={{ background: "var(--moon)" }} />
            <span className="lg-l">Sommeil</span>
            <span className="lg-v">{R.h != null ? fH(R.h) : "–"}</span>
            <span className="lg-g">sur {fH(S.sleep)}</span>
          </button>
        </div>
        {!night && R.t.k < S.kcal && p.frac > 0.05 && (
          <div className={"pace " + (p.diff >= -120 ? "good" : "late")}>
            {p.diff >= -120
              ? `Tu es dans le rythme${p.diff > 150 ? `, ${fint(p.diff)} kcal d'avance` : ""}.`
              : `${fint(-p.diff)} kcal de retard sur ton rythme.`}
          </div>
        )}
      </section>

      <NowCard ctx={ctx} acts={acts} p={p} />

      <Missions ctx={ctx} d={d} />

      <Week ctx={ctx} />

      {tip && <p className="insight-line">{tip}</p>}
    </div>
  );
}

function NowCard({ ctx, acts, p }) {
  const a = acts[0];
  const next = acts.slice(1, 3);
  return (
    <section className={"now tone-" + a.tone}>
      <div className="now-kicker">Maintenant</div>
      <div className="now-main">
        <span className="now-ic" aria-hidden="true">{a.ic}</span>
        <div>
          <h2 className="now-title">{a.title}</h2>
          <p className="now-text">{a.text}</p>
        </div>
      </div>
      <ActionButtons ctx={ctx} a={a} p={p} />
      {next.length > 0 && (
        <div className="then">
          <span className="then-l">Ensuite</span>
          {next.map((x) => <button key={x.id} className="then-i" onClick={() => quick(ctx, x)}>{x.ic} {x.title}</button>)}
        </div>
      )}
    </section>
  );
}

// Les petites actions de « Ensuite » se font en un tap
function quick(ctx, a) {
  const k = ctx.todayK;
  switch (a.id) {
    case "light": return A.toggleHabit(ctx, k, "light", "Lumière du jour");
    case "crea": return A.toggleHabit(ctx, k, "creatine", "Créatine");
    case "water": return A.addWater(ctx, k, 0.5);
    case "skm": case "sks": return A.toggleHabit(ctx, k, a.id, "Skincare");
    case "bed": return A.startNight(ctx);
    case "logNight": return ctx.open({ type: "sleep", k });
    case "train": return ctx.go("sport");
    case "weigh": return ctx.go("progress");
    default: return ctx.open({ type: "add", k });
  }
}

function ActionButtons({ ctx, a, p }) {
  const { todayK } = ctx;
  const [w, setW] = useState("");
  switch (a.id) {
    case "wake":
      return <button className="cta moon" onClick={() => A.wakeNow(ctx)}>☀️ Je suis levé</button>;
    case "sleeping":
      return <button className="cta ghost" onClick={() => { const u = L.snapKey("night"); L.store.del("night"); ctx.say("Nuit annulée", { undo: u }); }}>Annuler, je ne dors pas encore</button>;
    case "bed":
      return <button className="cta moon" onClick={() => A.startNight(ctx)}>🌙 Je pose le téléphone</button>;
    case "weigh": {
      const save = () => {
        const v = L.num(w);
        if (v == null || v < 30 || v > 200) { ctx.say("Écris ton poids, par exemple 52,4"); return; }
        const undo = L.snapKey("iwt", true);
        L.setWeights({ ...L.getWeights(), [todayK]: Math.round(v * 10) / 10 });
        buzz(12);
        ctx.say(`Pesée notée : ${fdec(v)} kg`, { undo });
      };
      return (
        <div className="cta-row">
          <input className="inp big-inp" inputMode="decimal" placeholder="52,4" value={w} onChange={(e) => setW(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Poids en kg" />
          <button className="cta sky" onClick={save}>Noter</button>
        </div>
      );
    }
    case "light":
      return <button className="cta sun" onClick={() => A.toggleHabit(ctx, todayK, "light", "Lumière du jour")}>C'est fait</button>;
    case "logNight":
      return <button className="cta moon" onClick={() => ctx.open({ type: "sleep", k: todayK })}>Noter ma nuit</button>;
    case "eat": {
      const fav = L.bestFav(a.target || p.perMeal);
      return (
        <div className="cta-col">
          {fav && (
            <button className="cta sun" onClick={() => A.addItems(ctx, todayK, fav.f.items, fav.f.name)}>
              <span>＋ {fav.f.name}</span><span className="cta-sub">{fint(fav.k)} kcal</span>
            </button>
          )}
          <button className="cta ghost" onClick={() => ctx.open({ type: "add", k: todayK })}>Autre chose</button>
          <button className="link center" onClick={() => ctx.open({ type: "coach", ask: "Qu'est-ce que je mange maintenant pour finir mes calories\u00a0?" })}>{"Une idée de repas\u00a0? Demande au coach"}</button>
        </div>
      );
    }
    case "prot": {
      const items = L.quickShaker();
      const t = L.itemsTot(items);
      return (
        <div className="cta-col">
          <button className="cta flesh" onClick={() => A.addItems(ctx, todayK, items, "Shaker whey")}><span>＋ Shaker whey + lait</span><span className="cta-sub">{fint(t.p)} g · {fint(t.k)} kcal</span></button>
          <button className="cta ghost" onClick={() => ctx.open({ type: "add", k: todayK })}>Autre chose</button>
        </div>
      );
    }
    case "train":
      return (
        <div className="cta-row">
          <button className="cta sun" onClick={() => ctx.go("sport")}>Voir mes charges</button>
          <button className="cta ghost" onClick={() => ctx.open({ type: "hevy" })}>Importer Hevy</button>
        </div>
      );
    case "crea":
      return <button className="cta sky" onClick={() => A.toggleHabit(ctx, todayK, "creatine", "Créatine")}>C'est pris</button>;
    case "water":
      return <button className="cta sky" onClick={() => A.addWater(ctx, todayK, 0.5)}>＋ 0,5 L</button>;
    case "skm":
    case "sks":
      return <button className="cta ghost" onClick={() => A.toggleHabit(ctx, todayK, a.id, "Skincare")}>C'est fait</button>;
    case "chill":
      return <button className="cta ghost" onClick={() => ctx.open({ type: "add", k: todayK })}>Ajouter un repas</button>;
    default:
      return <button className="cta ghost" onClick={() => ctx.go("progress")}>Voir ma semaine</button>;
  }
}

function Missions({ ctx, d }) {
  const { S, todayK } = ctx;
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const tr = L.trainingStatus(todayK);
  const water = d.water || 0;
  const tiles = [
    { id: "light", ic: "☀️", l: "Lumière", on: !!d.h.light, act: () => A.toggleHabit(ctx, todayK, "light", "Lumière du jour") },
    { id: "crea", ic: "💊", l: "Créatine", on: autoCrea || !!d.h.creatine, sub: autoCrea ? "dans ton shaker" : null, act: autoCrea ? null : () => A.toggleHabit(ctx, todayK, "creatine", "Créatine") },
    { id: "water", ic: "💧", l: "Eau", on: water >= S.water, sub: `${fdec(water)} / ${fdec(S.water)} L`, prog: Math.min(1, water / S.water), act: () => A.addWater(ctx, todayK, 0.5), hold: () => A.addWater(ctx, todayK, -0.5) },
  ];
  if (S.skincare) {
    tiles.push({ id: "skm", ic: "🧴", l: "Skin matin", on: !!d.h.skm, act: () => A.toggleHabit(ctx, todayK, "skm", "Skincare du matin") });
    tiles.push({ id: "sks", ic: "🌙", l: "Skin soir", on: !!d.h.sks, act: () => A.toggleHabit(ctx, todayK, "sks", "Skincare du soir") });
  }
  tiles.push(tr.todayW
    ? { id: "train", ic: "💪", l: `Séance ${tr.todayW.session || ""}`.trim(), on: true, sub: "faite", act: () => ctx.go("sport") }
    : tr.due ? { id: "train", ic: "💪", l: `Séance ${tr.next}`, on: false, sub: "aujourd'hui", act: () => ctx.go("sport") }
    : { id: "train", ic: "😮‍💨", l: "Repos", on: true, sub: `${tr.wk}/3 cette semaine`, act: () => ctx.go("sport") });
  const done = tiles.filter((t) => t.on).length;
  return (
    <section className="block">
      <div className="block-head"><h3>Missions du jour</h3><span className="count">{done}/{tiles.length}</span></div>
      <div className="tiles6">
        {tiles.map((t) => <Tile key={t.id} t={t} />)}
      </div>
      <div className="hint">Touche une mission pour la cocher. L'eau monte de 0,5 L par appui, appui long pour en retirer.</div>
    </section>
  );
}

function Tile({ t }) {
  const timer = React.useRef(null), held = React.useRef(false);
  const down = () => { held.current = false; if (t.hold) timer.current = setTimeout(() => { held.current = true; t.hold(); }, 550); };
  const up = () => clearTimeout(timer.current);
  return (
    <button className={"tile" + (t.on ? " on" : "") + (t.act ? "" : " static")} aria-pressed={t.on}
      onPointerDown={down} onPointerUp={up} onPointerLeave={up}
      onClick={() => { if (held.current) return; t.act && t.act(); }}>
      {t.prog != null && <span className="tile-fill" style={{ height: `${t.prog * 100}%` }} />}
      <span className="tile-ic">{t.ic}</span>
      <span className="tile-l">{t.l}</span>
      {t.sub && <span className="tile-s">{t.sub}</span>}
      {t.on && <span className="tile-ok" aria-hidden="true"><Icon n="check" size={13} sw={3} /></span>}
    </button>
  );
}

function Week({ ctx }) {
  const { S, todayK } = ctx;
  const ws = L.weekStartKey(todayK);
  return (
    <section className="block">
      <div className="block-head"><h3>Ta semaine</h3><button className="link" onClick={() => ctx.go("progress")}>Stats</button></div>
      <div className="week">
        {Array.from({ length: 7 }, (_, i) => {
          const k = L.addDays(ws, i), future = k > todayK;
          const R = L.rings(L.getDay(k), S);
          return (
            <button key={k} className={"wd" + (k === todayK ? " today" : "")} disabled={future} onClick={() => ctx.go("food", k)}>
              <span className="wd-l">{L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
              {future ? <span className="wd-empty" /> : <MiniTarget values={R} today={k === todayK} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
