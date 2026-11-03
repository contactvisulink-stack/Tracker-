// Actions communes (avec « Annuler » quand ça a du sens)
import * as L from "./lib.js";
import * as G from "./game.js";
import { buzz } from "./ui.jsx";
import { sfx } from "./sfx.js";

/** Je pose le téléphone : le recall, puis l'écran de fin de partie */
export function startNight(ctx) {
  const undo = L.snapKey("night");
  const k = ctx.todayK;
  L.store.set("night", { bed: new Date().toISOString() });
  buzz(12);
  window.scrollTo({ top: 0, behavior: "smooth" });
  ctx.say("Recall lancé 🌙 Appuie sur « Je suis levé » au réveil", { undo });
  ctx.afterRecall && ctx.afterRecall(k);
}

export function wakeNow(ctx, at) {
  const o = L.store.get("night", null);
  if (!o) return;
  const w = at || new Date();
  const k = L.dkey(w);
  const undoDay = L.snapDay(k), undoNight = L.snapKey("night");
  const night = { bed: o.bed, wake: w.toISOString(), lat: ctx.S.lat, q: null };
  L.updDay(k, (dd) => ({ ...dd, sleep: night }));
  L.store.del("night");
  buzz(15);
  ctx.say(`Nuit enregistrée : ${L.fH(L.sleepHours(night))}`, { undo: () => { undoDay(); undoNight(); } });
  ctx.afterWake && ctx.afterWake(L.sleepHours(night));
}

export function addItems(ctx, k, items, label) {
  const undo = L.snapDay(k);
  const before = L.dayTot(L.getDay(k));
  const fresh = G.newFoods(items);
  L.addEntry(k, items, label);
  const t = L.itemsTot(items);
  buzz(10);
  sfx.gold();
  ctx.say(`+${L.fint(t.k)} gold, ${L.fint(t.p)} g de protéines`, { undo });
  if (fresh.length && ctx.push) { const dx = G.dex(); ctx.push({ kicker: "Alimentdex", t: "Nouvel aliment", s: `${fresh.map((f) => f.name.replace(/ \(.*\)/, "")).slice(0, 2).join(", ")} : ${dx.n} sur ${dx.total} découverts`, tone: "cyan" }); }
  return before;
}

export function toggleHabit(ctx, k, id, label) {
  const undo = L.snapDay(k);
  const was = !!L.getDay(k).h[id];
  L.updDay(k, (dd) => ({ ...dd, h: { ...dd.h, [id]: !dd.h[id] } }));
  buzz(8);
  if (!was) {
    sfx.item();
    const st = G.stacks(id, k);
    if (label) ctx.say(`${label} ✓ ${st.s} stack${st.s > 1 ? "s" : ""}`, { undo });
  } else if (label) ctx.say(`${label} décoché`, { undo });
}

export function addWater(ctx, k, delta) {
  const undo = L.snapDay(k);
  L.updDay(k, (dd) => ({ ...dd, water: Math.max(0, Math.round(((dd.water || 0) + delta) * 2) / 2) }));
  buzz(8);
  sfx.tick();
  const w = L.getDay(k).water || 0;
  ctx.say(`Potion : ${L.fdec(w)} L`, { undo });
}

export function deleteEntry(ctx, k, e) {
  const undo = L.snapDay(k);
  L.updDay(k, (d) => ({ ...d, entries: d.entries.filter((x) => x.id !== e.id) }));
  ctx.say(`« ${e.label} » supprimé`, { undo });
}
