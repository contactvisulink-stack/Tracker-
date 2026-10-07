const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
const L = await import("../src/lib.js");
const show = (txt) => { const r = L.parseFoodText(txt); const tot = L.itemsTot(r.items.filter(i=>i.g!=null)); console.log("\n>>", JSON.stringify(txt)); r.items.forEach(i => console.log("  ", i.name.padEnd(30), i.g, "g", Math.round(L.itemTot(i).k), "kcal", Math.round(L.itemTot(i).p*10)/10, "p")); if (r.unmatched.length) console.log("   NON RECONNU:", r.unmatched); console.log("   TOTAL", Math.round(tot.k), "kcal", Math.round(tot.p), "g prot"); };
show(`196 ml lait entier 
100g yogourt 
90g flocons d’avoine 
20g whey 
5g créatine 
27g beurre de cacahuète 
85g mangue surgelée
3g de gingembre
130 ml eau`);
show(`160g de riz blanc cuit (beurre dedans ≈10g) 
Steak achee ( ≈120g) 
Huile d’olive, 
coca coma`);
show(`Bol 16h30 (357ml lait, 53g avoine, 56g mangue, banane, 15g whey, créatine)`);
show(`2 oeufs, 2 tranches de pain de mie, 1 c.s. de beurre de cacahouete, un verre de jus d'orange`);
show(`1,5 kg de patates et 1/2 avocat, 2 cs huile d'avocat, sauce soja`);
show(`pâtes bolo maison 400g`);
show(`kebab`);
