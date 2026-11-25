// Actions communes, toutes avec « Annuler »
import * as L from "./lib.js";
import * as E from "./engine.js";
import { buzz } from "./ui.jsx";

export function startNight(ctx) {
  const undo = L.snapKey("night");
  L.store.set("night", { bed: new Date().toISOString() });
  buzz(12);
  window.scrollTo({ top: 0, behavior: "smooth" });
  ctx.say("Mode nuit. Appuie sur « Je suis levé » au réveil.", { undo });
}

export function wakeNow(ctx, at) {
  const o = L.store.get("night", null);
  if (!o) return;
  const w = at || new Date();
  const k = L.dkey(w); // la nuit appartient au jour où tu te réveilles
  const undoDay = L.snapDay(k), undoNight = L.snapKey("night");
  const night = { bed: o.bed, wake: w.toISOString(), lat: ctx.S.lat, q: null };
  L.updDay(k, (dd) => ({ ...dd, sleep: night }));
  L.store.del("night");
  buzz(15);
  ctx.say(`Nuit enregistrée : ${L.fH(L.sleepHours(night))}`, { undo: () => { undoDay(); undoNight(); } });
}

export function addItems(ctx, k, items, label, time) {
  const undo = L.snapDay(k);
  L.addEntry(k, items, label, time);
  const t = L.itemsTot(items);
  buzz(10);
  ctx.say(`+${L.fint(t.k)} kcal, ${L.fint(t.p)} g de protéines`, { undo });
}

export function setHabit(ctx, k, id, on, quiet) {
  const undo = L.snapDay(k);
  const S = ctx.S;
  const was = id === "creatine" ? L.creatineDone(L.getDay(k)) : !!L.getDay(k).h[id];
  const next = on ?? !was;
  L.updDay(k, (dd) => {
    const h = { ...dd.h, [id]: next };
    // décocher la créatine retire aussi la créatine notée dans un repas
    const entries = !next && id === "creatine" ? dd.entries.map((e) => ({ ...e, items: e.items.filter((i) => i.fid !== "creatine") })).filter((e) => e.items.length) : dd.entries;
    return { ...dd, h, entries };
  });
  buzz(8);
  if (!quiet) {
    const r = L.allRituals(S).find((x) => x.id === id);
    const run = E.habit(id, k).run;
    ctx.say(next ? `${r?.label || id} : fait${run > 1 ? `, ${run} jours d'affilée` : ""}` : `${r?.label || id} décoché`, { undo });
  }
  return undo;
}

export function addWater(ctx, k, delta, quiet) {
  const undo = L.snapDay(k);
  L.updDay(k, (dd) => ({ ...dd, water: Math.max(0, Math.round(((dd.water || 0) + delta) * 4) / 4) }));
  buzz(8);
  if (!quiet) ctx.say(`Eau : ${L.fdec(L.getDay(k).water || 0, 2)} L`, { undo });
  return undo;
}

export function setWeight(ctx, k, v, quiet) {
  const undo = L.snapKey("iwt", true);
  L.setWeights({ ...L.getWeights(), [k]: Math.round(v * 100) / 100 });
  buzz(10);
  if (!quiet) ctx.say(`Pesée : ${L.fdec(v, 1)} kg`, { undo });
  return undo;
}

export function deleteEntry(ctx, k, e) {
  const undo = L.snapDay(k);
  L.updDay(k, (d) => ({ ...d, entries: d.entries.filter((x) => x.id !== e.id) }));
  ctx.say(`« ${e.label} » supprimé`, { undo });
}
