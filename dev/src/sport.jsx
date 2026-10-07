import React, { useState, useMemo } from "react";
import * as L from "./lib.js";
import { PROGRAM, RULES } from "./data.js";
import { Sheet, Icon, buzz } from "./ui.jsx";

const { fint, fdec, fkg } = L;
const shortDate = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" }));
const setsTxt = (sets) => sets.filter((s) => !s.warm).map((s) => (s.w ? `${fdec(s.w, 2)} × ${s.r}` : `${s.r}`)).join("   ");

function targetLine(pe, sg) {
  if (sg.status === "up") return { cls: "up", main: sg.weight > 0 ? `Monte à ${fkg(sg.weight)}` : "Ajoute des reps", sub: `${sg.last.reps.join(" · ")} à ${fkg(sg.last.W)} la dernière fois : haut de fourchette atteint.` };
  if (sg.status === "hold") return { cls: "hold", main: `Reste à ${fkg(sg.weight)}`, sub: `Dernière fois ${sg.last.reps.join(" · ")}. À ${Array(pe.sets).fill(pe.max).join("/")}, tu montes.` };
  return { cls: "new", main: sg.weight ? `Commence à ${fkg(sg.weight)}` : "Trouve ta charge", sub: sg.weight ? `Objectif ${pe.sets} × ${pe.min}-${pe.max}.` : `Une charge qui te permet ${pe.max} reps propres.` };
}

export function Sport({ ctx }) {
  const ws = L.getWorkouts();
  const tr = L.trainingStatus(ctx.todayK);
  const [sel, setSel] = useState(tr.todayW?.session || tr.next);
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  const wk = L.weekWorkouts(ctx.todayK, ws);
  const ws0 = L.weekStartKey(ctx.todayK);
  const prog = PROGRAM.find((p) => p.day === sel);
  const head = tr.todayW ? { t: `${tr.todayW.title} faite`, s: "Bien joué. Récupère bien, mange bien." }
    : tr.due ? { t: `Séance ${tr.next} aujourd'hui`, s: "Voici tes charges. Garde cet écran ouvert à la salle." }
    : { t: "Repos aujourd'hui", s: `Prochaine : séance ${tr.next}. ${tr.wk}/3 cette semaine.` };
  return (
    <div className="page">
      <section className="panel">
        <h2 className="panel-t">{head.t}</h2>
        <p className="muted">{head.s}</p>
        <div className="wk-row">
          {Array.from({ length: 7 }, (_, i) => {
            const k = L.addDays(ws0, i);
            const w = wk.find((x) => x.date.slice(0, 10) === k);
            return (
              <div key={k} className="wk-c">
                <span className="wk-l">{L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                <span className={"wk-d" + (w ? " on" : "") + (k === ctx.todayK ? " today" : "")}>{w ? w.session || "✓" : ""}</span>
              </div>
            );
          })}
        </div>
        <button className="cta sun full" onClick={() => ctx.open({ type: "hevy" })}><Icon n="clip" size={18} /> Importer une séance Hevy</button>
      </section>

      <div className="seg">
        {PROGRAM.map((p) => (
          <button key={p.day} className={sel === p.day ? "on" : ""} onClick={() => { setSel(p.day); setOpen(null); }}>
            Séance {p.day}{p.day === tr.next && !tr.todayW && <small>prochaine</small>}
          </button>
        ))}
      </div>

      <div className="ex-list">
        {prog.exs.map((pe) => <ExRow key={pe.key} pe={pe} ws={ws} open={open === pe.key} onToggle={() => setOpen(open === pe.key ? null : pe.key)} />)}
      </div>

      <section className="block">
        <div className="block-head"><h3>Les règles</h3></div>
        <ul className="rules">{RULES.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </section>

      <section className="block">
        <div className="block-head"><h3>Historique</h3><span className="count">{ws.length}</span></div>
        {!ws.length && <p className="muted">Aucune séance importée.</p>}
        {ws.slice(0, all ? 100 : 5).map((w) => <WorkoutRow key={w.id} w={w} ctx={ctx} />)}
        {ws.length > 5 && <button className="link" onClick={() => setAll(!all)}>{all ? "Voir moins" : "Tout voir"}</button>}
      </section>
    </div>
  );
}

function ExRow({ pe, ws, open, onToggle }) {
  const sg = L.suggest(pe, ws);
  const tl = targetLine(pe, sg);
  const hist = open ? L.exHistory(pe.key, ws) : [];
  return (
    <div className={"ex " + tl.cls + (open ? " open" : "")}>
      <button className="ex-head" onClick={onToggle} aria-expanded={open}>
        <div className="ex-main">
          <div className="ex-name">{pe.name}</div>
          <div className="ex-target">{tl.main}</div>
          <div className="ex-sub">{pe.sets} × {pe.min}-{pe.max} · repos {pe.rest}</div>
        </div>
        <Icon n="chevron" size={18} style={{ color: "var(--dim)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="ex-body">
          <p className="ex-why">{tl.sub}</p>
          {sg.drop && <p className="warn-txt">Ta dernière série a chuté : prends 3 min de repos avant elle.</p>}
          <ul className="cues">{pe.cues.map((c, i) => <li key={i}>{c}</li>)}</ul>
          {hist.length > 0 && (
            <>
              <div className="sub-h">Tes dernières fois</div>
              {hist.map((h, i) => <div key={i} className="hist-row"><span>{shortDate(h.date.slice(0, 10))}</span><span>{setsTxt(h.sets)}</span></div>)}
              {hist.length >= 2 && <Spark values={hist.map((h) => h.best).reverse()} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Spark({ values }) {
  const W = 300, H = 56;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 8 - ((v - min) / span) * (H - 18)]);
  return (
    <div className="mt10">
      <div className="item-sub">Force estimée sur ta meilleure série</div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--sun)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--sun)" />)}
      </svg>
    </div>
  );
}

function WorkoutRow({ w, ctx }) {
  const [open, setOpen] = useState(false);
  const del = () => { const undo = L.snapKey("workouts"); L.setWorkouts(L.getWorkouts().filter((x) => x.id !== w.id)); ctx.say(`« ${w.title} » supprimée`, { undo }); };
  return (
    <div className="wrow">
      <button className="wrow-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <span className="nm">{w.title}</span>{w.session && <span className="tag sun">{w.session}</span>}
          <div className="item-sub">{shortDate(w.date.slice(0, 10))} · {L.workoutSets(w)} séries · {fint(L.workoutVolume(w))} kg soulevés</div>
        </span>
        <Icon n="chevron" size={18} style={{ color: "var(--dim)", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="wrow-body">
          {w.exercises.map((e, i) => <div key={i} className="hist-row"><span>{e.name}</span><span>{setsTxt(e.sets)}</span></div>)}
          <div className="chips mt8">
            {w.url && <a className="chip" href={w.url} target="_blank" rel="noreferrer">Ouvrir dans Hevy</a>}
            <button className="chip danger" onClick={del}>Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HevyImport({ ctx }) {
  const [txt, setTxt] = useState("");
  const [ses, setSes] = useState(null);
  const parsed = useMemo(() => (txt.trim() ? L.parseHevy(txt) : null), [txt]);
  const session = ses || parsed?.session || null;
  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setTxt(t); else ctx.say("Le presse-papier est vide"); }
    catch { ctx.say("Appui long dans la case, puis Coller"); }
  };
  const save = () => {
    if (!parsed?.exercises.length) return;
    const ws = L.getWorkouts();
    const undo = L.snapKey("workouts");
    const w = { id: L.uid(), title: parsed.title, date: parsed.date, url: parsed.url, session,
      exercises: parsed.exercises.map((e) => ({ name: e.name, key: L.matchExercise(e.name, session)?.key || null, sets: e.sets })) };
    const dup = ws.find((x) => (w.url && x.url === w.url) || (x.date === w.date && x.title === w.title));
    L.setWorkouts(dup ? ws.map((x) => (x === dup ? { ...w, id: dup.id } : x)) : [w, ...ws]);
    buzz(15);
    ctx.celebrate?.(dup ? null : "workout");
    ctx.say(dup ? "Séance mise à jour" : "Séance enregistrée 💪 Charges mises à jour", { undo });
    ctx.close();
  };
  return (
    <Sheet title="Importer une séance Hevy" onClose={ctx.close}
      footer={parsed?.exercises.length > 0 && <button className="cta sun full" onClick={save}>Enregistrer la séance</button>}>
      <p className="muted mb10">Dans Hevy : ouvre ta séance, touche Partager, puis Copier. Colle le texte ici.</p>
      <button className="cta ghost full mb10" onClick={paste}><Icon n="clip" size={18} /> Coller depuis le presse-papier</button>
      <textarea className="inp" rows={5} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"Full body B\nLe mercredi, oct. 07, 2026 à 3:14pm\n\nRowing Haltère\nSérie 1: 17.5 kg x 12"} />
      {parsed && !parsed.exercises.length && <div className="err">Aucune série trouvée dans ce texte.</div>}
      {parsed?.exercises.length > 0 && (
        <div className="mt14">
          <div className="row-between"><b>{parsed.title}</b><span className="item-sub">{new Date(parsed.date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
          <div className="chips mt8 mb10">
            {["A", "B", "C"].map((x) => <button key={x} className={"chip" + (session === x ? " on" : "")} onClick={() => setSes(x)}>Séance {x}</button>)}
          </div>
          {parsed.exercises.map((e, i) => {
            const m = L.matchExercise(e.name, session);
            return (
              <div key={i} className="hist-row">
                <span>{e.name}{m ? <span className="tag ok">reconnu</span> : <span className="tag">hors programme</span>}</span>
                <span>{setsTxt(e.sets)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
