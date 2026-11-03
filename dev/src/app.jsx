import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as L from "./lib.js";
import * as G from "./game.js";
import { PATCH } from "./content.js";
import { sfx, announce } from "./sfx.js";
import { Icon, Confetti, buzz } from "./ui.jsx";
import { Home, Hud, greeting } from "./home.jsx";
import { Food, AddFood, Foods } from "./food.jsx";
import { Sport, HevyImport, ProgramEdit } from "./sport.jsx";
import { Profile } from "./progress.jsx";
import { SleepEdit, Coach, Settings } from "./sheets.jsx";
import { PosturePlayer } from "./posture.jsx";
import { ItemSheet, CodexSheet, PatchSheet, BossSheet } from "./gamesheets.jsx";
import { Announcer, Emblem, BossArt } from "./hud.jsx";
import { LoadingScreen, EndGame, Welcome } from "./overlays.jsx";

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

const TITLES = { home: "Base", food: "Farm", sport: "Arène", profile: "Profil" };
const rawGet = (k, fb) => { try { const s = localStorage.getItem("t2:" + k); return s == null ? fb : JSON.parse(s); } catch { return fb; } };
const rawSet = (k, v) => { try { localStorage.setItem("t2:" + k, JSON.stringify(v)); } catch {} };

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
  const [burst, setBurst] = useState(null);
  const [ann, setAnn] = useState(null);
  const [endK, setEndK] = useState(null);
  const [match, setMatch] = useState(null);
  const firstRun = useRef(!rawGet("seen", null));
  const [welcome, setWelcome] = useState(firstRun.current);
  const [loading, setLoading] = useState(() => !firstRun.current && S.loading !== false && rawGet("loadSeen", null) !== todayK && !L.store.get("night", null));
  const q = useRef([]), aRef = useRef(null), tRef = useRef();

  const say = (msg, opts = {}) => {
    setToast({ msg, undo: opts.undo || null, id: Date.now() });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), opts.undo ? 5000 : 2800);
  };
  // ── File d'annonces : une à la fois
  const pump = () => {
    if (aRef.current || !q.current.length) return;
    const a = q.current.shift();
    aRef.current = a;
    setAnn(a);
    a.sound && a.sound();
    if (a.voice) announce(a.voice);
    if (a.confetti) setBurst({ id: Date.now(), big: !!a.big, x: "50%", y: "30%" });
    buzz(a.big ? 30 : 15);
    setTimeout(() => { aRef.current = null; setAnn(null); setTimeout(pump, 260); }, a.big ? 2700 : 2000);
  };
  const push = (a) => { q.current.push({ id: Date.now() + Math.random(), ...a }); pump(); };
  const celebrate = (kind) => {
    if (kind === "workout") push({ t: "Sort lancé", s: "Séance enregistrée, charges mises à jour", tone: "blue", sound: sfx.item });
    else if (kind === "posture") push({ t: "Dos droit", s: "Routine posture faite", tone: "green", sound: sfx.item });
  };
  const ctx = {
    S, todayK, now, say, celebrate, sub, push,
    open: (s) => (s.type === "match" ? setMatch(s.k) : setSheet(s)),
    close: () => setSheet(null),
    go: (t, k, sb) => { setSheet(null); setTab(t); setSub(sb || null); setFoodK(k && k !== todayK ? k : null); window.scrollTo({ top: 0 }); },
    afterRecall: (k) => { sfx.recall(); setEndK(k); },
    afterWake: (h) => push({ t: "Réapparition", s: h != null ? `${L.fH(h)} de sommeil, PV ${h >= S.sleep ? "au max" : "rechargés"}` : "Bonne partie", tone: "blue", sound: sfx.respawn }),
  };

  // ── Ce qui mérite une annonce : kills du jour, niveau, promotion, boss, succès
  useEffect(() => {
    if (welcome) return;
    const di = G.dayInfo(todayK);
    const acc = G.account(todayK);
    const rk = G.rank();
    const b = G.boss(todayK);
    const unlocked = G.achievements(todayK).filter((a) => a.at);
    const seen = rawGet("seen", null);
    const ids = G.KILLS.filter((k) => di.kill[k.id]).map((k) => k.id);
    if (!seen) {
      rawSet("seen", { v: 1, ach: unlocked.map((a) => a.id), lvl: acc.level, step: rk ? rk.cur.step : -1, boss: b.dead ? b.ws : null, patch: PATCH.v });
      rawSet("ann:" + todayK, { ids });
      return;
    }
    const prev = rawGet("ann:" + todayK, { ids: [] });
    const fresh = ids.filter((x) => !(prev.ids || []).includes(x));
    if (fresh.length) {
      const n = ids.length;
      push({ t: G.KILL_NAMES[n], s: fresh.map((x) => G.KILLS.find((k) => k.id === x).sub).join(", ") + (n === 5 ? " : journée parfaite" : ""), tone: n === 5 ? "gold" : "red", big: n === 5, confetti: n === 5, sound: () => sfx.kill(n), voice: G.KILL_NAMES[n] });
    }
    if (fresh.length || ids.length !== (prev.ids || []).length) rawSet("ann:" + todayK, { ids });
    const ns = { ...seen };
    let dirty = false;
    if (acc.level > (seen.lvl || 0)) {
      const skin = G.SKINS.find((s) => s.req?.lvl && s.req.lvl > (seen.lvl || 0) && s.req.lvl <= acc.level);
      push({ t: `Niveau ${acc.level}`, s: skin ? `Skin débloqué : ${skin.n}` : "Niveau de compte", tone: "blue", sound: sfx.level });
      ns.lvl = acc.level; dirty = true;
    } else if (acc.level < (seen.lvl || 0)) { ns.lvl = acc.level; dirty = true; }
    if (rk && rk.cur.step !== seen.step) {
      if (rk.cur.step > seen.step && seen.step >= 0) {
        const newTier = G.stepTier(rk.cur.step) > G.stepTier(seen.step);
        push({ t: newTier ? "Nouveau palier" : "Promotion", s: rk.cur.name, tone: "gold", big: newTier, confetti: true, art: <Emblem tier={rk.cur.tier} size={newTier ? 110 : 80} />, sound: sfx.promo, voice: newTier ? "Nouveau palier" : "Promotion" });
      }
      ns.step = rk.cur.step; dirty = true;
    }
    if (b.dead && seen.boss !== b.ws) {
      push({ t: "Boss vaincu", s: b.n, tone: "red", big: true, confetti: true, art: <BossArt id={b.id} size={90} dead />, sound: sfx.boss, voice: "Boss vaincu" });
      ns.boss = b.ws; dirty = true;
    }
    const newAch = unlocked.filter((a) => !(seen.ach || []).includes(a.id));
    if (newAch.length) {
      newAch.slice(0, 3).forEach((a) => push({ t: a.n, kicker: "Succès", s: `Succès débloqué, +${a.xp} XP`, tone: "cyan", sound: sfx.ach }));
      ns.ach = [...new Set([...(seen.ach || []), ...newAch.map((a) => a.id)])]; dirty = true;
    }
    if (dirty) rawSet("seen", ns);
  });

  const update = useUpdateCheck();
  const viewK = foodK && foodK < todayK ? foodK : todayK;
  const skin = G.SKINS.find((s) => s.id === S.skin) || G.SKINS[0];
  const skinOk = G.skinOk(skin, G.account(todayK), G.rank());
  const night = L.store.get("night", null);

  return (
    <div className={"app skin-" + (skinOk ? skin.id : "hextech") + (tab === "home" ? " on-home" : "")}>
      <div className="ambient" aria-hidden="true" />
      <header className={"top" + (tab === "home" ? " home" : "")}>
        {tab === "home" ? <Hud ctx={ctx} /> : (
          <>
            <div>
              <h1 className="top-t">{TITLES[tab]}</h1>
              <div className="top-d">{L.cap(L.fmtDay(todayK))}</div>
            </div>
            <div className="top-r">
              <button className="round-btn" onClick={() => setSheet({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={19} /></button>
              <button className="round-btn" onClick={() => setSheet({ type: "settings" })} aria-label="Runes et réglages"><Icon n="rune" size={20} /></button>
            </div>
          </>
        )}
        <span className="sr-only">{greeting(nowD, night)}</span>
      </header>

      <main key={tab + (sub || "")} className="main">
        {tab === "home" && <Home ctx={ctx} />}
        {tab === "food" && <Food ctx={ctx} k={viewK} setK={(k) => setFoodK(k >= todayK ? null : k)} />}
        {tab === "sport" && <Sport ctx={ctx} />}
        {tab === "profile" && <Profile ctx={ctx} />}
      </main>

      <nav className="nav" aria-label="Navigation">
        <div className="nav-in">
          <NavBtn id="home" icon="home" label="Base" tab={tab} go={ctx.go} />
          <NavBtn id="food" icon="coin" label="Farm" tab={tab} go={ctx.go} />
          <button className="fab" onClick={() => setSheet({ type: "add", k: tab === "food" ? viewK : todayK })} aria-label="Ajouter un repas"><span className="fab-in"><Icon n="plus" size={26} sw={2.4} /></span></button>
          <NavBtn id="sport" icon="swords" label="Arène" tab={tab} go={ctx.go} />
          <NavBtn id="profile" icon="crown" label="Profil" tab={tab} go={ctx.go} />
        </div>
      </nav>

      {update && !sheet && (
        <div className="update-bar" role="status">
          <span>Nouveau patch disponible</span>
          <button onClick={installUpdate}>Mettre à jour</button>
        </div>
      )}
      {sheet && <SheetRouter sheet={sheet} ctx={ctx} />}
      {match && <EndGame ctx={ctx} k={match} onClose={() => setMatch(null)} />}
      {endK && <EndGame ctx={ctx} k={endK} live onClose={() => setEndK(null)} />}
      {loading && !welcome && <LoadingScreen ctx={ctx} onDone={() => { rawSet("loadSeen", todayK); setLoading(false); }} />}
      {welcome && <Welcome ctx={ctx} onClose={() => { rawSet("loadSeen", todayK); setWelcome(false); }} onPatch={() => { rawSet("loadSeen", todayK); setWelcome(false); setSheet({ type: "patch" }); }} />}

      <Announcer a={ann} />
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
      <Icon n={icon} size={22} sw={on ? 2.1 : 1.7} />
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
    case "posture": return <PosturePlayer ctx={ctx} />;
    case "item": return <ItemSheet ctx={ctx} id={sheet.id} />;
    case "codex": return <CodexSheet ctx={ctx} focus={sheet.focus} />;
    case "patch": return <PatchSheet ctx={ctx} />;
    case "boss": return <BossSheet ctx={ctx} />;
    default: return null;
  }
}

L.migrateAndSeed();
createRoot(document.getElementById("root")).render(<App />);
