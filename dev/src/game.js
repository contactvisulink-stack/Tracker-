// ═════════════════════════════════════════════════════════════
// Le jeu. Tout est calculé à partir de tes vraies données
// (repas, nuits, pesées, séances, rituels) : rien n'est inventé,
// rien n'est stocké en double. Si tu corriges un repas, tes stacks,
// ton XP et ton rang se recalculent tout seuls.
// ═════════════════════════════════════════════════════════════
import * as L from "./lib.js";

const { addDays, daysBetween, keyToDate, clamp, fint, fH } = L;
const r01 = (x) => clamp(x || 0, 0, 1);

// ── Cache vidé à chaque écriture dans le stockage
let cRev = -1;
const C = new Map();
function memo(key, fn) {
  const r = L.rev();
  if (r !== cRev) { C.clear(); cRev = r; }
  if (C.has(key)) return C.get(key);
  const v = fn();
  C.set(key, v);
  return v;
}

export const todayKey = (S = L.getSettings()) => L.logicalKey(new Date(), S.dayStart);

/** Toutes tes journées. Une journée qui n'a pas changé n'est pas relue. */
const rawCache = new Map(); // k → { raw, d, h }
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const dayMap = () => memo("days", () => {
  const m = new Map(), keep = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("t2:day:")) continue;
      const k = key.slice(7), raw = localStorage.getItem(key) || "";
      let c = rawCache.get(k);
      if (!c || c.raw !== raw) { c = { raw, d: L.getDay(k), h: hashStr(raw) }; rawCache.set(k, c); }
      m.set(k, c.d); keep.add(k);
    }
  } catch {}
  rawCache.forEach((_, k) => { if (!keep.has(k)) rawCache.delete(k); });
  return m;
});
export const day = (k) => dayMap().get(k) || L.emptyDay();
const dayHash = (k) => { dayMap(); return rawCache.get(k)?.h ?? 0; };
const weights = () => memo("weights", () => L.getWeights());

const wkDays = () => memo("wkDays", () => {
  const S = L.getSettings(), m = new Map();
  L.getWorkouts().forEach((w) => {
    const k = L.logicalKey(new Date(w.date), S.dayStart);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(w);
  });
  return m;
});
export const workoutsOn = (k) => wkDays().get(k) || [];

/** Premier jour de ton historique (repas, nuit, pesée ou séance) */
export const firstKey = () => memo("first", () => {
  let f = null;
  const take = (k) => { if (k && (!f || k < f)) f = k; };
  dayMap().forEach((d, k) => { if (L.dayHasData(d)) take(k); });
  const wl = L.weightList();
  if (wl.length) take(wl[0][0]);
  wkDays().forEach((_, k) => take(k));
  return f;
});

// ═════════════════════════════════════════════════════════════
// Les 5 kills du jour, la note, l'XP et le niveau de la partie
// ═════════════════════════════════════════════════════════════
export const KILLS = [
  { id: "gold", n: "Gold", sub: "Calories", ic: "coin" },
  { id: "prot", n: "Protéines", sub: "Protéines", ic: "bolt" },
  { id: "sleep", n: "Sommeil", sub: "Sommeil", ic: "heart" },
  { id: "crea", n: "Créatine", sub: "Créatine", ic: "crystal" },
  { id: "train", n: "Séance", sub: "Séance ou posture", ic: "sword" },
];
export const KILL_NAMES = ["", "First blood", "Double kill", "Triple kill", "Quadra kill", "Pentakill"];

const diCache = new Map(); // k → { sig, v } : une journée inchangée garde son calcul
export function dayInfo(k) {
  return memo("di:" + k, () => {
    let sig = (localStorage.getItem("t2:settings") || "") + "|" + workoutsOn(k).map((w) => w.id + w.date).join(",") + "|" + (weights()[k] ?? "");
    for (let i = 0; i <= 7; i++) sig += "|" + dayHash(addDays(k, -i));
    const c = diCache.get(k);
    if (c && c.sig === sig) return c.v;
    const v = computeDay(k);
    diCache.set(k, { sig, v });
    return v;
  });
}
function computeDay(k) {
  {
    const S = L.getSettings();
    const d = day(k), t = L.dayTot(d), sh = L.daySleepH(d);
    const ws = workoutsOn(k);
    const meals = d.entries.length || d.legacy?.meals || 0;
    const kill = {
      gold: t.k >= S.kcal,
      prot: d.entries.length > 0 && t.p >= S.prot,
      sleep: sh != null && sh >= S.sleep,
      crea: L.creatineDone(d),
      train: ws.length > 0 || !!d.h.posture,
    };
    const kills = KILLS.filter((x) => kill[x.id]).length;
    const score = 0.35 * r01(t.k / S.kcal) + 0.2 * (d.entries.length ? r01(t.p / S.prot) : 0) + 0.2 * (sh != null ? r01(sh / S.sleep) : 0)
      + 0.1 * (kill.crea ? 1 : 0) + 0.15 * (ws.length ? 1 : d.h.posture ? 0.7 : 0);
    const grade = kills === 5 ? "S+" : score >= 0.9 ? "S" : score >= 0.78 ? "A" : score >= 0.62 ? "B" : score >= 0.45 ? "C" : "D";
    const rit = L.activeRituals(S).filter((r) => r.id !== "creatine" && r.id !== "posture");
    const xp = {
      gold: Math.round(500 * r01(t.k / S.kcal)) + (kill.gold ? 100 : 0),
      prot: d.entries.length ? Math.round(250 * r01(t.p / S.prot)) + (kill.prot ? 50 : 0) : 0,
      sleep: sh != null ? Math.round(250 * r01(sh / S.sleep)) + (kill.sleep ? 50 : 0) : 0,
      crea: kill.crea ? 100 : 0,
      train: ws.length ? 300 : d.h.posture ? 100 : 0,
      items: rit.filter((r) => L.ritualDone(r.id, d, S)).length * 50 + ((d.water || 0) >= S.water ? 50 : 0),
    };
    const q = quests(k);
    xp.quests = q.filter((x) => x.done).reduce((a, x) => a + x.xp, 0);
    const total = Object.values(xp).reduce((a, b) => a + b, 0);
    const level = Math.min(18, 1 + Math.floor(total / 100));
    const vision = Math.round(100 * ((sh != null ? 0.3 : 0) + Math.min(1, meals / 3) * 0.5 + (Object.values(d.h).some(Boolean) || d.water ? 0.2 : 0)));
    const has = L.dayHasData(d) || ws.length > 0;
    return { k, d, t, sh, ws, meals, kill, kills, score, grade, win: t.k >= S.kcal * 0.9, xp, total, level, lvlPct: level >= 18 ? 1 : (total % 100) / 100, vision, has };
  }
}

// ═════════════════════════════════════════════════════════════
// Quêtes du jour : 3 par jour, tirées au sort (toujours les mêmes pour une date)
// ═════════════════════════════════════════════════════════════
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const TRIVIAL = new Set(["creatine", "eau", "cafe"]);
const FRUITVEG = new Set(["banane", "mangue", "fruits_rouges", "pomme", "avocat", "legumes", "tomate", "salade"]);
const foodId = (it) => it.fid || "n:" + L.norm(it.name);

const QPOOL = [
  { id: "early", t: "Farm matinal", d: "Un repas noté avant 11 h", xp: 75, ok: (c) => c.d.entries.some((e) => L.dayMin(e.t) < L.dayMin("11:00")) },
  { id: "giant", t: "Vague géante", d: "Un repas de 900 kcal ou plus", xp: 100, ok: (c) => c.tots.some((x) => x.k >= 900) },
  { id: "protbomb", t: "Bombe de protéines", d: "Un repas avec 40 g de protéines", xp: 75, ok: (c) => c.tots.some((x) => x.p >= 40) },
  { id: "explorer", t: "Explorateur", d: "Un aliment que tu n'as pas mangé ces 7 derniers jours", xp: 100, ok: (c) => c.fresh },
  { id: "water", t: "Potions", d: "Ton objectif d'eau", xp: 50, ok: (c) => (c.d.water || 0) >= c.S.water },
  { id: "waves4", t: "Quatre vagues", d: "4 repas ou plus", xp: 75, ok: (c) => c.d.entries.length >= 4 },
  { id: "veg", t: "Côté vert", d: "200 g de fruits ou de légumes", xp: 75, ok: (c) => c.veg >= 200 },
  { id: "lead", t: "Avance de farm", d: "1 200 kcal avant 14 h", xp: 100, ok: (c) => c.before14 >= 1200 },
  { id: "late", t: "Snack de fin de partie", d: "400 kcal ou plus après 21 h", xp: 75, ok: (c) => c.after21 >= 400 },
  { id: "posture", t: "Dos droit", d: "La routine posture", xp: 75, el: (c) => c.rit.has("posture"), ok: (c) => !!c.d.h.posture },
  { id: "eggs", t: "Œufs au menu", d: "2 œufs dans la journée", xp: 50, ok: (c) => c.g("oeuf") >= 100 },
  { id: "milk", t: "Lait entier", d: "500 ml de lait dans la journée", xp: 50, ok: (c) => c.g("lait_entier") + c.g("lait_lite") >= 500 },
  { id: "weigh", t: "Pesée", d: "Note ton poids", xp: 50, el: (c) => c.weighDay, ok: (c) => c.weighed },
  { id: "light", t: "Lumière du matin", d: "10 min dehors", xp: 50, el: (c) => c.rit.has("light"), ok: (c) => !!c.d.h.light },
];
function qctx(k) {
  const S = L.getSettings(), d = day(k);
  const tots = d.entries.map(L.entryTot);
  const g = (fid) => d.entries.reduce((a, e) => a + e.items.filter((i) => i.fid === fid).reduce((b, i) => b + (+i.g || 0), 0), 0);
  const prev = new Set();
  for (let i = 1; i <= 7; i++) day(addDays(k, -i)).entries.forEach((e) => e.items.forEach((it) => prev.add(foodId(it))));
  const fresh = prev.size > 0 && d.entries.some((e) => e.items.some((it) => !TRIVIAL.has(it.fid) && (+it.g || 0) >= 30 && !prev.has(foodId(it))));
  let before14 = 0, after21 = 0, veg = 0;
  d.entries.forEach((e, i) => {
    const m = L.dayMin(e.t);
    if (m < L.dayMin("14:00")) before14 += tots[i].k;
    if (m >= L.dayMin("21:00")) after21 += tots[i].k;
    e.items.forEach((it) => { if (FRUITVEG.has(it.fid)) veg += +it.g || 0; });
  });
  return { k, S, d, tots, g, fresh, before14, after21, veg, rit: new Set(L.activeRituals(S).map((r) => r.id)), weighDay: keyToDate(k).getDay() === S.weighDay, weighed: weights()[k] != null };
}
export function quests(k) {
  return memo("q:" + k, () => {
    const c = qctx(k);
    const pool = QPOOL.filter((q) => !q.el || q.el(c));
    const rnd = seeded("quetes-" + k);
    const picked = [];
    while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return picked.map((q) => ({ id: q.id, t: q.t, d: q.d, xp: q.xp, done: !!q.ok(c) }));
  });
}

// ═════════════════════════════════════════════════════════════
// Stacks : +1 par jour fait, −1 par jour raté (comme la créatine
// dans tes muscles : ça se remplit en ~4 semaines et ça se vide
// petit à petit si tu arrêtes). Aujourd'hui ne coûte rien tant
// que la journée n'est pas finie.
// ═════════════════════════════════════════════════════════════
export const STACK_MAX = 28;
export const itemDone = (id, d, S) => (id === "water" ? (d.water || 0) >= S.water : L.ritualDone(id, d, S));
export function stacks(id, k) {
  return memo("st:" + id + ":" + k, () => {
    const S = L.getSettings();
    const f = firstKey();
    const tk = todayKey(S);
    let s = 0, best = 0, run = 0, bestRun = 0;
    const lost = [], grid = [];
    if (f && f <= k) {
      for (let x = f, i = 0; x <= k && i < 3000; x = addDays(x, 1), i++) {
        const done = itemDone(id, day(x), S);
        if (done) { s = Math.min(STACK_MAX, s + 1); run++; }
        else if (x !== tk) { if (s > 0) lost.push(x); s = Math.max(0, s - 1); run = 0; }
        best = Math.max(best, s); bestRun = Math.max(bestRun, run);
      }
      for (let i = 13; i >= 0; i--) { const x = addDays(k, -i); grid.push({ k: x, done: x >= f && itemDone(id, day(x), S), pending: x === tk }); }
    }
    const doneK = itemDone(id, day(k), S);
    return { s, max: STACK_MAX, done: doneK, risk: !doneK && s > 0, best, run, bestRun, lost7: lost.filter((z) => daysBetween(z, k) < 7).length, grid };
  });
}

// ═════════════════════════════════════════════════════════════
// La mana (la vidéo) : l'énergie de tes muscles pour la séance.
// Max = 100, +20 avec la créatine à 28 stacks.
// Remplie par ta nuit, le farm d'hier et celui d'aujourd'hui.
// ═════════════════════════════════════════════════════════════
export function mana(k, now) {
  const S = L.getSettings();
  const cs = stacks("creatine", k).s;
  const max = 100 + Math.round((20 * cs) / STACK_MAX);
  const d = day(k), h = L.daySleepH(d);
  const sleepKnown = h != null;
  let sl;
  if (sleepKnown) sl = r01(h / S.sleep);
  else { const st = L.sleepStats(addDays(k, -1), 7); sl = st.avgH != null ? r01(st.avgH / S.sleep) * 0.85 : 0.6; }
  const y = day(addDays(k, -1));
  const fy = L.hasFood(y) ? r01(L.dayTot(y).k / S.kcal) : 0.5;
  const p = L.pace(k, now, S);
  const ft = p.expected < 300 ? 1 : r01(p.t.k / p.expected);
  const frac = 0.45 * sl + 0.35 * fy + 0.2 * ft;
  return { max, cur: Math.round(max * frac), frac, crea: cs, sl, fy, ft, sleepKnown };
}
export function manaAdvice(m) {
  const f = m.cur / m.max;
  if (f >= 0.85) return { t: "Full mana", s: "Va chercher le +1 rep sur chaque exercice." };
  if (f >= 0.65) return { t: "Mana correcte", s: "Vise le +1 rep sur les gros mouvements, garde le reste." };
  return { t: "Low mana", s: "Garde tes charges et soigne la technique. Pas de record aujourd'hui." };
}

// ═════════════════════════════════════════════════════════════
// Classé : ton poids devient ton rang, de Fer IV à Challenger
// (Challenger = ton poids visé). Le rang suit la moyenne de tes
// 3 dernières pesées : une pesée isolée ne te fait pas plonger.
// ═════════════════════════════════════════════════════════════
export const TIERS = [
  { id: "fer", n: "Fer", c1: "#9A918B", c2: "#3B3532" },
  { id: "bronze", n: "Bronze", c1: "#D49364", c2: "#5E3219" },
  { id: "argent", n: "Argent", c1: "#D6DEE8", c2: "#5A6878" },
  { id: "or", n: "Or", c1: "#F6D67E", c2: "#8C6516" },
  { id: "platine", n: "Platine", c1: "#79E6D8", c2: "#16675F" },
  { id: "emeraude", n: "Émeraude", c1: "#5BEAA3", c2: "#0B6A3B" },
  { id: "diamant", n: "Diamant", c1: "#A8C2FF", c2: "#3A44C2" },
  { id: "maitre", n: "Maître", c1: "#DDA6FF", c2: "#5B2496" },
  { id: "gm", n: "Grand Maître", c1: "#FF8A8A", c2: "#8E1B2C" },
  { id: "challenger", n: "Challenger", c1: "#FFF1BF", c2: "#2E86FF" },
];
const ROMAN = ["IV", "III", "II", "I"];
export const STEPS = 30; // 28 divisions (Fer IV → Diamant I), Maître, Grand Maître, puis Challenger
export function rankAt(w, start, goal) {
  const per = Math.max(0.1, goal - start) / STEPS;
  const x = (w - start) / per;
  if (x >= STEPS) return { step: STEPS, tier: 9, div: null, lp: Math.round((x - STEPS) * 100), name: "Challenger", total: STEPS * 100 + Math.round((x - STEPS) * 100), per };
  const step = Math.max(0, Math.floor(x));
  const lp = x <= 0 ? 0 : Math.floor((x - step) * 100);
  const tier = step < 28 ? Math.floor(step / 4) : step === 28 ? 7 : 8;
  const div = step < 28 ? ROMAN[step % 4] : null;
  return { step, tier, div, lp, name: TIERS[tier].n + (div ? " " + div : ""), total: step * 100 + lp, per };
}
export const stepName = (step) => (step >= STEPS ? "Challenger" : step < 28 ? `${TIERS[Math.floor(step / 4)].n} ${ROMAN[step % 4]}` : TIERS[step === 28 ? 7 : 8].n);
export const stepTier = (step) => (step >= STEPS ? 9 : step < 28 ? Math.floor(step / 4) : step === 28 ? 7 : 8);

export function rank() {
  return memo("rank", () => {
    const S = L.getSettings();
    const list = L.weightList();
    if (!list.length) return null;
    const start = Number.isFinite(S.rankStart) && S.rankStart > 20 ? S.rankStart : Math.floor(list[0][1] * 10) / 10;
    let goal = S.goalW;
    if (!(goal > start + 1)) goal = start + 10;
    const series = list.map(([k, w], i) => {
      const win = list.slice(Math.max(0, i - 2), i + 1).map((x) => x[1]);
      const sm = win.reduce((a, b) => a + b, 0) / win.length;
      return { k, w, sm, r: rankAt(sm, start, goal) };
    });
    series.forEach((p, i) => { p.dLP = i ? p.r.total - series[i - 1].r.total : 0; });
    const last = series[series.length - 1];
    const cur = last.r;
    const per = cur.per;
    const tk = todayKey(S);
    const rate = L.weeklyRate(list, tk);
    const nextKg = cur.step >= STEPS ? null : start + (cur.step + 1) * per;
    const kgToNext = nextKg != null ? Math.max(0, nextKg - last.sm) : null;
    let promoAt = null;
    if (kgToNext != null && rate != null && rate > 0.03) { const wk = kgToNext / rate; if (wk < 104) promoAt = addDays(tk, Math.max(1, Math.round(wk * 7))); }
    const bestStep = Math.max(...series.map((p) => p.r.step));
    return { start, goal, per, series, last, cur, rate, nextKg, kgToNext, promoAt, bestStep, bestTier: stepTier(bestStep), pct: r01((last.sm - start) / (goal - start)) };
  });
}

// ═════════════════════════════════════════════════════════════
// Boss de la semaine : PV = 7 jours de calories. Chaque kcal = 1 dégât.
// ═════════════════════════════════════════════════════════════
export const BOSSES = [
  { id: "meta", n: "Le Métabolisme", lore: "Il brûle tout ce que tu manges. Pour le battre, farme plus vite qu'il ne brûle.", weak: "Point faible : les repas de 800 kcal et plus." },
  { id: "estomac", n: "L'Estomac Fermé", lore: "Il te coupe l'appétit dès que tu as un peu mangé.", weak: "Point faible : les calories liquides, shakers et lait entier." },
  { id: "flemme", n: "La Flemme", lore: "Il te souffle de sauter un repas et de commander plus tard.", weak: "Point faible : un repas préparé à l'avance." },
  { id: "veilleur", n: "Le Veilleur", lore: "Il te garde sur ton téléphone jusqu'à pas d'heure et te fait rater le petit-déj.", weak: "Point faible : un en-cas avant de poser le téléphone." },
];
export function boss(k) {
  return memo("boss:" + k, () => {
    const S = L.getSettings();
    const ws = L.weekStartKey(k);
    const wn = Math.floor(keyToDate(ws).getTime() / (7 * 864e5));
    const b = BOSSES[((wn % BOSSES.length) + BOSSES.length) % BOSSES.length];
    const hp = Math.round(7 * S.kcal);
    const idx = daysBetween(ws, k);
    const per = Array.from({ length: 7 }, (_, i) => { const x = addDays(ws, i); return { k: x, v: i <= idx ? L.dayTot(day(x)).k : null }; });
    let cum = 0, deadAt = null;
    per.forEach((p) => { if (p.v != null) { cum += p.v; if (!deadAt && cum >= hp) deadAt = p.k; } });
    const dmg = cum, left = Math.max(0, hp - dmg);
    const daysLeft = 7 - idx; // aujourd'hui compris
    const need = daysLeft > 0 ? left / daysLeft : left;
    return { ...b, hp, dmg, left, pct: r01(left / hp), dead: !!deadAt, deadAt, daysLeft, need, enraged: !deadAt && need > S.kcal * 1.25, per, ws };
  });
}

// ═════════════════════════════════════════════════════════════
// Série de victoires (≥ 90 % des calories) et Flash : une journée
// ratée par semaine est sauvée automatiquement.
// ═════════════════════════════════════════════════════════════
export function streak(k) {
  return memo("streak:" + k, () => {
    const f = firstKey();
    const won = (x) => dayInfo(x).win;
    let x = won(k) ? k : addDays(k, -1), n = 0;
    const flashes = [];
    for (let i = 0; i < 500 && f && x >= f; i++) {
      if (won(x)) n++;
      else {
        const lastF = flashes[flashes.length - 1];
        if (x !== k && x > f && won(addDays(x, -1)) && (!lastF || daysBetween(x, lastF) >= 7)) flashes.push(x);
        else break;
      }
      x = addDays(x, -1);
    }
    const lastUse = flashes[0] || null;
    const since = lastUse ? daysBetween(lastUse, k) : 99;
    return { n, flashes, ready: since >= 7, inDays: Math.max(0, 7 - since), lastUse };
  });
}

// ═════════════════════════════════════════════════════════════
// Records perso (l'ultime) et « +1 rep » (la vidéo)
// ═════════════════════════════════════════════════════════════
export function records() {
  return memo("recs", () => {
    const S = L.getSettings();
    const ws = [...L.getWorkouts()].sort((a, b) => a.date.localeCompare(b.date));
    const best = {}, last = {}, events = [], plus1 = [];
    for (const w of ws) {
      const k = L.logicalKey(new Date(w.date), S.dayStart);
      for (const e of w.exercises) {
        const sets = e.sets.filter((s) => !s.warm && s.r > 0);
        if (!sets.length) continue;
        const key = e.key || "n:" + L.norm(e.name);
        let b = 0, bs = null;
        sets.forEach((s) => { const v = L.e1rm(s.w, s.r); if (v > b) { b = v; bs = s; } });
        const W = Math.max(...sets.map((s) => s.w));
        const repsW = sets.filter((s) => s.w === W).reduce((a, s) => a + s.r, 0);
        if (best[key] != null && b > best[key] * 1.005) events.push({ k, date: w.date, key, name: e.name, e1rm: b, prev: best[key], set: bs });
        if (last[key] && last[key].W === W && repsW > last[key].repsW) plus1.push({ k, key, name: e.name, W, from: last[key].repsW, to: repsW });
        best[key] = Math.max(best[key] || 0, b);
        last[key] = { W, repsW };
      }
    }
    return { events, plus1, best };
  });
}
/** « +1 rep » : la dernière perf + une rep sur la première série pas encore au max */
export function plusOne(pe, sg) {
  if (!sg?.last || sg.status === "up") return null;
  const reps = sg.last.reps.slice(0, pe.sets);
  while (reps.length < pe.sets) reps.push(reps[reps.length - 1] ?? pe.min);
  const i = reps.findIndex((r) => r < pe.max);
  if (i < 0) return null;
  const to = reps.map((r, j) => (j === i ? r + 1 : r));
  return { from: reps, to, i };
}

/** Sorts Q/W/E (séances A/B/C) : temps de recharge d'environ 2 jours */
export const SPELL_KEYS = { A: "Q", B: "W", C: "E" };
export const COOLDOWN_H = 42;
export function spells(now) {
  const ws = L.getWorkouts();
  const last = ws[0] || null;
  const h = last ? (now - new Date(last.date)) / 3.6e6 : 999;
  const cd = h < 0 ? 0 : Math.max(0, COOLDOWN_H - h);
  const per = {};
  ["A", "B", "C"].forEach((s) => { const list = ws.filter((x) => x.session === s); per[s] = { last: list[0]?.date || null, count: list.length }; });
  return { cd, ready: cd <= 0, last, per, frac: cd / COOLDOWN_H };
}

// ═════════════════════════════════════════════════════════════
// Farm : rareté des repas, phases, Alimentdex, build recommandé
// ═════════════════════════════════════════════════════════════
export const RARITY = {
  common: { n: "Commun", c: "#A09B8C" },
  rare: { n: "Rare", c: "#4AA8FF" },
  epic: { n: "Épique", c: "#B97CFF" },
  legendary: { n: "Légendaire", c: "#FF9F1C" },
};
export const rarity = (t) => (t.k >= 900 && t.p >= 40 ? "legendary" : t.k >= 700 || t.p >= 35 ? "epic" : t.k >= 400 || t.p >= 25 ? "rare" : "common");

export const PHASES = { early: { n: "Early game", end: "14:00" }, mid: { n: "Mid game", end: "19:00" }, late: { n: "Late game", end: null } };
export function phaseOf(now) { const h = now.getHours() + now.getMinutes() / 60; const x = h < 5 ? h + 24 : h; return x < 14 ? "early" : x < 19 ? "mid" : "late"; }

/** Aliments déjà mangés au moins une fois, avec la date de découverte */
export function dex() {
  return memo("dex", () => {
    const seen = new Map();
    [...dayMap().keys()].sort().forEach((k) => day(k).entries.forEach((e) => e.items.forEach((it) => {
      if (TRIVIAL.has(it.fid)) return;
      const id = foodId(it);
      if (!seen.has(id)) seen.set(id, k);
    })));
    const total = L.allFoods().filter((f) => !TRIVIAL.has(f.id)).length;
    const known = new Set(L.allFoods().map((f) => f.id));
    const extra = [...seen.keys()].filter((id) => !known.has(id)).length;
    return { seen, n: seen.size, total: total + extra };
  });
}
export const newFoods = (items) => { const s = dex().seen; return items.filter((it) => !TRIVIAL.has(it.fid) && !s.has(foodId(it))); };
export function weekVariety(k) {
  const ws = L.weekStartKey(k), set = new Set();
  for (let i = 0; i <= daysBetween(ws, k); i++) day(addDays(ws, i)).entries.forEach((e) => e.items.forEach((it) => { if (!TRIVIAL.has(it.fid)) set.add(foodId(it)); }));
  return set.size;
}

/** Les repas (favoris et récents) qui collent le mieux à ce qu'il te manque */
export function buildReco(k, now) {
  const S = L.getSettings();
  const p = L.pace(k, now, S);
  if (p.remaining < 250) return [];
  const target = clamp(p.perMeal, 350, 1200);
  const protLeft = Math.max(0, S.prot - p.t.p);
  const seen = new Set(), cands = [];
  const push = (name, items, src) => {
    const sig = items.map((it) => `${it.fid || it.name}:${it.g}`).sort().join("|");
    if (!items.length || seen.has(sig)) return;
    seen.add(sig);
    cands.push({ name, items, t: L.itemsTot(items), src });
  };
  L.getFavs().forEach((f) => push(f.name, f.items, "fav"));
  L.recentEntries(k, 8).forEach(({ e }) => push(e.label, e.items, "recent"));
  cands.forEach((c) => { c.score = Math.abs(c.t.k - target) / target - (protLeft > 20 ? Math.min(1, c.t.p / protLeft) * 0.45 : 0); });
  return cands.filter((c) => c.t.k >= 150).sort((a, b) => a.score - b.score).slice(0, 3);
}

// ═════════════════════════════════════════════════════════════
// Récap de mort : ce qui t'a fait perdre la journée
// ═════════════════════════════════════════════════════════════
const hOfDay = (dm) => { const t = ((Math.round(dm) + 300) % 1440 + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60; return m ? `${h} h ${L.pad(m)}` : `${h} h`; };
export function recap(k) {
  const S = L.getSettings();
  const di = dayInfo(k), d = di.d, out = [];
  if (!L.hasFood(d)) out.push({ ic: "eye", t: "Aucun repas noté : tu as joué sans vision.", w: 1 });
  else if (!di.kill.gold) out.push({ ic: "coin", t: `Il t'a manqué ${fint(S.kcal - di.t.k)} gold (calories).`, w: (S.kcal - di.t.k) / S.kcal + 0.2 });
  const times = d.entries.map((e) => L.dayMin(e.t)).sort((a, b) => a - b);
  const wake = d.sleep?.wake ? L.dayMin(L.hm(d.sleep.wake)) : null;
  const pts = [...(wake != null ? [wake] : []), ...times];
  let gap = 0, from = null, to = null;
  for (let i = 1; i < pts.length; i++) if (pts[i] - pts[i - 1] > gap) { gap = pts[i] - pts[i - 1]; from = pts[i - 1]; to = pts[i]; }
  if (gap >= 300) out.push({ ic: "hourglass", t: `Trou de farm : rien entre ${hOfDay(from)} et ${hOfDay(to)}, soit ${fH(gap / 60)}.`, w: gap / 600 });
  if (times.length && wake != null && times[0] - wake >= 180) out.push({ ic: "sword", t: `Premier repas ${fH((times[0] - wake) / 60)} après le réveil : early game raté.`, w: 0.45 });
  if (d.entries.length && !di.kill.prot && di.t.p < S.prot * 0.85) out.push({ ic: "bolt", t: `Protéines : ${fint(di.t.p)} g sur ${S.prot}.`, w: ((S.prot - di.t.p) / S.prot) * 0.8 });
  if (di.sh != null && di.sh < S.sleep - 1) out.push({ ic: "heart", t: `PV bas : ${fH(di.sh)} de sommeil la nuit d'avant.`, w: (S.sleep - di.sh) / S.sleep });
  return out.sort((a, b) => b.w - a.w).slice(0, 3);
}

// ═════════════════════════════════════════════════════════════
// Succès : calculés en rejouant ton historique jour par jour
// ═════════════════════════════════════════════════════════════
export const ACH = [
  { id: "first_blood", cat: "farm", n: "Premier sang", d: "Note ta première journée.", xp: 50, test: (s) => s.days >= 1 },
  { id: "farmer", cat: "farm", n: "Farmer", d: "Une journée à ton objectif de calories.", xp: 100, test: (s) => s.gold >= 1 },
  { id: "farmer7", cat: "farm", n: "Farmer assidu", d: "7 journées à ton objectif de calories.", xp: 250, test: (s) => s.gold >= 7, prog: (s) => [s.gold, 7] },
  { id: "farmer30", cat: "farm", n: "Machine à farm", d: "30 journées à ton objectif de calories.", xp: 600, test: (s) => s.gold >= 30, prog: (s) => [s.gold, 30] },
  { id: "streak5", cat: "farm", n: "Série de victoires", d: "5 victoires d'affilée (90 % des calories, Flash compris).", xp: 250, test: (s) => s.bestWin >= 5, prog: (s) => [s.bestWin, 5] },
  { id: "streak14", cat: "farm", n: "Inarrêtable", d: "14 victoires d'affilée.", xp: 600, test: (s) => s.bestWin >= 14, prog: (s) => [s.bestWin, 14] },
  { id: "legendary", cat: "farm", n: "Vague légendaire", d: "Un repas de 1 200 kcal ou plus.", xp: 150, test: (s) => s.bestMeal >= 1200, prog: (s) => [Math.round(s.bestMeal), 1200] },
  { id: "bigday", cat: "farm", n: "Festin", d: "Une journée à 4 000 kcal ou plus.", xp: 250, test: (s) => s.bestDay >= 4000, prog: (s) => [Math.round(s.bestDay), 4000] },
  { id: "prot7", cat: "farm", n: "Bâtisseur", d: "7 journées à ton objectif de protéines.", xp: 250, test: (s) => s.prot >= 7, prog: (s) => [s.prot, 7] },
  { id: "dex25", cat: "farm", n: "Explorateur", d: "25 aliments différents dans l'Alimentdex.", xp: 200, test: (s) => s.dex >= 25, prog: (s) => [s.dex, 25] },
  { id: "dex50", cat: "farm", n: "Encyclopédie", d: "50 aliments différents.", xp: 450, test: (s) => s.dex >= 50, prog: (s) => [s.dex, 50] },
  { id: "boss1", cat: "farm", n: "Tueur de boss", d: "Vaincre un boss de la semaine.", xp: 300, test: (s) => s.bosses >= 1 },
  { id: "boss4", cat: "farm", n: "Chasseur de boss", d: "4 boss vaincus.", xp: 700, test: (s) => s.bosses >= 4, prog: (s) => [s.bosses, 4] },
  { id: "sleep1", cat: "recup", n: "Recall réussi", d: "Une nuit à ton objectif de sommeil.", xp: 100, test: (s) => s.sleepN >= 1 },
  { id: "sleep7", cat: "recup", n: "Régénération", d: "7 nuits à ton objectif de sommeil.", xp: 300, test: (s) => s.sleepN >= 7, prog: (s) => [s.sleepN, 7] },
  { id: "early_bed", cat: "recup", n: "Couche-tôt", d: "Poser le téléphone avant minuit.", xp: 200, test: (s) => s.earlyBed },
  { id: "clock5", cat: "recup", n: "Horloge réglée", d: "5 nuits d'affilée couché avant 1 h.", xp: 350, test: (s) => s.clockBest >= 5, prog: (s) => [s.clockBest, 5] },
  { id: "vision7", cat: "recup", n: "Vision parfaite", d: "7 jours d'affilée avec ta nuit et 3 repas notés.", xp: 250, test: (s) => s.visBest >= 7, prog: (s) => [s.visBest, 7] },
  { id: "cast1", cat: "arene", n: "Premier cast", d: "Ta première séance enregistrée.", xp: 100, test: (s) => s.casts >= 1 },
  { id: "triple", cat: "arene", n: "Triple kill", d: "3 séances dans la même semaine.", xp: 250, test: (s) => s.weekMax >= 3, prog: (s) => [s.weekMax, 3] },
  { id: "regular4", cat: "arene", n: "Régulier", d: "4 semaines d'affilée à 3 séances.", xp: 700, test: (s) => s.regBest >= 4, prog: (s) => [s.regBest, 4] },
  { id: "ult1", cat: "arene", n: "Ultime", d: "Ton premier record perso.", xp: 150, test: (s) => s.prs >= 1 },
  { id: "ult10", cat: "arene", n: "Briseur de records", d: "10 records perso.", xp: 450, test: (s) => s.prs >= 10, prog: (s) => [s.prs, 10] },
  { id: "plus1", cat: "arene", n: "+1 rep", d: "Une rep de plus que la dernière fois, à la même charge.", xp: 100, test: (s) => s.plus1 >= 1 },
  { id: "posture10", cat: "arene", n: "Dos de champion", d: "10 routines posture.", xp: 250, test: (s) => s.posture >= 10, prog: (s) => [s.posture, 10] },
  { id: "crea28", cat: "items", n: "Stack complet", d: "28 stacks de créatine.", xp: 350, test: (s) => s.creaBest >= 28, prog: (s) => [s.creaBest, 28] },
  { id: "habit21", cat: "items", n: "Habitude forgée", d: "21 jours d'affilée sur un même item.", xp: 350, test: (s) => s.habitBest >= 21, prog: (s) => [s.habitBest, 21] },
  { id: "glow", cat: "items", n: "Avant / après", d: "Ta première photo glow-up.", xp: 100, test: (s) => s.photo },
  { id: "promo", cat: "classe", n: "Promotion", d: "Monter d'une division.", xp: 150, test: (s) => s.rankMax > s.rank0 },
  { id: "tier", cat: "classe", n: "Nouveau palier", d: "Passer au palier supérieur, par exemple de Bronze à Argent.", xp: 350, test: (s) => s.tierMax > s.tier0 },
  { id: "half", cat: "classe", n: "Mi-parcours", d: "La moitié du chemin vers ton poids visé.", xp: 600, test: (s) => s.half },
  { id: "challenger", cat: "classe", n: "Challenger", d: "Atteindre ton poids visé.", xp: 2000, test: (s) => s.chall },
  { id: "penta", cat: "special", n: "Pentakill", d: "Les 5 objectifs dans la même journée.", xp: 300, test: (s) => s.pentas >= 1 },
  { id: "penta5", cat: "special", n: "Légende", d: "5 pentakills.", xp: 700, test: (s) => s.pentas >= 5, prog: (s) => [s.pentas, 5] },
];
export const ACH_CATS = { farm: "Farm", recup: "Récup", arene: "Arène", items: "Items", classe: "Classé", special: "Spécial" };

function scan(k) {
  return memo("scan:" + k, () => {
    const S = L.getSettings();
    const f = firstKey();
    const st = { days: 0, gold: 0, prot: 0, sleepN: 0, win: 0, bestWin: 0, bestMeal: 0, bestDay: 0, dex: 0, bosses: 0, earlyBed: false, clockRun: 0, clockBest: 0,
      casts: 0, weekMax: 0, regBest: 0, prs: 0, plus1: 0, creaBest: 0, habitBest: 0, posture: 0, rank0: 0, tier0: 0, rankMax: 0, tierMax: 0,
      half: false, chall: false, pentas: 0, visRun: 0, visBest: 0, photo: false, kcalTot: 0, protTot: 0, nights: 0, sleepTot: 0 };
    const at = {};
    if (!f) return { st, at };
    const tk = todayKey(S);
    const rk = rank();
    const rkByDay = new Map(rk ? rk.series.map((p) => [p.k, p]) : []);
    if (rk) { st.rank0 = st.rankMax = rk.series[0].r.step; st.tier0 = st.tierMax = rk.series[0].r.tier; }
    const rec = records();
    const cnt = (arr) => { const m = new Map(); arr.forEach((e) => m.set(e.k, (m.get(e.k) || 0) + 1)); return m; };
    const prBy = cnt(rec.events), p1By = cnt(rec.plus1);
    const items = [...new Set(["creatine", ...L.activeRituals(S).map((r) => r.id)])];
    const runs = {};
    let crea = 0, weekKey = null, weekKcal = 0, weekCasts = 0, bossDone = false, regRun = 0, lastFlash = null;
    const seenFood = new Set();
    const lastPhoto = L.store.get("lastPhoto", null);
    for (let x = f, i = 0; x <= k && i < 3000; x = addDays(x, 1), i++) {
      const pending = x === tk;
      const wsk = L.weekStartKey(x);
      if (wsk !== weekKey) {
        if (weekKey) { regRun = weekCasts >= 3 ? regRun + 1 : 0; }
        weekKey = wsk; weekKcal = 0; weekCasts = 0; bossDone = false;
      }
      const di = dayInfo(x), d = di.d;
      if (di.has) st.days++;
      if (di.kill.gold) st.gold++;
      if (di.kill.prot) st.prot++;
      if (di.kill.sleep) st.sleepN++;
      // série de victoires, avec le Flash (une journée ratée sauvée tous les 7 jours)
      if (di.win) st.win++;
      else if (!pending) { if (st.win > 0 && (!lastFlash || daysBetween(lastFlash, x) >= 7)) lastFlash = x; else st.win = 0; }
      st.bestWin = Math.max(st.bestWin, st.win);
      d.entries.forEach((e) => {
        st.bestMeal = Math.max(st.bestMeal, L.entryTot(e).k);
        e.items.forEach((it) => { if (!TRIVIAL.has(it.fid)) seenFood.add(foodId(it)); });
      });
      st.dex = seenFood.size;
      st.bestDay = Math.max(st.bestDay, di.t.k);
      st.kcalTot += di.t.k; st.protTot += di.t.p;
      if (di.sh != null) { st.nights++; st.sleepTot += di.sh; }
      weekKcal += di.t.k;
      if (!bossDone && weekKcal >= 7 * S.kcal) { bossDone = true; st.bosses++; }
      if (d.sleep?.bed) {
        const nm = L.nightMin(d.sleep.bed);
        if (nm < 360) st.earlyBed = true;
        st.clockRun = nm < 420 ? st.clockRun + 1 : 0;
        st.clockBest = Math.max(st.clockBest, st.clockRun);
      } else if (!pending) st.clockRun = 0;
      st.casts += di.ws.length; weekCasts += di.ws.length;
      st.weekMax = Math.max(st.weekMax, weekCasts);
      st.regBest = Math.max(st.regBest, weekCasts >= 3 ? regRun + 1 : regRun);
      st.prs += prBy.get(x) || 0; st.plus1 += p1By.get(x) || 0;
      if (di.kill.crea) crea = Math.min(STACK_MAX, crea + 1); else if (!pending) crea = Math.max(0, crea - 1);
      st.creaBest = Math.max(st.creaBest, crea);
      items.forEach((id) => {
        if (itemDone(id, d, S)) runs[id] = (runs[id] || 0) + 1; else if (!pending) runs[id] = 0;
        st.habitBest = Math.max(st.habitBest, runs[id] || 0);
      });
      if (d.h.posture) st.posture++;
      const rp = rkByDay.get(x);
      if (rp) {
        st.rankMax = Math.max(st.rankMax, rp.r.step);
        st.tierMax = Math.max(st.tierMax, rp.r.tier);
        if (rp.sm >= rk.start + (rk.goal - rk.start) / 2) st.half = true;
        if (rp.sm >= rk.goal) st.chall = true;
      }
      if (di.kills === 5) st.pentas++;
      const vis = !!d.sleep && d.entries.length >= 3;
      if (vis) st.visRun++; else if (!pending) st.visRun = 0;
      st.visBest = Math.max(st.visBest, st.visRun);
      if (lastPhoto && lastPhoto <= x) st.photo = true;
      for (const a of ACH) if (!at[a.id] && a.test(st)) at[a.id] = x;
    }
    return { st, at };
  });
}
export function achievements(k) {
  return memo("ach:" + k, () => {
    const { st, at } = scan(k);
    return ACH.map((a) => ({ id: a.id, cat: a.cat, n: a.n, d: a.d, xp: a.xp, at: at[a.id] || null, prog: a.prog ? a.prog(st) : null }));
  });
}
export const careerStats = (k) => scan(k).st;

// ═════════════════════════════════════════════════════════════
// Compte : XP cumulée depuis ton premier jour et niveau
// ═════════════════════════════════════════════════════════════
export const lvlNeed = (lvl) => 800 + 200 * lvl;
export function account(k) {
  return memo("acc:" + k, () => {
    let total = 0, days = 0;
    const f = firstKey();
    if (f) for (let x = f, i = 0; x <= k && i < 3000; x = addDays(x, 1), i++) { const di = dayInfo(x); if (di.has) { total += di.total; days++; } }
    const achXP = achievements(k).filter((a) => a.at).reduce((a, x) => a + x.xp, 0);
    total += achXP;
    let level = 1, rest = total;
    while (rest >= lvlNeed(level) && level < 999) { rest -= lvlNeed(level); level++; }
    return { total, level, into: rest, need: lvlNeed(level), pct: rest / lvlNeed(level), days, achXP };
  });
}

/** Winrate sur n jours (journées notées et terminées seulement) */
export function winrate(k, n = 30) {
  let w = 0, l = 0;
  for (let i = 1; i <= n; i++) { const di = dayInfo(addDays(k, -i)); if (!L.hasFood(di.d)) continue; if (di.win) w++; else l++; }
  return { w, l, pct: w + l ? w / (w + l) : null };
}

// ═════════════════════════════════════════════════════════════
// Titres et skins à débloquer
// ═════════════════════════════════════════════════════════════
export const TITLES = [
  { id: "hardgainer", n: "Hardgainer", ach: null },
  { id: "farmer", n: "Farmer", ach: "farmer7" },
  { id: "explorer", n: "Explorateur", ach: "dex25" },
  { id: "recall", n: "Maître du recall", ach: "sleep7" },
  { id: "boss", n: "Tueur de boss", ach: "boss1" },
  { id: "stacks", n: "Full stacks", ach: "crea28" },
  { id: "inarretable", n: "Inarrêtable", ach: "streak14" },
  { id: "penta", n: "Pentakiller", ach: "penta" },
  { id: "records", n: "Briseur de records", ach: "ult10" },
  { id: "challenger", n: "Challenger", ach: "challenger" },
];
export function titles(k) {
  const got = new Set(achievements(k).filter((a) => a.at).map((a) => a.id));
  return TITLES.map((t) => ({ ...t, ok: !t.ach || got.has(t.ach) }));
}
export const currentTitle = (S, k) => { const list = titles(k); const t = list.find((x) => x.id === S.title && x.ok); return (t || list[0]).n; };

export const SKINS = [
  { id: "hextech", n: "Hextech", d: "Or et bleu, le thème de base.", req: null },
  { id: "neon", n: "Néon v7", d: "Les couleurs de ta version d'avant.", req: { lvl: 5 } },
  { id: "infernal", n: "Infernal", d: "Braise et rouge.", req: { lvl: 15 } },
  { id: "abysse", n: "Abysse", d: "Océan et turquoise.", req: { lvl: 25 } },
  { id: "prestige", n: "Prestige", d: "Blanc et or, à partir du rang Or.", req: { tier: 3 } },
  { id: "challenger", n: "Challenger", d: "Pour ceux qui ont atteint leur poids visé.", req: { tier: 9 } },
];
export const skinReq = (s) => (!s.req ? "" : s.req.lvl ? `Niveau ${s.req.lvl}` : `Rang ${TIERS[s.req.tier].n}`);
export function skinOk(s, acc, rk) {
  if (!s.req) return true;
  if (s.req.lvl) return acc.level >= s.req.lvl;
  return !!rk && rk.bestTier >= s.req.tier;
}

/** Résumé de la partie pour le coach IA */
export function coachContext(k) {
  try {
    const S = L.getSettings();
    const rk = rank(), b = boss(k), cs = stacks("creatine", k), sk = streak(k), acc = account(k), di = dayInfo(k);
    const parts = [
      rk ? `rang ${rk.cur.name} (${rk.cur.lp} LP), poids de forme ${L.fdec(rk.last.sm, 1)} kg${rk.promoAt ? `, promotion prévue vers le ${L.fmtDay(rk.promoAt, { day: "numeric", month: "long" })}` : ""}` : "pas encore classé",
      `boss de la semaine ${b.n} : ${b.dead ? "déjà vaincu" : `${fint(b.left)} PV restants, il faut ${fint(b.need)} kcal par jour d'ici dimanche`}`,
      `créatine ${cs.s}/${STACK_MAX} stacks`,
      `${KILL_NAMES[di.kills] || "aucun kill"} aujourd'hui (${di.kills}/5), note ${di.grade}`,
      `série de ${sk.n} victoire${sk.n > 1 ? "s" : ""}${sk.ready ? ", Flash prêt" : ""}`,
      `niveau de compte ${acc.level}`,
    ];
    return parts.join(" ; ") + ".";
  } catch { return ""; }
}
