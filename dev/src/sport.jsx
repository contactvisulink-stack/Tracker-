import React, { useState, useMemo } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { RULES } from "./data.js";
import { Sheet, Icon, buzz, GramInput } from "./ui.jsx";
import { PostureSection } from "./posture.jsx";
import { TopBar, Meter, Sec } from "./client.jsx";
import { Glyph } from "./hud.jsx";

const { fint, fdec, fkg } = L;
const shortDate = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" }));
const setsTxt = (sets) => sets.filter((s) => !s.warm).map((s) => (s.w ? `${fdec(s.w, 2)} × ${s.r}` : `${s.r}`)).join("   ");

function targetLine(pe, sg) {
  if (sg.status === "up") return { cls: "up", w: sg.weight > 0 ? fkg(sg.weight) : "+ reps", tag: "On monte", main: sg.weight > 0 ? `Monte à ${fkg(sg.weight)}` : "Ajoute des reps", sub: `${sg.last.reps.join(" · ")} à ${fkg(sg.last.W)} la dernière fois : haut de fourchette atteint.` };
  if (sg.status === "hold") return { cls: "hold", w: fkg(sg.weight), tag: "On garde", main: `Reste à ${fkg(sg.weight)}`, sub: `Dernière fois ${sg.last.reps.join(" · ")}. À ${Array(pe.sets).fill(pe.max).join("/")}, tu montes.` };
  return { cls: "new", w: sg.weight ? fkg(sg.weight) : "À trouver", tag: sg.weight ? "Départ" : "", main: sg.weight ? `Commence à ${fkg(sg.weight)}` : "Trouve ta charge", sub: sg.weight ? `Objectif ${pe.sets} × ${pe.min}-${pe.max}.` : `Une charge qui te permet ${pe.max} reps propres.` };
}

export function Sport({ ctx }) {
  const [view, setView] = useState(ctx.sub === "posture" ? "posture" : "gym");
  const tr = L.trainingStatus(ctx.todayK);
  const sub = tr.todayW ? `${tr.todayW.title} faite aujourd'hui` : tr.due ? `Séance ${tr.next} aujourd'hui` : `Repos · prochaine : séance ${tr.next}`;
  return (
    <div className="page arena">
      <TopBar ctx={ctx} title="Arène" sub={sub} />
      <div className="seg top-seg">
        <button className={view === "gym" ? "on" : ""} onClick={() => setView("gym")}>Salle</button>
        <button className={view === "posture" ? "on" : ""} onClick={() => setView("posture")}>Posture{!L.getDay(ctx.todayK).h.posture && <small>à faire</small>}</button>
      </div>
      {view === "gym" ? <Gym ctx={ctx} /> : <PostureSection ctx={ctx} />}
    </div>
  );
}

function Gym({ ctx }) {
  const ws = L.getWorkouts();
  const tr = L.trainingStatus(ctx.todayK);
  const [sel, setSel] = useState(tr.todayW?.session || tr.next);
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  const wk = L.weekWorkouts(ctx.todayK, ws);
  const ws0 = L.weekStartKey(ctx.todayK);
  const PROG = L.getProgram();
  const prog = PROG.find((p) => p.day === sel) || PROG[0];
  const diffs = PROG.map((p) => L.sessionDiff(p.day)).filter(Boolean);
  const now = new Date(ctx.now);
  const m = G.mana(ctx.todayK, now);
  const adv = G.manaAdvice(m);
  const cs = G.stacks("creatine", ctx.todayK);
  const sp = G.spells(now);
  const rec = G.records();
  const recent = [...rec.events].reverse().slice(0, 5);
  return (
    <>
      <Sec title="Sélection de séance" right={<><b>{tr.wk}</b> / 3 cette semaine</>} className="champs-sec" label="Sélection de séance">
        <div className="spells" role="group" aria-label="Tes séances">
          {PROG.map((p) => {
            const key = G.SPELL_KEYS[p.day] || p.day;
            const isNext = p.day === tr.next && !tr.todayW;
            const doneToday = tr.todayW?.session === p.day;
            const last = ws.find((w) => w.session === p.day);
            const st = doneToday ? "Faite aujourd'hui" : isNext ? (sp.ready ? "Prête" : `Prête dans ${Math.ceil(sp.cd)} h`) : last ? `Faite ${L.fmtDay(last.date.slice(0, 10), { weekday: "short" }).replace(".", "")}` : "Jamais faite";
            return (
              <button key={p.day} className={"spell" + (sel === p.day ? " sel" : "") + (isNext ? " next" : "") + (isNext && sp.ready ? " ready" : "") + (doneToday ? " done" : "") + (isNext && !sp.ready ? " cd" : "")} onClick={() => { setSel(p.day); setOpen(null); }}
                aria-pressed={sel === p.day} aria-label={`Full Body ${p.day}${isNext ? ", prochaine" : ""}. ${st}.`}>
                <span className="spell-f">
                  <span className="spell-n">{p.day}</span>
                  <span className="spell-k">{key}</span>
                  {isNext && !sp.ready && <span className="spell-cd" style={{ "--cd": sp.frac.toFixed(3) }} />}
                  {doneToday && <span className="spell-ok"><Icon n="check" size={12} sw={2.6} /></span>}
                </span>
                <span className="spell-t">Full Body {p.day}</span>
                <span className="spell-s">{st}</span>
              </button>
            );
          })}
          <button className="spell ult" onClick={() => document.getElementById("ultime")?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label={`Records : ${rec.events.length}`}>
            <span className="spell-f">
              <span className="spell-n"><Glyph n="star" size={24} /></span>
              <span className="spell-k">R</span>
            </span>
            <span className="spell-t">Records</span>
            <span className="spell-s">{rec.events.length} au total</span>
          </button>
        </div>
        <div className="wk-row" aria-label="Tes séances cette semaine">
          {Array.from({ length: 7 }, (_, i) => {
            const k = L.addDays(ws0, i);
            const w = wk.find((x) => x.date.slice(0, 10) === k);
            return (
              <div key={k} className={"wk-c" + (w ? " on" : "") + (k === ctx.todayK ? " today" : "")}>
                <span className="wk-l">{L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                <span className="wk-d">{w ? w.session || "✓" : ""}</span>
              </div>
            );
          })}
        </div>
      </Sec>

      <section className="mana-p" aria-label="Mana">
        <div className="today-k"><span className="kick">Mana</span><span className={"pace lv-" + adv.lv}>{adv.t}</span></div>
        <div className="mana-row">
          <div className="today-n"><Glyph n="crystal" size={20} className="today-coin mana" /><b>{m.cur}</b><span>/ {m.max}</span></div>
        </div>
        <Meter v={m.cur} max={m.max} tone="blue" marks={[100 / m.max]} label={`Mana ${m.cur} sur ${m.max}`} />
        <p className="mana-adv">{adv.s}</p>
        <div className="mana-src">
          <span>Nuit <b>{Math.round(m.sl * 100)} %</b>{!m.sleepKnown && <small> estimée</small>}</span>
          <span>Farm d'hier <b>{Math.round(m.fy * 100)} %</b></span>
          <span>Farm du jour <b>{Math.round(m.ft * 100)} %</b></span>
          <button className="mana-crea" onClick={() => ctx.open({ type: "item", id: "creatine" })}>Créatine <b>+{m.max - 100}</b> max · {cs.s}/28</button>
        </div>
      </section>

      {diffs.map((df) => <DiffCard key={df.w.id + df.day} df={df} ctx={ctx} onDone={() => setSel(df.day)} />)}

      <Sec title={`Full Body ${prog.day}`} right={`${prog.exs.length} exercices`} className="exs" label={`Exercices de la séance ${prog.day}`}>
        <div className="ex-list">
          {prog.exs.map((pe) => <ExRow key={pe.key} pe={pe} ws={ws} open={open === pe.key} onToggle={() => setOpen(open === pe.key ? null : pe.key)} />)}
        </div>
        <div className="ex-btns">
          <button className="cta-main ghost" onClick={() => ctx.open({ type: "program", day: prog.day })} aria-label={`Modifier la séance ${prog.day}`}><Icon n="pen" size={16} /> Modifier {prog.day}</button>
          <button className="cta-main ghost" onClick={() => ctx.open({ type: "hevy" })} aria-label="Importer une séance Hevy"><Icon n="clip" size={16} /> Importer Hevy</button>
        </div>
      </Sec>

      <Sec title="Ultime : tes records" right={<><b>{rec.events.length}</b> au total</>} className="recs" label="Tes records">
        <div id="ultime" />
        {!recent.length && <p className="muted small">Ton premier record apparaîtra ici dès qu'une séance importée bat ta meilleure perf sur un exercice.</p>}
        {recent.map((e, i) => (
          <div key={i} className="rec-row">
            <span className="rec-n">{e.name}<small>{shortDate(e.k)}</small></span>
            <span className="rec-v"><b>{e.set.w ? `${fdec(e.set.w, 2)} kg × ${e.set.r}` : `${e.set.r} reps`}</b><small>+{fdec(e.e1rm - e.prev, 1)} kg de force estimée</small></span>
          </div>
        ))}
        {rec.plus1.length > 0 && <p className="hint">+1 rep réussis : <b>{rec.plus1.length}</b>. Le dernier : {rec.plus1[rec.plus1.length - 1].name}, {L.fmtDay(rec.plus1[rec.plus1.length - 1].k, { weekday: "long", day: "numeric", month: "long" })}.</p>}
      </Sec>

      <Sec title="Historique" right={<><b>{ws.length}</b> séances</>} className="hist" label="Historique des séances">
        {!ws.length && <p className="muted">Aucune séance importée.</p>}
        {ws.slice(0, all ? 100 : 5).map((w) => <WorkoutRow key={w.id} w={w} ctx={ctx} />)}
        {ws.length > 5 && <button className="link" onClick={() => setAll(!all)}>{all ? "Voir moins" : "Tout voir"}</button>}
      </Sec>

      <Sec title="Les règles du jeu" className="rules-sec">
        <ol className="rules">{RULES.map((r, i) => <li key={i}>{r}</li>)}</ol>
      </Sec>
    </>
  );
}

function ExRow({ pe, ws, open, onToggle }) {
  const sg = L.suggest(pe, ws);
  const tl = targetLine(pe, sg);
  const p1 = G.plusOne(pe, sg);
  const hist = open ? L.exHistory(pe.key, ws) : [];
  return (
    <div className={"ex " + tl.cls + (open ? " open" : "")}>
      <button className="ex-head" onClick={onToggle} aria-expanded={open} aria-label={`${pe.name} : ${tl.main}`}>
        <div className="ex-main">
          <div className="ex-name">{pe.name}</div>
          <div className="ex-sub">{pe.sets} × {pe.min}-{pe.max} reps · repos {pe.rest}</div>
          {p1 && <div className="ex-p1"><b>+1 rep</b> vise {p1.to.map((r, i) => <React.Fragment key={i}>{i > 0 && <span className="sl">/</span>}{i === p1.i ? <em>{r}</em> : <span>{r}</span>}</React.Fragment>)}</div>}
        </div>
        <div className="ex-load"><b>{tl.w}</b>{tl.tag && <span>{tl.tag}</span>}</div>
        <Icon n="chevron" size={16} style={{ color: "var(--dim)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
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
    ctx.say(dup ? "Séance mise à jour" : "Séance enregistrée. Charges mises à jour.", { undo });
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
                <span>{e.name}{m ? <span className="tag ok">reconnu</span> : <span className="tag">en plus</span>}</span>
                <span>{setsTxt(e.sets)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// « Ta séance C a changé » : propose de mettre le programme à jour
// ─────────────────────────────────────────────────────────────
function DiffCard({ df, ctx, onDone }) {
  const { w, day, newEx, missing } = df;
  const [pairs, setPairs] = useState(() => newEx.map((_, i) => (missing[i] ? missing[i].key : "")));
  const used = new Set(pairs.filter(Boolean));
  const leftover = missing.filter((m) => !used.has(m.key));
  const [remove, setRemove] = useState(() => new Set());
  const apply = () => {
    const undo = L.snapKey("program");
    L.applySessionUpdate(day, newEx.map((ex, i) => ({ ex, replaceKey: pairs[i] || null })), [...remove]);
    L.dismissDiff(w.id, day);
    buzz(12);
    ctx.say(`Séance ${day} mise à jour`, { undo });
    onDone && onDone();
  };
  return (
    <section className="panel diff">
      <h2 className="panel-t">{missing.length ? `Ta séance ${day} a changé ?` : `Un exercice en plus qui revient`}</h2>
      <p className="muted small mb10">{missing.length
        ? <>Dans ta séance du {L.fmtDay(w.date.slice(0, 10), { day: "numeric", month: "long" })}, {newEx.length > 1 ? "ces exercices ne sont" : "cet exercice n'est"} pas dans ton programme, et {missing.length > 1 ? `${missing.length} exercices prévus manquent` : "un exercice prévu manque"}. Ta séance compte quand même.</>
        : <>Tu l'as fait en plus sur au moins 2 de tes 3 dernières séances {day}. Ta séance compte normalement. Tu veux l'ajouter au programme ?</>}</p>
      {newEx.map((ex, i) => (
        <div key={i} className="diff-row">
          <div className="diff-n">{ex.name}<span className="item-sub"> · {ex.sets.filter((x) => !x.warm).map((x) => (x.w ? `${L.fdec(x.w, 2)}×${x.r}` : x.r)).join("  ")}</span></div>
          <label className="diff-sel">
            <span>Remplace</span>
            <select className="inp" value={pairs[i]} onChange={(e) => setPairs(pairs.map((p, j) => (j === i ? e.target.value : p)))}>
              <option value="">rien, c'est en plus</option>
              {missing.map((m) => <option key={m.key} value={m.key} disabled={used.has(m.key) && pairs[i] !== m.key}>{m.name}</option>)}
            </select>
          </label>
        </div>
      ))}
      {leftover.length > 0 && (
        <div className="mt10">
          <div className="sub-h" style={{ marginTop: 6 }}>Pas faits cette fois</div>
          {leftover.map((m) => (
            <button key={m.key} className={"toggle small" + (remove.has(m.key) ? " on" : "")} onClick={() => { const r = new Set(remove); r.has(m.key) ? r.delete(m.key) : r.add(m.key); setRemove(r); }}>
              <span>Retirer « {m.name} » de la séance</span><span className="sw"><i /></span>
            </button>
          ))}
        </div>
      )}
      <div className="cta-row mt14">
        <button className="cta ghost" onClick={() => { L.dismissDiff(w.id, day); ctx.say("Programme inchangé"); }}>Ignorer</button>
        <button className="cta sun" onClick={apply}>Mettre à jour</button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Modifier une séance à la main
// ─────────────────────────────────────────────────────────────
export function ProgramEdit({ ctx, day }) {
  const [prog, setProg] = useState(() => L.getProgram().map((d) => ({ ...d, exs: d.exs.map((x) => ({ ...x })) })));
  const [edit, setEdit] = useState(null);
  const d = prog.find((x) => x.day === day);
  const setExs = (exs) => setProg(prog.map((x) => (x.day === day ? { ...x, exs } : x)));
  const move = (i, dir) => { const a = [...d.exs]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setExs(a); };
  const save = () => { const undo = L.snapKey("program"); L.setProgram(prog); ctx.say(`Séance ${day} enregistrée`, { undo }); ctx.close(); };
  const reset = () => { const undo = L.snapKey("program"); L.resetProgram(); ctx.say("Programme d'origine remis", { undo }); ctx.close(); };
  if (edit) {
    const ok = edit.name.trim() && edit.sets > 0 && edit.min > 0 && edit.max >= edit.min;
    const commit = () => {
      if (!ok) return;
      const base = edit.i >= 0 ? d.exs[edit.i] : { key: "x_" + L.norm(edit.name).replace(/[^a-z0-9]+/g, "_").slice(0, 20) + "_" + L.uid().slice(-4), a: [], cues: [], inc: 2.5 };
      const nx = { ...base, name: edit.name.trim(), a: [...new Set([...(base.a || []), L.norm(edit.name)])], sets: edit.sets, min: edit.min, max: edit.max, start: edit.start || 0, rest: edit.max >= 12 ? "60-90 s" : "2 min" };
      setExs(edit.i >= 0 ? d.exs.map((x, j) => (j === edit.i ? nx : x)) : [...d.exs, nx]);
      setEdit(null);
    };
    const N = (k, label, unit = "") => (
      <label className="field"><span>{label}</span><GramInput unit={unit} value={edit[k]} onChange={(v) => setEdit({ ...edit, [k]: v ?? 0 })} /></label>
    );
    return (
      <Sheet title={edit.i >= 0 ? "Modifier l'exercice" : "Nouvel exercice"} onClose={ctx.close}
        footer={<div className="cta-row"><button className="cta ghost" onClick={() => setEdit(null)}>Retour</button><button className="cta sun" disabled={!ok} onClick={commit}>OK</button></div>}>
        <label className="field"><span>Nom (le même que dans Hevy, c'est mieux)</span><input className="inp" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Curl Pupitre (Barre)" /></label>
        <div className="grid2">{N("sets", "Séries")}{N("start", "Charge de départ", "kg")}{N("min", "Reps minimum")}{N("max", "Reps maximum")}</div>
      </Sheet>
    );
  }
  return (
    <Sheet title={`Séance ${day}`} onClose={ctx.close} tall
      footer={<div className="cta-row"><button className="cta ghost" onClick={ctx.close}>Annuler</button><button className="cta sun" onClick={save}>Enregistrer</button></div>}>
      <p className="muted small mb10">Touche un exercice pour le modifier. Tes séances déjà enregistrées ne bougent pas.</p>
      {d.exs.map((x, i) => (
        <div key={x.key} className="pe-row">
          <button className="pe-main" onClick={() => setEdit({ i, name: x.name, sets: x.sets, min: x.min, max: x.max, start: x.start || 0 })}>
            <span className="nm">{x.name}</span>
            <span className="item-sub">{x.sets} × {x.min}-{x.max}{x.start ? ` · départ ${L.fdec(x.start, 2)} kg` : ""}</span>
          </button>
          <button className="pe-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
          <button className="pe-btn" onClick={() => move(i, 1)} disabled={i === d.exs.length - 1} aria-label="Descendre">↓</button>
          <button className="x-btn" onClick={() => setExs(d.exs.filter((_, j) => j !== i))} aria-label={`Retirer ${x.name}`}><Icon n="close" size={14} sw={2.4} /></button>
        </div>
      ))}
      <button className="wide-btn mt10" onClick={() => setEdit({ i: -1, name: "", sets: 3, min: 8, max: 12, start: 0 })}><Icon n="plus" size={17} /> Ajouter un exercice</button>
      {L.isCustomProgram() && <button className="link small mt10" onClick={reset}>Remettre tout le programme d'origine</button>}
    </Sheet>
  );
}
