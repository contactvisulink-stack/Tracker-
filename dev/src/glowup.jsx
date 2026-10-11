import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";
import { Icon, buzz } from "./ui.jsx";

// ═════════════════════════════════════════════════════════════
// Glow-up : photos avant / après, rangées dans le téléphone (IndexedDB),
// à part de tes données du journal (elles ne les touchent jamais).
// ═════════════════════════════════════════════════════════════
const DB = "isma-daily-photos", ST = "photos";
function db() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("Stockage des photos indisponible sur ce navigateur."));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(ST)) d.createObjectStore(ST, { keyPath: "id" }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error("Stockage des photos indisponible."));
  });
}
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(ST, mode), s = t.objectStore(ST);
    let out;
    Promise.resolve(fn(s)).then((v) => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error("Photo non enregistrée (espace plein ?)."));
  });
};
const reqP = (rq) => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
export const listPhotos = () => tx("readonly", (s) => reqP(s.getAll())).then((a) => (a || []).sort((x, y) => (x.k + x.at).localeCompare(y.k + y.at)));
const putPhoto = (p) => tx("readwrite", (s) => reqP(s.put(p)));
const delPhoto = (id) => tx("readwrite", (s) => reqP(s.delete(id)));

const CATS = [
  { id: "visage", l: "Visage", hint: "Barbe, moustache, cheveux, peau. De face, à hauteur des yeux, lumière du jour." },
  { id: "corps", l: "Corps", hint: "Torse nu, de face, bras le long du corps, même endroit et même lumière à chaque fois." },
];
const short = (k) => L.fmtDay(k, { day: "numeric", month: "short" }).replace(".", "");

export function GlowUp({ ctx }) {
  const [cat, setCat] = useState("visage");
  const [all, setAll] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState({}); // { visage: [idAvant, idApres] }
  const camRef = useRef(), libRef = useRef();
  const refresh = () => listPhotos().then(setAll).catch((e) => { setAll([]); setErr(e.message); });
  useEffect(() => { refresh(); }, []);
  const list = (all || []).filter((p) => p.cat === cat);
  const sel = pick[cat] || [];
  const before = list.find((p) => p.id === sel[0]) || list[0] || null;
  const after = list.find((p) => p.id === sel[1]) || (list.length > 1 ? list[list.length - 1] : null);
  const C = CATS.find((c) => c.id === cat);

  const add = async (file) => {
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const b64 = await L.compressImage(file, 1440);
      const p = { id: L.uid(), cat, k: ctx.todayK, at: new Date().toISOString(), src: "data:image/jpeg;base64," + b64 };
      await putPhoto(p);
      L.store.set("lastPhoto", ctx.todayK);
      buzz(12);
      ctx.say(`Photo ${C.l.toLowerCase()} enregistrée`);
      await refresh();
      setPick({ ...pick, [cat]: [before?.id || p.id, p.id] });
    } catch (e) { setErr(e.message || "Photo non enregistrée."); }
    setBusy(false);
  };
  const remove = async (p) => {
    if (!window.confirm(`Supprimer la photo du ${short(p.k)} ?`)) return;
    try {
      await delPhoto(p.id);
      const rest = (await listPhotos());
      L.store.set("lastPhoto", rest.length ? rest[rest.length - 1].k : null);
      setAll(rest);
      setPick({ ...pick, [cat]: [] });
    } catch (e) { setErr(e.message); }
  };
  const choose = (p) => {
    // un appui : devient « après » ; s'il est plus ancien que « avant », il devient « avant »
    const a = before, b = after;
    if (!a || p.k + p.at < a.k + a.at) setPick({ ...pick, [cat]: [p.id, (b || a)?.id] });
    else setPick({ ...pick, [cat]: [a.id, p.id] });
  };

  return (
    <>
      <div className="seg small">
        {CATS.map((c) => <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>{c.l}</button>)}
      </div>
      {err && <div className="err">{err}</div>}
      {all == null ? <div className="loading"><span className="spinner" /></div> : (
        <>
          {before && after ? <Compare a={before} b={after} /> : before ? (
            <div className="gu-one"><img src={before.src} alt={`Photo du ${short(before.k)}`} /><span className="gu-tag l"><b>Première photo</b>{short(before.k)}</span><span className="gu-days">La prochaine dans deux semaines</span></div>
          ) : (
            <section className="gu-empty">
              <div className="gu-empty-ic"><Icon n="camera" size={30} sw={1.7} /></div>
              <h3>Ton avant / après</h3>
              <p>Une photo toutes les deux semaines, et tu verras ta barbe se remplir et ton corps changer, côte à côte.</p>
            </section>
          )}
          <p className="hint">{C.hint}</p>
          <div className="cta-row mt10">
            <button className="cta neon" disabled={busy} onClick={() => camRef.current?.click()}><Icon n="camera" size={18} /> {busy ? "Enregistrement…" : "Prendre la photo"}</button>
            <button className="cta ghost shrink" disabled={busy} onClick={() => libRef.current?.click()}>Galerie</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture={cat === "visage" ? "user" : "environment"} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; add(f); }} />
          <input ref={libRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; add(f); }} />
          {list.length > 0 && (
            <section className="block mt14">
              <div className="block-head"><h3>Tes photos</h3><span className="count">{list.length}</span></div>
              <p className="hint mb10" style={{ marginTop: 0 }}>Touche une photo pour la comparer.</p>
              <div className="gu-grid">
                {[...list].reverse().map((p) => (
                  <div key={p.id} className={"gu-th" + (p.id === before?.id ? " a" : "") + (p.id === after?.id ? " b" : "")}>
                    <button className="gu-th-img" onClick={() => choose(p)} aria-label={`Comparer la photo du ${short(p.k)}`}><img src={p.src} alt="" loading="lazy" /></button>
                    <span className="gu-th-d">{short(p.k)}{p.id === before?.id ? <i>avant</i> : p.id === after?.id ? <i>après</i> : null}</span>
                    <button className="gu-del" onClick={() => remove(p)} aria-label={`Supprimer la photo du ${short(p.k)}`}><Icon n="close" size={13} sw={2.4} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}
          <p className="hint">Les photos restent sur ce téléphone. Elles ne sont pas dans la sauvegarde : garde aussi les plus importantes dans ta galerie.</p>
        </>
      )}
    </>
  );
}

/** Le curseur avant / après : glisse pour révéler */
function Compare({ a, b }) {
  const [x, setX] = useState(50);
  const ref = useRef();
  const move = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    setX(L.clamp(((clientX - r.left) / r.width) * 100, 0, 100));
  };
  const days = L.daysBetween(a.k, b.k);
  return (
    <div className="gu-cmp" ref={ref}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") move(e.clientX); }}
      role="slider" aria-label="Comparer avant et après" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(x)} tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX(L.clamp(x - 5, 0, 100)); if (e.key === "ArrowRight") setX(L.clamp(x + 5, 0, 100)); }}>
      <img src={b.src} alt={`Après, ${short(b.k)}`} draggable={false} />
      <img src={a.src} alt={`Avant, ${short(a.k)}`} draggable={false} className="gu-top" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} />
      <span className="gu-line" style={{ left: `${x}%` }}><span className="gu-knob"><Icon n="left" size={14} sw={2.6} /><Icon n="right" size={14} sw={2.6} /></span></span>
      <span className="gu-tag l"><b>Avant</b>{short(a.k)}</span>
      <span className="gu-tag r"><b>Après</b>{short(b.k)}</span>
      {days > 0 && <span className="gu-days">{days} jours d'écart</span>}
    </div>
  );
}
