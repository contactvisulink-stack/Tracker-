// ═════════════════════════════════════════════════════════════
// Le moteur d'analyse. Tout part de tes vraies données (repas, nuits,
// pesées, séances, protocole). Rien n'est stocké en double : corrige un
// repas et tous les calculs suivent.
// ═════════════════════════════════════════════════════════════
import * as L from "./lib.js";

const { addDays, daysBetween, keyToDate, clamp } = L;
const r01 = (x) => clamp(x || 0, 0, 1);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

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
const rawCache = new Map();
export const dayMap = () => memo("days", () => {
  const m = new Map(), keep = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("t2:day:")) continue;
      const k = key.slice(7), raw = localStorage.getItem(key) || "";
      let c = rawCache.get(k);
      if (!c || c.raw !== raw) { c = { raw, d: L.getDay(k) }; rawCache.set(k, c); }
      m.set(k, c.d); keep.add(k);
    }
  } catch {}
  rawCache.forEach((_, k) => { if (!keep.has(k)) rawCache.delete(k); });
  return m;
});
export const day = (k) => dayMap().get(k) || L.emptyDay();

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

/** Premier jour de ton historique */
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
// Protocole du jour (créatine, lumière, minoxidil, posture, eau…)
// ═════════════════════════════════════════════════════════════
export const SAT_MAX = 28;
export const habitDone = (id, d, S) => (id === "water" ? (d.water || 0) >= S.water : L.ritualDone(id, d, S));
/** Série en cours, meilleure série, 14 derniers jours, et « saturation » (+1 par jour fait, −1 par jour raté, max 28) */
export function habit(id, k) {
  return memo("h:" + id + ":" + k, () => {
    const S = L.getSettings();
    const f = firstKey();
    const tk = todayKey(S);
    let sat = 0, run = 0, best = 0;
    const grid = [];
    if (f && f <= k) {
      for (let x = f, i = 0; x <= k && i < 3000; x = addDays(x, 1), i++) {
        const done = habitDone(id, day(x), S);
        if (done) { sat = Math.min(SAT_MAX, sat + 1); run++; }
        else if (x !== tk) { sat = Math.max(0, sat - 1); run = 0; }
        best = Math.max(best, run);
      }
      for (let i = 13; i >= 0; i--) { const x = addDays(k, -i); grid.push({ k: x, done: x >= f && habitDone(id, day(x), S), pending: x === tk }); }
    }
    const done = habitDone(id, day(k), S);
    return { done, run, best, sat, grid, missed7: grid.slice(-8, -1).filter((g) => !g.done).length };
  });
}

// ═════════════════════════════════════════════════════════════
// Disponibilité pour la séance : nuit, carburant d'hier et d'aujourd'hui
// ═════════════════════════════════════════════════════════════
export function readiness(k, now) {
  const S = L.getSettings();
  const d = day(k), h = L.daySleepH(d);
  const sleepKnown = h != null;
  let sl;
  if (sleepKnown) sl = r01(h / S.sleep);
  else { const st = L.sleepStats(addDays(k, -1), 7); sl = st.avgH != null ? r01(st.avgH / S.sleep) * 0.85 : 0.6; }
  const y = day(addDays(k, -1));
  const fy = L.hasFood(y) ? r01(L.dayTot(y).k / S.kcal) : 0.5;
  const p = L.pace(k, now, S);
  const ft = p.expected < 300 ? 1 : r01(p.t.k / p.expected);
  const pct = Math.round((0.45 * sl + 0.35 * fy + 0.2 * ft) * 100);
  const crea = habit("creatine", k).sat;
  const adv = pct >= 90 ? { lv: "ok", t: "Pousse", s: "Vise +1 rep sur chaque exercice." }
    : pct >= 75 ? { lv: "ok", t: "Bonne forme", s: "+1 rep sur les gros mouvements, garde le reste." }
    : pct >= 60 ? { lv: "warn", t: "Moyen", s: "Garde tes charges. +1 rep seulement si elle passe propre." }
    : { lv: "crit", t: "Bas", s: "Garde tes charges, soigne la technique. Pas de record aujourd'hui." };
  return { pct, sl, fy, ft, sleepKnown, crea, adv };
}

// ═════════════════════════════════════════════════════════════
// Records et « +1 rep »
// ═════════════════════════════════════════════════════════════
export function records() {
  return memo("recs", () => {
    const S = L.getSettings();
    const ws = [...L.getWorkouts()].sort((a, b) => a.date.localeCompare(b.date));
    const best = {}, events = [];
    for (const w of ws) {
      const k = L.logicalKey(new Date(w.date), S.dayStart);
      for (const e of w.exercises) {
        const sets = e.sets.filter((s) => !s.warm && s.r > 0);
        if (!sets.length) continue;
        const key = e.key || "n:" + L.norm(e.name);
        let b = 0, bs = null;
        sets.forEach((s) => { const v = L.e1rm(s.w, s.r); if (v > b) { b = v; bs = s; } });
        if (best[key] != null && b > best[key] * 1.005) events.push({ k, key, name: e.name, e1rm: b, prev: best[key], set: bs });
        best[key] = Math.max(best[key] || 0, b);
      }
    }
    return { events, best };
  });
}
export function plusOne(pe, sg) {
  if (!sg?.last || sg.status === "up") return null;
  const reps = sg.last.reps.slice(0, pe.sets);
  while (reps.length < pe.sets) reps.push(reps[reps.length - 1] ?? pe.min);
  const i = reps.findIndex((r) => r < pe.max);
  if (i < 0) return null;
  return { from: reps, to: reps.map((r, j) => (j === i ? r + 1 : r)), i };
}
export const COOLDOWN_H = 42;
/** Récupération depuis la dernière séance (environ 2 jours entre deux full body) */
export function recharge(now) {
  const last = L.getWorkouts()[0] || null;
  const h = last ? (now - new Date(last.date)) / 3.6e6 : 999;
  const cd = h < 0 ? 0 : Math.max(0, COOLDOWN_H - h);
  return { cd, ready: cd <= 0, frac: cd / COOLDOWN_H, last };
}

/** Tonnage par semaine (8 dernières semaines) */
export function weeklyVolume(k, n = 8) {
  const ws = L.getWorkouts();
  const w0 = L.weekStartKey(k);
  return Array.from({ length: n }, (_, i) => {
    const s = addDays(w0, -7 * (n - 1 - i)), e = addDays(s, 6);
    const list = ws.filter((w) => { const kk = L.logicalKey(new Date(w.date)); return kk >= s && kk <= e; });
    return { s, n: list.length, vol: list.reduce((a, w) => a + L.workoutVolume(w), 0), sets: list.reduce((a, w) => a + L.workoutSets(w), 0) };
  });
}

// ═════════════════════════════════════════════════════════════
// Carburant : projection de fin de journée
// ═════════════════════════════════════════════════════════════
/** Ce que tu manges d'habitude après l'heure qu'il est (14 derniers jours notés) */
export function projection(k, now) {
  const S = L.getSettings();
  const t = L.dayTot(day(k));
  const nm = L.nowDayMin(now);
  const pm = L.plannedMeals(k).filter((m) => !m.done && m.at >= nm - 30);
  if (pm.length) {
    const add = pm.reduce((a, m) => a + (m.kcal || 0), 0);
    return { end: t.k + add, add, n: pm.length, src: "plan", gap: t.k + add - S.kcal };
  }
  const after = [];
  for (let i = 1; i <= 21 && after.length < 14; i++) {
    const d = day(addDays(k, -i));
    if (!d.entries.length || L.dayTot(d).k < S.kcal * 0.4) continue;
    after.push(d.entries.filter((e) => L.dayMin(e.t) > nm).reduce((a, e) => a + L.entryTot(e).k, 0));
  }
  if (after.length < 3) return null;
  const add = Math.round(avg(after));
  return { end: t.k + add, add, n: after.length, src: "habits", gap: t.k + add - S.kcal };
}

/** Repas (favoris et récents) qui collent le mieux à ce qu'il te manque */
export function suggestions(k, now) {
  const S = L.getSettings();
  const p = L.pace(k, now, S);
  if (p.remaining < 250) return { target: 0, list: [] };
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
  return { target, list: cands.filter((c) => c.t.k >= 150).sort((a, b) => a.score - b.score).slice(0, 3) };
}

// ═════════════════════════════════════════════════════════════
// Masse : tendance, bilan énergétique, maintenance réelle
// ═════════════════════════════════════════════════════════════
/** Droite des moindres carrés sur (jour, kg) : pente par jour et son incertitude */
function regress(pts) {
  const n = pts.length;
  if (n < 2) return null;
  const mx = avg(pts.map((p) => p[0])), my = avg(pts.map((p) => p[1]));
  let sxx = 0, sxy = 0;
  pts.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); });
  if (!sxx) return null;
  const b = sxy / sxx, a = my - b * mx;
  let se = null;
  if (n >= 3) { const ssr = pts.reduce((s, [x, y]) => s + (y - (a + b * x)) ** 2, 0); se = Math.sqrt(ssr / (n - 2) / sxx); }
  return { a, b, se, n };
}

/**
 * Maintenance réelle : ce que tu manges en moyenne, moins ce que ta prise de poids a « stocké ».
 * 1 kg de masse ≈ 7 700 kcal. Il faut au moins 3 pesées sur 14 jours et 10 jours de repas notés.
 */
export function energy(k, windowDays = 35) {
  return memo("en:" + k + ":" + windowDays, () => {
    const S = L.getSettings();
    const end = addDays(k, -1), start = addDays(end, -(windowDays - 1));
    const wl = L.weightList().filter(([kk]) => kk >= start && kk <= k);
    const pts = wl.map(([kk, v]) => [daysBetween(start, kk), v]);
    const span = pts.length ? pts[pts.length - 1][0] - pts[0][0] : 0;
    const intakes = [];
    for (let x = start; x <= end; x = addDays(x, 1)) {
      const d = day(x);
      if (d.entries.length && L.dayTot(d).k >= 800) intakes.push(L.dayTot(d).k);
    }
    const need = { weighs: Math.max(0, 3 - pts.length), span: Math.max(0, 14 - span), days: Math.max(0, 10 - intakes.length) };
    const intake = avg(intakes);
    const reg = pts.length >= 2 && span >= 6 ? regress(pts) : null;
    const ok = !need.weighs && !need.span && !need.days && reg;
    if (!ok) return { ok: false, need, intake, days: intakes.length, weighs: pts.length, span, windowDays };
    const ratePerDay = reg.b;
    const tdee = intake - ratePerDay * 7700;
    const err = reg.se != null ? reg.se * 7700 : null;
    const conf = pts.length >= 5 && intakes.length >= 20 && span >= 21 ? "bonne" : pts.length >= 4 && intakes.length >= 14 ? "moyenne" : "faible";
    const forRate = (kgPerWeek) => Math.round((tdee + (kgPerWeek / 7) * 7700) / 50) * 50;
    return { ok: true, intake, tdee, err, rate: ratePerDay * 7, days: intakes.length, weighs: pts.length, span, conf, forRate, goalKcal: S.kcal, windowDays };
  });
}

/** Courbe de poids : points, tendance et projection jusqu'à l'objectif */
export function massTrend(k) {
  const S = L.getSettings();
  const list = L.weightList();
  if (!list.length) return null;
  const latest = list[list.length - 1];
  const rate = L.weeklyRate(list, k, 35);
  const since = daysBetween(latest[0], k);
  let goalAt = null;
  if (rate != null && rate > 0.05) {
    const weeks = (S.goalW - latest[1]) / rate;
    if (weeks > 0 && weeks < 260) goalAt = addDays(latest[0], Math.round(weeks * 7));
  }
  const first = list[0];
  return { list, latest, first, rate, since, goalAt, goal: S.goalW, total: latest[1] - first[1] };
}

// ═════════════════════════════════════════════════════════════
// Les 4 systèmes : état, chiffre clé, diagnostic en une ligne
// ═════════════════════════════════════════════════════════════
const ST = { ok: "Nominal", warn: "À surveiller", crit: "Critique", idle: "En attente" };
export const stName = (s) => ST[s] || "";

export function systems(k, now) {
  const S = L.getSettings();
  const d = day(k), t = L.dayTot(d);
  const p = L.pace(k, now, S);
  const pr = projection(k, now);

  // Carburant
  let fuel;
  const nightOn = L.store.get("night", null);
  if (nightOn && t.k < S.kcal) fuel = { st: t.k >= S.kcal * 0.9 ? "warn" : "crit", line: `Journée close à ${L.fint(t.k)} kcal (−${L.fint(S.kcal - t.k)}).` };
  else if (t.k >= S.kcal) fuel = { st: "ok", line: `Objectif atteint. ${t.p >= S.prot ? "Protéines aussi." : `Il manque ${L.fint(S.prot - t.p)} g de protéines.`}` };
  else if (p.frac < 0.12) fuel = { st: "idle", line: `Début de journée. ${L.fint(S.kcal)} kcal à charger.` };
  else {
    const ratio = pr ? pr.end / S.kcal : t.k / Math.max(1, p.expected);
    const st = ratio >= 0.95 ? "ok" : ratio >= 0.85 ? "warn" : "crit";
    fuel = { st, line: pr ? `Projection : ${L.fint(pr.end)} kcal (${pr.gap >= 0 ? "+" : "−"}${L.fint(Math.abs(pr.gap))}).` : `${p.diff >= 0 ? "En avance" : "En retard"} de ${L.fint(Math.abs(p.diff))} kcal sur le rythme.` };
  }
  fuel = { ...fuel, v: t.k, goal: S.kcal, prot: t.p, protGoal: S.prot, frac: p.frac, expected: p.expected, proj: pr };

  // Récupération
  const h = L.daySleepH(d);
  const st7 = L.sleepStats(k, 7);
  const debt = st7.nights.reduce((a, n) => a + Math.max(0, S.sleep - n.h), 0);
  const night = L.store.get("night", null);
  let rec;
  if (night) rec = { st: "idle", line: `Mode nuit depuis ${L.hm(night.bed)}.` };
  else if (h == null) rec = { st: "idle", line: "Nuit pas notée." };
  else rec = { st: h >= S.sleep ? "ok" : h >= S.sleep - 1 ? "warn" : "crit", line: st7.count >= 3 ? `Moyenne 7 j : ${L.fH(st7.avgH)}. Dette : ${L.fH(debt)}.` : "Encore quelques nuits pour une moyenne." };
  rec = { ...rec, v: h, goal: S.sleep, avg: st7.avgH, debt, nights: st7.nights };

  // Masse
  const mt = massTrend(k);
  let mass;
  if (!mt) mass = { st: "idle", line: "Aucune pesée. Note ton poids pour lancer la tendance." };
  else {
    const late = mt.since > 10;
    const st = mt.rate == null ? "idle" : mt.rate < 0 ? "crit" : mt.rate < 0.15 || late ? "warn" : "ok";
    mass = { st, line: late ? `Dernière pesée il y a ${mt.since} jours.` : mt.rate == null ? "Encore une pesée pour la tendance." : mt.goalAt ? `${L.fdec(mt.goal)} kg vers ${L.fmtDay(mt.goalAt, { month: "short", year: "numeric" })}.` : mt.rate <= 0.05 ? "Ça ne monte pas : il faut plus de carburant." : "" };
  }
  mass = { ...mass, mt };

  // Entraînement
  const tr = L.trainingStatus(k);
  const rd = readiness(k, now);
  const wd = (keyToDate(k).getDay() + 6) % 7; // 0 = lundi
  const expectedByNow = Math.min(3, Math.floor((wd + 1) / 7 * 3 + 0.34));
  let train;
  if (tr.todayW) train = { st: "ok", line: `${tr.todayW.title} faite. ${tr.wk}/3 cette semaine.` };
  else if (tr.due) train = { st: rd.adv.lv === "crit" ? "warn" : "ok", line: `Séance ${tr.next} aujourd'hui. Forme ${rd.pct} %.` };
  else train = { st: tr.wk >= expectedByNow ? "ok" : "warn", line: `Repos. Prochaine : séance ${tr.next}.` };
  train = { ...train, tr, rd };

  return { fuel, rec, mass, train };
}

// ═════════════════════════════════════════════════════════════
// Alertes : seulement ce qui sort de la normale
// ═════════════════════════════════════════════════════════════
export function alerts(k, now) {
  const S = L.getSettings();
  const out = [];
  const past = [1, 2, 3, 4].map((i) => day(addDays(k, -i))).filter((d) => d.entries.length);
  if (past.length >= 3) {
    const low = past.filter((d) => L.dayTot(d).k < S.kcal * 0.9);
    if (low.length >= 3) out.push({ lv: "crit", id: "kcal", t: `${low.length} jours sur ${past.length} sous 90 % des calories`, s: `Moyenne : ${L.fint(avg(past.map((d) => L.dayTot(d).k)))} kcal pour ${L.fint(S.kcal)} visées. C'est le frein n° 1 de ta prise de masse.` });
    const lowP = past.filter((d) => L.dayTot(d).p < S.prot * 0.9);
    if (lowP.length >= 3) out.push({ lv: "warn", id: "prot", t: `Protéines basses ${lowP.length} jours sur ${past.length}`, s: "Un shaker whey et lait en plus règle la question." });
  }
  const st = L.sleepStats(addDays(k, 0), 3);
  if (st.count >= 3 && st.nights.every((n) => n.h < S.sleep - 1)) out.push({ lv: "warn", id: "sleep", t: "3 nuits courtes d'affilée", s: `Moyenne ${L.fH(st.avgH)}. La récup et l'appétit en prennent un coup.` });
  const mt = massTrend(k);
  if (mt && mt.rate != null && mt.rate < -0.05) out.push({ lv: "crit", id: "loss", t: `Tu perds du poids : ${L.fdec(mt.rate, 2)} kg/sem`, s: "Sur 5 semaines. Il faut plus de calories, pas plus de sport." });
  if (mt && mt.since > 10 && !L.getWeights()[k]) out.push({ lv: "warn", id: "weigh", t: `Pas de pesée depuis ${mt.since} jours`, s: "Sans pesée, impossible de savoir si le plan marche." });
  const cr = habit("creatine", k);
  if (L.activeRituals(S).some((r) => r.id === "creatine") && cr.missed7 >= 2 && cr.grid.some((g) => g.done)) out.push({ lv: "info", id: "crea", t: `Créatine ratée ${cr.missed7} jours cette semaine`, s: "Elle marche par accumulation : c'est la régularité qui compte." });
  const lb = L.store.get("lastBackup", null);
  const logged = [...dayMap().values()].filter((d) => L.dayHasData(d)).length;
  if (logged >= 14 && (!lb || Date.now() - lb > 21 * 864e5)) out.push({ lv: "info", id: "backup", t: lb ? "Sauvegarde de plus de 3 semaines" : "Aucune sauvegarde", s: "Tes données ne vivent que sur ce téléphone. Réglages, Sauvegarde." });
  return out;
}

// ═════════════════════════════════════════════════════════════
// Ce que disent tes données (seulement quand il y en a assez)
// ═════════════════════════════════════════════════════════════
export function findings(k, n = 42) {
  return memo("find:" + k, () => {
    const S = L.getSettings();
    const out = [];
    const days = [];
    for (let i = 1; i <= n; i++) { const kk = addDays(k, -i), d = day(kk); if (d.entries.length && L.dayTot(d).k >= 800) days.push({ k: kk, d, t: L.dayTot(d) }); }
    const cmp = (a, b, min = 4) => (a.length >= min && b.length >= min ? { a: avg(a), b: avg(b), na: a.length, nb: b.length } : null);
    // 1. Nombre de repas
    const many = days.filter((x) => x.d.entries.length >= 4).map((x) => x.t.k), few = days.filter((x) => x.d.entries.length <= 3).map((x) => x.t.k);
    const c1 = cmp(many, few);
    if (c1 && Math.abs(c1.a - c1.b) >= 150) out.push({ id: "meals", t: "4 repas ou plus", v: c1.a - c1.b, s: `${L.fint(c1.a)} kcal les jours à 4 repas ou plus, ${L.fint(c1.b)} kcal à 3 ou moins.`, n: c1.na + c1.nb });
    // 2. Sommeil de la nuit d'avant
    const good = [], bad = [];
    days.forEach((x) => { const h = L.daySleepH(x.d); if (h == null) return; (h >= S.sleep ? good : bad).push(x.t.k); });
    const c2 = cmp(good, bad);
    if (c2 && Math.abs(c2.a - c2.b) >= 150) out.push({ id: "sleep", t: "Bien dormir", v: c2.a - c2.b, s: `${L.fint(c2.a)} kcal après une nuit de ${L.fdec(S.sleep)} h ou plus, ${L.fint(c2.b)} kcal après une nuit plus courte.`, n: c2.na + c2.nb });
    // 3. Jours de séance
    const tr = [], rest = [];
    days.forEach((x) => (workoutsOn(x.k).length ? tr : rest).push(x.t.k));
    const c3 = cmp(tr, rest, 3);
    if (c3 && Math.abs(c3.a - c3.b) >= 150) out.push({ id: "train", t: "Jours de séance", v: c3.a - c3.b, s: `${L.fint(c3.a)} kcal les jours de séance, ${L.fint(c3.b)} kcal les jours de repos.`, n: c3.na + c3.nb });
    // 4. Heure de coucher et durée de sommeil
    const nights = L.sleepStats(addDays(k, 0), n).nights.filter((x) => x.bed != null);
    if (nights.length >= 8) {
      const med = [...nights].sort((a, b) => a.bed - b.bed)[Math.floor(nights.length / 2)].bed;
      const early = nights.filter((x) => x.bed < med).map((x) => x.h), lateN = nights.filter((x) => x.bed >= med).map((x) => x.h);
      const c4 = cmp(early, lateN);
      if (c4 && Math.abs(c4.a - c4.b) >= 0.33) out.push({ id: "bed", t: "Heure de coucher", v: (c4.a - c4.b) * 60, unit: "min", s: `${L.fH(c4.a)} de sommeil quand tu te couches avant ${L.nightMinToHM(med)}, ${L.fH(c4.b)} après.`, n: c4.na + c4.nb });
    }
    return out;
  });
}

// ═════════════════════════════════════════════════════════════
// Régularité : 5 semaines en carte de chaleur
// ═════════════════════════════════════════════════════════════
export function heat(k, weeks = 5) {
  const S = L.getSettings();
  const start = addDays(L.weekStartKey(k), -7 * (weeks - 1));
  const rit = L.activeRituals(S);
  const rows = [
    { id: "kcal", n: "Calories", f: (d) => (d.entries.length ? L.dayTot(d).k / S.kcal : null) },
    { id: "prot", n: "Protéines", f: (d) => (d.entries.length ? L.dayTot(d).p / S.prot : null) },
    { id: "sleep", n: "Sommeil", f: (d) => { const h = L.daySleepH(d); return h != null ? h / S.sleep : null; } },
    { id: "train", n: "Séance", f: (d, kk) => (workoutsOn(kk).length ? 1 : null) },
    { id: "rit", n: "Protocole", f: (d) => (rit.length && L.dayHasData(d) ? rit.filter((r) => L.ritualDone(r.id, d, S)).length / rit.length : null) },
  ];
  const cols = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  return { cols, rows: rows.map((r) => ({ ...r, v: cols.map((kk) => (kk > k ? undefined : r.f(day(kk), kk))) })) };
}

/** Moyennes sur une période (pour le tableau de l'Analyse) */
export function averages(k, n) {
  const S = L.getSettings();
  const kc = [], pr = [], sl = [];
  for (let i = 1; i <= n; i++) {
    const d = day(addDays(k, -i));
    if (d.entries.length && L.dayTot(d).k >= 800) { kc.push(L.dayTot(d).k); pr.push(L.dayTot(d).p); }
    const h = L.daySleepH(d); if (h != null) sl.push(h);
  }
  const ws = L.getWorkouts().filter((w) => { const kk = L.logicalKey(new Date(w.date), S.dayStart); return kk >= addDays(k, -n) && kk < k; });
  return { kcal: avg(kc), prot: avg(pr), sleep: avg(sl), sessions: ws.length, days: kc.length, n };
}

// ═════════════════════════════════════════════════════════════
// Mobilité : 4 tests, réussi / presque / pas encore
// ═════════════════════════════════════════════════════════════
export const MOB_TESTS = [
  { id: "toes", n: "Toucher ses pieds", how: "Debout, jambes tendues, descends doucement les mains.", lv: ["Genoux", "Tibias", "Pieds"] },
  { id: "squat", n: "Accroupi pieds à plat", how: "Talons au sol, tiens 30 s sans te tenir.", lv: ["Impossible", "Talons levés", "Pieds à plat"] },
  { id: "overhead", n: "Bras au-dessus de la tête", how: "Dos au mur, lève les bras tendus sans cambrer.", lv: ["Le dos se cambre", "Presque", "Pouces au mur"] },
  { id: "cross", n: "Assis en tailleur", how: "Dos droit, 1 min, sans appui des mains.", lv: ["Impossible", "Dos rond", "Dos droit"] },
];
export const getMob = () => { const m = L.store.get("mob", {}); return m && typeof m === "object" ? m : {}; };
export function setMob(id, lv, k) {
  const m = getMob();
  const list = Array.isArray(m[id]) ? m[id].filter((x) => x.k !== k) : [];
  L.store.set("mob", { ...m, [id]: [...list, { k, lv }].sort((a, b) => a.k.localeCompare(b.k)) });
}
