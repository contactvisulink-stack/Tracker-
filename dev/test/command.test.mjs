const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const { parseCommand } = await import("../src/command.js");
const favs = [{ id: "f1", name: "Shaker avoine-cacahuète", items: [] }, { id: "f2", name: "Bol yaourt-avoine-whey", items: [] }];
const S = { water: 2.5, rituals: ["light", "creatine", "minox", "posture"], customItems: [{ id: "u_1", label: "Anglais" }] };
const cases = [
  ["créa", "habit:creatine"], ["j'ai pris ma créatine", "habit:creatine"], ["lumière", "habit:light"], ["minox", "habit:minox"], ["anglais", "habit:u_1"],
  ["eau", "water:0.5"], ["eau 1l", "water:1"], ["50 cl d'eau", "water:0.5"], ["2 verres d'eau", "water:0.5"], ["eau 750 ml", "water:0.75"],
  ["poids 53,6", "weight:53.6"], ["53.6 kg", "weight:53.6"], ["pesée 54", "weight:54"],
  ["dodo", "bed"], ["levé", "wake"], ["nuit 1h30 9h45", "sleep:01:30-09:45"], ["couché 23h levé 7h30", "sleep:23:00-07:30"],
  ["séance", "hevy"], ["shaker", "fav:f1"], ["bol yaourt", "fav:f2"],
];
let fail = 0;
for (const [t, want] of cases) {
  const r = parseCommand(t, S, favs);
  const a = r.actions[0];
  const got = !a ? "food" : a.type === "habit" ? `habit:${a.id}` : a.type === "water" ? `water:${a.v}` : a.type === "weight" ? `weight:${a.v}` : a.type === "sleep" ? `sleep:${a.bed}-${a.wake}` : a.type === "fav" ? `fav:${a.fav.id}` : a.type;
  const okk = got === want && r.actions.length === 1;
  if (!okk) fail++;
  console.log((okk ? "✅ " : "❌ ") + JSON.stringify(t) + " → " + got + (okk ? "" : ` (attendu ${want}, ${r.actions.length} actions, aliments ${r.items.length})`));
}
const m = parseCommand("2 oeufs, 150 g riz cuit, créa, eau 1 l, poids 53,8", S, favs);
const okm = m.actions.length === 3 && m.items.length === 2 && m.items.find((i) => /oeuf|œuf/i.test(i.name))?.g === 100;
console.log((okm ? "✅" : "❌") + " ligne mixte : 3 actions + 2 aliments (2 œufs = 100 g)"); if (!okm) fail++;
const f = parseCommand("200 g poulet, 250 g riz cuit à 13h30", S, favs);
const okf = f.actions.length === 0 && f.items.length === 2 && f.time === "13:30";
console.log((okf ? "✅" : "❌") + " repas avec heure : " + f.time + ", " + f.items.map((i) => `${i.name} ${i.g}`).join(" / ")); if (!okf) fail++;
const r1 = parseCommand("riz 1 kg", S, favs);
console.log((r1.actions.length === 0 ? "✅" : "❌") + " « riz 1 kg » reste un aliment"); if (r1.actions.length) fail++;
console.log(fail ? `\n${fail} échec(s)` : "\nTout passe."); process.exit(fail ? 1 : 0);
