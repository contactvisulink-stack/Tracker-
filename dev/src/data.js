// ─────────────────────────────────────────────────────────────
// Données fixes : base d'aliments, programme, valeurs de départ
// Valeurs nutritionnelles pour 100 g (ou 100 ml pour les liquides)
// k = kcal, p = protéines, c = glucides, f = lipides
// u = unité naturelle {n: nom, g: grammes}, d = densité (g/ml)
// cs / cc = grammes par cuillère à soupe / à café
// def = portion par défaut (g) quand seul le nom est donné
// ─────────────────────────────────────────────────────────────

export const BASE_FOODS = [
  // Produits laitiers, œufs, protéines en poudre
  { id: "lait_entier", n: "Lait entier (Full Cream)", a: ["lait entier", "lait", "full cream", "milk", "lait complet"], k: 65, p: 3.3, c: 4.8, f: 3.4, u: { n: "verre", g: 250 } },
  { id: "lait_lite", n: "Lait demi-écrémé (Lite)", a: ["lait demi ecreme", "lait lite", "lite milk"], k: 46, p: 3.6, c: 4.9, f: 1.3, u: { n: "verre", g: 250 } },
  { id: "lait_ecreme", n: "Lait écrémé (Skim)", a: ["lait ecreme", "skim", "skim milk"], k: 35, p: 3.5, c: 5, f: 0.1, u: { n: "verre", g: 250 } },
  { id: "yaourt_grec", n: "Yaourt grec (Farmers Union)", a: ["yaourt grec", "yogourt grec", "yaourt", "yaourts", "yogourt", "yoghourt", "yoghurt", "yogurt", "greek yoghurt", "farmers union"], k: 127, p: 4.8, c: 5.5, f: 9.3, cs: 20 },
  { id: "fromage", n: "Fromage (cheddar)", a: ["fromage", "cheddar", "cheese", "fromage rape"], k: 400, p: 25, c: 0.5, f: 33, u: { n: "tranche", g: 20 } },
  { id: "oeuf", n: "Œuf", a: ["oeuf", "oeufs", "egg", "eggs", "oeuf dur", "oeuf au plat", "oeufs brouilles"], k: 143, p: 12.6, c: 0.7, f: 9.5, u: { n: "œuf", g: 50 }, def: 50 },
  { id: "whey", n: "Whey (Emerald Labs)", a: ["whey", "proteine en poudre", "proteine", "prot", "shaker whey"], k: 400, p: 75, c: 9, f: 6, u: { n: "dose", g: 30 } },
  { id: "wpi", n: "WPI (Bulk Nutrients)", a: ["wpi", "isolat", "whey isolate"], k: 370, p: 88, c: 2, f: 1, u: { n: "dose", g: 30 } },
  { id: "creatine", n: "Créatine", a: ["creatine"], k: 0, p: 0, c: 0, f: 0, def: 5 },

  // Viandes et poissons
  { id: "poulet", n: "Poulet (filet, cru)", a: ["poulet", "blanc de poulet", "filet de poulet", "chicken", "poulet cru", "escalope de poulet"], k: 120, p: 23, c: 0, f: 2.6 },
  { id: "poulet_cuit", n: "Poulet cuit", a: ["poulet cuit", "poulet grille", "poulet roti", "chicken cooked"], k: 165, p: 31, c: 0, f: 3.6 },
  { id: "cuisse_poulet", n: "Haut de cuisse de poulet (cru)", a: ["cuisse de poulet", "hauts de cuisse", "haut de cuisse", "chicken thigh", "thigh"], k: 150, p: 19, c: 0, f: 8 },
  { id: "boeuf_hache", n: "Bœuf haché (cru)", a: ["boeuf hache", "steak hache", "steaks haches", "viande hachee", "hache", "mince", "beef mince", "steak ach", "steack hach", "steak hach", "kefta"], k: 233, p: 20, c: 0, f: 17 },
  { id: "steak", n: "Steak de bœuf", a: ["steak", "steack", "rumsteak", "entrecote", "bavette", "beef steak"], k: 190, p: 26, c: 0, f: 9.5 },
  { id: "thon", n: "Thon en boîte (au naturel)", a: ["thon", "tuna", "thon au naturel", "thon nature"], k: 110, p: 25, c: 0, f: 1, u: { n: "boîte", g: 95 } },
  { id: "thon_huile", n: "Thon à l'huile", a: ["thon a l huile", "thon huile", "tuna in oil"], k: 190, p: 25, c: 0, f: 10, u: { n: "boîte", g: 95 } },
  { id: "saumon", n: "Saumon", a: ["saumon", "salmon"], k: 208, p: 20, c: 0, f: 13.5 },
  { id: "jambon", n: "Jambon", a: ["jambon", "ham"], k: 110, p: 18, c: 1.5, f: 3.5, u: { n: "tranche", g: 25 } },

  // Féculents
  { id: "riz_cuit", n: "Riz blanc cuit", a: ["riz", "riz cuit", "riz blanc", "riz blanc cuit", "rice"], k: 130, p: 2.5, c: 28, f: 0.3 },
  { id: "riz_cru", n: "Riz (cru)", a: ["riz cru", "riz sec", "riz non cuit", "uncooked rice"], k: 360, p: 7, c: 79, f: 0.6 },
  { id: "pates", n: "Pâtes (crues)", a: ["pates", "pates crues", "pates seches", "spaghetti", "spaghettis", "penne", "fusilli", "macaroni", "coquillettes", "pasta"], k: 355, p: 12.5, c: 71, f: 1.5 },
  { id: "pates_cuites", n: "Pâtes cuites", a: ["pates cuites", "pates cuite", "cooked pasta"], k: 158, p: 5.8, c: 31, f: 0.9 },
  { id: "avoine", n: "Flocons d'avoine", a: ["avoine", "flocons d avoine", "flocon d avoine", "flocons", "oats", "porridge", "rolled oats"], k: 375, p: 12, c: 60, f: 8 },
  { id: "pain_mie", n: "Pain de mie", a: ["pain de mie", "pain", "toast", "toasts", "tartine", "tartines", "tranche de pain", "pain blanc", "bread"], k: 250, p: 8.5, c: 46, f: 3, u: { n: "tranche", g: 35 } },
  { id: "wrap", n: "Wrap / tortilla", a: ["wrap", "wraps", "tortilla", "tortillas"], k: 300, p: 8.5, c: 50, f: 7, u: { n: "wrap", g: 60 } },
  { id: "pdt", n: "Pommes de terre (crues)", a: ["pomme de terre", "pommes de terre", "patate", "patates", "potato", "potatoes"], k: 77, p: 2, c: 17, f: 0.1, u: { n: "pièce", g: 170 } },
  { id: "frites", n: "Frites", a: ["frites", "fries", "hot chips"], k: 290, p: 3.4, c: 36, f: 15 },

  // Fruits et légumes
  { id: "banane", n: "Banane", a: ["banane", "bananes", "banana"], k: 89, p: 1.1, c: 23, f: 0.3, u: { n: "banane", g: 120 }, def: 120 },
  { id: "mangue", n: "Mangue (surgelée)", a: ["mangue", "mangue surgelee", "mango"], k: 60, p: 0.8, c: 15, f: 0.4 },
  { id: "fruits_rouges", n: "Fruits rouges", a: ["fruits rouges", "myrtilles", "framboises", "fraises", "berries", "blueberries"], k: 50, p: 0.8, c: 11, f: 0.3 },
  { id: "pomme", n: "Pomme", a: ["pomme", "pommes", "apple"], k: 52, p: 0.3, c: 14, f: 0.2, u: { n: "pomme", g: 150 }, def: 150 },
  { id: "avocat", n: "Avocat", a: ["avocat", "avocado"], k: 160, p: 2, c: 8.5, f: 15, u: { n: "avocat", g: 150 } },
  { id: "legumes", n: "Légumes surgelés (mélange)", a: ["legumes surgeles", "legumes", "legume", "melange de legumes", "petits pois", "haricots verts", "brocoli", "brocolis", "carottes", "frozen veg", "veg"], k: 60, p: 3, c: 9, f: 0.5 },
  { id: "oignon", n: "Oignon", a: ["oignon", "oignons", "onion"], k: 40, p: 1.1, c: 9, f: 0.1, u: { n: "oignon", g: 110 } },
  { id: "tomate", n: "Tomate", a: ["tomate", "tomates", "tomato"], k: 18, p: 0.9, c: 3.9, f: 0.2, u: { n: "tomate", g: 120 } },
  { id: "salade", n: "Salade verte", a: ["salade", "laitue", "salad"], k: 15, p: 1.3, c: 2.5, f: 0.2 },
  { id: "gingembre", n: "Gingembre", a: ["gingembre", "ginger"], k: 80, p: 1.8, c: 18, f: 0.8 },
  { id: "ail", n: "Ail", a: ["ail", "gousse d ail", "gousses d ail", "garlic"], k: 149, p: 6.4, c: 33, f: 0.5, u: { n: "gousse", g: 4 } },

  // Matières grasses, sucrés, sauces
  { id: "beurre_cacahuete", n: "Beurre de cacahuète", a: ["beurre de cacahuete", "beurre de cacahuetes", "beurre cacahuete", "peanut butter", "cacahuete", "cacahuetes"], k: 610, p: 25, c: 13, f: 50, cs: 16, cc: 5 },
  { id: "beurre", n: "Beurre", a: ["beurre", "butter", "noix de beurre"], k: 717, p: 0.9, c: 0.1, f: 81, cs: 14, cc: 5, def: 10 },
  { id: "huile", n: "Huile (olive / avocat)", a: ["huile", "huile d olive", "huile olive", "huile d avocat", "huile avocat", "olive oil", "avocado oil", "oil"], k: 884, p: 0, c: 0, f: 100, d: 0.92, cs: 13.5, cc: 4.5, def: 13.5 },
  { id: "amandes", n: "Amandes", a: ["amandes", "amande", "almonds"], k: 580, p: 21, c: 9, f: 50, u: { n: "poignée", g: 30 } },
  { id: "chocolat", n: "Chocolat au lait", a: ["chocolat", "chocolat au lait", "chocolate"], k: 535, p: 7.5, c: 58, f: 30, u: { n: "carré", g: 5 } },
  { id: "miel", n: "Miel", a: ["miel", "honey"], k: 304, p: 0.3, c: 82, f: 0, cs: 21, cc: 7, def: 21 },
  { id: "sucre", n: "Sucre", a: ["sucre", "sugar"], k: 400, p: 0, c: 100, f: 0, cs: 12.5, cc: 4, def: 5 },
  { id: "mayo", n: "Mayonnaise", a: ["mayonnaise", "mayo"], k: 680, p: 1, c: 1, f: 75, cs: 14, def: 14 },
  { id: "ketchup", n: "Ketchup / sauce tomate", a: ["ketchup", "sauce tomate"], k: 100, p: 1.2, c: 24, f: 0.2, cs: 17, def: 17 },
  { id: "sauce_soja", n: "Sauce soja", a: ["sauce soja", "soja", "soy sauce"], k: 53, p: 8, c: 5, f: 0.6, cs: 16, def: 16 },

  // Boissons
  { id: "coca", n: "Coca-Cola", a: ["coca", "coca cola", "coke", "soda"], k: 42, p: 0, c: 10.6, f: 0, u: { n: "canette", g: 375 }, def: 375 },
  { id: "coca_zero", n: "Coca zéro", a: ["coca zero", "coke zero", "pepsi max"], k: 0.4, p: 0, c: 0, f: 0, u: { n: "canette", g: 375 }, def: 375 },
  { id: "jus_orange", n: "Jus d'orange", a: ["jus d orange", "jus", "orange juice"], k: 45, p: 0.7, c: 10, f: 0.2, u: { n: "verre", g: 250 }, def: 250 },
  { id: "biere", n: "Bière", a: ["biere", "bieres", "beer", "pinte", "schooner"], k: 43, p: 0.5, c: 3.6, f: 0, u: { n: "canette", g: 375 }, def: 375 },
  { id: "eau", n: "Eau", a: ["eau", "water"], k: 0, p: 0, c: 0, f: 0, def: 250 },
  { id: "cafe", n: "Café", a: ["cafe", "coffee", "expresso", "espresso"], k: 2, p: 0.1, c: 0, f: 0, def: 100 },
];

// ─────────────────────────────────────────────────────────────
// Programme Full Body 3x/semaine
// min/max = fourchette de répétitions, inc = saut de charge conseillé
// start = charge de départ connue (kg)
// ─────────────────────────────────────────────────────────────
export const PROGRAM = [
  {
    day: "A", color: "var(--amber)",
    exs: [
      { key: "bench", name: "Développé Couché (Barre)", a: ["developpe couche barre", "developpe couche", "bench press barbell", "bench press"], sets: 3, min: 6, max: 10, inc: 2.5, start: 40, rest: "2-3 min",
        cues: ["Omoplates serrées et plaquées au banc, pieds au sol", "Barre au bas des pecs, coudes à ~45°", "3 min de repos avant la dernière série si elle s'effondre"] },
      { key: "smith", name: "Squat Smith", a: ["squat smith", "squat a la smith", "smith machine squat", "squat (smith)"], sets: 3, min: 8, max: 12, inc: 5, start: 40, rest: "2 min",
        cues: ["Pieds légèrement devant la barre", "Descends au moins cuisses parallèles", "Pousse à travers tout le pied"] },
      { key: "latpd", name: "Tirage Poitrine (Poulie)", a: ["tirage poitrine poulie", "tirage poitrine", "lat pulldown", "tirage vertical"], sets: 3, min: 8, max: 12, inc: 2.5, start: 37.5, rest: "2 min",
        cues: ["Prise sans pouce pour sentir le dos", "Initie le mouvement avec les omoplates, pas les bras", "Tire la barre vers le haut de la poitrine"] },
      { key: "legcurl", name: "Leg Curl Allongé", a: ["leg curl allonge", "leg curl allonge machine", "lying leg curl", "leg curl"], sets: 3, min: 10, max: 15, inc: 2.5, start: 41, rest: "60-90 s",
        cues: ["Hanches collées au banc", "Contrôle la descente sur 2-3 s"] },
      { key: "lateral", name: "Élévation Latérale (Haltère)", a: ["elevation laterale haltere", "elevation laterale", "lateral raise", "dumbbell lateral raise"], sets: 3, min: 12, max: 15, inc: 1, start: 7, rest: "60-90 s",
        cues: ["Coudes légèrement fléchis", "Monte jusqu'à l'horizontale, pas plus haut", "Descente lente, sans élan"] },
      { key: "tricep", name: "Extension Triceps Corde", a: ["extension triceps corde", "extension triceps (corde)", "triceps pushdown corde", "triceps corde", "rope pushdown", "extension triceps poulie"], sets: 2, min: 10, max: 15, inc: 2.5, start: 12.5, rest: "60-90 s",
        cues: ["Coudes collés au corps, ils ne bougent pas", "Écarte la corde en bas et contracte"] },
    ],
  },
  {
    day: "B", color: "var(--blue)",
    exs: [
      { key: "dbrow", name: "Rowing Haltère", a: ["rowing haltere", "rowing unilateral", "dumbbell row", "rowing haltere unilateral"], sets: 3, min: 8, max: 12, inc: 2.5, start: 17.5, rest: "2 min",
        cues: ["Dos plat, main et genou sur le banc", "Tire le coude vers la hanche", "Initie avec l'omoplate"] },
      { key: "inclinedb", name: "Développé Couché Incliné (Haltère)", a: ["developpe couche incline haltere", "developpe incline haltere", "developpe incline", "incline dumbbell press"], sets: 3, min: 8, max: 12, inc: 2.5, start: 15, rest: "2 min",
        cues: ["Banc à 30°, pas plus", "Descente contrôlée, haltères au niveau du haut des pecs"] },
      { key: "legpress", name: "Presse à Cuisses", a: ["presse a cuisses", "presse cuisses", "leg press"], sets: 3, min: 10, max: 15, inc: 5, start: 40, rest: "2 min",
        cues: ["Bas du dos collé au dossier", "Ne verrouille pas les genoux en haut"] },
      { key: "facepull", name: "Tirage vers le Visage", a: ["tirage vers le visage", "face pull", "face pulls"], sets: 2, min: 12, max: 15, inc: 2.5, start: 20, rest: "60-90 s",
        cues: ["Tire les coudes en arrière et vers le haut", "Écarte la corde au niveau du visage"] },
      { key: "curl", name: "Curl Biceps (Haltère)", a: ["curl biceps haltere", "curl haltere", "curl biceps", "dumbbell curl", "bicep curl dumbbell"], sets: 2, min: 10, max: 12, inc: 2.5, start: 10, rest: "60-90 s",
        cues: ["Coudes fixes contre le corps", "Pas d'élan avec le dos"] },
      { key: "calf", name: "Presse Mollets", a: ["presse mollets", "mollets presse", "calf press", "calf press on leg press", "mollets a la presse", "mollets"], sets: 3, min: 12, max: 15, inc: 5, start: 0, rest: "60 s",
        cues: ["À faire sur la presse à cuisses, juste après tes jambes", "Pieds en bas du plateau, pousse avec la pointe", "Étire bien en bas, pause 1 s en haut"] },
    ],
  },
  {
    day: "C", color: "var(--green)",
    exs: [
      { key: "dbohp", name: "Développé Épaules (Haltère)", a: ["developpe epaules haltere", "developpe epaules", "developpe militaire haltere", "shoulder press dumbbell", "dumbbell shoulder press"], sets: 3, min: 8, max: 12, inc: 2.5, start: 10, rest: "2 min",
        cues: ["Gainage fort, dos collé au dossier", "Pousse à la verticale, coudes un peu devant"] },
      { key: "rdl", name: "Soulevé de Terre Roumain (Haltère)", a: ["souleve de terre roumain haltere", "souleve de terre roumain", "romanian deadlift dumbbell", "romanian deadlift", "rdl"], sets: 3, min: 8, max: 12, inc: 2.5, start: 10, rest: "2 min",
        cues: ["Pousse les fesses en arrière, dos plat", "Haltères qui frôlent les jambes", "Remonte en serrant les fessiers"] },
      { key: "seatedrow", name: "Rowing Poulie Assis Prise V", a: ["rowing poulie assis prise v", "rowing poulie assis", "rowing assis", "tirage horizontal", "seated cable row"], sets: 3, min: 8, max: 12, inc: 2.5, start: 30, rest: "2 min",
        cues: ["Buste droit, pas de balancier", "Tire vers le nombril en serrant les omoplates"] },
      { key: "pecdeck", name: "Écarté Machine", a: ["ecarte machine", "pec deck", "butterfly", "chest fly machine", "ecarte"], sets: 3, min: 12, max: 15, inc: 2.5, start: 0, rest: "60-90 s",
        cues: ["Coudes légèrement fléchis et fixes", "Serre les pecs 1 s quand les mains se touchent"] },
      { key: "closedb", name: "Développé Serré Haltère", a: ["developpe serre haltere", "developpe serre", "close grip dumbbell press"], sets: 2, min: 8, max: 12, inc: 2.5, start: 12.5, rest: "90 s",
        cues: ["Haltères collés l'un à l'autre", "Coudes près du corps"] },
      { key: "legext", name: "Extension Jambes", a: ["extension jambes", "extension des jambes", "leg extension"], sets: 2, min: 12, max: 15, inc: 2.5, start: 0, rest: "superset",
        cues: ["En superset avec le curl marteau", "Pause 1 s jambes tendues"] },
      { key: "hammer", name: "Curl Marteau", a: ["curl marteau", "curl marteau haltere", "hammer curl"], sets: 2, min: 10, max: 12, inc: 2.5, start: 0, rest: "60-90 s",
        cues: ["Pouces vers le haut tout le mouvement", "Coudes fixes"] },
    ],
  },
];

export const RULES = [
  "Arrête chaque série à 1-2 reps de l'échec, pas à l'échec complet.",
  "Tu montes la charge quand tu atteins le haut de la fourchette sur toutes les séries.",
  "Repos : 2 min sur les gros mouvements, 60-90 s sur l'isolation.",
  "Prise sans pouce sur les tirages, et tu démarres avec les omoplates.",
];

// ─────────────────────────────────────────────────────────────
// Séances déjà faites (reprises de tes logs Hevy) : servent de
// point de départ pour les suggestions de charge
// ─────────────────────────────────────────────────────────────
const s = (w, ...reps) => reps.map((r) => ({ w, r }));
export const SEED_WORKOUTS = [
  {
    id: "seed-a-2026-10-05", date: "2026-10-05T18:00:00", title: "Full body A", session: "A",
    exercises: [
      { name: "Développé Couché (Barre)", key: "bench", sets: s(40, 10, 10, 4) },
      { name: "Squat Smith", key: "smith", sets: s(40, 10, 10, 10) },
      { name: "Tirage Poitrine (Poulie)", key: "latpd", sets: s(35, 12, 12, 12) },
      { name: "Leg Curl Allongé", key: "legcurl", sets: s(41, 10, 10, 10) },
      { name: "Élévation Latérale (Haltère)", key: "lateral", sets: s(7, 10, 10, 10) },
      { name: "Extension Triceps Corde", key: "tricep", sets: s(12.5, 12, 10, 8) },
    ],
  },
  {
    id: "seed-b-2026-10-07", date: "2026-10-07T15:14:00", title: "Full body B", session: "B",
    url: "https://hevy.com/workout/d5390d6a-2489-4c97-bced-b643aeaca617",
    exercises: [
      { name: "Rowing Haltère", key: "dbrow", sets: s(17.5, 12, 12, 10) },
      { name: "Développé Couché Incliné (Haltère)", key: "inclinedb", sets: [{ w: 10, r: 12 }, { w: 12.5, r: 12 }, { w: 12.5, r: 12 }] },
      { name: "Presse à Cuisses", key: "legpress", sets: s(40, 10, 10, 10) },
      { name: "Tirage vers le Visage", key: "facepull", sets: s(20, 10, 10) },
      { name: "Curl Biceps (Haltère)", key: "curl", sets: s(10, 10, 10, 10) },
    ],
  },
];

// Repas favoris de départ (tes repas habituels)
export const SEED_FAVS = [
  { id: "fav-shaker", name: "Shaker avoine-cacahuète", items: [
    ["lait_entier", 196], ["yaourt_grec", 100], ["avoine", 90], ["whey", 20], ["creatine", 5],
    ["beurre_cacahuete", 27], ["mangue", 85], ["gingembre", 3], ["eau", 130] ] },
  { id: "fav-ptidej", name: "Bol yaourt-avoine-whey", items: [
    ["yaourt_grec", 250], ["avoine", 45], ["whey", 20], ["lait_entier", 250], ["banane", 120] ] },
  { id: "fav-pates", name: "Pâtes crémeuses poulet (1 part)", items: [
    ["huile", 7], ["oignon", 55], ["poulet", 200], ["pates", 100], ["lait_entier", 150],
    ["beurre_cacahuete", 16], ["legumes", 75], ["yaourt_grec", 50] ] },
  { id: "fav-poelee", name: "Poêlée poulet-patates", items: [
    ["pdt", 300], ["poulet", 200], ["oignon", 110], ["huile", 27], ["beurre", 10], ["oeuf", 50], ["yaourt_grec", 100] ] },
];
