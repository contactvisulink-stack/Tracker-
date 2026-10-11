import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";
import { Sheet, Icon, buzz } from "./ui.jsx";

// ═════════════════════════════════════════════════════════════
// Routine posture : 5 exercices d'une minute, à la maison, sans matériel
// Pour les épaules qui partent en avant et la tête en avant.
// ═════════════════════════════════════════════════════════════
export const POSTURE = [
  {
    id: "chin", name: "Rentrées de menton", sec: 60,
    why: "Ramène ta tête au-dessus de tes épaules.",
    cues: ["Debout dos au mur, ou assis bien droit.", "Recule la tête comme pour faire un double menton. Le regard reste droit devant.", "Tiens 3 secondes, relâche, recommence."],
  },
  {
    id: "door", name: "Étirement à la porte", sec: 60,
    why: "Détend les pecs qui tirent tes épaules vers l'avant.",
    cues: ["Avant-bras sur les montants d'une porte, coudes à hauteur des épaules.", "Avance doucement un pied jusqu'à sentir la poitrine s'étirer.", "Respire lentement. Ça tire un peu, ça ne fait pas mal."],
  },
  {
    id: "angel", name: "Anges au mur", sec: 60,
    why: "Réveille le haut du dos et ouvre les épaules.",
    cues: ["Dos, tête et fesses collés au mur, bras en W.", "Monte lentement les bras en Y, coudes et poignets contre le mur.", "Redescends en W sans cambrer le bas du dos."],
  },
  {
    id: "yt", name: "Y-T au sol", sec: 60,
    why: "Muscle le bas des trapèzes, qui tiennent tes épaules en arrière.",
    cues: ["À plat ventre, le front sur une serviette.", "Bras en Y, pouces vers le haut : décolle-les en serrant les omoplates, 2 secondes en haut.", "Alterne avec les bras en T, sur les côtés."],
  },
  {
    id: "book", name: "Livre ouvert", sec: 60, sides: true,
    why: "Redonne de la mobilité au haut du dos.",
    cues: ["Allongé sur le côté, genoux pliés, bras tendus devant toi.", "Ouvre le bras du dessus vers l'arrière en le suivant des yeux.", "Reviens lentement. Change de côté à mi-temps."],
  },
];
const PREP = 5; // secondes pour se mettre en place

/** Pictogrammes en traits néon */
export function Picto({ id, size = 120 }) {
  const g = { fill: "none", stroke: "currentColor", strokeWidth: 3.4, strokeLinecap: "round", strokeLinejoin: "round" };
  const ghost = { ...g, strokeOpacity: 0.35, strokeDasharray: "3 6" };
  const wall = { fill: "none", stroke: "currentColor", strokeOpacity: 0.22, strokeWidth: 2 };
  const P = {
    chin: (
      <>
        <line x1="44" y1="8" x2="44" y2="116" {...wall} />
        <path d="M60 116 V68" {...g} />
        <path d="M60 72 L72 98" {...g} />
        <path d="M60 68 L62 56" {...g} />
        <circle cx="80" cy="42" r="13" {...ghost} />
        <circle cx="63" cy="41" r="13" {...g} />
        <path d="M114 42 H96 M102 35 L95 42 L102 49" {...g} strokeWidth="3" />
      </>
    ),
    door: (
      <>
        <path d="M30 116 V10 H130 V116" {...wall} />
        <circle cx="80" cy="34" r="11" {...g} />
        <path d="M80 46 V88" {...g} />
        <path d="M80 55 H38 V30 M80 55 H122 V30" {...g} />
        <path d="M80 88 L70 116 M80 88 L94 114" {...g} />
        <path d="M80 66 l0 0" {...g} strokeWidth="7" strokeOpacity=".5" />
      </>
    ),
    angel: (
      <>
        <rect x="36" y="4" width="88" height="112" rx="8" fill="currentColor" fillOpacity=".06" stroke="none" />
        <circle cx="80" cy="30" r="10" {...g} />
        <path d="M80 41 V82" {...g} />
        <path d="M80 52 H62 L58 34 M80 52 H98 L102 34" {...ghost} />
        <path d="M80 51 L58 16 M80 51 L102 16" {...g} />
        <path d="M80 82 L71 114 M80 82 L89 114" {...g} />
      </>
    ),
    yt: (
      <>
        <line x1="6" y1="106" x2="154" y2="106" {...wall} />
        <circle cx="42" cy="90" r="9" {...g} />
        <path d="M52 96 L106 99 L152 101" {...g} />
        <path d="M58 98 L22 101" {...ghost} />
        <path d="M58 95 L22 70" {...g} />
        <path d="M14 94 Q6 82 14 72 M10 79 L14 72 L20 77" {...g} strokeWidth="2.6" />
      </>
    ),
    book: (
      <>
        <circle cx="38" cy="60" r="10" {...g} />
        <path d="M48 60 H100" {...g} />
        <path d="M100 60 L114 86 H140" {...g} />
        <path d="M56 60 L58 98" {...ghost} />
        <path d="M56 60 L54 22" {...g} />
        <path d="M58 100 A40 40 0 0 1 52 20" {...ghost} />
        <path d="M46 26 L54 20 L58 29" {...g} strokeWidth="2.6" />
      </>
    ),
  };
  return <svg className="picto" width={size} height={size * 0.75} viewBox="0 0 160 120" aria-hidden="true">{P[id]}</svg>;
}

// ─────────────────────────────────────────────────────────────
// La section « Posture » de l'onglet Sport
// ─────────────────────────────────────────────────────────────
export function PostureSection({ ctx }) {
  const d = L.getDay(ctx.todayK);
  const done = !!d.h.posture;
  const st = L.ritualStreak("posture", ctx.todayK, ctx.S);
  const [open, setOpen] = useState(null);
  return (
    <>
      <section className="pz-hero">
        <div className="pz-glow" aria-hidden="true" />
        <h2 className="pz-t">Routine posture</h2>
        <p className="pz-p">Cinq exercices d'une minute, chez toi, sans matériel. Pour remettre les épaules en arrière et la tête au-dessus du corps.</p>
        <div className="pz-meta">
          <span><b>5</b> min</span>
          {st > 0 ? <span><b>{st}</b> {st > 1 ? "jours d'affilée" : "jour d'affilée"}</span> : <span>Commence ta série</span>}
          {done && <span className="ok"><Icon n="check" size={14} sw={3} /> Faite aujourd'hui</span>}
        </div>
        <button className="cta neon full" onClick={() => ctx.open({ type: "posture" })}><Icon n="play" size={18} sw={2.2} /> {done ? "La refaire" : "Lancer la routine"}</button>
      </section>
      <div className="pz-list">
        {POSTURE.map((x, i) => (
          <div key={x.id} className={"pz-ex" + (open === x.id ? " open" : "")}>
            <button className="pz-ex-h" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
              <span className="pz-pic"><Picto id={x.id} size={84} /></span>
              <span className="pz-main">
                <span className="pz-n">{i + 1}. {x.name}</span>
                <span className="pz-d">{x.sides ? "1 min, 30 s par côté" : "1 min"}</span>
                <span className="pz-w">{x.why}</span>
              </span>
              <Icon n="chevron" size={18} />
            </button>
            {open === x.id && <ul className="cues pz-cues">{x.cues.map((c, j) => <li key={j}>{c}</li>)}</ul>}
          </div>
        ))}
      </div>
      <p className="hint">Le mieux : tous les jours, par exemple en rentrant ou avant de dormir. Les effets se voient au bout de quelques semaines, en même temps que le tirage vers le visage et les rentrées de menton de tes séances.</p>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Le lecteur guidé : préparation 5 s, puis 60 s par exercice
// ─────────────────────────────────────────────────────────────
let audio = null;
const beep = (n = 1, f = 880) => {
  try {
    if (!audio) return;
    for (let i = 0; i < n; i++) {
      const t = audio.currentTime + i * 0.2;
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.18);
    }
  } catch {}
};

export function PosturePlayer({ ctx }) {
  const k = ctx.todayK;
  // tout l'état du minuteur vit dans une ref : le décompte ne dépend jamais d'un affichage en retard
  const st = useRef({ ph: "intro", i: 0, endAt: null, left: null, half: false, last: null });
  const [, render] = useState(0);
  const rr = () => render((x) => x + 1);
  const wake = useRef(null);
  const { ph, i } = st.current;
  const ex = POSTURE[i];
  const durOf = (phase, idx) => (phase === "prep" ? PREP : POSTURE[idx].sec) * 1000;
  const dur = durOf(ph === "prep" ? "prep" : "work", i);
  const paused = st.current.endAt == null && st.current.left != null;
  const rem = st.current.endAt != null ? Math.max(0, st.current.endAt - Date.now()) : st.current.left ?? dur;
  const secs = Math.ceil(rem / 1000);

  const lockScreen = async () => { try { wake.current = await navigator.wakeLock?.request("screen"); } catch {} };
  const unlockScreen = () => { try { wake.current?.release(); } catch {} wake.current = null; };
  const startPhase = (phase, idx) => { st.current = { ph: phase, i: idx, endAt: Date.now() + durOf(phase, idx), left: null, half: false, last: null }; rr(); };
  const finish = () => {
    st.current = { ...st.current, ph: "end", endAt: null, left: null };
    rr();
    unlockScreen();
    beep(3, 1046); buzz(30);
    if (!L.getDay(k).h.posture) {
      const undo = L.snapDay(k);
      L.updDay(k, (dd) => ({ ...dd, h: { ...dd.h, posture: true } }));
      ctx.celebrate("posture");
      ctx.say("Posture cochée pour aujourd'hui", { undo });
    }
  };
  const advance = () => {
    const c = st.current;
    if (c.ph === "prep") { beep(1, 1046); startPhase("work", c.i); }
    else if (c.ph === "work" && c.i < POSTURE.length - 1) { beep(2, 660); startPhase("prep", c.i + 1); }
    else if (c.ph === "work") finish();
  };
  useEffect(() => {
    const iv = setInterval(() => {
      const c = st.current;
      if (!(c.ph === "prep" || c.ph === "work") || c.endAt == null) return;
      const r = c.endAt - Date.now();
      const x = POSTURE[c.i];
      if (c.ph === "work" && x.sides && !c.half && r <= (x.sec * 1000) / 2) { c.half = true; beep(2, 740); buzz(20); }
      const s = Math.ceil(r / 1000);
      if (s <= 3 && s >= 1 && c.last !== s) { c.last = s; beep(1, 600); }
      if (r <= 0) { advance(); return; }
      rr();
    }, 150);
    const vis = () => { const c = st.current; if (document.visibilityState === "visible" && (c.ph === "prep" || c.ph === "work") && c.endAt != null) lockScreen(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); unlockScreen(); };
  }, []);

  const start = () => {
    try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {}
    lockScreen(); buzz(10);
    startPhase("prep", 0);
  };
  const togglePause = () => {
    const c = st.current;
    if (c.endAt != null) { st.current = { ...c, left: Math.max(0, c.endAt - Date.now()), endAt: null }; unlockScreen(); }
    else { st.current = { ...c, endAt: Date.now() + (c.left ?? 0), left: null }; lockScreen(); }
    rr();
  };
  const back = () => startPhase("prep", Math.max(0, ph === "work" && rem < dur - 3000 ? i : i - 1));

  const R = 104, C = 2 * Math.PI * R;
  const frac = 1 - rem / dur;
  const side = ex.sides && ph === "work" ? (rem <= (ex.sec * 1000) / 2 ? 2 : 1) : null;
  return (
    <Sheet title="Routine posture" onClose={ctx.close} tall>
      {ph === "intro" && (
        <div className="pp-intro">
          <p className="muted mb10">5 exercices, 1 minute chacun, avec 5 secondes pour te mettre en place entre deux. Pose ton téléphone à côté de toi : l'écran reste allumé et un bip t'annonce chaque changement.</p>
          <div className="pp-steps">
            {POSTURE.map((x, j) => (
              <div key={x.id} className="pp-step">
                <span className="pp-pic"><Picto id={x.id} size={64} /></span>
                <span className="pp-tx"><b>{j + 1}. {x.name}</b><span>{x.sides ? "30 s par côté" : "1 min"}</span></span>
              </div>
            ))}
          </div>
          <button className="cta neon full mt14" onClick={start}><Icon n="play" size={18} sw={2.2} /> C'est parti</button>
        </div>
      )}

      {(ph === "prep" || ph === "work") && (
        <div className={"pp-run" + (ph === "prep" ? " prep" : "") + (paused ? " paused" : "")}>
          <div className="pp-bars" aria-hidden="true">
            {POSTURE.map((x, j) => <i key={x.id}><b style={{ width: `${j < i ? 100 : j > i ? 0 : ph === "prep" ? 0 : frac * 100}%` }} /></i>)}
          </div>
          <div className="pp-k">{ph === "prep" ? "Prépare-toi" : `Exercice ${i + 1} sur ${POSTURE.length}`}{side && <span className="pp-side">Côté {side}</span>}</div>
          <h3 className="pp-n">{ex.name}</h3>
          <div className="pp-ring">
            <svg viewBox="0 0 240 240" aria-hidden="true">
              <circle cx="120" cy="120" r={R} className="pp-track" />
              <circle cx="120" cy="120" r={R} className="pp-arc glow" strokeDasharray={C} strokeDashoffset={C * frac} transform="rotate(-90 120 120)" />
              <circle cx="120" cy="120" r={R} className="pp-arc" strokeDasharray={C} strokeDashoffset={C * frac} transform="rotate(-90 120 120)" />
            </svg>
            <div className="pp-mid"><Picto id={ex.id} size={150} /></div>
          </div>
          <div className="pp-sec" role="timer" aria-live="off">{secs}<small> s</small></div>
          {side === 2 && rem > (ex.sec * 1000) / 2 - 2500 && <div className="pp-flash">Change de côté</div>}
          <ul className="cues pp-cues">{ex.cues.map((c, j) => <li key={j}>{c}</li>)}</ul>
          <div className="pp-ctrl">
            <button className="round-btn lg" onClick={back} aria-label="Exercice précédent"><Icon n="undo" size={20} /></button>
            <button className="pp-play" onClick={togglePause} aria-label={paused ? "Reprendre" : "Pause"}>{paused ? <Icon n="play" size={26} sw={2.2} /> : <span className="pp-pause" />}</button>
            <button className="round-btn lg" onClick={advance} aria-label="Passer"><Icon n="right" size={22} sw={2.2} /></button>
          </div>
        </div>
      )}

      {ph === "end" && (
        <div className="pp-end">
          <div className="pp-badge"><Icon n="check" size={44} sw={3} /></div>
          <h3>Routine terminée</h3>
          <p className="muted">Posture cochée pour aujourd'hui. {L.ritualStreak("posture", k, ctx.S) > 1 ? `${L.ritualStreak("posture", k, ctx.S)} jours d'affilée, continue.` : "Refais-la demain pour lancer ta série."}</p>
          <button className="cta neon full mt14" onClick={ctx.close}>Fermer</button>
        </div>
      )}
    </Sheet>
  );
}
