import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import * as L from "./lib.js";
import { PROGRAM, RULES } from "./data.js";

const { fint, fdec, fkg, fH } = L;
const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));
const shortDate = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" }));

// ═════════════════════════════════════════════════════════════
// Application
// ═════════════════════════════════════════════════════════════
function App() {
  const [, setRev] = useState(0);
  useEffect(() => L.store.subscribe(() => setRev((r) => r + 1)), []);
  const [now, setNow] = useState(Date.now());
  const tabRef = useRef("today");
  useEffect(() => {
    const upd = () => {
      setNow(Date.now());
      // au réveil, la carte « Je suis réveillé » est tout en haut : on y remonte
      if (document.visibilityState === "visible" && tabRef.current === "today" && L.store.get("night", null)) window.scrollTo({ top: 0 });
    };
    const iv = setInterval(upd, 30000);
    document.addEventListener("visibilitychange", upd);
    window.addEventListener("focus", upd);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", upd); window.removeEventListener("focus", upd); };
  }, []);
  const S = L.getSettings();
  const todayK = L.logicalKey(new Date(now), S.dayStart);
  const [tab, setTab] = useState("today");
  tabRef.current = tab;
  const [foodK, setFoodK] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const tRef = useRef();
  const say = (msg) => { setToast(msg); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), 2800); };
  const ctx = {
    S, todayK, now, say,
    open: (s) => setSheet(s),
    close: () => setSheet(null),
    go: (t, k) => { setTab(t); setFoodK(k && k !== todayK ? k : null); window.scrollTo(0, 0); },
  };
  const viewK = foodK && foodK < todayK ? foodK : todayK;

  return (
    <div className="app">
      <div className="glow"><i /><i /><i /></div>
      <Header ctx={ctx} />
      <main className="wrap">
        {tab === "today" && <Today ctx={ctx} />}
        {tab === "food" && <Food ctx={ctx} k={viewK} setK={(k) => setFoodK(k >= todayK ? null : k)} />}
        {tab === "sport" && <Sport ctx={ctx} />}
        {tab === "weight" && <Weight ctx={ctx} />}
        {tab === "stats" && <Stats ctx={ctx} />}
        {tab === "coach" && <Coach ctx={ctx} />}
      </main>
      <Nav tab={tab} go={(t) => ctx.go(t)} />
      {sheet && <SheetRouter sheet={sheet} ctx={ctx} />}
      {toast && <div className={"toast" + (sheet ? " top" : "")} role="status">{toast}</div>}
    </div>
  );
}

function Header({ ctx }) {
  const streak = L.kcalStreak(ctx.todayK, ctx.S);
  return (
    <header className="wrap head">
      <div>
        <div className="eyebrow">{L.fmtDay(ctx.todayK)}</div>
        <h1 className="title">Isma <span className="dot">·</span> Daily</h1>
      </div>
      <div className="head-right">
        {streak > 0 && <div className="streak" title="Jours d'affilée à 90 % de ton objectif calories">🔥 <b>{streak}</b><small>j</small></div>}
        <button className="icon-btn" onClick={() => ctx.open({ type: "settings" })} aria-label="Réglages">⚙️</button>
      </div>
    </header>
  );
}

const TABS = [
  { id: "today", i: "⚡", l: "TODAY" },
  { id: "food", i: "🍽️", l: "MANGER" },
  { id: "sport", i: "💪", l: "SPORT" },
  { id: "weight", i: "⚖️", l: "POIDS" },
  { id: "stats", i: "📊", l: "STATS" },
  { id: "coach", i: "🤖", l: "COACH" },
];
function Nav({ tab, go }) {
  return (
    <nav className="nav">
      <div className="nav-in">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => go(t.id)}>
            <span className="i">{t.i}</span>{t.l}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ═════════════════════════════════════════════════════════════
// Petits composants
// ═════════════════════════════════════════════════════════════
function Card({ icon, title, right, children, className = "" }) {
  return (
    <section className={"card " + className}>
      {title && (
        <div className="card-head">
          {icon && <span className="ic">{icon}</span>}
          <span className="t">{title}</span>
          {right != null && <span className="r">{right}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
function Bar({ label, value, goal, unit, color }) {
  return (
    <div className="bar">
      <div className="top">
        <span className="lbl">{label}</span>
        <span className="val">{fint(value)} <small>/ {fint(goal)} {unit}</small></span>
      </div>
      <div className="track"><div className={"c-" + color} style={{ width: `${clamp01(value / goal) * 100}%` }} /></div>
    </div>
  );
}
function Ring({ pct, size = 84 }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  const col = pct >= 100 ? "var(--green)" : "var(--amber)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 8px ${pct >= 100 ? "rgba(74,222,128,.35)" : "rgba(240,165,0,.3)"})` }} />
      <text x="50%" y="54%" textAnchor="middle" fill="var(--tx)" fontSize="15" fontWeight="800" fontFamily="Syne, sans-serif">{pct}%</text>
    </svg>
  );
}
function Check({ on, label, sub, onClick, disabled }) {
  return (
    <button className={"check" + (on ? " on" : "")} onClick={disabled ? undefined : onClick} aria-pressed={!!on}>
      <span className="box">{on ? "✓" : ""}</span>
      <span><span className="lbl">{label}</span>{sub && <div className="sub">{sub}</div>}</span>
    </button>
  );
}
function Empty({ icon, text }) {
  return <div className="empty"><div className="e">{icon}</div><div>{text}</div></div>;
}
function Spinner() { return <span className="spinner" />; }
function AddButtons({ onPick }) {
  return (
    <div className="add-grid">
      <button onClick={() => onPick("text")}><span>✍️</span>Écrire</button>
      <button onClick={() => onPick("photo")}><span>📸</span>Photo</button>
      <button onClick={() => onPick("favs")}><span>⭐</span>Favoris</button>
      <button onClick={() => onPick("search")}><span>🔎</span>Chercher</button>
    </div>
  );
}
function GramInput({ value, onChange }) {
  const [s, setS] = useState(value == null ? "" : String(value));
  useEffect(() => { if (L.num(s) !== value) setS(value == null ? "" : String(value)); }, [value]);
  return (
    <label className="gram">
      <input inputMode="decimal" value={s} placeholder="?" aria-label="grammes"
        onChange={(e) => { setS(e.target.value); onChange(L.num(e.target.value)); }} />
      <span>g</span>
    </label>
  );
}
function SrcTag({ it }) {
  if (it.isNew) return <span className="tag new">nouveau</span>;
  if (it.src === "ia") return <span className="tag ia">IA</span>;
  if (it.src === "perso") return <span className="tag">perso</span>;
  if (it.conf === "basse") return <span className="tag warn">à vérifier</span>;
  return null;
}
function ItemsEditor({ items, onGrams, onRemove, tags }) {
  return (
    <div className="items">
      {items.map((it, i) => {
        const tt = L.itemTot(it), missing = it.g == null;
        return (
          <div key={i} className={"item" + (missing ? " missing" : "")}>
            <div className="item-main">
              <div className="item-name">{it.name}{tags && <SrcTag it={it} />}</div>
              {it.unsure && <div className="warn-txt">⚠️ « {it.unsure} » : vérifie que c'est bien ça</div>}
              <div className="muted small">{missing ? "Quantité ?" : `${fint(tt.k)} kcal · ${fdec(tt.p)} g prot`}</div>
            </div>
            <GramInput value={it.g} onChange={(g) => onGrams(i, g)} />
            {onRemove && <button className="x-btn" onClick={() => onRemove(i)} aria-label="Retirer">✕</button>}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Onglet Aujourd'hui
// ═════════════════════════════════════════════════════════════
function Today({ ctx }) {
  const d = L.getDay(ctx.todayK);
  const sc = L.dayScore(d, ctx.S);
  const nightOpen = !!L.store.get("night", null);
  return (
    <div className="fade">
      {nightOpen && <SleepCard ctx={ctx} />}
      <ScoreCard sc={sc} />
      <EatCard ctx={ctx} d={d} />
      {!nightOpen && <SleepCard ctx={ctx} />}
      <HabitsCard ctx={ctx} d={d} />
      <TrainCard ctx={ctx} />
    </div>
  );
}

function ScoreCard({ sc }) {
  const msg = sc.pct === 100 ? "🔥 Journée parfaite" : sc.pct >= 75 ? "💪 Presque là" : sc.pct >= 50 ? "⚡ Continue comme ça" : sc.pct >= 25 ? "🎯 T'es lancé" : "✨ C'est parti Isma";
  return (
    <section className="card">
      <div className="score">
        <Ring pct={sc.pct} />
        <div>
          <div className="num">{sc.n}<small>/{sc.max}</small></div>
          <div className="msg">{msg}</div>
        </div>
      </div>
      <div className="pills">
        {sc.checks.map((c) => <span key={c.id} className={"pill" + (c.ok ? " on" : "")}>{c.ic} {c.label}</span>)}
      </div>
    </section>
  );
}

function EatCard({ ctx, d }) {
  const { S, todayK } = ctx;
  const t = L.dayTot(d);
  return (
    <Card icon="🍽️" title="Manger" right={<button className="link" onClick={() => ctx.go("food")}>Détail →</button>}>
      <Bar label="Calories" value={t.k} goal={S.kcal} unit="kcal" color="amber" />
      <Bar label="Protéines" value={t.p} goal={S.prot} unit="g" color="green" />
      <div className="remain">{t.k >= S.kcal ? "Objectif calories atteint 🔥" : `Il te reste ${fint(S.kcal - t.k)} kcal${t.p < S.prot ? ` et ${fint(S.prot - t.p)} g de protéines` : ""}.`}</div>
      <AddButtons onPick={(mode) => ctx.open({ type: "add", k: todayK, mode })} />
      {d.entries.length > 0 && (
        <div className="mini-entries">
          {d.entries.map((e) => <div key={e.id} className="mini-entry"><span>{e.t} · {e.label}</span><b>{fint(L.entryTot(e).k)} kcal</b></div>)}
        </div>
      )}
    </Card>
  );
}

function SleepCard({ ctx }) {
  const { S, todayK } = ctx;
  const open = L.store.get("night", null);
  const d = L.getDay(todayK), s = d.sleep, h = L.daySleepH(d);
  const st = L.sleepStats(todayK, 7), prev = L.sleepStats(L.addDays(todayK, -7), 7);

  const startNight = () => { L.store.set("night", { bed: new Date().toISOString() }); window.scrollTo({ top: 0, behavior: "smooth" }); ctx.say("Bonne nuit 🌙 Appuie sur ☀️ au réveil"); };
  const wake = (at) => {
    const o = L.store.get("night", null);
    if (!o) return;
    const w = at || new Date();
    const k = L.dkey(w);
    const night = { bed: o.bed, wake: w.toISOString(), lat: S.lat, q: null };
    L.updDay(k, (dd) => ({ ...dd, sleep: night }));
    L.store.del("night");
    ctx.say(`Nuit enregistrée : ${fH(L.sleepHours(night))}`);
  };

  if (open) {
    const since = (ctx.now - new Date(open.bed).getTime()) / 3.6e6;
    return (
      <Card icon="😴" title="Sommeil">
        <div className="night-on">
          <div className="moon">🌙</div>
          <div><div className="big">Nuit en cours</div><div className="muted">Téléphone posé à {L.hm(open.bed)} · il y a {fH(Math.max(0, since))}</div></div>
        </div>
        {since < 16 ? <button className="btn violet strong full" onClick={() => wake()}>☀️ Je suis réveillé</button> : <ForgotWake bed={open.bed} onSave={wake} />}
        <div className="btn-row"><button className="btn ghost small" onClick={() => L.store.del("night")}>Annuler la nuit</button></div>
      </Card>
    );
  }

  let trend = null;
  if (st.avgBed != null && prev.avgBed != null && prev.count >= 2) {
    const diff = Math.round(st.avgBed - prev.avgBed);
    trend = diff <= -10 ? ` · ${-diff} min plus tôt que la semaine d'avant 👍` : diff >= 10 ? ` · ${diff} min plus tard que la semaine d'avant` : " · stable";
  }
  const ok = h != null && h >= S.sleep;
  const hr = new Date(ctx.now).getHours();
  const evening = hr >= 18 || hr < 5;
  return (
    <Card icon="😴" title="Sommeil" right={h != null ? <span className={ok ? "ok" : "warn"}>{ok ? "✓ " : ""}{fH(h)}</span> : null}>
      {h != null ? (
        <>
          <div className="row-between">
            <div className="sleep-big">{fH(h)}</div>
            <button className="link" onClick={() => ctx.open({ type: "sleep", k: todayK })}>Modifier</button>
          </div>
          {s && <div className="muted">{L.hm(s.bed)} → {L.hm(s.wake)} · {s.lat ?? S.lat} min pour t'endormir</div>}
          {s && (
            <>
              <div className="q-row">
                {["😵", "😪", "😐", "🙂", "😄"].map((e, i) => (
                  <button key={i} className={s.q === i + 1 ? "on" : ""} aria-label={`Énergie ${i + 1} sur 5`}
                    onClick={() => L.updDay(todayK, (dd) => ({ ...dd, sleep: { ...dd.sleep, q: i + 1 } }))}>{e}</button>
                ))}
              </div>
              <div className="muted small">{s.q ? "Énergie au réveil notée" : "Comment tu te sens au réveil ?"}</div>
            </>
          )}
        </>
      ) : (
        <div className="row-between" style={{ marginBottom: 4 }}>
          <span className="muted">Pas encore de nuit notée aujourd'hui.</span>
          <button className="link" onClick={() => ctx.open({ type: "sleep", k: todayK })}>Saisir</button>
        </div>
      )}
      <div className="btn-row"><button className={"btn " + (evening ? "violet" : "ghost")} onClick={startNight}>🌙 {evening ? "Je pose le téléphone" : "Ce soir : je pose le téléphone"}</button></div>
      <div className="tip">Un appui quand tu poses le téléphone pour dormir, un appui sur ☀️ au réveil. L'app retire {S.lat} min pour le temps d'endormissement.</div>
      {st.count >= 2 && (
        <div className="insight">7 derniers jours : <b>{fH(st.avgH)}</b> par nuit{st.avgBed != null && <>, coucher vers <b>{L.nightMinToHM(st.avgBed)}</b></>}{trend}</div>
      )}
    </Card>
  );
}

function ForgotWake({ bed, onSave }) {
  const [t, setT] = useState("09:30");
  const save = () => {
    const [H, M] = t.split(":").map(Number);
    const w = new Date(bed);
    w.setHours(H, M, 0, 0);
    if (w <= new Date(bed)) w.setDate(w.getDate() + 1);
    onSave(w);
  };
  return (
    <div>
      <div className="warn-txt" style={{ marginBottom: 8 }}>Tu as oublié d'appuyer au réveil ? Indique l'heure à peu près :</div>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <input className="inp" type="time" value={t} onChange={(e) => setT(e.target.value)} />
        <button className="btn violet" onClick={save}>Valider</button>
      </div>
    </div>
  );
}

function HabitsCard({ ctx, d }) {
  const { S, todayK } = ctx;
  const tog = (id) => L.updDay(todayK, (dd) => ({ ...dd, h: { ...dd.h, [id]: !dd.h[id] } }));
  const autoCrea = d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));
  const setWater = (v) => L.updDay(todayK, (dd) => ({ ...dd, water: dd.water === v ? v - 0.5 : v }));
  return (
    <Card icon="✅" title="Habitudes">
      <Check on={d.h.light} label="☀️ Lumière du jour" sub="Dehors dans l'heure après ton réveil, même 10 min" onClick={() => tog("light")} />
      <Check on={autoCrea || d.h.creatine} label="💊 Créatine" sub={autoCrea ? "Comptée dans ton shaker" : "5 g, peu importe l'heure"} onClick={() => tog("creatine")} disabled={autoCrea} />
      {S.skincare && <Check on={d.h.skm} label="🌤️ Skincare matin" onClick={() => tog("skm")} />}
      {S.skincare && <Check on={d.h.sks} label="🌙 Skincare soir" onClick={() => tog("sks")} />}
      <div className="water">
        <div className="row-between"><span>💧 Eau</span><b>{fdec(d.water || 0)} / {fdec(S.water)} L</b></div>
        <div className="water-btns">
          {[0.5, 1, 1.5, 2, 2.5, 3].map((v) => <button key={v} className={(d.water || 0) >= v ? "on" : ""} onClick={() => setWater(v)}>{fdec(v)}</button>)}
        </div>
      </div>
    </Card>
  );
}

function TrainCard({ ctx }) {
  const ws = L.getWorkouts();
  const wk = L.weekWorkouts(ctx.todayK, ws);
  const todayW = ws.find((w) => L.logicalKey(new Date(w.date), ctx.S.dayStart) === ctx.todayK);
  const next = L.nextSession(ws);
  const done = new Set(wk.map((w) => w.session).filter(Boolean));
  return (
    <Card icon="💪" title="Sport" right={`${wk.length}/3 cette semaine`}>
      <div className="abc">
        {["A", "B", "C"].map((x) => <div key={x} className={"abc-chip" + (done.has(x) ? " done" : x === next && !todayW ? " next" : "")}>{done.has(x) ? "✓ " : ""}{x}</div>)}
      </div>
      <div className="muted">{todayW ? `✓ ${todayW.title} faite aujourd'hui.` : `Prochaine séance : ${next}.`}</div>
      <div className="btn-row">
        <button className="btn" onClick={() => ctx.open({ type: "hevy" })}>📋 Importer Hevy</button>
        <button className="btn ghost" onClick={() => ctx.go("sport")}>Mes charges →</button>
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
// Onglet Manger
// ═════════════════════════════════════════════════════════════
function Food({ ctx, k, setK }) {
  const { S, todayK } = ctx;
  const d = L.getDay(k), t = L.dayTot(d);
  const isToday = k === todayK;
  const label = isToday ? "Aujourd'hui" : k === L.addDays(todayK, -1) ? "Hier" : L.cap(L.fmtDay(k));
  return (
    <div className="fade">
      <div className="daynav">
        <button onClick={() => setK(L.addDays(k, -1))} aria-label="Jour précédent">‹</button>
        <div className="daynav-label">{label}</div>
        <button disabled={isToday} onClick={() => setK(L.addDays(k, 1))} aria-label="Jour suivant">›</button>
      </div>
      <section className="card">
        <div className="hero-kcal"><span className="n">{fint(t.k)}</span><span className="u">/ {fint(S.kcal)} kcal</span></div>
        <div className="track"><div className={t.k >= S.kcal ? "c-green" : "c-amber"} style={{ width: `${clamp01(t.k / S.kcal) * 100}%` }} /></div>
        <div className="macros">
          <div className="macro"><div className="l">Protéines</div><div className="v" style={{ color: t.p >= S.prot ? "var(--green)" : undefined }}>{fint(t.p)}<span className="muted small"> / {S.prot} g</span></div></div>
          <div className="macro"><div className="l">Glucides</div><div className="v">{fint(t.c)}<span className="muted small"> g</span></div></div>
          <div className="macro"><div className="l">Lipides</div><div className="v">{fint(t.f)}<span className="muted small"> g</span></div></div>
        </div>
        {d.legacy && !d.entries.length && <div className="tip">Journée notée avec l'ancienne version : {fint(d.legacy.kcal)} kcal au total.</div>}
      </section>
      <div style={{ marginBottom: 12 }}><AddButtons onPick={(mode) => ctx.open({ type: "add", k, mode })} /></div>
      {d.entries.map((e) => <EntryCard key={e.id} e={e} k={k} ctx={ctx} />)}
      {!d.entries.length && <Empty icon="🍽️" text="Rien de noté pour ce jour." />}
      <button className="btn ghost full" onClick={() => ctx.open({ type: "foods" })}>📒 Mes aliments</button>
      <div className="tip">Le plus précis : écris ce que tu as pesé, comme tu me l'écris (« 196 ml lait entier, 90 g avoine… »). Les valeurs viennent de ta base, donc même repas = même résultat. La photo, elle, reste une estimation à l'œil.</div>
    </div>
  );
}

function EntryCard({ e, k, ctx }) {
  const [open, setOpen] = useState(false);
  const tot = L.entryTot(e);
  const upd = (fn) => L.updDay(k, (d) => ({ ...d, entries: d.entries.map((x) => (x.id === e.id ? fn(x) : x)) }));
  const del = () => { if (window.confirm(`Supprimer « ${e.label} » ?`)) L.updDay(k, (d) => ({ ...d, entries: d.entries.filter((x) => x.id !== e.id) })); };
  const fav = () => { const name = window.prompt("Nom du favori :", e.label); if (name && name.trim()) { L.saveFav(name.trim(), e.items); ctx.say("Ajouté à tes favoris ⭐"); } };
  return (
    <section className="card entry">
      <button className="entry-head" onClick={() => setOpen(!open)}>
        <div>
          <div className="entry-title">{e.label}</div>
          <div className="muted small">{e.t} · {e.items.length} aliment{e.items.length > 1 ? "s" : ""}</div>
        </div>
        <div className="entry-kcal"><b>{fint(tot.k)}</b> kcal<div>{fint(tot.p)} g prot</div></div>
      </button>
      {open && (
        <div className="entry-body">
          <div className="entry-meta">
            <input value={e.label} onChange={(ev) => upd((x) => ({ ...x, label: ev.target.value }))} aria-label="Nom du repas" />
            <input type="time" value={e.t} onChange={(ev) => upd((x) => ({ ...x, t: ev.target.value || x.t }))} aria-label="Heure" />
          </div>
          <ItemsEditor items={e.items}
            onGrams={(i, g) => upd((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, g: g ?? 0 } : it)) }))}
            onRemove={(i) => upd((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} />
          <div className="row-wrap">
            <button className="chip" onClick={() => ctx.open({ type: "add", k, mode: "text", entryId: e.id })}>＋ Aliment</button>
            <button className="chip" onClick={fav}>⭐ En favori</button>
            <button className="chip danger" onClick={del}>🗑️ Supprimer</button>
          </div>
        </div>
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// Panneau d'ajout de repas
// ═════════════════════════════════════════════════════════════
function AddFood({ ctx, k, mode: initMode, entryId }) {
  const [mode, setMode] = useState(initMode || "text");
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
  const [favBase, setFavBase] = useState(null);
  const [mult, setMult] = useState(1);
  const camRef = useRef(), galRef = useRef();
  const hasKey = !!L.getApiKey();

  const runAI = async (txt) => {
    setBusy(true); setErr("");
    try {
      const res = await L.aiParseText(txt);
      setItems(L.fromAI(res)); setUnmatched([]); setNote(res.note || "");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const analyze = async () => {
    setErr(""); setNote(""); setFavBase(null);
    const r = L.parseFoodText(text);
    const needs = r.unmatched.length > 0 || r.items.some((i) => i.unsure);
    setItems(r.items); setUnmatched(r.unmatched);
    if (needs && hasKey) await runAI(text);
    else if (!r.items.length && !r.unmatched.length) setErr("Je n'ai rien trouvé. Exemple : « 200 g poulet, 250 g riz cuit, 1 c.s. huile ».");
  };
  const onPhoto = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setBusy(true); setErr(""); setNote(""); setFavBase(null);
    try {
      const b64 = await L.compressImage(file);
      const res = await L.aiPhoto(b64, hint.trim());
      setItems(L.fromAI(res)); setUnmatched([]); setNote(res.note || "");
      if (!res.items?.length) setErr("Je n'ai pas reconnu de nourriture sur la photo.");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const pickFav = (f) => {
    const its = f.items.map((i) => ({ ...i, src: i.fid && L.findFood(i.fid) ? (L.findFood(i.fid).custom ? "perso" : "base") : "perso" }));
    setFavBase(its); setMult(1); setItems(its); setUnmatched([]); setNote("");
    if (!entryId) setLabel(f.name);
  };
  const scale = (m) => { setMult(m); if (favBase) setItems(favBase.map((i) => ({ ...i, g: Math.round(i.g * m) }))); };
  const delFav = (f) => { if (window.confirm(`Supprimer le favori « ${f.name} » ?`)) L.setFavs(L.getFavs().filter((x) => x.id !== f.id)); };
  const addFood = (f) => { setItems((xs) => [...xs, L.itemFromFood(f)]); setQ(""); };
  const setG = (i, g) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, g } : x)));
  const rm = (i) => setItems((xs) => xs.filter((_, j) => j !== i));

  const valid = items.filter((i) => i.g != null);
  const tot = L.itemsTot(valid);
  const missing = items.some((i) => i.g == null);
  const canSave = valid.length > 0 && !missing && !busy;
  const save = () => {
    if (!canSave) return;
    if (entryId) L.appendToEntry(k, entryId, valid);
    else L.addEntry(k, valid, label.trim() || L.mealLabel(), time);
    ctx.say(`Ajouté : ${fint(tot.k)} kcal · ${fint(tot.p)} g prot`);
    ctx.close();
  };

  const results = mode === "search" ? L.searchFoods(q).slice(0, 25) : [];
  const favs = L.getFavs();

  return (
    <Sheet title={entryId ? "Ajouter au repas" : "Ajouter un repas"} onClose={ctx.close}
      footer={(items.length > 0 || unmatched.length > 0) && (
        <>
          {!entryId && (
            <div className="grid2" style={{ marginBottom: 10 }}>
              <input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Nom du repas" />
              <input className="inp" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Heure" />
            </div>
          )}
          <div className="total-line"><span className="muted">{missing ? "Indique les quantités en rouge" : `${fint(tot.p)} g de protéines`}</span><b>{fint(tot.k)} kcal</b></div>
          <button className="btn primary full" disabled={!canSave} onClick={save}>Ajouter au journal</button>
        </>
      )}>
      <div className="tabs">
        {[["text", "✍️ Écrire"], ["photo", "📸 Photo"], ["favs", "⭐ Favoris"], ["search", "🔎 Chercher"]].map(([m, l]) => (
          <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setErr(""); }}>{l}</button>
        ))}
      </div>

      {mode === "text" && (
        <>
          <textarea className="inp" rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus
            placeholder={"Écris comme tu me l'écris :\n196 ml lait entier\n90 g flocons d'avoine\n27 g beurre de cacahuète"} />
          <div className="tip" style={{ marginTop: 6 }}>🎤 Tu peux aussi dicter avec le micro du clavier.</div>
          <div className="btn-row"><button className="btn primary" disabled={!text.trim() || busy} onClick={analyze}>{busy ? <><Spinner /> Analyse…</> : "Analyser"}</button></div>
        </>
      )}

      {mode === "photo" && (
        <>
          <label className="field"><span>Ce que tu sais déjà (facultatif, ça aide beaucoup)</span>
            <input className="inp" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="ex : 170 g de pâtes, 1 c.s. d'huile" />
          </label>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <button className="btn primary" disabled={busy || !hasKey} onClick={() => camRef.current?.click()}>📸 Photo</button>
            <button className="btn" disabled={busy || !hasKey} onClick={() => galRef.current?.click()}>🖼️ Galerie</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
          <input ref={galRef} type="file" accept="image/*" onChange={onPhoto} hidden />
          {!hasKey && <div className="err">L'analyse photo a besoin de ta clé API : ⚙️ Réglages.</div>}
          <div className="tip">L'IA ne fait qu'estimer les grammes : les calories viennent de ta base, donc elles ne changent plus à chaque essai. Une photo reste une estimation à l'œil (souvent ±25 %), corrige les grammes si tu les connais.</div>
        </>
      )}

      {mode === "favs" && (
        <>
          {!favs.length && <Empty icon="⭐" text="Pas encore de favori. Ouvre un repas noté et appuie sur « En favori »." />}
          {favs.map((f) => {
            const tt = L.itemsTot(f.items);
            return (
              <div key={f.id} className="list-row">
                <button style={{ flex: 1, textAlign: "left" }} onClick={() => pickFav(f)}>
                  <div className="nm">{f.name}</div>
                  <div className="muted small">{fint(tt.k)} kcal · {fint(tt.p)} g prot · {f.items.length} aliments</div>
                </button>
                <button className="x-btn" onClick={() => delFav(f)} aria-label="Supprimer le favori">✕</button>
              </div>
            );
          })}
          {favBase && (
            <div className="row-wrap" style={{ marginTop: 12 }}>
              {[0.5, 1, 1.5, 2].map((m) => <button key={m} className={"chip" + (mult === m ? " on" : "")} onClick={() => scale(m)}>× {fdec(m)}</button>)}
            </div>
          )}
        </>
      )}

      {mode === "search" && (
        <>
          <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un aliment…" autoFocus />
          <div style={{ marginTop: 6 }}>
            {results.map((f) => (
              <button key={f.id} className="list-row" onClick={() => addFood(f)}>
                <span><span className="nm">{f.n}</span>{f.custom && <span className="tag">perso</span>}<div className="muted small">{fint(f.k)} kcal · {fdec(f.p)} g prot / 100 g</div></span>
                <span className="link">＋</span>
              </button>
            ))}
            {q.trim() && <QuickFood name={q.trim()} onCreate={(f) => addFood(f)} />}
          </div>
        </>
      )}

      {err && <div className="err">{err}</div>}
      {busy && mode === "photo" && <div className="loading"><Spinner /> Analyse de la photo…</div>}

      {(items.length > 0 || unmatched.length > 0) && (
        <div style={{ marginTop: 16 }}>
          <div className="sec-label">À ajouter</div>
          {note && <div className="note">💬 {note}</div>}
          <ItemsEditor items={items} onGrams={setG} onRemove={rm} tags />
          {unmatched.map((u, i) => (
            <div key={i} className="unmatched">
              <span>❓ « {u} » pas reconnu</span>
              <button className="link" onClick={() => { setMode("search"); setQ(u); }}>Chercher</button>
              <button className="link" onClick={() => setUnmatched((xs) => xs.filter((_, j) => j !== i))}>Ignorer</button>
            </div>
          ))}
          {unmatched.length > 0 && hasKey && <button className="btn full" disabled={busy} onClick={() => runAI(text)}>{busy ? <><Spinner /> L'IA réfléchit…</> : "✨ Demander à l'IA"}</button>}
          {unmatched.length > 0 && !hasKey && <div className="tip">Sans clé API, cherche-les dans ta base ou crée-les avec 🔎 Chercher.</div>}
        </div>
      )}
    </Sheet>
  );
}

function QuickFood({ name, onCreate }) {
  const [open, setOpen] = useState(false);
  const [k, setK] = useState(""), [p, setP] = useState("");
  if (!open) return <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>＋ Créer « {name} »</button>;
  const ok = L.num(k) != null;
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="sec-label">Nouvel aliment : {name}</div>
      <div className="grid2">
        <label className="field"><span>kcal pour 100 g</span><input className="inp" inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} /></label>
        <label className="field"><span>Protéines pour 100 g</span><input className="inp" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} /></label>
      </div>
      <button className="btn primary full" disabled={!ok} onClick={() => {
        const f = L.saveCustomFood({ id: "c_" + L.uid(), n: L.cap(name), a: [L.norm(name)], k: L.num(k), p: L.num(p) || 0, c: 0, f: 0, src: "manuel" });
        onCreate({ ...f, custom: true, al: [L.norm(name)] });
      }}>Créer et ajouter</button>
      <div className="tip">Les valeurs sont sur l'étiquette (colonne « per 100 g »). Tu peux aussi la scanner dans 📒 Mes aliments.</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Panneaux : Mes aliments, Sommeil, Hevy, Réglages
// ═════════════════════════════════════════════════════════════
function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

function SheetRouter({ sheet, ctx }) {
  switch (sheet.type) {
    case "add": return <AddFood ctx={ctx} k={sheet.k} mode={sheet.mode} entryId={sheet.entryId} />;
    case "foods": return <Foods ctx={ctx} />;
    case "sleep": return <SleepEdit ctx={ctx} k={sheet.k} />;
    case "hevy": return <HevyImport ctx={ctx} />;
    case "settings": return <Settings ctx={ctx} />;
    default: return null;
  }
}

function Foods({ ctx }) {
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
      setEdit({ n: r.name || "", k: Math.round(r.kcal_100g), p: fdecRaw(r.protein_100g), c: fdecRaw(r.carbs_100g), f: fdecRaw(r.fat_100g), ug: r.serving_g ? Math.round(r.serving_g) : "", un: r.serving_g ? "portion" : "", src: "etiquette" });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const startEdit = (f) => setEdit({
    id: f.custom ? f.id : undefined, base: f.custom ? null : f, n: f.n, k: f.k, p: f.p, c: f.c, f: f.f,
    ug: f.u?.g || "", un: f.u?.n || "", src: f.src || "manuel", a: f.custom ? f.a : f.al, over: f.over,
  });
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
      <Sheet title={edit.id ? "Modifier l'aliment" : edit.base ? "Ma version de l'aliment" : "Nouvel aliment"} onClose={ctx.close}
        footer={<div className="btn-row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => setEdit(null)}>Retour</button>
          {edit.id && <button className="btn" onClick={() => { if (window.confirm("Supprimer cet aliment ?")) { L.deleteCustomFood(edit.id); setEdit(null); } }}>🗑️</button>}
          <button className="btn primary" onClick={saveEdit}>Enregistrer</button>
        </div>}>
        {edit.base && <div className="note">Tu crées ta propre version de « {edit.base.n} ». C'est elle qui sera utilisée ensuite.</div>}
        {edit.src === "etiquette" && <div className="note">Valeurs lues sur l'étiquette : vérifie-les vite fait.</div>}
        {F("n", "Nom", "text")}
        <div className="sec-label">Pour 100 g (ou 100 ml)</div>
        <div className="grid2">{F("k", "Calories (kcal)")}{F("p", "Protéines (g)")}{F("c", "Glucides (g)")}{F("f", "Lipides (g)")}</div>
        <div className="sec-label">Unité (facultatif)</div>
        <div className="grid2">{F("un", "Nom de l'unité (ex : dose)", "text")}{F("ug", "Poids d'une unité (g)")}</div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Mes aliments" onClose={ctx.close}>
      <div className="btn-row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className="btn" onClick={() => setEdit({ n: q, k: "", p: "", c: "", f: "", ug: "", un: "", src: "manuel" })}>＋ Nouveau</button>
        <button className="btn primary" disabled={!hasKey || busy} onClick={() => scanRef.current?.click()}>{busy ? <><Spinner /> Lecture…</> : "📦 Étiquette"}</button>
      </div>
      <input ref={scanRef} type="file" accept="image/*" capture="environment" onChange={scan} hidden />
      {!hasKey && <div className="tip" style={{ marginTop: -4, marginBottom: 10 }}>Le scan d'étiquette a besoin de ta clé API (⚙️ Réglages).</div>}
      {err && <div className="err">{err}</div>}
      <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher…" />
      <div style={{ marginTop: 6 }}>
        {list.map((f) => (
          <button key={f.id} className="list-row" onClick={() => startEdit(f)}>
            <span><span className="nm">{f.n}</span>{f.custom && <span className={"tag" + (f.src === "ia" ? " ia" : "")}>{f.src === "ia" ? "appris" : "perso"}</span>}
              <div className="muted small">{fint(f.k)} kcal · {fdec(f.p)} g prot / 100 g{f.u ? ` · 1 ${f.u.n} = ${f.u.g} g` : ""}</div></span>
            <span className="dim">›</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
const fdecRaw = (x) => Math.round((+x || 0) * 10) / 10;

function SleepEdit({ ctx, k }) {
  const d = L.getDay(k), s = d.sleep;
  const [bed, setBed] = useState(s?.bed ? L.hm(s.bed) : "01:30");
  const [wake, setWake] = useState(s?.wake ? L.hm(s.wake) : "09:30");
  const [lat, setLat] = useState(String(s?.lat ?? ctx.S.lat));
  const [q, setQ] = useState(s?.q || null);
  const n = bed && wake ? L.nightFromTimes(k, bed, wake) : null;
  const h = n ? L.sleepHours({ ...n, lat: L.num(lat) ?? ctx.S.lat }) : null;
  const save = () => {
    if (!n) return;
    L.updDay(k, (dd) => ({ ...dd, sleep: { ...n, lat: L.num(lat) ?? ctx.S.lat, q } }));
    ctx.say(`Nuit enregistrée : ${fH(h)}`);
    ctx.close();
  };
  const remove = () => { L.updDay(k, (dd) => { const x = { ...dd }; delete x.sleep; return x; }); ctx.close(); };
  return (
    <Sheet title="Ma nuit" onClose={ctx.close}
      footer={<div className="btn-row" style={{ marginTop: 0 }}>
        {s && <button className="btn" onClick={remove}>🗑️</button>}
        <button className="btn primary" disabled={!n} onClick={save}>Enregistrer {h != null ? `· ${fH(h)}` : ""}</button>
      </div>}>
      <div className="muted" style={{ marginBottom: 12 }}>Nuit du {L.fmtDay(L.addDays(k, -1), { weekday: "long", day: "numeric" })} au {L.fmtDay(k, { weekday: "long", day: "numeric", month: "long" })}</div>
      <div className="grid2">
        <label className="field"><span>Téléphone posé à</span><input className="inp" type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></label>
        <label className="field"><span>Réveil à</span><input className="inp" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></label>
      </div>
      <label className="field"><span>Minutes pour t'endormir</span><input className="inp" inputMode="numeric" value={lat} onChange={(e) => setLat(e.target.value)} /></label>
      <div className="sec-label">Énergie au réveil</div>
      <div className="q-row">
        {["😵", "😪", "😐", "🙂", "😄"].map((e, i) => <button key={i} className={q === i + 1 ? "on" : ""} onClick={() => setQ(i + 1)}>{e}</button>)}
      </div>
    </Sheet>
  );
}

function HevyImport({ ctx }) {
  const [txt, setTxt] = useState("");
  const [ses, setSes] = useState(null);
  const parsed = useMemo(() => (txt.trim() ? L.parseHevy(txt) : null), [txt]);
  const session = ses || parsed?.session || null;
  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setTxt(t); else ctx.say("Le presse-papier est vide"); }
    catch { ctx.say("Appui long dans la case → Coller"); }
  };
  const save = () => {
    if (!parsed?.exercises.length) return;
    const ws = L.getWorkouts();
    const w = { id: L.uid(), title: parsed.title, date: parsed.date, url: parsed.url, session,
      exercises: parsed.exercises.map((e) => ({ name: e.name, key: L.matchExercise(e.name, session)?.key || null, sets: e.sets })) };
    const dup = ws.find((x) => (w.url && x.url === w.url) || (x.date === w.date && x.title === w.title));
    L.setWorkouts(dup ? ws.map((x) => (x === dup ? { ...w, id: dup.id } : x)) : [w, ...ws]);
    ctx.say(dup ? "Séance mise à jour" : "Séance enregistrée 💪 Charges mises à jour");
    ctx.close();
  };
  return (
    <Sheet title="Importer une séance Hevy" onClose={ctx.close}
      footer={parsed?.exercises.length > 0 && <button className="btn primary full" onClick={save}>Enregistrer la séance</button>}>
      <div className="muted" style={{ marginBottom: 10 }}>Dans Hevy : ouvre ta séance → <b>Partager</b> → <b>Copier</b>. Puis colle le texte ici.</div>
      <button className="btn full" onClick={paste} style={{ marginBottom: 10 }}>📋 Coller depuis le presse-papier</button>
      <textarea className="inp" rows={5} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"Full body B\nLe mercredi, oct. 07, 2026 à 3:14pm\n\nRowing Haltère\nSérie 1: 17.5 kg x 12\n…"} />
      {parsed && !parsed.exercises.length && <div className="err">Je ne trouve aucune série dans ce texte.</div>}
      {parsed?.exercises.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="row-between"><b>{parsed.title}</b><span className="muted small">{new Date(parsed.date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
          <div className="row-wrap" style={{ margin: "10px 0" }}>
            {["A", "B", "C"].map((x) => <button key={x} className={"chip" + (session === x ? " on" : "")} onClick={() => setSes(x)}>Séance {x}</button>)}
          </div>
          {parsed.exercises.map((e, i) => {
            const m = L.matchExercise(e.name, session);
            return (
              <div key={i} className="wex" style={{ padding: "7px 0", borderBottom: "1px solid var(--bd)" }}>
                <span>{e.name}{m ? <span className="tag ok">✓</span> : <span className="tag">hors programme</span>}</span>
                <span>{e.sets.filter((s) => !s.warm).map((s) => (s.w ? `${fdec(s.w, 2)}×${s.r}` : `${s.r}`)).join(" · ")}</span>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

function NumField({ S, k, label, unit }) {
  const [v, setV] = useState(String(S[k]).replace(".", ","));
  return (
    <label className="field"><span>{label}</span>
      <div className="gram" style={{ width: "100%" }}>
        <input style={{ width: "100%", textAlign: "left" }} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)}
          onBlur={() => { const n = L.num(v); if (n != null && n > 0) L.setSettings({ [k]: n }); else setV(String(S[k]).replace(".", ",")); }} />
        <span>{unit}</span>
      </div>
    </label>
  );
}

function Settings({ ctx }) {
  const S = ctx.S;
  const cur = L.getApiKey();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [restore, setRestore] = useState("");
  const [msg, setMsg] = useState("");
  const saveKey = () => {
    const k = key.trim();
    if (!k.startsWith("sk-ant-")) { setMsg("La clé doit commencer par sk-ant-"); return; }
    L.setApiKey(k); setKey(""); setMsg("Clé enregistrée sur ce téléphone ✓");
  };
  const copyBackup = async () => {
    const data = L.exportData();
    try { await navigator.clipboard.writeText(data); setMsg("Sauvegarde copiée ✓ Colle-la dans tes notes."); }
    catch { setRestore(data); setMsg("Copie impossible : le texte est dans la case du dessous, copie-le à la main."); }
  };
  const doRestore = () => {
    try { L.importData(restore.trim()); setRestore(""); setMsg("Données restaurées ✓"); }
    catch (e) { setMsg(e.message || "Sauvegarde illisible."); }
  };
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  return (
    <Sheet title="Réglages" onClose={ctx.close}>
      {msg && <div className="note">{msg}</div>}
      <div className="sec-label">Clé API Claude (photo, étiquettes, coach)</div>
      {cur ? (
        <div className="row-between" style={{ marginBottom: 12 }}>
          <span className="muted">✓ Clé enregistrée (…{cur.slice(-4)})</span>
          <button className="link" onClick={() => { if (window.confirm("Retirer la clé de ce téléphone ?")) { L.setApiKey(""); setMsg("Clé retirée."); } }}>Retirer</button>
        </div>
      ) : <div className="muted small" style={{ marginBottom: 8 }}>Sans clé, tout marche sauf la photo, l'étiquette, les textes non reconnus et le coach.</div>}
      <div className="btn-row" style={{ marginTop: 0, marginBottom: 16 }}>
        <input className="inp" type={showKey ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder={cur ? "Remplacer la clé…" : "sk-ant-…"} autoComplete="off" />
        <button className="btn" style={{ flex: "0 0 auto" }} onClick={() => setShowKey(!showKey)}>{showKey ? "🙈" : "👁️"}</button>
        <button className="btn primary" style={{ flex: "0 0 auto" }} disabled={!key.trim()} onClick={saveKey}>OK</button>
      </div>

      <div className="sec-label">Objectifs</div>
      <div className="grid2">
        <NumField S={S} k="kcal" label="Calories / jour" unit="kcal" />
        <NumField S={S} k="prot" label="Protéines / jour" unit="g" />
        <NumField S={S} k="water" label="Eau / jour" unit="L" />
        <NumField S={S} k="sleep" label="Sommeil visé" unit="h" />
        <NumField S={S} k="goalW" label="Poids visé" unit="kg" />
        <NumField S={S} k="lat" label="Temps d'endormissement" unit="min" />
      </div>
      <label className="field"><span>Jour de pesée</span>
        <select className="inp" value={S.weighDay} onChange={(e) => L.setSettings({ weighDay: +e.target.value })}>
          {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </label>
      <label className="field"><span>La journée change à</span>
        <select className="inp" value={S.dayStart} onChange={(e) => L.setSettings({ dayStart: +e.target.value })}>
          {[0, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} h du matin{h === 5 ? " (conseillé)" : h === 0 ? " (minuit)" : ""}</option>)}
        </select>
      </label>
      <Check on={S.skincare} label="Afficher la skincare" onClick={() => L.setSettings({ skincare: !S.skincare })} />

      <div className="sec-label" style={{ marginTop: 18 }}>Sauvegarde</div>
      <div className="muted small" style={{ marginBottom: 8 }}>Tes données restent sur ce téléphone. Copie une sauvegarde de temps en temps (la clé API n'y est pas).</div>
      <button className="btn full" onClick={copyBackup}>📤 Copier ma sauvegarde</button>
      <textarea className="inp" style={{ marginTop: 10, minHeight: 80 }} value={restore} onChange={(e) => setRestore(e.target.value)} placeholder="Pour restaurer : colle une sauvegarde ici" />
      {restore.trim() && <button className="btn full" style={{ marginTop: 8 }} onClick={doRestore}>📥 Restaurer cette sauvegarde</button>}
      <div className="tip" style={{ textAlign: "center", marginTop: 18 }}>Isma Daily · v2 · octobre 2026</div>
    </Sheet>
  );
}

// ═════════════════════════════════════════════════════════════
// Onglet Sport
// ═════════════════════════════════════════════════════════════
function Sport({ ctx }) {
  const ws = L.getWorkouts();
  const next = L.nextSession(ws);
  const [sel, setSel] = useState(next);
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  const wk = L.weekWorkouts(ctx.todayK, ws);
  const ws0 = L.weekStartKey(ctx.todayK);
  const prog = PROGRAM.find((p) => p.day === sel);
  return (
    <div className="fade">
      <section className="card">
        <div className="row-between"><span className="sec-label" style={{ margin: 0 }}>Cette semaine</span><b>{wk.length}/3 séances</b></div>
        <div className="week-dots">
          {Array.from({ length: 7 }, (_, i) => {
            const k = L.addDays(ws0, i);
            const w = wk.find((x) => x.date.slice(0, 10) === k);
            return (
              <div key={k}>
                <div className="d">{L.keyToDate(k).toLocaleDateString("fr-FR", { weekday: "narrow" })}</div>
                <div className={"dot" + (w ? " on" : "") + (k === ctx.todayK ? " today" : "")}>{w ? w.session || "✓" : ""}</div>
              </div>
            );
          })}
        </div>
        <button className="btn primary full" onClick={() => ctx.open({ type: "hevy" })}>📋 Importer une séance Hevy</button>
      </section>
      <div className="seg">
        {PROGRAM.map((p) => (
          <button key={p.day} className={sel === p.day ? "on" : ""} onClick={() => { setSel(p.day); setOpen(null); }}>
            Séance {p.day}{p.day === next && <small>prochaine</small>}
          </button>
        ))}
      </div>
      {prog.exs.map((pe) => <ExCard key={pe.key} pe={pe} ws={ws} open={open === pe.key} onToggle={() => setOpen(open === pe.key ? null : pe.key)} />)}
      <Card icon="📏" title="Les règles">{RULES.map((r, i) => <div key={i} className="rule">• {r}</div>)}</Card>
      <Card icon="🗂️" title="Historique" right={`${ws.length} séance${ws.length > 1 ? "s" : ""}`}>
        {!ws.length && <div className="muted">Aucune séance importée.</div>}
        {ws.slice(0, all ? 100 : 5).map((w) => <WorkoutRow key={w.id} w={w} ctx={ctx} />)}
        {ws.length > 5 && <button className="link" onClick={() => setAll(!all)}>{all ? "Voir moins" : "Tout voir"}</button>}
      </Card>
    </div>
  );
}

function ExCard({ pe, ws, open, onToggle }) {
  const sg = L.suggest(pe, ws);
  const hist = open ? L.exHistory(pe.key, ws) : [];
  let main, sub, cls;
  if (sg.status === "up") {
    cls = "up";
    main = sg.weight > 0 ? `⬆️ Monte à ${fkg(sg.weight)}` : "⬆️ Ajoute des reps";
    sub = `${sg.last.reps.join(" · ")} à ${fkg(sg.last.W)} la dernière fois : haut de fourchette atteint.`;
  } else if (sg.status === "hold") {
    cls = "hold";
    main = `🎯 Reste à ${fkg(sg.weight)}`;
    sub = `Dernière fois : ${sg.last.reps.join(" · ")}. Gagne des reps : à ${Array(pe.sets).fill(pe.max).join("/")} tu montes.`;
  } else {
    cls = "new";
    main = sg.weight ? `🆕 Commence à ${fkg(sg.weight)}` : "🆕 Trouve ta charge";
    sub = sg.weight ? `Objectif ${pe.sets} × ${pe.min}-${pe.max}.` : `Une charge qui te permet ${pe.max} reps propres.`;
  }
  return (
    <section className="card ex">
      <button className="ex-head" onClick={onToggle} aria-expanded={open}>
        <div className="ex-main">
          <div className="ex-name">{pe.name}</div>
          <div className="muted small">{pe.sets} × {pe.min}-{pe.max} · repos {pe.rest}</div>
          <div className={"ex-sugg " + cls}>{main}</div>
          <div className="muted small">{sub}</div>
          {sg.drop && <div className="warn-txt">💡 Ta dernière série a chuté : prends 3 min de repos avant elle.</div>}
        </div>
        <span className={"chev" + (open ? " open" : "")}>▾</span>
      </button>
      {open && (
        <div className="ex-body">
          <ul className="cues">{pe.cues.map((c, i) => <li key={i}>{c}</li>)}</ul>
          {hist.length > 0 && (
            <>
              <div className="sec-label">Tes dernières fois</div>
              {hist.map((h, i) => (
                <div key={i} className="hist-row">
                  <span>{shortDate(h.date.slice(0, 10))}</span>
                  <span>{h.sets.map((s) => (s.w ? `${fdec(s.w, 2)}×${s.r}` : `${s.r}`)).join("  ")}</span>
                </div>
              ))}
              {hist.length >= 2 && <Spark values={hist.map((h) => h.best).reverse()} />}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Spark({ values }) {
  const W = 300, H = 50;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 6 - ((v - min) / span) * (H - 14)]);
  return (
    <div style={{ marginTop: 10 }}>
      <div className="muted small" style={{ marginBottom: 4 }}>Force estimée (meilleure série)</div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--green)" />)}
      </svg>
    </div>
  );
}

function WorkoutRow({ w, ctx }) {
  const [open, setOpen] = useState(false);
  const del = () => { if (window.confirm(`Supprimer « ${w.title} » ?`)) L.setWorkouts(L.getWorkouts().filter((x) => x.id !== w.id)); };
  return (
    <div className="wrow">
      <button className="wrow-head" onClick={() => setOpen(!open)}>
        <span><b>{w.title}</b>{w.session && <span className="tag ok">{w.session}</span>}<div className="muted small">{shortDate(w.date.slice(0, 10))} · {L.workoutSets(w)} séries · {fint(L.workoutVolume(w))} kg soulevés</div></span>
        <span className={"chev" + (open ? " open" : "")}>▾</span>
      </button>
      {open && (
        <div className="wrow-body">
          {w.exercises.map((e, i) => (
            <div key={i} className="wex"><span>{e.name}</span><span>{e.sets.filter((s) => !s.warm).map((s) => (s.w ? `${fdec(s.w, 2)}×${s.r}` : `${s.r}`)).join(" · ")}</span></div>
          ))}
          <div className="row-wrap" style={{ marginTop: 8 }}>
            {w.url && <a className="chip" href={w.url} target="_blank" rel="noreferrer">Ouvrir dans Hevy</a>}
            <button className="chip danger" onClick={del}>🗑️ Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Onglet Poids
// ═════════════════════════════════════════════════════════════
function Weight({ ctx }) {
  const { S, todayK } = ctx;
  const list = L.weightList();
  const [inp, setInp] = useState("");
  const todayW = L.getWeights()[todayK];
  const latest = list.length ? list[list.length - 1][1] : null;
  const first = list.length ? list[0][1] : null;
  const rate = L.weeklyRate(list, todayK);
  const weighDay = L.keyToDate(todayK).getDay() === S.weighDay;
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const save = () => {
    const v = L.num(inp);
    if (v == null || v < 30 || v > 200) { ctx.say("Poids invalide"); return; }
    L.setWeights({ ...L.getWeights(), [todayK]: Math.round(v * 10) / 10 });
    setInp(""); ctx.say("Pesée notée ⚖️");
  };
  const remove = () => { const w = { ...L.getWeights() }; delete w[todayK]; L.setWeights(w); };
  const prog = latest != null && first != null && S.goalW > first ? clamp01((latest - first) / (S.goalW - first)) : 0;
  let rateTxt = "Il faut deux pesées à au moins une semaine d'écart pour voir ton rythme.";
  if (rate != null) {
    if (rate < 0.1) rateTxt = "Ça stagne : ajoute environ 300 kcal par jour (un shaker en plus).";
    else if (rate < 0.25) rateTxt = "Ça monte doucement : 200 kcal de plus par jour accéléreraient.";
    else if (rate <= 0.6) rateTxt = "Bon rythme, continue comme ça 👍";
    else rateTxt = "Ça monte vite : parfait vu d'où tu pars.";
  }
  return (
    <div className="fade">
      <section className="card">
        <div className="row-between" style={{ alignItems: "flex-end", marginBottom: 12 }}>
          <div><div className="muted small">Actuel</div><div className="hero-kcal" style={{ margin: 0 }}><span className="n">{latest != null ? fdec(latest) : "–"}</span><span className="u">kg</span></div></div>
          <div style={{ textAlign: "right" }}><div className="muted small">Objectif</div><div className="big" style={{ color: "var(--amber)" }}>{fdec(S.goalW)} kg</div></div>
        </div>
        <div className="track"><div className="c-blue" style={{ width: `${prog * 100}%` }} /></div>
        <div className="row-between" style={{ marginTop: 8 }}>
          <span className="muted small">{latest != null ? `${fdec(Math.max(0, S.goalW - latest))} kg à prendre` : "Note ton poids pour commencer"}</span>
          {first != null && latest != null && <span className="muted small">{latest - first >= 0 ? "+" : ""}{fdec(latest - first)} kg depuis le début</span>}
        </div>
      </section>

      <div className="tiles">
        <div className="tile"><div className="l">Rythme</div><div className="v">{rate != null ? `${rate >= 0 ? "+" : ""}${fdec(rate, 2)}` : "–"}<small>kg/sem</small></div><div className="s">sur 5 semaines</div></div>
        <div className="tile"><div className="l">Pesées</div><div className="v">{list.length}</div><div className="s">le {days[S.weighDay]} matin</div></div>
      </div>
      <div className="note" style={{ marginTop: -2 }}>{rateTxt}</div>

      <Card icon="⚖️" title="Pesée" right={weighDay && todayW == null ? "📅 C'est le jour !" : null}>
        {todayW != null ? (
          <div className="row-between">
            <span className="big" style={{ color: "var(--green)" }}>✓ {fdec(todayW)} kg</span>
            <button className="link" onClick={remove}>Modifier</button>
          </div>
        ) : (
          <div className="btn-row" style={{ marginTop: 0 }}>
            <input className="inp" inputMode="decimal" value={inp} onChange={(e) => setInp(e.target.value)} placeholder={latest != null ? `Dernière : ${fdec(latest)} kg` : "ex : 52,4"} onKeyDown={(e) => e.key === "Enter" && save()} />
            <button className="btn primary" style={{ flex: "0 0 auto" }} onClick={save}>Noter</button>
          </div>
        )}
        <div className="tip">Une fois par semaine, le {days[S.weighDay]} : le matin, à jeun, après les toilettes, même balance.</div>
      </Card>

      {list.length >= 2 && <Card icon="📈" title="Évolution"><WeightChart list={list.slice(-20)} goal={S.goalW} /></Card>}

      {list.length > 0 && (
        <Card icon="🗂️" title="Historique">
          {[...list].reverse().slice(0, 12).map(([k, v], i, arr) => {
            const prev = arr[i + 1];
            const diff = prev ? Math.round((v - prev[1]) * 10) / 10 : null;
            return (
              <div key={k} className="hist-row">
                <span>{shortDate(k)}</span>
                <span>{diff != null && <span style={{ color: diff > 0 ? "var(--green)" : diff < 0 ? "var(--red)" : "var(--mu)", marginRight: 10, fontSize: 12 }}>{diff > 0 ? "+" : ""}{fdec(diff)}</span>}<b>{fdec(v)} kg</b></span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function WeightChart({ list, goal }) {
  const W = 320, H = 120, P = 6;
  const vals = list.map(([, v]) => v);
  let min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const showGoal = goal <= max + 2;
  if (showGoal) max = Math.max(max, goal + 0.3);
  const t0 = L.keyToDate(list[0][0]).getTime(), t1 = L.keyToDate(list[list.length - 1][0]).getTime();
  const x = (k) => P + ((L.keyToDate(k).getTime() - t0) / (t1 - t0 || 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - min) / (max - min)) * (H - 2 * P - 14);
  const pts = list.map(([k, v]) => [x(k), y(v)]);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ height: "auto" }}>
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity=".35" /><stop offset="100%" stopColor="#60a5fa" stopOpacity="0" /></linearGradient></defs>
        {showGoal && <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--amber)" strokeDasharray="4 4" opacity=".6" />}
        <path d={`M${pts[0][0]},${H} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${H} Z`} fill="url(#wg)" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill="var(--blue)" stroke="var(--bg)" strokeWidth="1.5" />)}
        <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 10} textAnchor="end" fill="var(--tx)" fontSize="11" fontWeight="600">{fdec(vals[vals.length - 1])} kg</text>
      </svg>
      <div className="row-between muted small" style={{ marginTop: 4 }}>
        <span>{shortDate(list[0][0])}</span>
        {showGoal && <span style={{ color: "var(--amber)" }}>– – objectif {fdec(goal)} kg</span>}
        <span>{shortDate(list[list.length - 1][0])}</span>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// Onglet Stats
// ═════════════════════════════════════════════════════════════
function Stats({ ctx }) {
  const { S, todayK } = ctx;
  const [n, setN] = useState(7);
  const keys = Array.from({ length: n }, (_, i) => L.addDays(todayK, i - n + 1));
  const days = keys.map((k) => ({ k, d: L.getDay(k) }));
  const fed = days.filter((x) => L.hasFood(x.d) && x.k !== todayK);
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const avgK = avg(fed.map((x) => L.dayTot(x.d).k));
  const avgP = avg(fed.map((x) => L.dayTot(x.d).p));
  const hit = fed.filter((x) => L.dayTot(x.d).k >= S.kcal).length;
  const sl = L.sleepStats(todayK, n);
  const ws = L.getWorkouts().filter((w) => w.date.slice(0, 10) >= keys[0] && w.date.slice(0, 10) <= todayK);
  const wl = L.weightList().filter(([k]) => k >= keys[0] && k <= todayK);
  const dW = wl.length >= 2 ? wl[wl.length - 1][1] - wl[0][1] : null;
  const hist = [...days].reverse().filter((x) => L.dayHasData(x.d));
  return (
    <div className="fade">
      <div className="seg">
        {[7, 30].map((v) => <button key={v} className={n === v ? "on" : ""} onClick={() => setN(v)}>{v} jours</button>)}
      </div>
      <div className="tiles">
        <div className="tile"><div className="l">Calories / jour</div><div className="v">{avgK != null ? fint(avgK) : "–"}<small>kcal</small></div><div className="s">objectif {fint(S.kcal)} · hors aujourd'hui</div></div>
        <div className="tile"><div className="l">Protéines / jour</div><div className="v">{avgP != null ? fint(avgP) : "–"}<small>g</small></div><div className="s">objectif {S.prot} g</div></div>
        <div className="tile"><div className="l">Jours au top</div><div className="v">{hit}<small>/ {fed.length}</small></div><div className="s">jours notés ≥ objectif kcal</div></div>
        <div className="tile"><div className="l">Sommeil</div><div className="v">{sl.avgH != null ? fH(sl.avgH) : "–"}</div><div className="s">{sl.avgBed != null ? `coucher moyen ${L.nightMinToHM(sl.avgBed)}` : "pas encore de nuit"}</div></div>
        <div className="tile"><div className="l">Séances</div><div className="v">{ws.length}<small>{n === 30 ? `· ${fdec(ws.length / (30 / 7))}/sem` : "/ 3"}</small></div><div className="s">sur {n} jours</div></div>
        <div className="tile"><div className="l">Poids</div><div className="v">{dW != null ? `${dW >= 0 ? "+" : ""}${fdec(dW)}` : "–"}<small>kg</small></div><div className="s">sur la période</div></div>
      </div>
      <Card icon="🔥" title="Calories"><DayBars days={days} value={(d) => L.dayTot(d).k} goal={S.kcal} color="var(--amber)" todayK={todayK} /></Card>
      <Card icon="🥩" title="Protéines"><DayBars days={days} value={(d) => L.dayTot(d).p} goal={S.prot} color="var(--green)" todayK={todayK} /></Card>
      <Card icon="😴" title="Heures de sommeil"><SleepChart days={days} /></Card>
      <Card icon="🗂️" title="Jour par jour">
        {!hist.length && <div className="muted">Rien de noté sur la période.</div>}
        {hist.map(({ k, d }) => {
          const t = L.dayTot(d), sh = L.daySleepH(d), sc = L.dayScore(d, S);
          return (
            <button key={k} className="list-row" onClick={() => ctx.go("food", k)}>
              <span>
                <span className="nm">{k === todayK ? "Aujourd'hui" : shortDate(k)}</span>
                <div className="muted small">{L.hasFood(d) ? `${fint(t.k)} kcal · ${fint(t.p)} g prot` : "repas non notés"}{sh != null ? ` · 😴 ${fH(sh)}` : ""}</div>
              </span>
              <span className="tag" style={{ color: sc.pct >= 75 ? "var(--green)" : "var(--mu)" }}>{sc.n}/{sc.max}</span>
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function DayBars({ days, value, goal, color, todayK }) {
  const W = 320, H = 110, top = 8, bottom = 18;
  const vals = days.map((x) => (L.hasFood(x.d) ? value(x.d) : 0));
  const max = Math.max(goal * 1.15, ...vals);
  const bw = (W / days.length) * 0.66, step = W / days.length;
  const y = (v) => H - bottom - (v / max) * (H - top - bottom);
  const lbl = days.length <= 7;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
      <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke={color} strokeDasharray="4 4" opacity=".55" />
      {days.map((x, i) => {
        const v = vals[i];
        const h = Math.max(v > 0 ? 3 : 2, H - bottom - y(v));
        return (
          <g key={x.k}>
            <rect x={i * step + (step - bw) / 2} y={H - bottom - h} width={bw} height={h} rx="3"
              fill={v > 0 ? color : "rgba(255,255,255,.07)"} opacity={v >= goal ? 1 : v > 0 ? (x.k === todayK ? 0.45 : 0.7) : 1} />
            {(lbl || i % 5 === 0 || i === days.length - 1) && (
              <text x={i * step + step / 2} y={H - 4} textAnchor="middle" fontSize="9.5" fill="var(--dim)">
                {lbl ? L.keyToDate(x.k).toLocaleDateString("fr-FR", { weekday: "narrow" }) : L.keyToDate(x.k).getDate()}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SleepChart({ days }) {
  // axe vertical : de 20 h (haut) à 14 h (bas), une barre par nuit (coucher → réveil)
  const W = 320, H = 170, left = 34, top = 6, bottom = 18;
  const T0 = 120, T1 = 1200; // minutes après 18 h : 20 h → 14 h
  const y = (m) => top + ((Math.min(Math.max(m, T0), T1) - T0) / (T1 - T0)) * (H - top - bottom);
  const step = (W - left) / days.length, bw = step * 0.56;
  const nights = days.map((x) => ({ k: x.k, s: x.d.sleep }));
  const any = nights.some((n) => n.s?.bed);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
        {[180, 360, 540, 720, 900, 1080].map((m) => (
          <g key={m}>
            <line x1={left} x2={W} y1={y(m)} y2={y(m)} stroke="rgba(255,255,255,.06)" />
            <text x={left - 6} y={y(m) + 3} textAnchor="end" fontSize="9.5" fill="var(--dim)">{L.nightMinToHM(m).replace(":00", "h")}</text>
          </g>
        ))}
        {nights.map((n, i) => {
          if (!n.s?.bed || !n.s?.wake) return null;
          const b = L.nightMin(n.s.bed), w = L.nightMin(n.s.wake);
          if (w <= b) return null;
          return <rect key={n.k} x={left + i * step + (step - bw) / 2} y={y(b)} width={bw} height={Math.max(3, y(w) - y(b))} rx="4" fill="var(--violet)" opacity=".85" />;
        })}
      </svg>
      <div className="tip" style={{ marginTop: 6 }}>{any ? "Chaque barre va de l'heure où tu poses le téléphone à ton réveil. Le but : voir les barres remonter petit à petit." : "Tes nuits apparaîtront ici dès que tu utiliseras 🌙 et ☀️."}</div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// Onglet Coach
// ═════════════════════════════════════════════════════════════
const SUGG = [
  "Qu'est-ce que je mange ce soir pour finir mes calories ?",
  "Analyse ma dernière séance",
  "Comment avancer mon heure de coucher ?",
  "J'ai pas faim aujourd'hui, je fais comment ?",
];
function cleanHistory(chat) {
  const msgs = chat.filter((m) => !m.err).slice(-12);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const out = [];
  msgs.forEach((m) => { if (out.length && out[out.length - 1].role === m.role) out[out.length - 1] = { role: m.role, content: out[out.length - 1].content + "\n\n" + m.content }; else out.push({ role: m.role, content: m.content }); });
  return out;
}
// Gras **…** et puces « - » sans risque (pas de HTML injecté)
function Rich({ text }) {
  return String(text).split("\n").map((line, i) => {
    const bullet = /^\s*[-•*]\s+/.test(line);
    const clean = line.replace(/^\s*[-•*]\s+/, "").replace(/^#+\s*/, "");
    const parts = clean.split(/\*\*(.+?)\*\*/g).map((t, j) => (j % 2 ? <b key={j}>{t}</b> : t));
    return <React.Fragment key={i}>{i > 0 && "\n"}{bullet ? "• " : ""}{parts}</React.Fragment>;
  });
}

function Coach({ ctx }) {
  const chat = L.store.get("chat", []);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef();
  const hasKey = !!L.getApiKey();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  const send = async (txt) => {
    const m = (txt ?? inp).trim();
    if (!m || busy) return;
    const nc = [...chat, { role: "user", content: m }];
    L.store.set("chat", nc.slice(-40));
    setInp(""); setBusy(true);
    try {
      const r = await L.aiCoach(cleanHistory(nc), L.buildContext(ctx.todayK));
      L.store.set("chat", [...nc, { role: "assistant", content: r || "…" }].slice(-40));
    } catch (e) {
      L.store.set("chat", [...nc, { role: "assistant", content: "❌ " + e.message, err: true }].slice(-40));
    }
    setBusy(false);
  };
  return (
    <div className="fade">
      {!chat.length && (
        <section className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🤖</div>
          <div className="big" style={{ fontSize: 17 }}>Ton coach</div>
          <div className="muted" style={{ margin: "6px 0 4px" }}>Il voit ce que tu as mangé, ton sommeil, ton poids et tes séances.</div>
          {SUGG.map((s) => <button key={s} className="sugg" onClick={() => send(s)} disabled={!hasKey}>💬 {s}</button>)}
        </section>
      )}
      {!hasKey && <div className="err">Le coach a besoin de ta clé API : ⚙️ Réglages.</div>}
      <div className="chat">
        {chat.map((m, i) => <div key={i} className={"msg " + m.role + (m.err ? " err" : "")}>{m.role === "assistant" ? <Rich text={m.content} /> : m.content}</div>)}
        {busy && <div className="msg assistant typing"><i /><i /><i /></div>}
        <div ref={endRef} />
      </div>
      {chat.length > 0 && <div style={{ textAlign: "center", marginBottom: 6 }}><button className="link" onClick={() => { if (window.confirm("Effacer la conversation ?")) L.store.set("chat", []); }}>Effacer la conversation</button></div>}
      <div className="composer">
        <textarea className="inp" rows={1} value={inp} onChange={(e) => setInp(e.target.value)} placeholder="Pose ta question…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); send(); } }} />
        <button className="send" disabled={!inp.trim() || busy || !hasKey} onClick={() => send()} aria-label="Envoyer">↑</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
L.migrateAndSeed();
createRoot(document.getElementById("root")).render(<App />);
