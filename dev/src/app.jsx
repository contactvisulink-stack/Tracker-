import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as L from "./lib.js";
import { Icon } from "./ui.jsx";
import { Status } from "./status.jsx";
import { Fuel, AddFood, Foods } from "./fuel.jsx";
import { Sport, HevyImport, ProgramEdit } from "./train.jsx";
import { Lab } from "./lab.jsx";
import { ConsoleSheet } from "./console.jsx";
import { SleepEdit, Coach, Settings } from "./sheets.jsx";
import { PosturePlayer } from "./posture.jsx";

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

const TABS = [["status", "home", "Aujourd'hui"], ["fuel", "fork", "Repas"], ["sport", "dumbbell", "Sport"], ["lab", "chart", "Analyse"]];

function App() {
  const [, setRev] = useState(0);
  useEffect(() => L.store.subscribe(() => setRev((r) => r + 1)), []);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState("status");
  const [sub, setSub] = useState(null);
  useEffect(() => {
    const upd = () => setNow(Date.now());
    const iv = setInterval(upd, 30000);
    document.addEventListener("visibilitychange", upd);
    window.addEventListener("focus", upd);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", upd); window.removeEventListener("focus", upd); };
  }, []);

  const S = L.getSettings();
  const todayK = L.logicalKey(new Date(now), S.dayStart);
  const [foodK, setFoodK] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const tRef = useRef();
  const say = (msg, opts = {}) => {
    setToast({ msg, undo: opts.undo || null, id: Date.now() });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), opts.undo ? 5000 : 2800);
  };
  const ctx = {
    S, todayK, now, say, sub,
    open: (s) => setSheet(s),
    close: () => setSheet(null),
    console: (init = "", k) => setSheet({ type: "console", init, k }),
    go: (t, k, sb) => { setSheet(null); setTab(t); setSub(sb || null); setFoodK(k && k !== todayK ? k : null); window.scrollTo({ top: 0 }); },
  };
  const update = useUpdateCheck();
  const viewK = foodK && foodK < todayK ? foodK : todayK;

  return (
    <div className={"app tab-" + tab}>
      <main key={tab + (sub || "")} className="main">
        {tab === "status" && <Status ctx={ctx} />}
        {tab === "fuel" && <Fuel ctx={ctx} k={viewK} setK={(k) => setFoodK(k >= todayK ? null : k)} />}
        {tab === "sport" && <Sport ctx={ctx} />}
        {tab === "lab" && <Lab ctx={ctx} />}
      </main>

      <nav className="tabbar" aria-label="Navigation">
        {TABS.map(([id, ic, label]) => (
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => ctx.go(id)} aria-current={tab === id ? "page" : undefined}>
            <Icon n={ic} size={21} sw={tab === id ? 2.1 : 1.7} />
            <span>{label}</span>
          </button>
        ))}
        <button className="fab" onClick={() => ctx.console("", tab === "fuel" ? viewK : todayK)} aria-label="Noter quelque chose : repas, eau, créatine, poids, nuit">
          <Icon n="plus" size={24} sw={2.6} />
        </button>
      </nav>

      {update && !sheet && (
        <div className="update-bar" role="status">
          <span>Nouvelle version disponible</span>
          <button onClick={installUpdate}>Mettre à jour</button>
        </div>
      )}
      {sheet && <SheetRouter sheet={sheet} ctx={ctx} />}
      {toast && (
        <div key={toast.id} className={"toast" + (sheet ? " top" : "")} role="status">
          <span>{toast.msg}</span>
          {toast.undo && <button className="toast-undo" onClick={() => { toast.undo(); setToast(null); say("Annulé"); }}>Annuler</button>}
        </div>
      )}
    </div>
  );
}

function SheetRouter({ sheet, ctx }) {
  switch (sheet.type) {
    case "console": return <ConsoleSheet ctx={ctx} init={sheet.init} k={sheet.k} />;
    case "add": return <AddFood ctx={ctx} k={sheet.k || ctx.todayK} mode={sheet.mode} entryId={sheet.entryId} />;
    case "foods": return <Foods ctx={ctx} />;
    case "sleep": return <SleepEdit ctx={ctx} k={sheet.k} />;
    case "hevy": return <HevyImport ctx={ctx} />;
    case "program": return <ProgramEdit ctx={ctx} day={sheet.day} />;
    case "coach": return <Coach ctx={ctx} ask={sheet.ask} />;
    case "settings": return <Settings ctx={ctx} />;
    case "posture": return <PosturePlayer ctx={ctx} />;
    default: return null;
  }
}

L.migrateAndSeed();
createRoot(document.getElementById("root")).render(<App />);
