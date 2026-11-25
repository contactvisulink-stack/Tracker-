// Mécaniques : arrondis des totaux, alerte de séance, maintenance réelle
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const L = await import("../src/lib.js");
const E = await import("../src/engine.js");
let fails = 0;
const ok = (n, c, d = "") => { console.log((c ? "✅ " : "❌ ") + n + (d ? ` (${d})` : "")); if (!c) fails++; };

// 3) Arrondis : le total est la somme exacte de ce qu'on lit sur chaque aliment
const items = [
  { g: 160, per: { k: 130, p: 2.7, c: 28.2, f: 0.3 } },
  { g: 10, per: { k: 717, p: 0.9, c: 0.1, f: 81.1 } },
  { g: 123, per: { k: 254, p: 17.2, c: 0, f: 20 } },
  { g: 33, per: { k: 42, p: 0, c: 10.6, f: 0 } },
];
const parts = items.map(L.itemTot), tot = L.itemsTot(items);
for (const m of ["k", "p", "c", "f"]) ok(`${m} : total = somme des aliments`, tot[m] === parts.reduce((a, t) => a + t[m], 0), `${parts.map((t) => t[m]).join(" + ")} = ${tot[m]}`);

// 4) Alerte « ta séance a changé » : pas pour un bonus ponctuel
const prog = L.getProgram().find((p) => p.day === "C");
const mk = (id, date, extra) => ({ id, date, session: "C", title: "Full body C", exercises: [...prog.exs.map((e) => ({ name: e.name, sets: [{ w: 10, r: 10 }] })), ...(extra ? [{ name: extra, sets: [{ w: 10, r: 12 }] }] : [])] });
const X = "Hip Thrust Barre";
L.setWorkouts([mk("a1", "2026-10-20T10:00:00", null), mk("a2", "2026-10-27T10:00:00", null), mk("a3", "2026-11-03T10:00:00", X)]);
ok("exercice en plus une seule fois : pas d'alerte", L.sessionDiff("C") === null);
L.setWorkouts([mk("b1", "2026-10-20T10:00:00", null), mk("b2", "2026-10-27T10:00:00", X), mk("b3", "2026-11-03T10:00:00", X)]);
const d = L.sessionDiff("C");
ok("exercice en plus 2 fois sur les 3 dernières : alerte", !!d && d.newEx.length === 1, d ? d.newEx.map((e) => e.name).join() : "aucune");
L.setWorkouts([mk("c0", "2026-10-06T10:00:00", X), mk("c1", "2026-10-13T10:00:00", X), mk("c2", "2026-10-20T10:00:00", null), mk("c3", "2026-10-27T10:00:00", null), mk("c4", "2026-11-03T10:00:00", X)]);
ok("ce sont les 3 séances les plus récentes qui comptent", L.sessionDiff("C") === null);
const miss = mk("d1", "2026-11-04T10:00:00", X); miss.exercises = miss.exercises.slice(1);
L.setWorkouts([miss]);
const d2 = L.sessionDiff("C");
ok("exercice du programme absent : alerte", !!d2 && d2.missing.length === 1);

// 5) Maintenance réelle : 3 000 kcal/j mangées, +0,5 kg/sem → 3 000 − (0,5/7 × 7 700) = 2 450
for (let i = 1; i <= 35; i++) { const k = L.addDays("2026-11-03", -i); L.setDay(k, { entries: [{ id: "x" + i, t: "12:00", label: "Repas", items: [{ name: "Riz", g: 1000, per: { k: 300, p: 10, c: 60, f: 2 } }] }], water: 0, h: {} }); }
const W = {}; [35, 28, 21, 14, 7, 0].forEach((d, i) => { W[L.addDays("2026-11-03", -d)] = 50 + i * 0.5; });
L.setWeights(W);
const en = E.energy("2026-11-03");
ok("maintenance = mangé − stockage", en.ok && Math.abs(en.tdee - 2450) < 5, en.ok ? `${Math.round(en.tdee)} kcal` : JSON.stringify(en.need));
ok("pour +0,5 kg/sem : retour à 3 000", en.ok && en.forRate(0.5) === 3000, en.ok ? String(en.forRate(0.5)) : "");

console.log(fails ? `\n${fails} échec(s)` : "\nTout passe.");
process.exit(fails ? 1 : 0);
