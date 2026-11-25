// ═════════════════════════════════════════════════════════════
// La console : une seule ligne pour tout noter.
// « 2 oeufs, 150 g riz, créa, eau 1 l, poids 53,6 » → 4 actions.
// Lecture locale, sans IA. Rien n'est écrit avant que tu valides.
// ═════════════════════════════════════════════════════════════
import * as L from "./lib.js";

const NUM = "(\\d+(?:[.,]\\d+)?)";
const n = (s) => parseFloat(String(s).replace(",", "."));

const HABIT_WORDS = [
  ["creatine", /^(?:j ?ai pris (?:ma |la )?)?(?:creatine|crea|creat)(?: prise| faite| ok)?$/],
  ["light", /^(?:lumiere|soleil|dehors|lumiere du jour|10 ?min dehors)(?: faite?| ok)?$/],
  ["minox", /^(?:minox|minoxidil)(?: fait| mis| ok)?$/],
  ["posture", /^(?:posture|routine posture)(?: faite?| ok)?$/],
  ["spf", /^(?:spf|creme solaire|spf ?50)(?: mise?| ok)?$/],
];

/** Heures dans un texte : « 1h30 », « 9:45 », « 23h » */
const times = (t) => [...t.matchAll(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/g)].map((m) => `${L.pad(+m[1] % 24)}:${m[2] || "00"}`).filter(L.validHM);

/** Lit une commande. Renvoie les actions reconnues et le texte qui reste pour les repas. */
export function parseCommand(text, S = L.getSettings(), favs = L.getFavs()) {
  const actions = [];
  const food = [];
  const custom = L.customItems(S);
  const segs = String(text || "").split(/\n|;|,(?!\d)|\s\+\s/).map((s) => s.trim()).filter(Boolean);
  for (const raw of segs) {
    const t = L.norm(raw).replace(/[.!?]+$/, "").trim();
    if (!t) continue;
    let m;
    // Poids : « poids 53,6 », « 53.6 kg », « pesee 54 »
    if ((m = t.match(new RegExp(`^(?:poids|pesee|pese|je pese|balance)\\s*:?\\s*${NUM}\\s*(?:kg|kilos?)?$`))) || (m = t.match(new RegExp(`^${NUM}\\s*(?:kg|kilos?)$`)))) {
      const v = n(m[1]);
      if (v >= 30 && v <= 200) { actions.push({ type: "weight", v, raw }); continue; }
    }
    // Eau : « eau », « eau 1l », « 50 cl d'eau », « 2 verres d'eau »
    if ((m = t.match(new RegExp(`^(?:eau|water|bu|j ?ai bu)\\s*${NUM}?\\s*(l|litres?|cl|ml|verres?)?(?:\\s*d ?eau)?$`))) || (m = t.match(new RegExp(`^${NUM}\\s*(l|litres?|cl|ml|verres?)\\s*(?:d ?|de |d )?eau$`)))) {
      const q = m[1] ? n(m[1]) : null, u = (m[2] || "").replace(/s$/, "");
      let v = q == null ? 0.5 : u === "cl" ? q / 100 : u === "ml" ? q / 1000 : u === "verre" ? q * 0.25 : u === "l" || u === "litre" ? q : q >= 10 ? q / 1000 : q;
      v = Math.round(v * 4) / 4;
      if (v > 0 && v <= 5) { actions.push({ type: "water", v, raw }); continue; }
    }
    // Protocole
    const hw = HABIT_WORDS.find(([, re]) => re.test(t));
    if (hw) { actions.push({ type: "habit", id: hw[0], raw }); continue; }
    const ci = custom.find((c) => L.norm(c.label) === t || t === L.norm(c.label) + " fait" || t === L.norm(c.label) + " ok");
    if (ci) { actions.push({ type: "habit", id: ci.id, raw }); continue; }
    // Sommeil
    if (/^(?:dodo|je dors|je vais dormir|je me couche|couche|au lit|bonne nuit|nuit)$/.test(t)) { actions.push({ type: "bed", raw }); continue; }
    if (/^(?:leve|je suis leve|reveil|reveille|debout|bonjour)$/.test(t)) { actions.push({ type: "wake", raw }); continue; }
    if (/(?:nuit|couche|dormi|dodo|sommeil|leve|reveil)/.test(t)) {
      const tt = times(t);
      if (tt.length === 2) { actions.push({ type: "sleep", bed: tt[0], wake: tt[1], raw }); continue; }
    }
    // Séance
    if (/^(?:seance|hevy|importer? (?:une )?seance|j ?ai fait (?:ma )?seance)$/.test(t)) { actions.push({ type: "hevy", raw }); continue; }
    // Favori par son nom
    const fav = matchFav(t, favs);
    if (fav) { actions.push({ type: "fav", fav, raw }); continue; }
    food.push(raw);
  }
  // Heure du repas : « … à 13h30 »
  const foodText = food.join(", ");
  const tm = foodText ? times(L.norm(foodText)) : [];
  const parsed = foodText ? L.parseFoodText(foodText) : { items: [], unmatched: [] };
  return { actions, foodText, items: parsed.items, unmatched: parsed.unmatched, time: tm.length === 1 ? tm[0] : null };
}

function matchFav(t, favs) {
  if (t.length < 4) return null;
  const words = (s) => L.norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  let best = null, score = 0;
  for (const f of favs) {
    const fn = L.norm(f.name);
    if (fn === t) return f;
    const fw = words(f.name), tw = words(t);
    if (!tw.length) continue;
    const hit = tw.filter((w) => fw.some((x) => x.startsWith(w))).length;
    if (hit === tw.length && hit / fw.length > score && (fn.startsWith(t) || hit >= 2 || tw.length === 1 && fw[0]?.startsWith(tw[0]))) { best = f; score = hit / fw.length; }
  }
  return best;
}

/** Ce que l'aperçu affiche pour une action */
export function describe(a, S = L.getSettings()) {
  switch (a.type) {
    case "weight": return { ic: "scale", t: "Pesée", v: `${L.fdec(a.v, 1)} kg` };
    case "water": return { ic: "drop", t: "Eau", v: `+${L.fdec(a.v, 2)} L` };
    case "habit": { const r = L.allRituals(S).find((x) => x.id === a.id); return { ic: r?.ic === "rune" ? "check" : r?.ic || "check", t: r?.label || a.id, v: "fait" }; }
    case "bed": return { ic: "moon", t: "Mode nuit", v: "maintenant" };
    case "wake": return { ic: "sun", t: "Réveil", v: "maintenant" };
    case "sleep": return { ic: "moon", t: "Nuit", v: `${a.bed} → ${a.wake}` };
    case "hevy": return { ic: "dumbbell", t: "Importer la séance Hevy", v: "" };
    case "fav": { const t = L.itemsTot(a.fav.items); return { ic: "star", t: a.fav.name, v: `${L.fint(t.k)} kcal · ${L.fint(t.p)} g P` }; }
    default: return { ic: "check", t: a.raw, v: "" };
  }
}
