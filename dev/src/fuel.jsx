// ═════════════════════════════════════════════════════════════
// Carburant : total, macros, projection, ce qu'il faut manger, journal.
// ═════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import * as A from "./actions.js";
import { Sheet, Icon, Spinner, GramInput, buzz } from "./ui.jsx";
import { Header, Sec, St, Bar, sign } from "./kit.jsx";

const { fint, fdec } = L;

export function Fuel({ ctx, k, setK }) {
  const { S, todayK } = ctx;
  const now = new Date(ctx.now);
  const isToday = k === todayK;
  const d = L.getDay(k), t = L.dayTot(d);
  const p = L.pace(k, now, S);
  const pr = isToday ? E.projection(k, now) : null;
  const sys = isToday ? E.systems(k, now).fuel : null;
  const kc = t.k || 1;
  const pct = (g, kcalPerG) => Math.round(((g * kcalPerG) / kc) * 100);
  const dayLabel = isToday ? "Aujourd'hui" : k === L.addDays(todayK, -1) ? "Hier" : L.cap(L.fmtDay(k, { weekday: "long", day: "numeric", month: "short" }));
  return (
    <div className="page">
      <Header ctx={ctx} title="Carburant" sub={`${fint(S.kcal)} kcal · ${fint(S.prot)} g de protéines par jour`} />
      <div className="daynav">
        <button className="dn-b" onClick={() => setK(L.addDays(k, -1))} aria-label="Jour précédent"><Icon n="left" size={18} /></button>
        <span className="daynav-t">{dayLabel}</span>
        <button className="dn-b" onClick={() => setK(L.addDays(k, 1))} disabled={isToday} aria-label="Jour suivant"><Icon n="right" size={18} /></button>
      </div>

      <section className="pnl" aria-label="Total du jour">
        <div className="pnl-h"><span className="lbl">Énergie</span>{sys ? <St s={sys.st} /> : <St s={t.k >= S.kcal ? "ok" : t.k >= S.kcal * 0.9 ? "warn" : "crit"} label={`${Math.round((t.k / S.kcal) * 100)} %`} />}</div>
        <div className="big xl"><b>{fint(t.k)}</b><span>/ {fint(S.kcal)} kcal</span></div>
        <div style={{ marginTop: 12 }}><Bar v={t.k} max={S.kcal} mark={isToday && t.k < S.kcal && p.frac > 0.05 ? p.expected : null} proj={pr?.end} /></div>
        <div className="scale"><span>0</span>{isToday && t.k < S.kcal && p.frac > 0.05 && <span>| = rythme visé à {L.hm(now)}</span>}<span>{fint(S.kcal)}</span></div>
        {isToday && (
          <div style={{ marginTop: 10 }}>
            <div className="kv"><span>Reste</span><b>{t.k >= S.kcal ? "objectif atteint" : `${fint(S.kcal - t.k)} kcal`}</b></div>
            {t.k < S.kcal && <div className="kv"><span>Rythme</span><b className={p.diff >= 0 ? "c-ok" : "c-warn"}>{sign(p.diff)} kcal</b></div>}
            {pr && t.k < S.kcal && <div className="kv"><span>Projection à la fin du jour</span><b className={pr.gap >= 0 ? "c-ok" : pr.gap > -S.kcal * 0.1 ? "c-warn" : "c-crit"}>{fint(pr.end)} ({sign(pr.gap)})</b></div>}
            {pr && t.k < S.kcal && <p className="hint" style={{ marginTop: 2 }}>{pr.src === "plan" ? "D'après le plan du coach." : `D'après ce que tu manges d'habitude après ${L.hm(now)} (${pr.n} derniers jours).`}</p>}
          </div>
        )}
        <div className="macros">
          <div className="mac"><span className="lbl">Protéines</span><b>{fint(t.p)}<small>/ {fint(S.prot)} g</small></b><Bar v={t.p} max={S.prot} tone="prot" thin /></div>
          <div className="mac"><span className="lbl">Glucides</span><b>{fint(t.c)}<small>g</small></b><span className="lbl">{t.k ? pct(t.c, 4) : 0} % kcal</span></div>
          <div className="mac"><span className="lbl">Lipides</span><b>{fint(t.f)}<small>g</small></b><span className="lbl">{t.k ? pct(t.f, 9) : 0} % kcal</span></div>
        </div>
      </section>

      {isToday && <Suggest ctx={ctx} k={k} now={now} />}

      <Sec code="J" title="Journal" right={`${d.entries.length} repas`}>
        <div className="meals">
          {d.entries.length ? d.entries.map((e) => <MealRow key={e.id} e={e} k={k} ctx={ctx} />)
            : <div className="empty-l">{d.legacy?.kcal ? `${fint(d.legacy.kcal)} kcal notées (ancienne version)` : "Rien de noté. Tape ton repas dans la console, en bas."}</div>}
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => ctx.console("", k)}><Icon n="plus" size={16} sw={2.2} /> Ajouter</button>
          <button className="btn ghost" onClick={() => ctx.open({ type: "foods" })}><Icon n="book" size={16} /> Aliments</button>
        </div>
      </Sec>
    </div>
  );
}

function Suggest({ ctx, k, now }) {
  const sg = E.suggestions(k, now);
  if (!sg.list.length) return null;
  return (
    <Sec code="→" title="Pour finir la journée" right={`~${fint(Math.round(sg.target / 50) * 50)} kcal / repas`}>
      <div className="box">
        {sg.list.map((c, i) => (
          <div key={i} className="sg">
            <span className="sg-n">{c.name}<small>{c.items.map((it) => it.name.replace(/ \(.*\)/, "")).join(", ")}</small></span>
            <span className="sg-v"><b>{fint(c.t.k)}</b>{fint(c.t.p)} g P</span>
            <button className="sg-p" onClick={() => A.addItems(ctx, k, c.items, c.name)} aria-label={`Ajouter ${c.name}`}><Icon n="plus" size={17} sw={2.4} /></button>
          </div>
        ))}
      </div>
    </Sec>
  );
}

function MealRow({ e, k, ctx }) {
  const [open, setOpen] = useState(false);
  const tot = L.entryTot(e);
  const upd = (fn) => L.updDay(k, (d) => ({ ...d, entries: d.entries.map((x) => (x.id === e.id ? fn(x) : x)) }));
  const fav = () => {
    const name = window.prompt("Nom du favori :", e.label);
    if (name && name.trim()) { const undo = L.snapKey("favs"); L.saveFav(name.trim(), e.items); ctx.say("Ajouté à tes favoris", { undo }); }
  };
  return (
    <div className={"ml" + (open ? " open" : "")}>
      <button className="ml-h" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="ml-t">{e.t}</span>
        <span><span className="ml-n">{e.label}</span><span className="ml-i">{e.items.filter((i) => i.fid !== "eau").map((i) => `${i.name.replace(/ \(.*\)/, "")}${i.g ? ` ${fint(i.g)} g` : ""}`).join(", ")}</span></span>
        <span className="ml-k"><b>{fint(tot.k)}</b><span>{fint(tot.p)} g P</span></span>
      </button>
      {open && (
        <div className="ml-b">
          <div className="grid2">
            <input className="inp" value={e.label} onChange={(ev) => upd((x) => ({ ...x, label: ev.target.value }))} aria-label="Nom du repas" />
            <input className="inp" type="time" value={e.t} onChange={(ev) => upd((x) => ({ ...x, t: ev.target.value || x.t }))} aria-label="Heure" />
          </div>
          <ItemsEditor items={e.items}
            onGrams={(i, g) => upd((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, g: g ?? 0 } : it)) }))}
            onRemove={(i) => upd((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} />
          <div className="kv"><span>Glucides · lipides</span><b>{fint(tot.c)} g · {fint(tot.f)} g</b></div>
          <div className="chips mt10">
            <button className="chip" onClick={() => ctx.open({ type: "add", k, entryId: e.id })}>+ Aliment</button>
            {k !== ctx.todayK && <button className="chip" onClick={() => { const undo = L.snapDay(ctx.todayK); L.addEntry(ctx.todayK, e.items, e.label); buzz(10); ctx.say("Refait aujourd'hui", { undo }); }}>Refaire aujourd'hui</button>}
            <button className="chip" onClick={fav}><Icon n="star" size={14} /> Favori</button>
            <button className="chip danger" onClick={() => A.deleteEntry(ctx, k, e)}>Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SrcTag({ it }) {
  if (it.isNew) return <span className="tag new">nouveau</span>;
  if (it.src === "ia") return <span className="tag ia">IA</span>;
  if (it.src === "perso") return <span className="tag">perso</span>;
  if (it.conf === "basse") return <span className="tag warn">à vérifier</span>;
  return null;
}
export function ItemsEditor({ items, onGrams, onRemove, tags }) {
  return (
    <div className="items">
      {items.map((it, i) => {
        const tt = L.itemTot(it), missing = it.g == null;
        return (
          <div key={i} className={"item" + (missing ? " missing" : "")}>
            <div className="item-main">
              <div className="item-name">{it.name}{tags && <SrcTag it={it} />}</div>
              {it.unsure && <div className="warn-txt">« {it.unsure} » : vérifie que c'est bien ça</div>}
              <div className="item-sub">{missing ? "Quantité ?" : `${fint(tt.k)} kcal · ${fdec(tt.p)} g prot`}</div>
            </div>
            <GramInput value={it.g} onChange={(g) => onGrams(i, g)} />
            {onRemove && <button className="x-btn" onClick={() => onRemove(i)} aria-label={`Retirer ${it.name}`}><Icon n="close" size={14} sw={2.4} /></button>}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Ajout rapide (bouton +)
// ═════════════════════════════════════════════════════════════
export function AddFood({ ctx, k, mode: initMode, entryId }) {
  const [mode, setMode] = useState(initMode || "home");
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [items, setItems] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [label, setLabel] = useState(k === ctx.todayK ? L.mealLabel() : "Repas");
  const [time, setTime] = useState(k === ctx.todayK ? L.hm(new Date()) : "12:00");
  const [q, setQ] = useState("");
  const [base, setBase] = useState(null);
  const [mult, setMult] = useState(1);
  const camRef = useRef(), galRef = useRef();
  const hasKey = !!L.getApiKey();

  const oneTap = (its, name) => {
    if (entryId) { const undo = L.snapDay(k); L.appendToEntry(k, entryId, its); ctx.say("Ajouté au repas", { undo }); }
    else A.addItems(ctx, k, its, name);
    ctx.close();
  };
  const runAI = async (txt) => {
    setBusy(true); setErr("");
    try { const res = await L.aiParseText(txt); setItems(L.fromAI(res)); setUnmatched([]); setNote(res.note || ""); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const analyze = async () => {
    setErr(""); setNote(""); setBase(null);
    const r = L.parseFoodText(text);
    setItems(r.items); setUnmatched(r.unmatched);
    const needs = r.unmatched.length > 0 || r.items.some((i) => i.unsure);
    if (needs && hasKey) await runAI(text);
    else if (!r.items.length && !r.unmatched.length) setErr("Rien trouvé. Exemple : « 200 g poulet, 250 g riz cuit, 1 c.s. huile ».");
  };
  const onPhoto = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setBusy(true); setErr(""); setNote(""); setBase(null);
    try {
      const res = await L.aiPhoto(await L.compressImage(file), hint.trim());
      setItems(L.fromAI(res)); setUnmatched([]); setNote(res.note || "");
      if (!res.items?.length) setErr("Aucune nourriture reconnue sur la photo.");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const adjust = (its, name) => {
    const x = its.map((i) => ({ ...i, src: i.fid && L.findFood(i.fid)?.custom ? "perso" : i.src || "base" }));
    setBase(x); setMult(1); setItems(x); setUnmatched([]); setNote(""); setMode("home");
    if (!entryId && name) setLabel(name);
  };
  const scale = (m) => { setMult(m); if (base) setItems(base.map((i) => ({ ...i, g: Math.round(i.g * m) }))); };
  const setG = (i, g) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, g } : x)));
  const rm = (i) => setItems((xs) => xs.filter((_, j) => j !== i));

  const valid = items.filter((i) => i.g != null);
  const tot = L.itemsTot(valid);
  const missing = items.some((i) => i.g == null);
  const canSave = valid.length > 0 && !missing && !busy;
  const save = () => {
    if (!canSave) return;
    if (entryId) { const undo = L.snapDay(k); L.appendToEntry(k, entryId, valid); ctx.say(`Ajouté : ${fint(tot.k)} kcal`, { undo }); }
    else {
      const undo = L.snapDay(k);
      L.addEntry(k, valid, label.trim() || L.mealLabel(), time);
      buzz(10);
      ctx.say(`+${fint(tot.k)} kcal, ${fint(tot.p)} g de protéines`, { undo });
    }
    ctx.close();
  };

  const favs = L.getFavs();
  const recents = L.recentEntries(ctx.todayK, 5);
  const results = mode === "search" ? L.searchFoods(q).slice(0, 25) : [];
  const preview = items.length > 0 || unmatched.length > 0;

  return (
    <Sheet title={entryId ? "Ajouter au repas" : "Qu'est-ce que tu as mangé ?"} onClose={ctx.close} tall
      footer={preview && (
        <>
          {!entryId && (
            <div className="grid2 mb10">
              <input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Nom du repas" />
              <input className="inp" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Heure" />
            </div>
          )}
          <div className="total-line"><span className="muted">{missing ? "Indique les quantités en rouge" : `${fint(tot.p)} g de protéines`}</span><b className="mono">+{fint(tot.k)} kcal</b></div>
          <button className="btn full" disabled={!canSave} onClick={save}>Ajouter au journal</button>
        </>
      )}>
      <div className="modes">
        {[["home", "pen", "Écrire"], ["photo", "camera", "Photo"], ["search", "search", "Chercher"]].map(([m, ic, l]) => (
          <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setErr(""); }}><Icon n={ic} size={17} /> {l}</button>
        ))}
      </div>

      {mode === "home" && (
        <>
          <div className="composer-box">
            <textarea className="inp" rows={text ? 4 : 2} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={"Écris comme tu me l'écris :\n196 ml lait entier, 90 g avoine…"} />
            {text.trim() && <button className="cta sun" disabled={busy} onClick={analyze}>{busy ? <><Spinner /> Analyse…</> : "Analyser"}</button>}
          </div>
          {!preview && (
            <>
              {favs.length > 0 && <div className="sub-h">En un tap</div>}
              <div className="hscroll">
                {favs.map((f) => {
                  const t = L.itemsTot(f.items);
                  return (
                    <div key={f.id} className="fav">
                      <button className="fav-main" onClick={() => oneTap(f.items, f.name)}>
                        <span className="fav-n">{f.name}</span>
                        <span className="fav-k"><b>{fint(t.k)}</b> kcal, {fint(t.p)} g P</span>
                      </button>
                      <button className="fav-adj" onClick={() => adjust(f.items, f.name)}>Ajuster</button>
                    </div>
                  );
                })}
              </div>
              {recents.length > 0 && <div className="sub-h">Refaire un repas récent</div>}
              {recents.map(({ k: rk, e, tot: rt }) => (
                <div key={rk + e.id} className="recent">
                  <button className="recent-main" onClick={() => oneTap(e.items, e.label)}>
                    <span className="recent-n">{e.label} <span className="muted small">· {rk === ctx.todayK ? "aujourd'hui" : L.fmtDay(rk, { weekday: "short", day: "numeric" })}</span></span>
                    <span className="recent-i">{e.items.map((i) => i.name.replace(/ \(.*\)/, "")).join(", ")}</span>
                  </button>
                  <div className="recent-r"><span><b>{fint(rt.k)}</b> <span className="muted small">kcal</span></span><button className="link small" onClick={() => adjust(e.items, e.label)}>Ajuster</button></div>
                </div>
              ))}
              {!favs.length && !recents.length && <p className="hint">Tes repas favoris et récents apparaîtront ici pour les ajouter en un tap.</p>}
            </>
          )}
          {base && (
            <div className="chips mt10">
              {[0.5, 1, 1.5, 2].map((m) => <button key={m} className={"chip" + (mult === m ? " on" : "")} onClick={() => scale(m)}>× {fdec(m)}</button>)}
            </div>
          )}
        </>
      )}

      {mode === "photo" && (
        <>
          <label className="field"><span>Ce que tu sais déjà (facultatif, ça aide beaucoup)</span>
            <input className="inp" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="170 g de pâtes, 1 c.s. d'huile" />
          </label>
          <div className="cta-row">
            <button className="cta sun" disabled={busy || !hasKey} onClick={() => camRef.current?.click()}><Icon n="camera" size={18} /> Prendre la photo</button>
            <button className="cta ghost" disabled={busy || !hasKey} onClick={() => galRef.current?.click()}>Galerie</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
          <input ref={galRef} type="file" accept="image/*" onChange={onPhoto} hidden />
          {!hasKey && <div className="err">L'analyse photo a besoin de ta clé API, dans Réglages.</div>}
          {busy && <div className="loading"><Spinner /> Analyse de la photo…</div>}
          <p className="hint">L'IA estime seulement les grammes. Les calories viennent de ta base, donc elles ne changent plus d'un essai à l'autre. Corrige les grammes si tu les connais.</p>
        </>
      )}

      {mode === "search" && (
        <>
          <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un aliment" autoFocus />
          <div className="mt6">
            {results.map((f) => (
              <button key={f.id} className="list-row" onClick={() => { setItems((xs) => [...xs, L.itemFromFood(f)]); setQ(""); }}>
                <span><span className="nm">{f.n}</span>{f.custom && <span className="tag">perso</span>}<div className="item-sub">{fint(f.k)} kcal · {fdec(f.p)} g de protéines / 100 g</div></span>
                <span className="plus-dot"><Icon n="plus" size={16} sw={2.2} /></span>
              </button>
            ))}
            {q.trim() && <QuickFood name={q.trim()} onCreate={(f) => { setItems((xs) => [...xs, L.itemFromFood(f)]); setQ(""); }} />}
          </div>
        </>
      )}

      {err && <div className="err">{err}</div>}

      {preview && (
        <div className="mt14">
          <div className="sub-h">À ajouter</div>
          {note && <div className="note">{note}</div>}
          <ItemsEditor items={items} onGrams={setG} onRemove={rm} tags />
          {unmatched.map((u, i) => (
            <div key={i} className="unmatched">
              <span>« {u} » pas reconnu</span>
              <button className="link" onClick={() => { setMode("search"); setQ(u); }}>Chercher</button>
              <button className="link" onClick={() => setUnmatched((xs) => xs.filter((_, j) => j !== i))}>Ignorer</button>
            </div>
          ))}
          {unmatched.length > 0 && hasKey && <button className="cta ghost full" disabled={busy} onClick={() => runAI(text)}>{busy ? <><Spinner /> L'IA réfléchit…</> : "Demander à l'IA"}</button>}
          {unmatched.length > 0 && !hasKey && <p className="hint">Sans clé API : cherche-les dans ta base ou crée-les avec Chercher.</p>}
        </div>
      )}
    </Sheet>
  );
}

function QuickFood({ name, onCreate }) {
  const [open, setOpen] = useState(false);
  const [k, setK] = useState(""), [p, setP] = useState("");
  if (!open) return <button className="wide-btn ghost mt8" onClick={() => setOpen(true)}>＋ Créer « {name} »</button>;
  return (
    <div className="panel mt10">
      <div className="sub-h">Nouvel aliment : {name}</div>
      <div className="grid2">
        <label className="field"><span>kcal pour 100 g</span><input className="inp" inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} /></label>
        <label className="field"><span>Protéines pour 100 g</span><input className="inp" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} /></label>
      </div>
      <button className="cta sun full" disabled={L.num(k) == null} onClick={() => {
        const f = L.saveCustomFood({ id: "c_" + L.uid(), n: L.cap(name), a: [L.norm(name)], k: L.num(k), p: L.num(p) || 0, c: 0, f: 0, src: "manuel" });
        onCreate({ ...f, custom: true, al: [L.norm(name)] });
      }}>Créer et ajouter</button>
      <p className="hint">Les valeurs sont sur l'étiquette, colonne « per 100 g ». Tu peux aussi la scanner dans Mes aliments.</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Mes aliments
// ═════════════════════════════════════════════════════════════
const r1 = (x) => Math.round((+x || 0) * 10) / 10;
export function Foods({ ctx }) {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const scanRef = useRef();
  const hasKey = !!L.getApiKey();
  const list = L.searchFoods(q).slice(0, 120);

  const scan = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const r = await L.aiLabel(await L.compressImage(file, 1600));
      if (!r.readable) throw new Error("Étiquette illisible. Reprends la photo bien à plat, avec de la lumière.");
      setEdit({ n: r.name || "", k: Math.round(r.kcal_100g), p: r1(r.protein_100g), c: r1(r.carbs_100g), f: r1(r.fat_100g), ug: r.serving_g ? Math.round(r.serving_g) : "", un: r.serving_g ? "portion" : "", src: "etiquette" });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const startEdit = (f) => setEdit({ id: f.custom ? f.id : undefined, base: f.custom ? null : f, n: f.n, k: f.k, p: f.p, c: f.c, f: f.f, ug: f.u?.g || "", un: f.u?.n || "", src: f.src || "manuel", a: f.custom ? f.a : f.al, over: f.over });
  const saveEdit = () => {
    const n = (edit.n || "").trim();
    if (!n || L.num(edit.k) == null) return;
    const ug = L.num(edit.ug);
    L.saveCustomFood({
      id: edit.id || "c_" + L.uid(), n, a: [...new Set([L.norm(n), ...(edit.a || [])])],
      k: L.num(edit.k), p: L.num(edit.p) || 0, c: L.num(edit.c) || 0, f: L.num(edit.f) || 0,
      ...(ug ? { u: { n: edit.un || "portion", g: ug } } : {}), src: edit.src || "manuel",
      ...(edit.base ? { over: edit.base.id } : edit.over ? { over: edit.over } : {}),
    });
    ctx.say(edit.base ? "Ta version remplace celle de base" : "Aliment enregistré");
    setEdit(null);
  };

  if (edit) {
    const F = (key, lbl, mode = "decimal") => (
      <label className="field"><span>{lbl}</span><input className="inp" inputMode={mode} value={edit[key] ?? ""} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} /></label>
    );
    return (
      <Sheet title={edit.id ? "Modifier l'aliment" : edit.base ? "Ta version" : "Nouvel aliment"} onClose={ctx.close}
        footer={<div className="cta-row">
          <button className="cta ghost" onClick={() => setEdit(null)}>Retour</button>
          {edit.id && <button className="cta ghost" onClick={() => { const undo = L.snapKey("foods"); L.deleteCustomFood(edit.id); setEdit(null); ctx.say("Aliment supprimé", { undo }); }}>Supprimer</button>}
          <button className="cta sun" onClick={saveEdit}>Enregistrer</button>
        </div>}>
        {edit.base && <div className="note">Tu crées ta propre version de « {edit.base.n} ». C'est elle qui sera utilisée ensuite.</div>}
        {edit.src === "etiquette" && <div className="note">Valeurs lues sur l'étiquette : vérifie-les vite fait.</div>}
        {F("n", "Nom", "text")}
        <div className="sub-h">Pour 100 g (ou 100 ml)</div>
        <div className="grid2">{F("k", "Calories (kcal)")}{F("p", "Protéines (g)")}{F("c", "Glucides (g)")}{F("f", "Lipides (g)")}</div>
        <div className="sub-h">Unité, si tu veux</div>
        <div className="grid2">{F("un", "Nom de l'unité (ex : dose)", "text")}{F("ug", "Poids d'une unité (g)")}</div>
      </Sheet>
    );
  }
  return (
    <Sheet title="Base d'aliments" onClose={ctx.close} tall>
      <p className="muted small mb10">{list.length >= 120 ? "Plus de 120" : list.length} aliments. Touche un aliment pour corriger ses valeurs : ta version remplace celle de base.</p>
      <div className="cta-row mb10">
        <button className="cta ghost" onClick={() => setEdit({ n: q, k: "", p: "", c: "", f: "", ug: "", un: "", src: "manuel" })}>＋ Nouveau</button>
        <button className="cta sun" disabled={!hasKey || busy} onClick={() => scanRef.current?.click()}>{busy ? <><Spinner /> Lecture…</> : "Scanner une étiquette"}</button>
      </div>
      <input ref={scanRef} type="file" accept="image/*" capture="environment" onChange={scan} hidden />
      {!hasKey && <p className="hint">Le scan d'étiquette a besoin de ta clé API, dans Réglages.</p>}
      {err && <div className="err">{err}</div>}
      <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher" />
      <div className="mt6">
        {list.map((f) => (
          <button key={f.id} className="list-row" onClick={() => startEdit(f)}>
            <span><span className="nm">{f.n}</span>{f.custom && <span className={"tag" + (f.src === "ia" ? " ia" : "")}>{f.src === "ia" ? "appris" : "perso"}</span>}
              <div className="item-sub">{fint(f.k)} kcal · {fdec(f.p)} g de protéines / 100 g{f.u ? ` · 1 ${f.u.n} = ${f.u.g} g` : ""}</div></span>
            <Icon n="right" size={18} style={{ color: "var(--dim)" }} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
