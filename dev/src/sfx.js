// ─────────────────────────────────────────────────────────────
// Bruitages de jeu, synthétisés (aucun fichier son à charger).
// Sur iPhone, ils restent muets quand le téléphone est en silencieux.
// ─────────────────────────────────────────────────────────────
import * as L from "./lib.js";

let ac = null;
const enabled = () => L.getSettings().sfx !== false;
function ctx() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
  } catch { ac = null; }
  return ac;
}
// iOS : le son ne s'active qu'après un premier appui
if (typeof document !== "undefined") {
  const unlock = () => { if (enabled()) ctx(); document.removeEventListener("touchend", unlock); document.removeEventListener("click", unlock); };
  document.addEventListener("touchend", unlock, { passive: true });
  document.addEventListener("click", unlock);
}

function tone(f, at, dur, { type = "sine", vol = 0.1, to = null, attack = 0.01 } = {}) {
  const a = ac;
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(at, dur, vol = 0.08) {
  const a = ac;
  if (!a) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = 900;
  s.buffer = buf; g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(t);
}
const play = (fn) => { if (!enabled()) return; if (!ctx()) return; try { fn(); } catch {} };

export const sfx = {
  gold: () => play(() => { tone(1318, 0, 0.12, { type: "triangle", vol: 0.09 }); tone(1760, 0.07, 0.22, { type: "triangle", vol: 0.08 }); }),
  tick: () => play(() => tone(880, 0, 0.08, { type: "triangle", vol: 0.05 })),
  item: () => play(() => { tone(523, 0, 0.12, { type: "triangle", vol: 0.07 }); tone(784, 0.06, 0.18, { type: "triangle", vol: 0.07 }); }),
  kill: (n = 1) => play(() => {
    noise(0, 0.25, 0.09);
    tone(110, 0, 0.35, { type: "sawtooth", vol: 0.05, to: 70 });
    const base = [392, 440, 494, 523, 587][Math.min(4, n - 1)];
    [1, 1.25, 1.5].forEach((m, i) => tone(base * m, 0.08 + i * 0.07, 0.5 + (n === 5 ? 0.6 : 0), { type: "triangle", vol: 0.06 }));
    if (n === 5) [2, 2.5, 3].forEach((m, i) => tone(base * m, 0.45 + i * 0.09, 0.8, { type: "sine", vol: 0.05 }));
  }),
  level: () => play(() => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.4, { type: "triangle", vol: 0.07 }))),
  ach: () => play(() => { tone(988, 0, 0.5, { vol: 0.07 }); tone(1319, 0.1, 0.6, { vol: 0.06 }); tone(1976, 0.2, 0.7, { vol: 0.04 }); }),
  boss: () => play(() => { noise(0, 0.5, 0.12); tone(82, 0, 0.8, { type: "sawtooth", vol: 0.06, to: 41 }); tone(330, 0.3, 0.9, { type: "triangle", vol: 0.06 }); }),
  promo: () => play(() => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.6, { type: "triangle", vol: 0.065 }))),
  recall: () => play(() => { tone(220, 0, 1.2, { vol: 0.07, to: 880, attack: 0.3 }); tone(330, 0.2, 1, { vol: 0.04, to: 1320, attack: 0.3 }); }),
  respawn: () => play(() => { tone(523, 0, 0.3, { type: "triangle", vol: 0.07 }); tone(784, 0.1, 0.5, { type: "triangle", vol: 0.07 }); }),
};

/** Annonceur vocal (voix du téléphone), coupé par défaut */
export function announce(text) {
  try {
    if (!L.getSettings().voice || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; u.rate = 1.02; u.pitch = 0.75;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}
