// ═════════════════════════════════════════════════════════════
// La console : tu tapes, l'appli comprend, tu vois l'aperçu, tu valides.
// ═════════════════════════════════════════════════════════════
import React, { useState, useMemo, useRef, useEffect } from "react";
import * as L from "./lib.js";
import * as A from "./actions.js";
import { parseCommand, describe } from "./command.js";
import { Sheet, Icon, Spinner, buzz } from "./ui.jsx";
import { ItemsEditor } from "./fuel.jsx";

const { fint } = L;

export function ConsoleSheet({ ctx, init = "", k: k0 }) {
  const k = k0 || ctx.todayK;
  const [txt, setTxt] = useState(init);
  const [skip, setSkip] = useState(() => new Set());
  const [grams, setGrams] = useState({});
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef();
  useEffect(() => { const t = setTimeout(() => { ref.current?.focus(); const v = ref.current?.value || ""; ref.current?.setSelectionRange(v.length, v.length); }, 60); return () => clearTimeout(t); }, []);
  const P = useMemo(() => parseCommand(txt, ctx.S), [txt, ctx.S]);
  const change = (v) => { setTxt(v); setSkip(new Set()); setGrams({}); setAi(null); setErr(""); };

  const baseItems = ai || P.items;
  const items = baseItems.map((it, i) => (grams[i] !== undefined ? { ...it, g: grams[i] } : it)).filter((_, i) => !skip.has("i" + i));
  const acts = P.actions.map((a, i) => ({ a, i })).filter(({ i }) => !skip.has("a" + i));
  const missing = items.some((i) => i.g == null);
  const tot = L.itemsTot(items.filter((i) => i.g != null));
  const favTot = L.sumTot(acts.filter(({ a }) => a.type === "fav").map(({ a }) => L.itemsTot(a.fav.items)));
  const hasKey = !!L.getApiKey();
  const unmatched = ai ? [] : P.unmatched;
  const n = acts.length + (items.length ? 1 : 0);
  const can = n > 0 && !missing && !busy;
  const label = k === ctx.todayK ? L.mealLabel() : "Repas";
  const time = P.time || (k === ctx.todayK ? L.hm(new Date()) : "12:00");

  const askAI = async () => {
    setBusy(true); setErr("");
    try { const res = await L.aiParseText(P.foodText); setAi(L.fromAI(res)); setGrams({}); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const run = () => {
    if (!can) return;
    const undos = [L.snapDay(k), L.snapKey("iwt", true), L.snapKey("night")];
    let after = null;
    const done = [];
    for (const { a } of acts) {
      if (a.type === "weight") { A.setWeight(ctx, k, a.v, true); done.push(`${L.fdec(a.v, 1)} kg`); }
      else if (a.type === "water") { A.addWater(ctx, k, a.v, true); done.push(`eau +${L.fdec(a.v, 2)} L`); }
      else if (a.type === "habit") { A.setHabit(ctx, k, a.id, true, true); done.push(describe(a, ctx.S).t.toLowerCase()); }
      else if (a.type === "sleep") { const nt = L.nightFromTimes(k, a.bed, a.wake); L.updDay(k, (d) => ({ ...d, sleep: { ...nt, lat: ctx.S.lat, q: d.sleep?.q ?? null } })); done.push(`nuit ${L.fH(L.sleepHours({ ...nt, lat: ctx.S.lat }))}`); }
      else if (a.type === "fav") { L.addEntry(k, a.fav.items, a.fav.name, time); done.push(a.fav.name); }
      else if (a.type === "bed") after = () => A.startNight(ctx);
      else if (a.type === "wake") after = () => A.wakeNow(ctx);
      else if (a.type === "hevy") after = () => ctx.open({ type: "hevy" });
    }
    if (items.length) { L.addEntry(k, items, label, time); done.push(`${fint(tot.k)} kcal`); }
    buzz(12);
    ctx.close();
    if (done.length) ctx.say(`Noté : ${done.join(", ")}`, { undo: () => undos.forEach((u) => u()) });
    if (after) setTimeout(after, done.length ? 300 : 0);
  };

  const favs = L.getFavs().slice(0, 8);
  const quick = [["eau", "Eau +0,5 L"], ["créa", "Créatine"], ["poids ", "Poids"], ["dodo", "Mode nuit"]];
  const append = (s) => change((txt.trim() ? txt.trim().replace(/,$/, "") + ", " : "") + s);

  return (
    <Sheet title="Noter" onClose={ctx.close} tall
      footer={<div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn ghost" onClick={() => ctx.open({ type: "add", k, mode: "photo" })}><Icon n="camera" size={16} /> Photo</button>
        <button className="btn ghost" onClick={() => ctx.open({ type: "add", k, mode: "search" })}><Icon n="search" size={16} /> Chercher</button>
        <button className="btn" disabled={!can} onClick={run}>Valider{n > 1 ? ` (${n})` : ""}</button>
      </div>}>
      <div className="con-in">
        <textarea ref={ref} className="inp" rows={2} value={txt} onChange={(e) => change(e.target.value)} placeholder="2 oeufs, 150 g riz, créa, eau 1 l…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); run(); } }} aria-label="Ce que tu as fait" />
      </div>

      {n === 0 && !P.unmatched.length && (
        <>
          <div className="qrow">{quick.map(([v, l]) => <button key={l} className="chip" onClick={() => append(v)}>{l}</button>)}</div>
          {favs.length > 0 && <div className="sub-h">Favoris</div>}
          <div className="chips">{favs.map((f) => <button key={f.id} className="chip" onClick={() => append(f.name)}>{f.name}<small className="mono dim" style={{ marginLeft: 6 }}>{fint(L.itemsTot(f.items).k)}</small></button>)}</div>
          <p className="con-help"><b>Repas</b> 200 g poulet, 250 g riz, 1 c.s. huile<br /><b>Protocole</b> créa · lumière · minox · posture · eau 1 l<br /><b>Corps</b> poids 53,6 · nuit 1h30 9h45 · dodo · levé<br /><b>Séance</b> séance (ouvre l'import Hevy)<br />Sépare par des virgules. Rien n'est enregistré avant « Valider ».</p>
        </>
      )}

      {(n > 0 || P.unmatched.length > 0) && (
        <div className="cp" aria-label="Aperçu">
          {acts.map(({ a, i }) => {
            const d = describe(a, ctx.S);
            return (
              <div key={"a" + i} className="cp-row">
                <span className="cp-ic"><Icon n={d.ic} size={17} /></span>
                <span className="cp-t">{d.t}<small>{a.type === "fav" ? "favori" : a.raw}</small></span>
                <span className="cp-v">{d.v}</span>
                <button className="cp-x" onClick={() => setSkip(new Set([...skip, "a" + i]))} aria-label={`Retirer ${d.t}`}><Icon n="close" size={14} sw={2.2} /></button>
              </div>
            );
          })}
          {baseItems.length > 0 && items.length > 0 && (
            <>
              <div className="cp-row"><span className="cp-ic"><Icon n="fork" size={17} /></span><span className="cp-t">{label}<small>{time}{ai ? " · estimé par l'IA" : ""}</small></span><span className="cp-v">{missing ? "quantités ?" : `${fint(tot.k)} kcal`}</span><span /></div>
              <div className="cp-meal">
                <ItemsEditor items={items} tags onGrams={(j, g) => setGrams({ ...grams, [indexOf(baseItems, skip, j)]: g })} onRemove={(j) => setSkip(new Set([...skip, "i" + indexOf(baseItems, skip, j)]))} />
              </div>
            </>
          )}
          {unmatched.map((u, i) => <div key={"u" + i} className="cp-row"><span className="cp-ic" style={{ color: "var(--warn)" }}><Icon n="info" size={17} /></span><span className="cp-t">« {u} »<small>pas reconnu</small></span><span /><span /></div>)}
          {(items.length > 0 || favTot.k > 0) && <div className="cp-tot"><span>Total repas</span><span><b>{fint(tot.k + favTot.k)}</b> kcal · {fint(tot.p + favTot.p)} g P</span></div>}
        </div>
      )}
      {unmatched.length > 0 && (hasKey
        ? <button className="btn ghost full" style={{ marginTop: 10 }} disabled={busy} onClick={askAI}>{busy ? <><Spinner /> Analyse…</> : "Demander à l'IA"}</button>
        : <p className="hint">Sans clé API : utilise « Chercher » pour trouver ou créer l'aliment.</p>)}
      {err && <div className="err">{err}</div>}
    </Sheet>
  );
}

/** Position réelle d'un aliment affiché (les aliments retirés sont sautés) */
function indexOf(base, skip, j) {
  let c = -1;
  for (let i = 0; i < base.length; i++) { if (skip.has("i" + i)) continue; c++; if (c === j) return i; }
  return -1;
}
