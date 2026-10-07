import React, { useState, useRef } from "react";
import * as L from "./lib.js";
import * as A from "./actions.js";
import { Sheet, Icon, Spinner, Empty, GramInput, PaceBar, Count, buzz } from "./ui.jsx";

const { fint, fdec } = L;

// ═════════════════════════════════════════════════════════════
// Onglet Manger
// ═════════════════════════════════════════════════════════════
export function Food({ ctx, k, setK }) {
  const { S, todayK } = ctx;
  const d = L.getDay(k), t = L.dayTot(d);
  const isToday = k === todayK;
  const p = isToday ? L.pace(k, new Date(ctx.now), S) : null;
  const sw = useRef(null);
  const onTS = (e) => { sw.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTE = (e) => {
    if (!sw.current) return;
    const dx = e.changedTouches[0].clientX - sw.current.x, dy = e.changedTouches[0].clientY - sw.current.y;
    sw.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx > 0) setK(L.addDays(k, -1));
      else if (!isToday) setK(L.addDays(k, 1));
    }
  };
  const label = isToday ? "Aujourd'hui" : k === L.addDays(todayK, -1) ? "Hier" : L.cap(L.fmtDay(k));
  return (
    <div className="page" onTouchStart={onTS} onTouchEnd={onTE}>
      <div className="daynav">
        <button className="round-btn" onClick={() => setK(L.addDays(k, -1))} aria-label="Jour précédent"><Icon n="left" /></button>
        <div className="daynav-l">
          <div className="daynav-t">{label}</div>
          {!isToday && <button className="link small" onClick={() => setK(todayK)}>Revenir à aujourd'hui</button>}
        </div>
        <button className="round-btn" disabled={isToday} onClick={() => setK(L.addDays(k, 1))} aria-label="Jour suivant"><Icon n="right" /></button>
      </div>

      <section className="panel">
        <PaceBar label="Calories" value={t.k} goal={S.kcal} expected={p && t.k < S.kcal ? p.expected : null} color="var(--sun)" unit="kcal" />
        <PaceBar label="Protéines" value={t.p} goal={S.prot} color="var(--flesh)" unit="g" />
        <div className="macro-row">
          <span>Glucides <b>{fint(t.c)} g</b></span>
          <span>Lipides <b>{fint(t.f)} g</b></span>
          {p && t.k < S.kcal && <span className="muted">Le trait blanc : où tu devrais en être</span>}
        </div>
        {d.legacy && !d.entries.length && <div className="hint">Journée notée avec l'ancienne version : {fint(d.legacy.kcal)} kcal au total.</div>}
      </section>

      {d.entries.length > 0 ? (
        <div className="timeline">
          {d.entries.map((e) => <EntryRow key={e.id} e={e} k={k} ctx={ctx} />)}
        </div>
      ) : (
        <Empty title="Rien de noté pour ce jour" text="Ajoute ton premier repas avec le bouton +." />
      )}

      <button className="wide-btn" onClick={() => ctx.open({ type: "add", k })}><Icon n="plus" size={18} /> Ajouter un repas</button>
      <button className="wide-btn ghost" onClick={() => ctx.open({ type: "foods" })}><Icon n="book" size={18} /> Mes aliments</button>
      <p className="hint center">Glisse vers la droite ou la gauche pour changer de jour.</p>
    </div>
  );
}

function EntryRow({ e, k, ctx }) {
  const [open, setOpen] = useState(false);
  const tot = L.entryTot(e);
  const upd = (fn) => L.updDay(k, (d) => ({ ...d, entries: d.entries.map((x) => (x.id === e.id ? fn(x) : x)) }));
  const fav = () => {
    const name = window.prompt("Nom du favori :", e.label);
    if (name && name.trim()) { const undo = L.snapKey("favs"); L.saveFav(name.trim(), e.items); ctx.say("Ajouté à tes favoris ⭐", { undo }); }
  };
  return (
    <div className={"tl-row" + (open ? " open" : "")}>
      <div className="tl-time">{e.t}</div>
      <div className="tl-dot" />
      <div className="tl-card">
        <button className="tl-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="tl-main">
            <div className="tl-title">{e.label}</div>
            <div className="tl-items">{e.items.map((i) => i.name.replace(/ \(.*\)/, "")).join(", ")}</div>
          </div>
          <div className="tl-kcal"><b>{fint(tot.k)}</b><span>{fint(tot.p)} g prot</span></div>
        </button>
        {open && (
          <div className="tl-body">
            <div className="grid2">
              <input className="inp" value={e.label} onChange={(ev) => upd((x) => ({ ...x, label: ev.target.value }))} aria-label="Nom du repas" />
              <input className="inp" type="time" value={e.t} onChange={(ev) => upd((x) => ({ ...x, t: ev.target.value || x.t }))} aria-label="Heure" />
            </div>
            <ItemsEditor items={e.items}
              onGrams={(i, g) => upd((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, g: g ?? 0 } : it)) }))}
              onRemove={(i) => upd((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} />
            <div className="chips">
              <button className="chip" onClick={() => ctx.open({ type: "add", k, entryId: e.id })}>＋ Aliment</button>
              <button className="chip" onClick={() => { const undo = L.snapDay(ctx.todayK); L.addEntry(ctx.todayK, e.items, e.label); buzz(10); ctx.say("Refait aujourd'hui", { undo }); }}>↻ Refaire aujourd'hui</button>
              <button className="chip" onClick={fav}>⭐ En favori</button>
              <button className="chip danger" onClick={() => A.deleteEntry(ctx, k, e)}>Supprimer</button>
            </div>
          </div>
        )}
      </div>
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
              <div className="item-sub">{missing ? "Quantité ?" : `${fint(tt.k)} kcal · ${fdec(tt.p)} g de protéines`}</div>
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
    else { const undo = L.snapDay(k); L.addEntry(k, valid, label.trim() || L.mealLabel(), time); buzz(10); ctx.say(`Ajouté : ${fint(tot.k)} kcal · ${fint(tot.p)} g de protéines`, { undo }); }
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
          <div className="total-line"><span className="muted">{missing ? "Indique les quantités en rouge" : `${fint(tot.p)} g de protéines`}</span><b>{fint(tot.k)} kcal</b></div>
          <button className="cta sun full" disabled={!canSave} onClick={save}>Ajouter au journal</button>
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
                        <span className="fav-k"><b>{fint(t.k)}</b> kcal · {fint(t.p)} g</span>
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
    <Sheet title="Mes aliments" onClose={ctx.close} tall>
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
