const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const L = await import("../src/lib.js");
const { PROGRAM, SEED_WORKOUTS } = await import("../src/data.js");
console.log("unsure check:", JSON.stringify(L.parseFoodText("pâtes bolo maison 400g").items.map(i => [i.name, i.unsure])));
const txt = `Full body B 🏋️‍♂️
Le mercredi, oct. 07, 2026 à 3:14pm

Rowing Haltère
Série 1: 17.5 kg x 12
Série 2: 17.5 kg x 12
Série 3: 17.5 kg x 10

Développé Couché Incliné (Haltère)
Série 1: 10 kg x 12
Série 2: 12.5 kg x 12
Série 3: 12.5 kg x 12

Presse à Cuisses
Série 1: 40 kg x 10
Série 2: 40 kg x 10
Série 3: 40 kg x 10

Tirage vers le Visage
Série 1: 20 kg x 10
Série 2: 20 kg x 10

Curl Biceps (Haltère)
Série 1: 10 kg x 10
Série 2: 10 kg x 10
Série 3: 10 kg x 10

@hevyapp
https://hevy.com/workout/d5390d6a-2489-4c97-bced-b643aeaca617`;
const w = L.parseHevy(txt);
console.log(w.title, "|", w.date, "|", w.session, "|", w.url);
w.exercises.forEach(e => console.log("  ", e.name, "→", e.key, JSON.stringify(e.sets)));
const en = `Push day
Wednesday, Oct 8, 2026 at 6:05pm

Bench Press (Barbell)
Set 1: 40 kg x 10
Warm-up set: 20 kg x 10
Set 2: 42.5 kg x 8

Lat Pulldown (Cable)
Set 1: 80 lbs x 12`;
const w2 = L.parseHevy(en);
console.log(w2.title, "|", w2.date, "|", w2.session);
w2.exercises.forEach(e => console.log("  ", e.name, "→", e.key, JSON.stringify(e.sets)));
// suggestions
const ws = [w, ...SEED_WORKOUTS].map(x => ({ ...x, id: x.id || "x" })).sort((a,b)=>b.date.localeCompare(a.date));
for (const d of PROGRAM) { console.log("Séance", d.day); for (const pe of d.exs) { const s = L.suggest(pe, ws); console.log("   ", pe.name.padEnd(36), s.status, s.weight, s.last ? s.last.reps.join("/") + (s.drop ? " (chute)" : "") : ""); } }
console.log("next:", L.nextSession(ws), "week:", L.weekWorkouts("2026-10-07", ws).length);
// sleep
const n = L.nightFromTimes("2026-10-08", "02:10", "10:05"); console.log("night", n, L.fH(L.sleepHours({...n, lat: 15})));
const n2 = L.nightFromTimes("2026-10-08", "23:30", "07:00"); console.log("night2", L.fH(L.sleepHours({...n2, lat: 15})));
console.log("logical", L.logicalKey(new Date(2026, 9, 8, 1, 30), 5), L.logicalKey(new Date(2026, 9, 8, 6, 0), 5));
console.log("nightMin", L.nightMinToHM((L.nightMin(new Date(2026,9,8,1,30)) + L.nightMin(new Date(2026,9,7,23,30)))/2));
