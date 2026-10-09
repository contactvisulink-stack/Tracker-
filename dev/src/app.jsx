import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as L from "./lib.js";
import { Icon, Confetti, buzz } from "./ui.jsx";
import { Home } from "./home.jsx";
import { Food, AddFood, Foods } from "./food.jsx";
import { Sport, HevyImport, ProgramEdit } from "./sport.jsx";
import { Progress } from "./progress.jsx";
import { SleepEdit, Coach, Settings } from "./sheets.jsx";

// ── Mise à jour automatique : l'app vérifie s'il existe une version plus récente en ligne
const BUILD = (typeof document !== "undefined" && document.querySelector('meta[name="build"]')?.content) || "";
function useUpdateCheck() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!/^https?:/.test(location.protocol)) return;
    let last = 0;
    const check = async () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 4 * 60e3) return;
      last = Date.now();
      try {
        const r = await fetch(location.pathname + "?v=" + Date.now(), { cache: "no-store" });
        const m = (await r.text()).match(/<meta name="build" content="([^"]+)"/);
        if (m && BUILD && m[1] !== BUILD) setReady(true);
      } catch {}
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);
  return ready;
}
async function installUpdate() {
  try { await fetch(location.href, { cache: "reload" }); } catch {}
  try { await fetch(location.pathname, { cache: "reload" }); } catch {}
  location.reload();
}

const ambient = (h) => (h >= 5 && h < 10 ? "dawn" : h >= 10 && h < 17 ? "day" : h >= 17 && h < 22 ? "dusk" : "night");
const TITLES = { home: "Isma Daily", food: "Manger", sport: "Sport", progress: "Progrès" };

function App() {
  const [, setRev] = useState(0);
  useEffect(() => L.store.subscribe(() => setRev((r) => r + 1)), []);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState("home");
  const [sub, setSub] = useState(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(() => {
    const upd = () => {
      setNow(Date.now());
      if (document.visibilityState === "visible" && tabRef.current === "home" && L.store.get("night", null)) window.scrollTo({ top: 0 });
    };
    const iv = setInterval(upd, 30000);
    document.addEventListener("visibilitychange", upd);
    window.addEventListener("focus", upd);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", upd); window.removeEventListener("focus", upd); };
  }, []);

  const S = L.getSettings();
  const nowD = new Date(now);
  const todayK = L.logicalKey(nowD, S.dayStart);
  const [foodK, setFoodK] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [cel, setCel] = useState(null);
  const [burst, setBurst] = useState(null);
  const tRef = useRef(), cRef = useRef();

  const say = (msg, opts = {}) => {
    setToast({ msg, undo: opts.undo || null, id: Date.now() });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), opts.undo ? 5000 : 2800);
  };
  const celebrate = (kind) => {
    if (!kind) return;
    const big = kind === "all";
    setBurst({ id: Date.now(), big, x: "50%", y: big ? "34%" : "30%" });
    const txt = { kcal: ["🔥", "Objectif calories atteint"], prot: ["🥩", "Protéines au complet"], sleep: ["🌙", "Nuit complète"], all: ["🎯", "Dans le mille"], workout: ["💪", "Séance dans la boîte"] }[kind];
    setCel({ ic: txt[0], t: txt[1], big, id: Date.now() });
    buzz(big ? 30 : 15);
    clearTimeout(cRef.current);
    cRef.current = setTimeout(() => setCel(null), big ? 3200 : 2400);
  };
  const ctx = {
    S, todayK, now, say, celebrate, sub,
    open: (s) => setSheet(s),
    close: () => setSheet(null),
    go: (t, k, sb) => { setTab(t); setSub(sb || null); setFoodK(k && k !== todayK ? k : null); window.scrollTo({ top: 0 }); },
  };

  // Célébrations : une seule fois par objectif et par jour
  useEffect(() => {
    const R = L.rings(L.getDay(todayK), S);
    const done = L.store.get("cel:" + todayK, {});
    const fresh = ["kcal", "prot", "sleep"].filter((x) => R[x] >= 1 && !done[x]);
    const all = R.kcal >= 1 && R.prot >= 1 && R.sleep >= 1 && !done.all;
    if (!fresh.length && !all) return;
    const nd = { ...done };
    fresh.forEach((x) => { nd[x] = true; });
    if (all) nd.all = true;
    try { localStorage.setItem("t2:cel:" + todayK, JSON.stringify(nd)); } catch {}
    celebrate(all ? "all" : fresh.includes("kcal") ? "kcal" : fresh[0]);
  });

  const update = useUpdateCheck();
  const viewK = foodK && foodK < todayK ? foodK : todayK;
  const h = nowD.getHours();
  const streak = L.kcalStreak(todayK, S);

  return (
    <div className={"app amb-" + ambient(h)}>
      <div className="ambient" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /></div>
      <header className={"top" + (tab === "home" ? " home" : "")}>
        <div>
          {tab === "home" ? <div className="brand"><span className="brand-dot" />Isma Daily</div> : <h1 className="top-t">{TITLES[tab]}</h1>}
          {tab !== "home" && <div className="top-d">{L.cap(L.fmtDay(todayK))}</div>}
        </div>
        <div className="top-r">
          {streak > 0 && <span className="streak" title="Jours d'affilée à 90 % de ton objectif calories">🔥 {streak}</span>}
          <button className="round-btn" onClick={() => setSheet({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={20} /></button>
          <button className="round-btn" onClick={() => setSheet({ type: "settings" })} aria-label="Réglages"><Icon n="sliders" size={20} /></button>
        </div>
      </header>

      <main key={tab + (sub || "")} className="main">
        {tab === "home" && <Home ctx={ctx} />}
        {tab === "food" && <Food ctx={ctx} k={viewK} setK={(k) => setFoodK(k >= todayK ? null : k)} />}
        {tab === "sport" && <Sport ctx={ctx} />}
        {tab === "progress" && <Progress ctx={ctx} />}
      </main>

      <nav className="nav" aria-label="Navigation">
        <div className="nav-in">
          <NavBtn id="home" icon="home" label="Accueil" tab={tab} go={ctx.go} />
          <NavBtn id="food" icon="bowl" label="Manger" tab={tab} go={ctx.go} />
          <button className="fab" onClick={() => setSheet({ type: "add", k: tab === "food" ? viewK : todayK })} aria-label="Ajouter un repas"><Icon n="plus" size={28} sw={2.4} /></button>
          <NavBtn id="sport" icon="dumbbell" label="Sport" tab={tab} go={ctx.go} />
          <NavBtn id="progress" icon="chart" label="Progrès" tab={tab} go={ctx.go} />
        </div>
      </nav>

      {update && !sheet && (
        <div className="update-bar" role="status">
          <span>Nouvelle version disponible</span>
          <button onClick={installUpdate}>Mettre à jour</button>
        </div>
      )}
      {sheet && <SheetRouter sheet={sheet} ctx={ctx} />}

      {cel && <div key={cel.id} className={"cel" + (cel.big ? " big" : "")} role="status"><span className="cel-ic">{cel.ic}</span><span>{cel.t}</span></div>}
      <Confetti burst={burst} />
      {toast && (
        <div key={toast.id} className={"toast" + (sheet ? " top" : "")} role="status">
          <span>{toast.msg}</span>
          {toast.undo && <button className="toast-undo" onClick={() => { toast.undo(); setToast(null); say("Annulé"); }}>Annuler</button>}
        </div>
      )}
    </div>
  );
}

function NavBtn({ id, icon, label, tab, go }) {
  const on = tab === id;
  return (
    <button className={"nb" + (on ? " on" : "")} onClick={() => go(id)} aria-current={on ? "page" : undefined}>
      <Icon n={icon} size={23} sw={on ? 2.1 : 1.7} />
      <span>{label}</span>
    </button>
  );
}

function SheetRouter({ sheet, ctx }) {
  switch (sheet.type) {
    case "add": return <AddFood ctx={ctx} k={sheet.k || ctx.todayK} mode={sheet.mode} entryId={sheet.entryId} />;
    case "foods": return <Foods ctx={ctx} />;
    case "sleep": return <SleepEdit ctx={ctx} k={sheet.k} />;
    case "hevy": return <HevyImport ctx={ctx} />;
    case "program": return <ProgramEdit ctx={ctx} day={sheet.day} />;
    case "coach": return <Coach ctx={ctx} ask={sheet.ask} />;
    case "settings": return <Settings ctx={ctx} />;
    default: return null;
  }
}

L.migrateAndSeed();
createRoot(document.getElementById("root")).render(<App />);
