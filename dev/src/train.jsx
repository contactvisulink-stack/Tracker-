// ═════════════════════════════════════════════════════════════
// Sport : ta séance, ta forme, tes charges, ta progression, ta mobilité.
// ═════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import { Sheet, Icon, buzz, GramInput } from "./ui.jsx";
import { PostureSection } from "./posture.jsx";
import { Title, Sec, Cap, Ring, Area, Chip, shortDay } from "./kit.jsx";

const { fint, fdec, fkg } = L;
const shortDate = shortDay;
const setsTxt = (sets) => sets.filter((s) => !s.warm).map((s) => (s.w ? `${fdec(s.w, 2)}×${s.r}` : `${s.r}`)).join("  ");

function target(pe, sg) {
  if (sg.status === "up") return { cls: "up", w: sg.weight > 0 ? fkg(sg.weight) : "+ reps", tag: "On monte", why: `${sg.last.reps.join(" · ")} à ${fkg(sg.last.W)} la dernière fois : haut de la fourchette atteint partout.` };
  if (sg.status === "hold") return { cls: "hold", w: fkg(sg.weight), tag: "On garde", why: `Dernière fois ${sg.last.reps.join(" · ")}. Tu montes quand tu fais ${Array(pe.sets).fill(pe.max).join(" · ")}.` };
  return { cls: "new", w: sg.weight ? fkg(sg.weight) : "À trouver", tag: sg.weight ? "Départ" : "", why: sg.weight ? `Objectif ${pe.sets} × ${pe.min}-${pe.max}.` : `Une charge qui te permet ${pe.max} reps propres.` };
}

export function Sport({ ctx }) {
  const [tab, setTab] = useState(ctx.sub === "mob" ? "mob" : "gym");
  const tr = L.trainingStatus(ctx.todayK);
  const kick = tr.todayW ? `${tr.todayW.title} faite aujourd'hui` : tr.due ? `Séance ${tr.next} aujourd'hui` : `Repos · séance ${tr.next} ensuite`;
  return (
    <div className="page">
      <Title ctx={ctx} kicker={kick} title="Sport">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === "gym"} className={tab === "gym" ? "on" : ""} onClick={() => setTab("gym")}>Salle</button>
          <button role="tab" aria-selected={tab === "mob"} className={tab === "mob" ? "on" : ""} onClick={() => setTab("mob")}>Mobilité et posture</button>
        </div>
      </Title>
      {tab === "gym" ? <Gym ctx={ctx} tr={tr} /> : <Mobility ctx={ctx} />}
    </div>
  );
}

function Gym({ ctx, tr }) {
  const now = new Date(ctx.now);
  const PROG = L.getProgram();
  const ws = L.getWorkouts();
  const [sel, setSel] = useState(tr.todayW?.session || tr.next);
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  const prog = PROG.find((p) => p.day === sel) || PROG[0];
  const diffs = PROG.map((p) => L.sessionDiff(p.day)).filter(Boolean);
  const rd = E.readiness(ctx.todayK, now);
  const rc = E.recharge(now);
  const vol = E.weeklyVolume(ctx.todayK, 8);
  const rec = E.records();
  const recent = [...rec.events].reverse().slice(0, 4);
  const thisW = vol[vol.length - 1];
  const status = tr.todayW ? "Faite aujourd'hui" : rc.ready ? "Prête" : `Prête dans ${Math.ceil(rc.cd)} h`;
  return (
    <>
      <section className="card hero t-train" aria-label="Forme du jour">
        <div className="hero-top"><span className="hero-l"><Icon n="bolt" size={15} /> Forme du jour</span><Chip s={rd.adv.lv}>{rd.adv.t}</Chip></div>
        <div className="hero-row">
          <div>
            <div className="hero-n"><b className="grad-train">{rd.pct}</b><span>%</span></div>
            <p className="hero-s" style={{ marginTop: 2 }}>{rd.adv.s}</p>
          </div>
        </div>
        <div className="factors">
          <span><em>Nuit</em><Cap v={rd.sl * 100} max={100} tone="sleep" h={5} /><b>{Math.round(rd.sl * 100)} %</b></span>
          <span><em>Calories hier</em><Cap v={rd.fy * 100} max={100} tone="fuel" h={5} /><b>{Math.round(rd.fy * 100)} %</b></span>
          <span><em>Rythme auj.</em><Cap v={rd.ft * 100} max={100} tone="fuel" h={5} /><b>{Math.round(rd.ft * 100)} %</b></span>
          <span><em>Créatine</em><Cap v={rd.crea} max={28} tone="mass" h={5} /><b>{rd.crea}/28 j</b></span>
        </div>
      </section>

      <Sec title={`Full body ${prog.day}`} right={sel === (tr.todayW?.session || tr.next) ? status : null}>
        <div className="seg small3" role="group" aria-label="Séances">
          {PROG.map((p) => {
            const last = ws.find((w) => w.session === p.day);
            return (
              <button key={p.day} className={sel === p.day ? "on" : ""} onClick={() => { setSel(p.day); setOpen(null); }} aria-pressed={sel === p.day}>
                <b>{p.day}</b><small>{tr.todayW?.session === p.day ? "aujourd'hui" : last ? shortDate(last.date.slice(0, 10)).toLowerCase().replace(/ \d+ \w+$/, "") : "jamais"}</small>
              </button>
            );
          })}
        </div>
        {diffs.map((df) => <DiffCard key={df.w.id + df.day} df={df} ctx={ctx} onDone={() => setSel(df.day)} />)}
        <div className="card list mt10">
          {prog.exs.map((pe) => <ExRow key={pe.key} pe={pe} ws={ws} open={open === pe.key} onToggle={() => setOpen(open === pe.key ? null : pe.key)} />)}
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => ctx.open({ type: "hevy" })} aria-label="Importer une séance Hevy"><Icon n="clip" size={16} /> Importer Hevy</button>
          <button className="btn ghost" onClick={() => ctx.open({ type: "program", day: prog.day })} aria-label={`Modifier la séance ${prog.day}`}><Icon n="pen" size={16} /> Modifier</button>
        </div>
      </Sec>

      <Sec title="Progression">
        <div className="card chartc">
          <div className="chartc-h"><span><em>Volume soulevé cette semaine</em><b>{fint(thisW.vol)} kg</b></span><Chip>{thisW.sets} séries</Chip></div>
          <Area values={vol.map((v) => v.vol || null)} bars tone="train" h={70} w={320} min={0} />
          <div className="axis"><span>il y a 7 semaines</span><span>cette semaine</span></div>
        </div>
        {recent.length > 0 && (
          <div className="card list mt10">
            {recent.map((e, i) => (
              <div key={i} className="row">
                <span className="bub sm t-ok"><Icon n="trophy" size={15} /></span>
                <span className="row-m"><b>{e.name}</b><span>{shortDate(e.k)}</span></span>
                <span className="row-v"><b>{e.set.w ? `${fdec(e.set.w, 2)} kg × ${e.set.r}` : `${e.set.r} reps`}</b><span className="c-ok">record</span></span>
              </div>
            ))}
          </div>
        )}
      </Sec>

      <Sec title="Historique" right={`${ws.length} séances`}>
        <div className="card list pad">
          {!ws.length && <p className="muted" style={{ padding: "12px 0" }}>Aucune séance importée.</p>}
          {ws.slice(0, all ? 100 : 4).map((w) => <WorkoutRow key={w.id} w={w} ctx={ctx} />)}
          {ws.length > 4 && <button className="link" style={{ padding: "12px 0" }} onClick={() => setAll(!all)}>{all ? "Voir moins" : "Tout voir"}</button>}
        </div>
      </Sec>
    </>
  );
}

function ExRow({ pe, ws, open, onToggle }) {
  const sg = L.suggest(pe, ws);
  const tl = target(pe, sg);
  const p1 = E.plusOne(pe, sg);
  const hist = open ? L.exHistory(pe.key, ws, 8) : [];
  return (
    <div className={"ex " + tl.cls + (open ? " open" : "")}>
      <button className="ex-h" onClick={onToggle} aria-expanded={open} aria-label={`${pe.name} : ${tl.w}, ${tl.tag}`}>
        <span className="ex-m">
          <b>{pe.name}</b>
          <span>{pe.sets} × {pe.min}-{pe.max} · repos {pe.rest}</span>
          {p1 && <span className="ex-p">+1 rep : {p1.to.map((r, i) => (i === p1.i ? <em key={i}>{r}</em> : <React.Fragment key={i}>{r}</React.Fragment>)).reduce((a, x, i) => (i ? [...a, " · ", x] : [x]), [])}</span>}
        </span>
        <span className="load"><b>{tl.w}</b>{tl.tag && <span>{tl.tag}</span>}</span>
      </button>
      {open && (
        <div className="ex-b">
          <p className="muted">{tl.why}</p>
          {sg.drop && <p className="warn-txt">Ta dernière série a chuté : prends 3 min de repos avant elle.</p>}
          {hist.length >= 2 && (
            <div className="mt10">
              <em className="cap-l">Force estimée sur ta meilleure série</em>
              <Area values={hist.map((h) => h.best).reverse()} tone="ok" h={50} w={300} dots />
            </div>
          )}
          {hist.map((h, i) => <div key={i} className="hist-row"><span>{shortDate(h.date.slice(0, 10))}</span><span>{setsTxt(h.sets)}</span></div>)}
          {pe.cues?.length > 0 && <ul className="cues">{pe.cues.map((c, i) => <li key={i}>{c}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

// ── Mobilité : 4 tests à refaire chaque semaine, puis la routine posture
function Mobility({ ctx }) {
  const mob = E.getMob();
  const k = ctx.todayK;
  return (
    <>
      <Sec title="Tests de mobilité" right="1 fois par semaine">
        <div className="mobs">
          {E.MOB_TESTS.map((t) => {
            const h = Array.isArray(mob[t.id]) ? mob[t.id] : [];
            const last = h[h.length - 1];
            const today = last && last.k === k ? last.lv : null;
            return (
              <div key={t.id} className="card mob">
                <div className="mob-h"><b>{t.n}</b>{h.length > 0 && <span className="mob-hist" aria-label="Historique">{h.slice(-8).map((x, i) => <i key={i} className={"lv" + x.lv} title={`${x.k} : ${t.lv[x.lv]}`} />)}</span>}</div>
                <p>{t.how}</p>
                <div className="mob-lv" role="group" aria-label={t.n}>
                  {t.lv.map((l, i) => <button key={i} className={"lv" + i + (today === i ? " on" : "")} aria-pressed={today === i} onClick={() => { const undo = L.snapKey("mob"); E.setMob(t.id, i, k); buzz(8); ctx.say(`${t.n} : ${l.toLowerCase()}`, { undo }); }}>{l}</button>)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="hint">Note où tu en es, pas où tu voudrais être. Le but : voir ces points passer au vert grâce à la routine ci-dessous.</p>
      </Sec>
      <Sec title="Routine posture">
        <PostureSection ctx={ctx} />
      </Sec>
    </>
  );
}

function WorkoutRow({ w, ctx }) {
  const [open, setOpen] = useState(false);
  const del = () => { const undo = L.snapKey("workouts"); L.setWorkouts(L.getWorkouts().filter((x) => x.id !== w.id)); ctx.say(`« ${w.title} » supprimée`, { undo }); };
  return (
    <div className="wrow">
      <button className="wrow-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <span className="nm">{w.title}</span>{w.session && <span className="tag">{w.session}</span>}
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
