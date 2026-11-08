// Patch 9 : les mécaniques corrigées (mana, boss, arrondis, alerte de séance)
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const L = await import("../src/lib.js");
const G = await import("../src/game.js");
let fails = 0;
const ok = (n, c, d = "") => { console.log((c ? "✅ " : "❌ ") + n + (d ? ` (${d})` : "")); if (!c) fails++; };

// 1) Mana : « pleine » seulement quand elle l'est vraiment
ok("92/103 = mana haute, pas pleine", G.manaAdvice({ cur: 92, max: 103 }).t === "Mana haute");
ok("100/103 = mana pleine", G.manaAdvice({ cur: 100, max: 103 }).t === "Mana pleine");
ok("70/100 = mana correcte", G.manaAdvice({ cur: 70, max: 100 }).t === "Mana correcte");
ok("50/100 = mana basse", G.manaAdvice({ cur: 50, max: 100 }).t === "Mana basse");

// 2) Boss : le texte dit ce qu'il reste à manger
const last = G.bossNeed({ dead: false, daysLeft: 1, left: 1263, need: 1263 });
ok("dernier jour : il reste X PV, mange X kcal", /1\s?263 PV/.test(last) && /1\s?263 kcal/.test(last), last);
const mid = G.bossNeed({ dead: false, daysLeft: 6, left: 16654, need: 2776 });
ok("en semaine : PV restants et kcal par jour", mid.includes("6 jours") && /2\s?776 kcal par jour/.test(mid), mid);

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

console.log(fails ? `\n${fails} échec(s)` : "\nTout passe.");
process.exit(fails ? 1 : 0);
