import { BASE_FOODS, PROGRAM, SEED_WORKOUTS, SEED_FAVS } from "./data.js";

// ═════════════════════════════════════════════════════════════
// Stockage local (même navigateur = mêmes données qu'avant)
// ═════════════════════════════════════════════════════════════
const PFX = "t2:";
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const readRaw = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeRaw = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn("Stockage plein ou bloqué", e); return false; } };

export const store = {
  get(k, fb) { const s = readRaw(PFX + k); if (s == null) return fb; try { return JSON.parse(s); } catch { return fb; } },
  set(k, v) { writeRaw(PFX + k, JSON.stringify(v)); emit(); },
  del(k) { try { localStorage.removeItem(PFX + k); } catch {} emit(); },
  // clés de l'ancienne version (poids, clé API) : même format JSON qu'avant
  rawGet(k, fb) { const s = readRaw(k); if (s == null) return fb; try { return JSON.parse(s); } catch { return fb; } },
  rawSet(k, v) { writeRaw(k, JSON.stringify(v)); emit(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit,
};

export const DEFAULTS = { kcal: 3000, prot: 100, water: 2.5, sleep: 7.5, goalW: 76, weighDay: 1, lat: 15, dayStart: 5 };
export const getSettings = () => ({ ...DEFAULTS, ...store.get("settings", {}) });
export const setSettings = (patch) => store.set("settings", { ...store.get("settings", {}), ...patch });

// ═════════════════════════════════════════════════════════════
// Dates — toujours en heure LOCALE (Perth), jamais en UTC
// Le « jour » bascule à 5 h du matin (réglable) : un encas à 1 h
// compte pour la veille, comme dans ta vraie vie.
// ═════════════════════════════════════════════════════════════
export const pad = (n) => String(n).padStart(2, "0");
export const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const logicalKey = (date = new Date(), dayStart = getSettings().dayStart) => dkey(new Date(date.getTime() - dayStart * 3600e3));
export const keyToDate = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12, 0, 0); };
export const addDays = (k, n) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return dkey(d); };
export const weekStartKey = (k) => { const d = keyToDate(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dkey(d); };
export const hm = (date) => { const d = new Date(date); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDay = (k, opts = { weekday: "long", day: "numeric", month: "long" }) => keyToDate(k).toLocaleDateString("fr-FR", opts);
export const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 864e5);
export const localISO = (d) => `${dkey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

// ═════════════════════════════════════════════════════════════
// Formatage
// ═════════════════════════════════════════════════════════════
export const fint = (n) => Math.round(n || 0).toLocaleString("fr-FR");
export const fdec = (n, d = 1) => (Math.round((n || 0) * 10 ** d) / 10 ** d).toLocaleString("fr-FR");
export const fkg = (w) => `${fdec(w, 2)} kg`;
export const fH = (h) => { if (h == null) return "–"; const t = Math.round(h * 60); return `${Math.floor(t / 60)} h ${pad(t % 60)}`; };
export const num = (s) => { const v = parseFloat(String(s ?? "").replace(",", ".").replace(/[^\d.\-]/g, "")); return Number.isFinite(v) ? v : null; };
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ═════════════════════════════════════════════════════════════
// Aliments
// ═════════════════════════════════════════════════════════════
export const norm = (s) => (s || "").toString().toLowerCase()
  .replace(/œ/g, "oe").replace(/æ/g, "ae")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[’'`´]/g, " ")
  .replace(/[^a-z0-9.,½¼/\s]/g, " ")
  .replace(/\s+/g, " ").trim();

const prepFood = (f, custom) => ({ ...f, custom: !!custom, al: [...new Set([f.n, ...(f.a || [])].map(norm).filter(Boolean))] });
const BASE = BASE_FOODS.map((f) => prepFood(f, false));
export const getCustomFoods = () => store.get("foods", []);
export const allFoods = () => {
  const custom = getCustomFoods();
  const hidden = new Set(custom.map((f) => f.over).filter(Boolean)); // tes versions remplacent celles de base
  return [...custom.map((f) => prepFood(f, true)), ...BASE.filter((f) => !hidden.has(f.id))];
};
export const findFood = (id) => allFoods().find((f) => f.id === id) || null;
export const perOf = (f) => ({ k: f.k || 0, p: f.p || 0, c: f.c || 0, f: f.f || 0 });
export const defaultGrams = (f) => f.def || f.u?.g || 100;
export const itemFromFood = (f, g) => ({ name: f.n, fid: f.id, g: Math.round(g ?? defaultGrams(f)), per: perOf(f), src: f.custom ? "perso" : "base" });

export const saveCustomFood = (food) => {
  const list = getCustomFoods();
  const i = list.findIndex((x) => x.id === food.id);
  if (i >= 0) list[i] = food; else list.unshift(food);
  store.set("foods", list);
  return food;
};
export const deleteCustomFood = (id) => store.set("foods", getCustomFoods().filter((x) => x.id !== id));

export const searchFoods = (q) => {
  const t = norm(q);
  const foods = allFoods();
  if (!t) return foods;
  const scored = [];
  for (const f of foods) {
    let best = -1;
    for (const a of f.al) {
      if (a === t) best = Math.max(best, 3);
      else if (a.startsWith(t)) best = Math.max(best, 2);
      else if (a.includes(t)) best = Math.max(best, 1);
    }
    if (best >= 0) scored.push([best + (f.custom ? 0.5 : 0), f]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1]);
};

// Distance d'édition (pour les fautes de frappe : « cacahouete », « yogourt »…)
const lev = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

// Corrige les fautes de frappe mot par mot (« cacahouete » → « cacahuete », « coma » → « coca »)
const fixTypos = (t, foods) => {
  const vocab = new Set();
  foods.forEach((f) => f.al.forEach((a) => a.split(" ").forEach((w) => { if (w.length >= 4) vocab.add(w); })));
  return t.split(" ").map((w) => {
    if (w.length < 4 || !/^[a-z]+$/.test(w) || vocab.has(w) || FILLER.has(w)) return w;
    let best = w, bd = 9;
    vocab.forEach((v) => { const d = lev(w, v), max = v.length >= 7 ? 2 : 1; if (d <= max && d < bd) { bd = d; best = v; } });
    return best;
  }).join(" ");
};

// Mots qui ne changent rien aux valeurs : s'il reste autre chose, l'aliment est « à vérifier »
const FILLER = new Set(["de", "du", "d", "la", "le", "les", "l", "des", "au", "aux", "a", "en", "et", "avec", "dedans", "dans", "cuit", "cuite", "cuits", "cuites",
  "cru", "crue", "crus", "crues", "surgele", "surgelee", "surgeles", "surgelees", "frais", "fraiche", "fraiches", "entier", "entiere", "nature", "blanc", "blanche",
  "environ", "env", "approx", "gros", "grosse", "petit", "petite", "petits", "moyen", "moyenne", "grand", "grande", "bien", "mon", "ma", "mes", "peu", "pot", "sachet",
  "portion", "morceau", "morceaux", "fine", "fines", "rape", "rapee", "x", "pour", "sur", "the", "of", "chacun", "chacune", "total", "fait", "faite"]);

const matchFood = (t, foods) => {
  // correspondance d'un alias (le plus long gagne : « beurre de cacahuète » bat « beurre »)
  let best = null, len = 0, alias = "";
  const padded = " " + t;
  for (const f of foods) for (const a of f.al) {
    if (a.length > len && padded.includes(" " + a)) { best = f; len = a.length; alias = a; }
  }
  if (!best) return null;
  const aw = alias.split(" ");
  const leftover = t.split(" ").filter((w) => w && !FILLER.has(w) && !/^\d/.test(w) && !aw.some((x) => w.startsWith(x) || x.startsWith(w)));
  return { f: best, sure: leftover.length === 0, extra: leftover.join(" ") };
};

const NUMW = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, demi: 0.5, demie: 0.5 };
const COUNT_UNITS = /^(tranches?|pieces?|pcs?|canettes?|cannettes?|boites?|verres?|gousses?|doses?|scoops?|poignees?|carres?|bols?|tasses?|wraps?|oeufs?)$/;
const QRE = /(\d+(?:\.\d+)?|½|¼|\b(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|demi|demie)\b)\s*(kg|kilos?|g|gr|grs|grammes?|ml|cl|l|litres?|cs|cc|tranches?|pieces?|pcs?|canettes?|cannettes?|boites?|verres?|gousses?|doses?|scoops?|poignees?|carres?|bols?|tasses?)?(?![a-z])/;

const unitNorm = (t) => t
  .replace(/\b(\d{1,2})h(\d{2})?\b/g, " ") // heures « 16h30 » : pas une quantité
  .replace(/\b(cuil+(?:ere|eres|eree)?s?|cuil)\s*(?:a\s*)?soupe\b/g, " cs ")
  .replace(/\b(cuil+(?:ere|eres)?s?|cuil)\s*(?:a\s*)?cafe\b/g, " cc ")
  .replace(/\b(grosses?\s+cuilleres?|tbsp)\b/g, " cs ")
  .replace(/\b(petites?\s+cuilleres?|tsp)\b/g, " cc ")
  .replace(/\bc\s?\.?\s?a?\s?\.?\s?s\b\.?/g, " cs ")
  .replace(/\bc\s?\.?\s?a?\s?\.?\s?c\b\.?/g, " cc ")
  .replace(/\s+/g, " ").trim();

const toGrams = (f, n, unit) => {
  const d = f.d || 1;
  if (unit == null) {
    if (n == null) return f.def ?? null;
    if (n >= 10) return n; // « riz 160 » → 160 g
    if (f.u) return n * f.u.g;
    if (f.def) return n * f.def;
    return null;
  }
  if (unit === "cs") return n * (f.cs || 15 * d);
  if (unit === "cc") return n * (f.cc || 5 * d);
  const u = unit.replace(/s$/, "");
  if (u === "kg" || u === "kilo") return n * 1000;
  if (["g", "gr", "gramme"].includes(u) || unit === "grs") return n;
  if (u === "ml") return n * d;
  if (u === "cl") return n * 10 * d;
  if (u === "l" || u === "litre") return n * 1000 * d;
  if (COUNT_UNITS.test(unit)) {
    if (f.u) return n * f.u.g;
    if (u === "verre" || u === "tasse") return n * 250 * d;
    if (u === "bol") return n * 300;
    if (u === "dose" || u === "scoop") return n * 30;
    if (f.def) return n * f.def;
    return null;
  }
  return null;
};

const NOISE = /^(bol|repas|plat|assiette|dans|dedans|le tout|tout|maison|midi|soir|matin|petit dej|petit dejeuner|dejeuner|diner|encas|collation|snack|shaker|smoothie|melange|sauce|de|du|la|le|les|des|un peu|sel|poivre|epices?|sel poivre|a la poele|a l eau)$/;

/**
 * Lit un texte du type « 196 ml lait entier, 90 g flocons d'avoine… »
 * et le transforme en aliments de ta base, sans IA ni internet.
 */
export function parseFoodText(text) {
  const foods = allFoods();
  const prepared = String(text || "")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(\d+)\s*\/\s*(\d+)/g, (m, a, b) => (+b ? String(+a / +b) : m))
    .replace(/[()[\]{}]/g, ",");
  const chunks = prepared.split(/\n|,|;|\+|\bet\b|\bavec\b|\bpuis\b/i).map((c) => c.trim()).filter(Boolean);
  const rows = [];
  for (const raw of chunks) {
    const t = unitNorm(norm(raw));
    if (!t) continue;
    let n = null, unit = null, rest = t;
    const m = t.match(QRE);
    if (m) {
      const v = m[1];
      n = v === "½" ? 0.5 : v === "¼" ? 0.25 : NUMW[v] ?? parseFloat(v);
      unit = m[2] || null;
      rest = (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
    }
    rest = fixTypos(rest, foods);
    const mf = rest ? matchFood(rest, foods) : null;
    rows.push({ raw: raw.trim(), t: rest, n, unit, f: mf?.f || null, sure: mf ? mf.sure : true, extra: mf?.extra || "" });
  }
  // une quantité seule (« ≈120g ») va avec l'aliment voisin qui n'en a pas
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.f || r.n == null) continue;
    const prev = rows[i - 1], next = rows[i + 1];
    const target = prev && prev.f && prev.n == null ? prev : next && next.f && next.n == null ? next : null;
    if (target) { target.n = r.n; target.unit = r.unit; r.used = true; }
  }
  const items = [], unmatched = [];
  for (const r of rows) {
    if (r.used) continue;
    if (!r.f) {
      if (r.t && /[a-z]{3,}/.test(r.t) && !NOISE.test(r.t)) unmatched.push(r.raw);
      continue;
    }
    const g = toGrams(r.f, r.n, r.unit);
    items.push({ ...itemFromFood(r.f, g ?? 0), g: g == null ? null : Math.round(g), raw: r.raw, ...(r.sure ? {} : { unsure: r.extra }) });
  }
  return { items, unmatched };
}

// ═════════════════════════════════════════════════════════════
// Calculs nutrition
// ═════════════════════════════════════════════════════════════
export const itemTot = (it) => { const m = (+it.g || 0) / 100, P = it.per || {}; return { k: (P.k || 0) * m, p: (P.p || 0) * m, c: (P.c || 0) * m, f: (P.f || 0) * m }; };
export const sumTot = (arr) => arr.reduce((a, t) => ({ k: a.k + t.k, p: a.p + t.p, c: a.c + t.c, f: a.f + t.f }), { k: 0, p: 0, c: 0, f: 0 });
export const itemsTot = (items) => sumTot((items || []).map(itemTot));
export const entryTot = (e) => itemsTot(e.items);

// ═════════════════════════════════════════════════════════════
// Journées
// ═════════════════════════════════════════════════════════════
export const emptyDay = () => ({ entries: [], water: 0, h: {} });
export const getDay = (k) => { const d = store.get("day:" + k, null); return d ? { ...emptyDay(), ...d, h: { ...(d.h || {}) }, entries: d.entries || [] } : emptyDay(); };
export const setDay = (k, d) => store.set("day:" + k, d);
export const updDay = (k, fn) => setDay(k, fn(getDay(k)));
export const dayTot = (d) => { const t = sumTot(d.entries.map(entryTot)); if (!d.entries.length && d.legacy?.kcal) t.k = d.legacy.kcal; return t; };
export const hasFood = (d) => d.entries.length > 0 || !!d.legacy?.kcal;
export const dayHasData = (d) => hasFood(d) || !!d.water || !!d.sleep || Object.values(d.h).some(Boolean) || !!d.legacy;
export const creatineDone = (d) => !!d.h.creatine || d.entries.some((e) => e.items.some((i) => i.fid === "creatine"));

export const mealLabel = (date = new Date()) => {
  const m = date.getHours() * 60 + date.getMinutes();
  if (m >= 300 && m < 630) return "Petit-déj";
  if (m >= 630 && m < 870) return "Déjeuner";
  if (m >= 870 && m < 1080) return "Collation";
  if (m >= 1080 && m < 1350) return "Dîner";
  return "Encas de nuit";
};

export function addEntry(k, items, label, time) {
  const custom = learnFoods(items);
  updDay(k, (d) => ({ ...d, entries: [...d.entries, { id: uid(), t: time || hm(new Date()), label: label || mealLabel(), items: custom }].sort((a, b) => sortTime(a.t) - sortTime(b.t)) }));
}
export function appendToEntry(k, entryId, items) {
  const custom = learnFoods(items);
  updDay(k, (d) => ({ ...d, entries: d.entries.map((e) => (e.id === entryId ? { ...e, items: [...e.items, ...custom] } : e)) }));
}
// les heures d'après minuit passent après celles du soir (jour de 5 h à 5 h)
const sortTime = (t) => { const [h, m] = (t || "12:00").split(":").map(Number); return ((h < 5 ? h + 24 : h) * 60) + m; };

// Un aliment estimé par l'IA est ajouté à « Mes aliments » :
// la prochaine fois, mêmes valeurs, même résultat.
function learnFoods(items) {
  return items.filter((it) => (+it.g || 0) > 0 || it.fid === "creatine").map((it) => {
    const clean = { name: it.name, fid: it.fid || null, g: Math.round(+it.g || 0), per: it.per };
    if (it.isNew && !it.fid) {
      const existing = getCustomFoods().find((f) => norm(f.n) === norm(it.name));
      const aliases = [...new Set([it.name, it.name.replace(/\(.*?\)/g, " ").split(",")[0], it.words || ""].map(norm).filter((a) => a.length >= 3))];
      const food = existing || saveCustomFood({ id: "c_" + uid(), n: cap(it.name), a: aliases, k: round1(it.per.k), p: round1(it.per.p), c: round1(it.per.c), f: round1(it.per.f), src: "ia" });
      clean.fid = food.id;
      clean.name = food.n;
      clean.per = perOf(food);
    }
    return clean;
  });
}
const round1 = (x) => Math.round((+x || 0) * 10) / 10;

// ═════════════════════════════════════════════════════════════
// Sommeil — une nuit appartient au jour où tu te réveilles
// ═════════════════════════════════════════════════════════════
export const sleepHours = (s) => {
  if (!s?.bed || !s?.wake) return null;
  const h = (new Date(s.wake) - new Date(s.bed)) / 3.6e6 - (s.lat ?? 15) / 60;
  return h > 0 && h < 20 ? h : null;
};
export const daySleepH = (d) => sleepHours(d.sleep) ?? d.legacy?.sleepH ?? null;
// minutes écoulées depuis 18 h (pour faire des moyennes d'heure de coucher qui passent minuit)
export const nightMin = (iso) => { const d = new Date(iso); return (d.getHours() * 60 + d.getMinutes() - 1080 + 1440) % 1440; };
export const nightMinToHM = (m) => { const t = (Math.round(m) + 1080) % 1440; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
export function nightFromTimes(k, bedHM, wakeHM) {
  const [bh, bm] = bedHM.split(":").map(Number), [wh, wm] = wakeHM.split(":").map(Number);
  const base = keyToDate(k);
  const wake = new Date(base.getFullYear(), base.getMonth(), base.getDate(), wh, wm);
  const bed = new Date(base.getFullYear(), base.getMonth(), base.getDate(), bh, bm);
  if (bed >= wake) bed.setDate(bed.getDate() - 1);
  return { bed: bed.toISOString(), wake: wake.toISOString() };
}
export function sleepStats(endK, n) {
  const nights = [];
  for (let i = 0; i < n; i++) {
    const k = addDays(endK, -i), d = getDay(k), h = daySleepH(d);
    if (h != null) nights.push({ k, h, bed: d.sleep?.bed ? nightMin(d.sleep.bed) : null, wake: d.sleep?.wake ? nightMin(d.sleep.wake) : null, q: d.sleep?.q });
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const beds = nights.map((x) => x.bed).filter((x) => x != null);
  return { nights, avgH: avg(nights.map((x) => x.h)), avgBed: avg(beds), count: nights.length };
}

// ═════════════════════════════════════════════════════════════
// Score du jour
// ═════════════════════════════════════════════════════════════
export function dayChecks(d, S) {
  const t = dayTot(d), sh = daySleepH(d);
  const list = [
    { id: "kcal", ic: "🔥", label: "Calories", ok: t.k >= S.kcal },
    { id: "prot", ic: "🥩", label: "Protéines", ok: t.p >= S.prot },
    { id: "sleep", ic: "😴", label: "Sommeil", ok: sh != null && sh >= S.sleep },
    { id: "water", ic: "💧", label: "Eau", ok: (d.water || 0) >= S.water },
    { id: "light", ic: "☀️", label: "Lumière", ok: !!d.h.light },
    { id: "creatine", ic: "💊", label: "Créatine", ok: creatineDone(d) },
  ];
  return list;
}
export function dayScore(d, S) {
  const checks = dayChecks(d, S), n = checks.filter((c) => c.ok).length;
  return { n, max: checks.length, pct: Math.round((n / checks.length) * 100), checks };
}
export function kcalStreak(todayK, S) {
  const ok = (k) => dayTot(getDay(k)).k >= S.kcal * 0.9;
  let k = todayK, s = 0;
  if (!ok(k)) k = addDays(k, -1);
  while (s < 400 && ok(k)) { s++; k = addDays(k, -1); }
  return s;
}

// ═════════════════════════════════════════════════════════════
// Poids (même clé que l'ancienne version : ton historique est gardé)
// ═════════════════════════════════════════════════════════════
export const getWeights = () => store.rawGet("iwt", {}) || {};
export const setWeights = (w) => store.rawSet("iwt", w);
export const weightList = () => Object.entries(getWeights()).filter(([, v]) => typeof v === "number" && v > 20).sort(([a], [b]) => a.localeCompare(b));
export function weeklyRate(list, endK, days = 35) {
  const pts = list.filter(([k]) => daysBetween(k, endK) <= days && daysBetween(k, endK) >= 0).map(([k, v]) => [-daysBetween(k, endK), v]);
  if (pts.length < 2) return null;
  const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
  const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const den = n * sxx - sx * sx;
  if (!den) return null;
  const span = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
  if (span < 6) return null;
  return ((n * sxy - sx * sy) / den) * 7;
}

// ═════════════════════════════════════════════════════════════
// Entraînement
// ═════════════════════════════════════════════════════════════
export const ALL_EX = PROGRAM.flatMap((d) => d.exs.map((e) => ({ ...e, day: d.day })));
export const getWorkouts = () => store.get("workouts", []).slice().sort((a, b) => b.date.localeCompare(a.date));
export const setWorkouts = (list) => store.set("workouts", list.slice().sort((a, b) => b.date.localeCompare(a.date)));
const STOP = new Set(["a", "de", "le", "la", "les", "du", "des", "vers", "en", "au", "aux", "avec", "sur", "the", "with", "on", "machine", "et"]);
const toks = (s) => new Set(norm(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w && !STOP.has(w)));
const jacc = (A, B) => { let i = 0; A.forEach((x) => { if (B.has(x)) i++; }); return i / (A.size + B.size - i || 1); };

export function matchExercise(name, preferDay) {
  const T = toks(name), nn = norm(name);
  let best = null, bs = 0;
  for (const e of ALL_EX) {
    for (const cand of [e.name, ...e.a]) {
      let sc = norm(cand) === nn ? 1.01 : jacc(T, toks(cand));
      if (preferDay && e.day === preferDay) sc += 0.04;
      if (sc > bs) { bs = sc; best = e; }
    }
  }
  return bs >= 0.6 ? best : null;
}

const MONTHS = [["janv", 0], ["jan", 0], ["fevr", 1], ["fev", 1], ["feb", 1], ["mars", 2], ["mar", 2], ["avr", 3], ["apr", 3], ["mai", 4], ["may", 4], ["juin", 5], ["jun", 5], ["juil", 6], ["jul", 6], ["aout", 7], ["aug", 7], ["sept", 8], ["sep", 8], ["oct", 9], ["nov", 10], ["dec", 11]];
const monthOf = (tok) => { for (const [p, m] of MONTHS) if (tok.startsWith(p)) return m; return null; };
function parseHevyDate(line) {
  const s = line.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let m = s.match(/([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s+(?:a|at)\s+(\d{1,2})[:h](\d{2})\s*(am|pm)?)?/);
  let y, mo, d, H = 12, M = 0, ap;
  if (m && monthOf(m[1]) != null) { mo = monthOf(m[1]); d = +m[2]; y = +m[3]; if (m[4]) { H = +m[4]; M = +m[5]; ap = m[6]; } }
  else {
    m = s.match(/(\d{1,2})\s+([a-z]{3,9})\.?\s+(\d{4})(?:\s+(?:a|at)\s+(\d{1,2})[:h](\d{2})\s*(am|pm)?)?/);
    if (!m || monthOf(m[2]) == null) return null;
    d = +m[1]; mo = monthOf(m[2]); y = +m[3]; if (m[4]) { H = +m[4]; M = +m[5]; ap = m[6]; }
  }
  if (ap === "pm" && H < 12) H += 12;
  if (ap === "am" && H === 12) H = 0;
  return localISO(new Date(y, mo, d, H, M));
}

/** Lit le texte « Partager » de Hevy */
export function parseHevy(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.trim());
  const SET = /^(?:s[ée]rie|set|warm[- ]?up|[ée]chauffement)\b[^:]*:\s*(.*)$/i;
  let title = "", date = null, url = null, lastText = null, fresh = false;
  const exercises = [];
  for (const l of lines) {
    if (!l) continue;
    const u = l.match(/https?:\/\/(?:www\.)?hevy\.com\/\S+/i);
    if (u) { url = u[0]; continue; }
    if (/^@hevy/i.test(l)) continue;
    if (!title) { title = l; continue; }
    if (!date) { const d = parseHevyDate(l); if (d) { date = d; continue; } }
    const sm = l.match(SET);
    if (sm) {
      if (fresh || !exercises.length) { exercises.push({ name: lastText || "Exercice", sets: [] }); fresh = false; }
      const v = sm[1];
      const wm = v.match(/(\d+(?:[.,]\d+)?)\s*(kg|lbs?)/i);
      let w = wm ? parseFloat(wm[1].replace(",", ".")) : 0;
      if (wm && /lb/i.test(wm[2])) w = Math.round(w * 0.4536 * 4) / 4;
      const rm = v.match(/[x×]\s*(\d+)/i) || v.match(/(\d+)\s*(?:reps?|r[ée]p)/i);
      const r = rm ? +rm[1] : 0;
      const warm = /chauff|warm/i.test(l);
      exercises[exercises.length - 1].sets.push({ w, r, ...(warm ? { warm: true } : {}) });
      continue;
    }
    lastText = l; fresh = true;
  }
  const exs = exercises.filter((e) => e.sets.length);
  const letter = (title.match(/\b([ABC])\b/) || [])[1] || null;
  let session = letter;
  if (!session) {
    const votes = {};
    exs.forEach((e) => { const m = matchExercise(e.name); if (m) votes[m.day] = (votes[m.day] || 0) + 1; });
    session = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }
  exs.forEach((e) => { const m = matchExercise(e.name, session); e.key = m ? m.key : null; });
  return { title: title || "Séance", date: date || localISO(new Date()), url, session, exercises: exs };
}

export function lastPerf(key, workouts) {
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.key === key);
    if (ex && ex.sets.some((s) => !s.warm && s.r > 0)) return { w, ex };
  }
  return null;
}
export const e1rm = (w, r) => (w > 0 ? w * (1 + r / 30) : r);

/** Prochaine charge : on monte quand le haut de la fourchette est atteint partout */
export function suggest(pe, workouts) {
  const lp = lastPerf(pe.key, workouts);
  if (!lp) return { status: "new", weight: pe.start || null };
  const sets = lp.ex.sets.filter((s) => !s.warm && s.r > 0);
  const W = Math.max(...sets.map((s) => s.w));
  const work = sets.filter((s) => s.w === W);
  const reps = work.map((s) => s.r);
  const enough = work.length >= Math.max(1, pe.sets - 1);
  const allTop = enough && reps.every((r) => r >= pe.max);
  const drop = reps.length >= 2 && reps[reps.length - 1] <= reps[0] * 0.6;
  const base = { last: { W, reps, all: sets }, date: lp.w.date, drop };
  if (allTop) return { ...base, status: "up", weight: W > 0 ? Math.round((W + pe.inc) * 100) / 100 : 0 };
  return { ...base, status: "hold", weight: W };
}
export function exHistory(key, workouts, n = 6) {
  const out = [];
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.key === key);
    if (ex) out.push({ date: w.date, sets: ex.sets.filter((s) => !s.warm), best: Math.max(0, ...ex.sets.filter((s) => !s.warm).map((s) => e1rm(s.w, s.r))) });
    if (out.length >= n) break;
  }
  return out;
}
export function weekWorkouts(todayK, workouts) {
  const ws = weekStartKey(todayK), we = addDays(ws, 7);
  return workouts.filter((w) => { const k = w.date.slice(0, 10); return k >= ws && k < we; });
}
export function nextSession(workouts) {
  const last = workouts.find((w) => ["A", "B", "C"].includes(w.session));
  return last ? { A: "B", B: "C", C: "A" }[last.session] : "A";
}
export const workoutSets = (w) => w.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.warm).length, 0);
export const workoutVolume = (w) => w.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.warm).reduce((b, s) => b + s.w * s.r, 0), 0);

// ═════════════════════════════════════════════════════════════
// Favoris
// ═════════════════════════════════════════════════════════════
export const getFavs = () => store.get("favs", []);
export const setFavs = (f) => store.set("favs", f);
export const saveFav = (name, items) => setFavs([{ id: uid(), name, items: items.map((i) => ({ name: i.name, fid: i.fid || null, g: i.g, per: i.per })) }, ...getFavs()]);

// ═════════════════════════════════════════════════════════════
// Première ouverture : reprise des anciennes données + valeurs de départ
// ═════════════════════════════════════════════════════════════
const legacySleep = (b, w) => {
  if (!b || !w) return null;
  const [bh, bm] = b.split(":").map(Number), [wh, wm] = w.split(":").map(Number);
  let bed = bh * 60 + bm + 30, wake = wh * 60 + wm;
  if (wake <= bed - 30) wake += 1440;
  const d = (wake - bed) / 60;
  return d > 0 && d < 20 ? d : null;
};
export function migrateAndSeed() {
  if (!store.get("migrated", false)) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      const dates = new Set();
      keys.forEach((k) => { const m = k && k.match(/^(?:id_|ik_)(\d{4}-\d{2}-\d{2})$/); if (m) dates.add(m[1]); });
      dates.forEach((date) => {
        if (store.get("day:" + date, null)) return;
        const old = (() => { try { return JSON.parse(readRaw("id_" + date) || "{}") || {}; } catch { return {}; } })();
        const kc = (() => { try { return JSON.parse(readRaw("ik_" + date) || "{}") || {}; } catch { return {}; } })();
        const kcal = Math.round(Object.values(kc).reduce((s, v) => s + (v && v.total ? +v.total : 0), 0));
        const sleepH = legacySleep(old.bed, old.wake);
        const meals = Object.values(old.meals || {}).filter(Boolean).length;
        if (kcal || sleepH || meals || old.water || old.skm || old.sks)
          writeRaw(PFX + "day:" + date, JSON.stringify({ entries: [], water: old.water || 0, h: { skm: !!old.skm, sks: !!old.sks }, legacy: { kcal, sleepH, meals } }));
      });
    } catch (e) { console.warn(e); }
    writeRaw(PFX + "migrated", "true");
  }
  if (!store.get("seeded", false)) {
    if (!store.get("workouts", null)) writeRaw(PFX + "workouts", JSON.stringify(SEED_WORKOUTS));
    if (!store.get("favs", null)) {
      const favs = SEED_FAVS.map((f) => ({ id: f.id, name: f.name, items: f.items.map(([id, g]) => { const food = BASE.find((x) => x.id === id); return { name: food.n, fid: id, g, per: perOf(food) }; }) }));
      writeRaw(PFX + "favs", JSON.stringify(favs));
    }
    writeRaw(PFX + "seeded", "true");
  }
}

// ═════════════════════════════════════════════════════════════
// Sauvegarde (sans la clé API)
// ═════════════════════════════════════════════════════════════
export function exportData() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(PFX) || k === "iwt")) data[k] = localStorage.getItem(k);
    }
  } catch {}
  return JSON.stringify({ app: "isma-daily", v: 2, at: new Date().toISOString(), data });
}
export function importData(json) {
  const o = JSON.parse(json);
  if (!o || o.app !== "isma-daily" || !o.data) throw new Error("Ce n'est pas une sauvegarde de l'app.");
  Object.entries(o.data).forEach(([k, v]) => { if (k.startsWith(PFX) || k === "iwt") writeRaw(k, v); });
  emit();
}

// ═════════════════════════════════════════════════════════════
// IA (Claude) — uniquement pour photo, étiquette, textes non reconnus et coach
// ═════════════════════════════════════════════════════════════
export const MODEL = "claude-sonnet-5-5";
export const getApiKey = () => { const k = store.rawGet("iak", ""); return typeof k === "string" ? k : ""; };
export const setApiKey = (k) => store.rawSet("iak", k);

const apiErr = (st, m) => {
  if (st === 401) return "Clé API refusée. Vérifie-la dans ⚙️ Réglages.";
  if (/credit|balance|billing/i.test(m)) return "Plus de crédit sur ton compte API (console.anthropic.com → Billing).";
  if (st === 403) return "Cette clé n'a pas accès à ce modèle.";
  if (st === 404) return "Modèle introuvable avec cette clé.";
  if (st === 429) return "Trop de demandes d'un coup. Réessaie dans une minute.";
  if (st === 529 || st >= 500) return "Les serveurs de Claude sont saturés. Réessaie dans un instant.";
  return `Erreur ${st}${m ? " : " + m : ""}`;
};

async function callClaude({ system, messages, schema, effort = "low", think = false, maxTokens = 2500 }) {
  const key = getApiKey();
  if (!key) throw new Error("Ajoute ta clé API dans ⚙️ Réglages pour utiliser l'IA.");
  const body = { model: MODEL, max_tokens: maxTokens, messages, thinking: think ? { type: "adaptive" } : { type: "between_tools" }, output_config: { effort } };
  if (schema) body.output_config.format = { type: "json_schema", schema };
  if (system) body.system = system;
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify(body),
    });
  } catch { throw new Error("Pas de connexion internet."); }
  if (!r.ok) { let m = ""; try { const e = await r.json(); m = e?.error?.message || ""; } catch {} throw new Error(apiErr(r.status, m)); }
  const d = await r.json();
  if (d.stop_reason === "refusal") throw new Error("L'IA n'a pas voulu traiter cette demande.");
  const text = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!schema) return text;
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    throw new Error("Réponse illisible. Réessaie.");
  }
}

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" }, user_words: { type: "string" }, grams: { type: "number" }, food_id: { type: "string" },
    kcal_100g: { type: "number" }, protein_100g: { type: "number" }, carbs_100g: { type: "number" }, fat_100g: { type: "number" },
    confidence: { type: "string", enum: ["haute", "moyenne", "basse"] },
  },
  required: ["name", "user_words", "grams", "food_id", "kcal_100g", "protein_100g", "carbs_100g", "fat_100g", "confidence"],
  additionalProperties: false,
};
const MEAL_SCHEMA = { type: "object", properties: { items: { type: "array", items: ITEM_SCHEMA }, note: { type: "string" } }, required: ["items", "note"], additionalProperties: false };
const LABEL_SCHEMA = {
  type: "object",
  properties: { readable: { type: "boolean" }, name: { type: "string" }, kcal_100g: { type: "number" }, protein_100g: { type: "number" }, carbs_100g: { type: "number" }, fat_100g: { type: "number" }, serving_g: { type: "number" } },
  required: ["readable", "name", "kcal_100g", "protein_100g", "carbs_100g", "fat_100g", "serving_g"],
  additionalProperties: false,
};

const foodBaseForPrompt = () => allFoods().map((f) => `${f.id} | ${f.n} | ${f.k} kcal | ${f.p} g prot`).join("\n");
const COMMON_RULES = `Règles :
- grams = poids réellement mangé, en grammes. 1 ml de liquide = 1 g (huile : 0,92 g/ml). 1 c.s. = 15 ml (huile 13,5 g, beurre de cacahuète 16 g). 1 c.c. = 5 ml.
- Si un aliment correspond à un élément de la BASE (même mal orthographié ou dit autrement), mets son id dans food_id et recopie ses valeurs pour 100 g. Attention cru/cuit : riz et pâtes cuits ≠ crus.
- Sinon food_id = "" et donne des valeurs réalistes pour 100 g (produits de supermarché australiens si c'est pertinent).
- Un plat composé : décompose-le en ingrédients principaux.
- name = nom clair et court en français. user_words = les mots exacts de l'utilisateur pour cet aliment, sans la quantité (ex : "kebab"), ou "" s'il n'en a pas parlé.
- Ne compte pas le sel, le poivre ni les épices sèches.
- note : une phrase courte en français (ce que tu as supposé), ou "" si rien à signaler.
BASE (id | nom | pour 100 g) :
`;

export async function aiParseText(text) {
  const system = `Tu convertis la description d'un repas écrite par Isma (français familier, fautes possibles) en liste d'aliments avec leur poids.\n${COMMON_RULES}${foodBaseForPrompt()}`;
  return callClaude({ system, messages: [{ role: "user", content: text }], schema: MEAL_SCHEMA, think: false, effort: "low", maxTokens: 3000 });
}
export async function aiPhoto(b64, hint) {
  const system = `Tu estimes le contenu d'une assiette à partir d'une photo, pour Isma (20 ans, prise de masse).
Identifie chaque aliment visible et estime son poids en grammes avec les repères visuels (assiette ~26 cm, couverts, contenants).
Si les aliments paraissent poêlés ou frits, ajoute l'huile ou le beurre de cuisson comme un aliment à part.
Les infos données par l'utilisateur sont prioritaires sur ton estimation (s'il donne un poids, utilise-le).
confidence = ta certitude sur le poids de chaque aliment.
${COMMON_RULES}${foodBaseForPrompt()}`;
  const content = [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
    { type: "text", text: hint ? `Ce que je sais déjà : ${hint}` : "Estime le contenu de cette assiette." },
  ];
  return callClaude({ system, messages: [{ role: "user", content }], schema: MEAL_SCHEMA, think: true, effort: "low", maxTokens: 8000 });
}
export async function aiLabel(b64) {
  const system = `Tu lis une étiquette nutritionnelle (souvent australienne : « Nutrition Information », colonnes « Per serving » et « Per 100 g / 100 mL »).
Renvoie les valeurs POUR 100 g (ou 100 mL). Si l'énergie n'est qu'en kJ, convertis : kcal = kJ / 4,184.
name = nom du produit s'il est visible, sinon "". serving_g = taille d'une portion en g si indiquée, sinon 0.
readable = false si l'étiquette est illisible ou absente (mets alors 0 partout).`;
  const content = [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }, { type: "text", text: "Lis cette étiquette." }];
  return callClaude({ system, messages: [{ role: "user", content }], schema: LABEL_SCHEMA, think: false, effort: "low", maxTokens: 1500 });
}
export async function aiCoach(history, context) {
  const S = getSettings();
  const system = `Tu es le coach nutrition et musculation d'Isma (Ismaël), 20 ans, 1m76, très mince : il est en prise de masse (objectif ${S.goalW} kg).
Il vit à Perth (Australie) depuis fin septembre 2026. Il s'entraîne en salle en Full Body 3 fois par semaine (séances A, B, C) et note ses séances sur Hevy.
Objectifs : ${S.kcal} kcal et ${S.prot} g de protéines par jour. Il a longtemps eu un petit appétit (ça s'améliore).
Sommeil : il se couche tard (souvent 1 h 30 - 3 h). Stratégie : prendre la lumière du jour dans l'heure après le réveil pour avancer son horloge par paliers de 30 min, sans forcer le coucher.
Règles d'entraînement : s'arrêter à 1-2 reps de l'échec ; monter la charge quand le haut de la fourchette est atteint sur toutes les séries ; 2 min de repos sur les gros mouvements, 60-90 s sur l'isolation.
Courses : Coles / Woolworths ; lait « Full Cream », yaourt grec Farmers Union.
Style : français familier, tutoiement, direct et concret. Réponses courtes (5 à 8 lignes) sauf s'il demande plus. Pas de ton de cours d'école : des exemples tirés de sa vie, des chiffres précis.
Format : texte simple pour un écran de téléphone. Pas de titres ni de tableaux ; des tirets « - » si tu fais une liste.
Si quelque chose ressemble à un souci de santé (fatigue qui dure, douleur, vertiges), conseille-lui d'en parler à un médecin (GP).
Données de son app (à jour) :
${context}`;
  return callClaude({ system, messages: history, think: false, effort: "medium", maxTokens: 1500 });
}

/** Résultat IA → lignes éditables, avec les valeurs fixes de la base dès que possible */
export function fromAI(res) {
  return (res?.items || []).filter((x) => x && x.name).map((x) => {
    const f = x.food_id ? findFood(x.food_id) : null;
    const g = Math.max(0, Math.round(+x.grams || 0));
    if (f) return { ...itemFromFood(f, g), conf: x.confidence };
    return { name: cap(x.name.trim()), words: x.user_words || "", fid: null, g, per: { k: +x.kcal_100g || 0, p: +x.protein_100g || 0, c: +x.carbs_100g || 0, f: +x.fat_100g || 0 }, src: "ia", isNew: true, conf: x.confidence };
  });
}

/** Image → JPEG compressé en base64 */
export function compressImage(file, max = 1280) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > max || h > max) { const s = Math.min(max / w, max / h); w = Math.round(w * s); h = Math.round(h * s); }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Image illisible.")); };
    img.src = url;
  });
}

/** Résumé envoyé au coach */
export function buildContext(todayK) {
  const S = getSettings();
  const d = getDay(todayK), t = dayTot(d);
  const lines = [];
  lines.push(`Aujourd'hui (${fmtDay(todayK)}, ${hm(new Date())}) : ${fint(t.k)} kcal, ${fint(t.p)} g de protéines sur ${fint(S.kcal)} kcal / ${fint(S.prot)} g.`);
  d.entries.forEach((e) => lines.push(`- ${e.t} ${e.label} : ${fint(entryTot(e).k)} kcal (${e.items.map((i) => `${i.name} ${i.g} g`).join(", ")})`));
  let sk = 0, sp = 0, n = 0;
  for (let i = 1; i <= 7; i++) { const dd = getDay(addDays(todayK, -i)); if (hasFood(dd)) { const tt = dayTot(dd); sk += tt.k; sp += tt.p; n++; } }
  if (n) lines.push(`Moyenne des ${n} derniers jours notés : ${fint(sk / n)} kcal, ${fint(sp / n)} g de protéines.`);
  const sl = sleepStats(todayK, 7);
  const last = daySleepH(d);
  if (last != null) lines.push(`Nuit dernière : ${fH(last)}${d.sleep?.bed ? ` (couché ${hm(d.sleep.bed)}, levé ${hm(d.sleep.wake)})` : ""}.`);
  if (sl.count) lines.push(`Sommeil sur 7 jours : ${fH(sl.avgH)} en moyenne${sl.avgBed != null ? `, coucher moyen ${nightMinToHM(sl.avgBed)}` : ""}.`);
  const wl = weightList();
  if (wl.length) { const r = weeklyRate(wl, todayK); lines.push(`Poids : ${fdec(wl[wl.length - 1][1])} kg le ${fmtDay(wl[wl.length - 1][0], { day: "numeric", month: "short" })}${r != null ? ` (tendance ${r >= 0 ? "+" : ""}${fdec(r, 2)} kg/semaine)` : ""}.`); }
  const ws = getWorkouts();
  const wk = weekWorkouts(todayK, ws);
  lines.push(`Séances cette semaine : ${wk.length}/3. Prochaine séance : ${nextSession(ws)}.`);
  if (ws[0]) lines.push(`Dernière séance (${ws[0].title}, ${fmtDay(ws[0].date.slice(0, 10), { day: "numeric", month: "short" })}) : ${ws[0].exercises.map((e) => `${e.name} ${e.sets.filter((s) => !s.warm).map((s) => (s.w ? `${fdec(s.w, 2)}×${s.r}` : `${s.r}`)).join(" / ")}`).join(" ; ")}.`);
  return lines.join("\n");
}

// ═════════════════════════════════════════════════════════════
// v3 — Focus : rythme, prochaine action, missions, encouragements
// ═════════════════════════════════════════════════════════════
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const minutesOf = (hhmm) => { const [h, m] = (hhmm || "12:00").split(":").map(Number); return h * 60 + m; };

/** Anneaux du viseur : 1 = objectif atteint */
export function rings(d, S) {
  const t = dayTot(d), h = daySleepH(d);
  return { kcal: t.k / S.kcal, prot: t.p / S.prot, sleep: h != null ? h / S.sleep : 0, t, h };
}

/** Où tu devrais en être à cette heure-ci (du réveil jusqu'à ~1 h avant ton coucher habituel) */
export function pace(k, now, S) {
  const d = getDay(k), t = dayTot(d);
  const b = keyToDate(k);
  const wake = d.sleep?.wake ? new Date(d.sleep.wake) : new Date(b.getFullYear(), b.getMonth(), b.getDate(), 9, 0);
  const st = sleepStats(addDays(k, -1), 7);
  const endMin = clamp(st.avgBed != null ? st.avgBed - 60 : 390, 300, 480); // entre 23 h et 2 h
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 18, 0);
  end.setMinutes(end.getMinutes() + endMin);
  const frac = clamp((now - wake) / (end - wake), 0, 1);
  const expected = S.kcal * frac;
  const hoursLeft = Math.max(0, (end - now) / 3.6e6);
  const remaining = Math.max(0, S.kcal - t.k);
  const mealsLeft = Math.max(1, Math.round(hoursLeft / 3));
  const lastT = d.entries.length ? d.entries[d.entries.length - 1].t : null;
  let sinceLast = null;
  if (lastT) {
    let m = now.getHours() * 60 + now.getMinutes() - minutesOf(lastT);
    if (m < -180) m += 1440;
    sinceLast = Math.max(0, m);
  }
  return { expected, diff: t.k - expected, frac, end, hoursLeft, remaining, perMeal: remaining / mealsLeft, sinceLast, t };
}

/** Heure de la nuit en toutes lettres : « 2 h 20 », « 1 h » */
export const hFr = (nightMinutes) => { const t = (Math.round(nightMinutes / 5) * 5 + 1080) % 1440; const h = Math.floor(t / 60), m = t % 60; return m ? `${h} h ${pad(m)}` : `${h} h`; };

/** Favori dont les calories collent le mieux à ce qu'il te faut */
export function bestFav(target) {
  const favs = getFavs().map((f) => ({ f, k: itemsTot(f.items).k }));
  if (!favs.length) return null;
  favs.sort((a, b) => Math.abs(a.k - target) - Math.abs(b.k - target));
  return favs[0];
}

/** Derniers repas différents, pour « refaire la même chose » */
export function recentEntries(todayK, n = 5) {
  const seen = new Set(), out = [];
  for (let i = 0; i < 21 && out.length < n; i++) {
    const k = addDays(todayK, -i), d = getDay(k);
    for (const e of [...d.entries].reverse()) {
      const sig = e.items.map((it) => `${it.fid || it.name}:${it.g}`).sort().join("|");
      if (!sig || seen.has(sig)) continue;
      seen.add(sig);
      out.push({ k, e, tot: entryTot(e) });
      if (out.length >= n) break;
    }
  }
  return out;
}

/** Séance du jour : à faire, faite ou repos */
export function trainingStatus(k) {
  const ws = getWorkouts();
  const S = getSettings();
  const todayW = ws.find((w) => logicalKey(new Date(w.date), S.dayStart) === k) || null;
  const last = ws[0];
  const daysSince = last ? daysBetween(logicalKey(new Date(last.date), S.dayStart), k) : 99;
  const wk = weekWorkouts(k, ws).length;
  const daysLeft = 7 - ((keyToDate(k).getDay() + 6) % 7);
  const need = Math.max(0, 3 - wk);
  const due = !todayW && need > 0 && (daysSince >= 2 || need * 2 - 1 > daysLeft);
  return { todayW, due, rest: !todayW && !due, next: nextSession(ws), wk, daysSince, need };
}

/** La prochaine chose à faire, par ordre d'importance */
export function focusActions(k, now, S) {
  const d = getDay(k), t = dayTot(d);
  const hr = now.getHours() + now.getMinutes() / 60;
  const night = store.get("night", null);
  const acts = [];
  const add = (a) => acts.push(a);

  if (night) {
    const h = (now - new Date(night.bed)) / 3.6e6;
    if (h >= 3) add({ id: "wake", prio: 100, ic: "☀️", tone: "moon", title: "Bien dormi ?", text: `Téléphone posé à ${hm(night.bed)}. Appuie dès que tu es levé.` });
    else add({ id: "sleeping", prio: 100, ic: "🌙", tone: "moon", title: "Bonne nuit", text: "Téléphone posé. Le reste attendra demain." });
    return acts;
  }
  const late = hr >= 23 || hr < 4.5;
  if (late) {
    const st = sleepStats(addDays(k, 0), 7);
    const goal = st.avgBed != null ? Math.round(Math.max(300, st.avgBed - 20) / 10) * 10 : null;
    add({ id: "bed", prio: 92, ic: "🌙", tone: "moon", title: "Pose le téléphone", text: goal != null ? `Ces 7 derniers soirs, tu t'es couché vers ${hFr(st.avgBed)}. Vise ${hFr(goal)} ce soir.` : "Un appui au moment où tu le poses, un autre au réveil." });
  }
  const hasW = getWeights()[k] != null;
  if (keyToDate(k).getDay() === S.weighDay && !hasW && hr >= 5 && hr < 13)
    add({ id: "weigh", prio: 88, ic: "⚖️", tone: "sky", title: "Pesée du jour", text: "À jeun, après les toilettes, même balance." });
  const sinceWake = d.sleep?.wake ? (now - new Date(d.sleep.wake)) / 3.6e6 : null;
  if (!d.h.light && hr >= 6 && hr < 17 && (sinceWake == null || sinceWake < 5))
    add({ id: "light", prio: 84, ic: "☀️", tone: "sun", title: "10 min dehors", text: "La lumière du matin avance ton horloge : c'est ce qui t'aidera à te coucher plus tôt." });
  if (!d.sleep && hr >= 5 && hr < 15)
    add({ id: "logNight", prio: 72, ic: "🌙", tone: "moon", title: "Note ta nuit", text: "Tu n'as pas appuyé hier soir ? Indique tes heures en 10 secondes." });

  const p = pace(k, now, S);
  const behind = -p.diff;
  if (t.k < S.kcal - 250 && hr >= 7 && !late) {
    const noFood = !d.entries.length;
    const since = p.sinceLast == null ? 999 : p.sinceLast;
    if ((noFood && hr >= 10) || since >= 210 || (behind > 250 && since >= 120))
      add({ id: "eat", prio: 70 + Math.min(18, behind / 120), ic: "🍽️", tone: "sun", title: noFood ? "Premier repas" : "C'est l'heure de manger", text: `Vise environ ${fint(Math.round(clamp(p.perMeal, 350, 1100) / 50) * 50)} kcal.`, target: clamp(p.perMeal, 350, 1100) });
  }
  if (t.k >= S.kcal * 0.75 && t.p < S.prot - 10)
    add({ id: "prot", prio: 62, ic: "🥩", tone: "flesh", title: `Encore ${fint(S.prot - t.p)} g de protéines`, text: "Un shaker whey + lait en apporte une trentaine." });
  const tr = trainingStatus(k);
  if (tr.due && hr >= 8 && hr < 21)
    add({ id: "train", prio: 64, ic: "💪", tone: "sun", title: `Séance ${tr.next} aujourd'hui`, text: "Tes charges sont prêtes dans Sport." });
  if (!creatineDone(d) && hr >= 11 && !late)
    add({ id: "crea", prio: 50, ic: "💊", tone: "sky", title: "Créatine", text: "5 g, dans un shaker ou un verre d'eau." });
  if ((d.water || 0) < S.water && hr >= 14 && !late)
    add({ id: "water", prio: 40, ic: "💧", tone: "sky", title: `${fdec(S.water - (d.water || 0))} L d'eau à boire`, text: "Une bouteille à côté de toi, ça suffit." });

  if (!acts.length) {
    const sc = dayScore(d, S);
    if (sc.n === sc.max) add({ id: "done", prio: 1, ic: "🎯", tone: "sun", title: "Journée bouclée", text: "Tout est fait. Profite de ta soirée." });
    else if (t.k >= S.kcal) add({ id: "fed", prio: 1, ic: "🔥", tone: "sun", title: "Calories atteintes", text: "Le plus dur est fait aujourd'hui." });
    else add({ id: "chill", prio: 1, ic: "✨", tone: "sun", title: "Tout roule", text: `Il te reste ${fint(S.kcal - t.k)} kcal pour la journée.` });
  }
  return acts.sort((a, b) => b.prio - a.prio);
}

/** Une phrase d'encouragement tirée de tes vraies données */
export function insight(k, S) {
  const out = [];
  const streak = kcalStreak(k, S);
  if (streak >= 2) out.push(`🔥 ${streak} jours d'affilée à plus de 90 % de tes calories.`);
  const wl = weightList();
  if (wl.length >= 2) {
    const dW = wl[wl.length - 1][1] - wl[0][1];
    if (dW > 0.2) out.push(`💪 +${fdec(dW)} kg depuis le ${fmtDay(wl[0][0], { day: "numeric", month: "long" })}.`);
  }
  const st = sleepStats(k, 7), prev = sleepStats(addDays(k, -7), 7);
  if (st.avgBed != null && prev.avgBed != null && prev.count >= 2 && st.avgBed < prev.avgBed - 10)
    out.push(`🌙 Tu te couches ${Math.round(prev.avgBed - st.avgBed)} min plus tôt que la semaine d'avant.`);
  let protDays = 0;
  for (let i = 1; i <= 7; i++) if (dayTot(getDay(addDays(k, -i))).p >= S.prot) protDays++;
  if (protDays >= 3) out.push(`🥩 Protéines au rendez-vous ${protDays} jours sur les 7 derniers.`);
  const tr = trainingStatus(k);
  if (tr.wk >= 1) out.push(`🏋️ ${tr.wk}/3 séances cette semaine.`);
  if (!out.length) return null;
  return out[keyToDate(k).getDate() % out.length];
}

/** Petits instantanés pour le bouton « Annuler » */
export const snapDay = (k) => { const s = readRaw(PFX + "day:" + k); return () => { if (s == null) { try { localStorage.removeItem(PFX + "day:" + k); } catch {} emit(); } else { writeRaw(PFX + "day:" + k, s); emit(); } }; };
export const snapKey = (key, raw = false) => { const full = raw ? key : PFX + key; const s = readRaw(full); return () => { if (s == null) { try { localStorage.removeItem(full); } catch {} } else writeRaw(full, s); emit(); }; };
export const quickShaker = () => {
  const whey = findFood("whey") || allFoods().find((f) => f.id === "wpi");
  const milk = findFood("lait_entier");
  return [whey && itemFromFood(whey, 30), milk && itemFromFood(milk, 300)].filter(Boolean);
};


// ═════════════════════════════════════════════════════════════
// v4 — Tableau de bord
// ═════════════════════════════════════════════════════════════
/** Calories cumulées au fil de la journée (pour la courbe de l'accueil) */
export function kcalSeries(k, now) {
  const d = getDay(k);
  const b = keyToDate(k);
  const start = d.sleep?.wake ? new Date(d.sleep.wake) : new Date(b.getFullYear(), b.getMonth(), b.getDate(), 8, 0);
  const toDate = (t) => { const [h, m] = t.split(":").map(Number); const x = new Date(b.getFullYear(), b.getMonth(), b.getDate(), h, m); if (h < 5) x.setDate(x.getDate() + 1); return x; };
  let cum = 0;
  const pts = [{ t: start, v: 0, meal: false }];
  for (const e of d.entries) { cum += entryTot(e).k; pts.push({ t: toDate(e.t), v: cum, meal: true, label: e.label }); }
  const end = now > start ? now : new Date(start.getTime() + 3600e3);
  pts.push({ t: end, v: cum, meal: false, now: true });
  return pts.filter((p, i) => i === 0 || p.t >= pts[0].t).sort((a, b2) => a.t - b2.t);
}

/** Moyennes de la semaine en cours (lundi → aujourd'hui) */
export function weekAverages(k, S) {
  const ws = weekStartKey(k);
  const n = daysBetween(ws, k) + 1;
  const days = Array.from({ length: n }, (_, i) => getDay(addDays(ws, i)));
  const fed = days.filter((d, i) => hasFood(d) && (i < n - 1 || dayTot(d).k >= S.kcal * 0.5));
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const kcal = avg(fed.map((d) => dayTot(d).k));
  const prot = avg(fed.map((d) => dayTot(d).p));
  const sl = avg(days.map(daySleepH).filter((h) => h != null));
  const wk = weekWorkouts(k, getWorkouts()).length;
  const parts = [kcal != null ? Math.min(1, kcal / S.kcal) : null, prot != null ? Math.min(1, prot / S.prot) : null, sl != null ? Math.min(1, sl / S.sleep) : null, Math.min(1, wk / 3)].filter((x) => x != null);
  return { kcal, prot, sleep: sl, wk, score: parts.length ? avg(parts) : 0, days: n };
}

/** Ce qui arrive bientôt : coucher visé, prochaine séance, pesée */
export function upcoming(k, S, now) {
  const out = [];
  const st = sleepStats(k, 7);
  if (st.avgBed != null) out.push({ k, title: "Poser le téléphone", sub: `Vise ${hFr(Math.round(Math.max(300, st.avgBed - 20) / 10) * 10)} ce soir`, dot: "var(--moon)" });
  const tr = trainingStatus(k);
  if (!tr.todayW) out.push({ k: tr.due ? k : addDays(k, 1), title: `Séance ${tr.next}`, sub: tr.due ? "Aujourd'hui, tes charges sont prêtes" : "Demain, après une journée de repos", dot: "var(--sun)" });
  else out.push({ k: addDays(k, tr.wk >= 3 ? (8 - ((keyToDate(k).getDay() + 6) % 7)) : 2), title: `Séance ${tr.next}`, sub: tr.wk >= 3 ? "La semaine prochaine" : "Après-demain", dot: "var(--sun)" });
  const wd = keyToDate(k).getDay();
  let delta = (S.weighDay - wd + 7) % 7;
  if (delta === 0 && getWeights()[k] != null) delta = 7;
  out.push({ k: addDays(k, delta), title: "Pesée", sub: delta === 0 ? "Ce matin, à jeun" : `${cap(fmtDay(addDays(k, delta), { weekday: "long" }))} matin, à jeun`, dot: "var(--sky)" });
  return out.sort((a, b) => a.k.localeCompare(b.k));
}

/** Météo de Perth (Open-Meteo, gratuit, sans clé), gardée 30 min */
const WMO = [[[0], "Ciel dégagé", "☀️", "🌙"], [[1], "Plutôt dégagé", "🌤️", "🌙"], [[2], "Quelques nuages", "⛅", "☁️"], [[3], "Couvert", "☁️", "☁️"],
  [[45, 48], "Brouillard", "🌫️", "🌫️"], [[51, 53, 55, 56, 57], "Bruine", "🌦️", "🌧️"], [[61, 63, 65, 66, 67], "Pluie", "🌧️", "🌧️"],
  [[71, 73, 75, 77, 85, 86], "Neige", "🌨️", "🌨️"], [[80, 81, 82], "Averses", "🌦️", "🌧️"], [[95, 96, 99], "Orage", "⛈️", "⛈️"]];
export const wmo = (code, day = true) => { const w = WMO.find(([c]) => c.includes(code)) || WMO[2]; return { label: w[1], ic: day ? w[2] : w[3] }; };
let wxLoading = false;
export function getWeather() {
  const c = store.get("wx", null);
  const fresh = c && Date.now() - c.at < 30 * 60e3;
  if (!fresh && !wxLoading && typeof fetch !== "undefined") {
    wxLoading = true;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-31.93&longitude=115.89&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=Australia%2FPerth&forecast_days=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.current) store.set("wx", { at: Date.now(), t: j.current.temperature_2m, code: j.current.weather_code, day: !!j.current.is_day, max: j.daily?.temperature_2m_max?.[0], min: j.daily?.temperature_2m_min?.[0] });
      })
      .catch(() => {})
      .finally(() => { wxLoading = false; });
  }
  return c;
}
