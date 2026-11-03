// ─────────────────────────────────────────────────────────────
// Les textes du jeu : le codex « expliqué en LoL », les astuces
// de l'écran de chargement et les notes de patch.
// ─────────────────────────────────────────────────────────────

/** Le codex : la science derrière tes habitudes, expliquée comme dans la vidéo */
export const CODEX = [
  {
    id: "creatine", ic: "crystal", n: "La créatine, c'est un item",
    lol: "Tes muscles ont une barre de mana. La créatine, c'est l'item qui monte ta mana max.",
    lines: [
      "Chaque série lourde, c'est un sort : ça coûte de la mana.",
      "Quand la barre est vide, tu ne peux plus caster : la rep ne monte plus.",
      "Avec la créatine, la barre est plus grande. Tu castes une ou deux reps de plus avant d'être à sec.",
      "Ces reps en plus, séance après séance, c'est ça qui te fait progresser.",
    ],
    stacks: "Ce n'est pas un effet magique immédiat : il faut stacker. 3 à 5 g chaque jour, et le réservoir se remplit en 3 à 4 semaines. Si tu arrêtes, tu perds tes stacks petit à petit : 4 à 6 semaines pour revenir à zéro.",
    real: "La créatine augmente la phosphocréatine stockée dans tes muscles, d'environ 20 à 40 %. C'est le carburant des efforts courts et à fond, les 10 premières secondes. Les premières semaines, tu prends souvent un peu d'eau dans le muscle : c'est normal, ce n'est pas du gras.",
    you: () => "N'importe quelle créatine monohydrate fait le job, pas besoin d'une marque chère. L'heure ne compte pas, le tous les jours si. Si ça te barbouille, prends-la avec un repas ou en deux fois.",
  },
  {
    id: "calories", ic: "coin", n: "Les calories, c'est ton gold",
    lol: "Tu ne gagnes pas une game sans farmer. Ton corps non plus.",
    lines: [
      "Chaque repas, c'est une vague de sbires : tu la farmes, ou tu la laisses mourir sous ta tour.",
      "Le gold sert à acheter des items. Ici, l'item, c'est du muscle et des kilos.",
      "Pas de surplus de gold, pas d'achat : tu stagnes.",
    ],
    real: "Pour prendre du poids, il faut manger plus que ce que tu dépenses. Un surplus de 300 à 500 kcal par jour donne en gros 0,25 à 0,5 kg de plus par semaine. Un hardgainer dépense beaucoup : c'est un champion qui a besoin de beaucoup de farm.",
    you: (S) => `Ton objectif : ${Math.round(S.kcal).toLocaleString("fr-FR")} kcal. Si ton rang ne bouge pas pendant 2 semaines, ajoute 200 à 300 kcal par jour, un shaker suffit.`,
  },
  {
    id: "proteines", ic: "bolt", n: "Les protéines, ce sont les composants",
    lol: "Le gold achète l'item, mais sans les composants, l'item ne se construit pas.",
    lines: [
      "Les calories donnent l'énergie pour construire. Les protéines, c'est la matière.",
      "Sans elles, tu farmes du gold mais tu construis plus de gras que de muscle.",
    ],
    real: "Vise 1,6 à 2 g de protéines par kilo de poids et par jour. Au-delà de 2,2 g/kg, ça n'apporte presque rien de plus. Répartis-les sur la journée : 20 à 40 g par repas.",
    you: (S) => `Ton objectif : ${S.prot} g par jour. Un shaker whey et lait en apporte une trentaine.`,
  },
  {
    id: "sommeil", ic: "heart", n: "Le sommeil, c'est le recall",
    lol: "Tu ne régénères pas tes PV en restant en lane. Tu recall.",
    lines: [
      "La séance casse le muscle. C'est pendant que tu dors qu'il se répare et grossit.",
      "Une nuit courte, c'est jouer low HP : moins de force, plus envie de sucre, moins de motivation.",
    ],
    real: "La plus grosse partie de l'hormone de croissance est libérée pendant le sommeil profond, en début de nuit. Vise 7 h 30 à 9 h. Te coucher à heure fixe compte presque autant que la durée.",
    you: (S) => `Ton objectif : ${String(S.sleep).replace(".", ",")} h. Le bouton « Je pose le téléphone » lance ton recall.`,
  },
  {
    id: "surcharge", ic: "sword", n: "+1 rep, c'est ton scaling",
    lol: "Un champion qui ne monte pas de niveau se fait rouler dessus en late game.",
    lines: [
      "Même charge, mêmes reps pendant des mois : ton corps n'a aucune raison de changer.",
      "+1 rep ou +2,5 kg dès que tu peux. Chaque petite marche, c'est un niveau.",
    ],
    real: "La règle de ton programme : quand tu atteins le haut de la fourchette sur toutes les séries, tu montes la charge. En attendant, tu cherches une rep de plus. Arrête chaque série à 1 ou 2 reps de l'échec.",
    you: () => "Dans l'Arène, chaque exercice t'affiche ton objectif +1 rep calculé sur ta dernière séance.",
  },
  {
    id: "recup", ic: "hourglass", n: "Le repos, c'est le cooldown",
    lol: "Tu ne peux pas relancer ton ultime en boucle.",
    lines: [
      "Un muscle travaillé a besoin d'environ 48 h pour récupérer.",
      "En full body 3 fois par semaine, ton sort recharge pile entre deux séances.",
      "Relancer trop tôt : moins de dégâts, plus de risque de blessure.",
    ],
    real: "Un jour de repos entre deux séances, c'est le bon rythme pour ton programme. Par exemple lundi, mercredi, vendredi.",
  },
  {
    id: "regularite", ic: "flag", n: "Le farm bat les gros plays",
    lol: "Les meilleurs joueurs ne gagnent pas avec un pentakill par game. Ils gagnent en ne ratant aucun sbire.",
    lines: [
      "3 200 kcal tous les jours valent mieux que 5 000 un jour puis 2 000 les trois suivants.",
      "Le boss de la semaine compte tout : un jour raté se rattrape un peu, jamais complètement.",
    ],
    real: "Ton poids réagit à ta moyenne sur la semaine, pas à un repas énorme.",
  },
  {
    id: "pesee", ic: "crown", n: "La pesée, ce sont tes LP",
    lol: "Une défaite ne te fait pas descendre de division d'un coup. Un mauvais chiffre sur la balance non plus.",
    lines: [
      "Ton poids bouge d'un kilo d'un jour à l'autre : eau, sel, repas de la veille.",
      "C'est pour ça que ton rang suit la moyenne de tes 3 dernières pesées.",
    ],
    real: "Pèse-toi toujours dans les mêmes conditions : même balance, même moment de la journée, avant de manger ou avant la séance. Ce qui compte, c'est la tendance sur plusieurs semaines.",
  },
  {
    id: "tilt", ic: "recall", n: "Le tilt",
    lol: "Une mauvaise teamfight ne perd pas la game. Le tilt qui suit, si.",
    lines: [
      "Tu as raté un repas ou une séance ? Ce n'est pas grave.",
      "Ce qui fait perdre, c'est de tout lâcher après. Reprends au prochain camp.",
    ],
    real: "Une journée ratée ne change rien à ton corps. Une semaine lâchée, oui.",
  },
  {
    id: "lumiere", ic: "sun", n: "La lumière du matin, c'est ta vision",
    lol: "Sans ward, tu joues dans le noir. Sans lumière le matin, ton horloge aussi.",
    lines: [
      "10 minutes dehors après le réveil disent à ton cerveau que la journée commence.",
      "Le soir, la fatigue arrive plus tôt : c'est comme ça qu'on avance son coucher sans forcer.",
    ],
    real: "La lumière du jour est le signal le plus fort pour régler l'horloge interne. Même par temps couvert, elle est bien plus forte que la lumière d'une pièce.",
  },
  {
    id: "eau", ic: "potion", n: "L'eau, ce sont tes potions",
    lol: "Sans potions, tu ne tiens pas la lane.",
    lines: [
      "La créatine fait entrer de l'eau dans tes muscles : il faut boire assez.",
      "Déshydraté, tu perds de la force avant même de le sentir.",
    ],
    real: "2 à 3 litres par jour, plus quand il fait chaud ou que tu transpires. Urine jaune clair : tu es bien hydraté.",
  },
];

/** Astuces de l'écran de chargement */
export const TIPS = [
  "La créatine, c'est un item à stacks : un jour raté ne vide pas tout, mais chaque jour compte.",
  "Un shaker whey et lait, c'est une trentaine de grammes de protéines en 30 secondes.",
  "Ton rang suit la moyenne de tes 3 dernières pesées : une mauvaise pesée ne te fait pas plonger.",
  "Le boss de la semaine perd 1 PV par kcal. Un repas de 900 kcal, c'est un gros coup.",
  "Le Flash sauve ta série une fois par semaine. Pas deux.",
  "Trois heures sans manger : le camp est réapparu, va farm.",
  "Vise le +1 rep, pas le record. C'est comme ça que tu scales.",
  "Une nuit sous 6 h, c'est jouer low HP toute la journée.",
  "10 minutes dehors le matin avancent ton heure de coucher.",
  "Pas faim ? Les calories liquides passent mieux : lait entier, shaker, smoothie.",
  "Un repas Légendaire : 900 kcal et 40 g de protéines dans la même assiette.",
  "Chaque nouvel aliment rejoint ton Alimentdex. Varier, c'est aussi mieux farmer.",
  "La journée se gagne à 90 % de ton objectif de calories.",
  "Pentakill : calories, protéines, sommeil, créatine et séance (ou posture) le même jour.",
  "Un bon early game : premier repas dans les 2 h après le réveil.",
  "Tu as raté un repas ? Ne tilte pas. Reprends au prochain camp.",
  "Le sommeil, c'est le recall : c'est là que le muscle se construit.",
  "L'heure de la créatine ne compte pas. Le tous les jours, si.",
  "Ta mana de séance dépend de ta nuit et de ton farm d'hier.",
  "Toujours la même balance, au même moment : sinon tes LP mentent.",
];

/** Notes du patch précédent (8.0), gardées sous les nouvelles */
const PATCH80 = {
  v: "8.0",
  n: "Le Reforge",
  date: "novembre 2026",
  intro: "Ton tracker devient une partie de League. Ta vraie vie, c'est la game : chaque repas se farme, chaque nuit est un recall, chaque pesée te fait gagner des LP. Tout est calculé à partir de tes données : rien n'a été perdu, ton historique a été rejoué.",
  sections: [
    { t: "La mana et les stacks (la vidéo)", items: [
      ["NOUVEAU", "Barre de mana : l'énergie de tes muscles pour la séance, remplie par ta nuit et ton farm."],
      ["NOUVEAU", "La créatine monte ta mana max : jusqu'à +20 à 28 stacks."],
      ["NOUVEAU", "Grille de 28 stacks. Un jour raté = un stack perdu, comme dans tes muscles."],
      ["NOUVEAU", "Tous tes rituels deviennent des items à stacks, avec leur fiche façon boutique."],
      ["NOUVEAU", "Objectif +1 rep sur chaque exercice, calculé sur ta dernière séance."],
      ["NOUVEAU", "Conseil de séance selon ta mana : full mana, mana correcte ou low mana."],
      ["NOUVEAU", "Codex : la créatine, les calories, le sommeil, les protéines… expliqués en LoL."],
    ] },
    { t: "Farm", items: [
      ["REFONTE", "Les calories deviennent ton gold : le farm du jour, avec ta courbe et le rythme idéal."],
      ["NOUVEAU", "Gold diff : ton avance ou ton retard sur le rythme, en direct."],
      ["NOUVEAU", "Phases de jeu : early, mid et late game, avec ce qu'il faut avoir farmé à la fin de chacune."],
      ["NOUVEAU", "Camp réapparu : ça fait 3 h que tu n'as pas mangé."],
      ["NOUVEAU", "CS du jour : le nombre de repas notés."],
      ["NOUVEAU", "Rareté des repas : Commun, Rare, Épique, Légendaire."],
      ["NOUVEAU", "Build recommandé : les repas qui comblent pile ce qu'il te manque."],
      ["NOUVEAU", "Alimentdex : chaque nouvel aliment se découvre, pour t'aider à varier."],
      ["NOUVEAU", "Variété de la semaine : le nombre d'aliments différents."],
      ["BUFF", "« +X gold » et un petit son à chaque repas ajouté."],
    ] },
    { t: "La partie du jour", items: [
      ["NOUVEAU", "5 objectifs = 5 kills : First blood, Double kill… jusqu'au Pentakill."],
      ["NOUVEAU", "Note de la journée, de D à S+."],
      ["NOUVEAU", "Victoire à 90 % de tes calories, et ton winrate sur 30 jours."],
      ["NOUVEAU", "Écran de fin de partie quand tu poses le téléphone : victoire ou défaite."],
      ["NOUVEAU", "Récap de mort : ce qui t'a fait perdre la journée, sans filtre."],
      ["NOUVEAU", "Historique des parties : chaque jour, sa note et ses kills."],
      ["NOUVEAU", "Série de victoires et Flash : une journée ratée par semaine est sauvée."],
      ["NOUVEAU", "Score de vision : ce qui est noté dans ta journée."],
      ["NOUVEAU", "Quêtes du jour : 3 défis par jour, tirés selon ta journée."],
      ["NOUVEAU", "Écran de chargement : ton match du jour et une astuce, une fois par jour."],
    ] },
    { t: "Progression", items: [
      ["NOUVEAU", "Niveau de la partie, de 1 à 18, qui monte avec tes objectifs."],
      ["NOUVEAU", "Niveau de compte : toute ton XP depuis ton premier jour."],
      ["NOUVEAU", "Classé : ton poids devient ton rang, de Fer IV à Challenger, ton poids visé."],
      ["NOUVEAU", "LP à chaque pesée, calculés sur la moyenne de tes 3 dernières pesées."],
      ["NOUVEAU", "Date de ta prochaine promotion, à ton rythme actuel."],
      ["NOUVEAU", "Boss de la semaine : chaque kcal lui retire 1 PV."],
      ["NOUVEAU", "34 succès, rejoués sur tout ton historique, avec leur date."],
      ["NOUVEAU", "Titres à débloquer sous ton pseudo."],
      ["NOUVEAU", "Stats de carrière : gold farmé, nuits, séances, kilos, pentakills."],
    ] },
    { t: "Arène", items: [
      ["REFONTE", "Tes séances A, B et C deviennent tes sorts Q, W et E, avec leur temps de recharge."],
      ["NOUVEAU", "L'ultime : tes records perso, détectés tout seuls à l'import Hevy."],
      ["NOUVEAU", "Triple kill de la semaine : 3 séances."],
      ["BUFF", "La routine posture compte comme un kill les jours sans séance."],
    ] },
    { t: "Visuel et confort", items: [
      ["REFONTE", "Nouveau thème Hextech : fond abysse, cadres dorés, mana bleue."],
      ["NOUVEAU", "HUD de champion : portrait, niveau, PV et mana."],
      ["NOUVEAU", "Emblèmes de rang dessinés pour chaque palier."],
      ["NOUVEAU", "Annonces plein écran : kills, boss vaincu, promotion, niveau."],
      ["NOUVEAU", "Le mode nuit devient ton recall : tes PV se régénèrent pendant que tu dors."],
      ["NOUVEAU", "Pings de couleur sur la prochaine action."],
      ["NOUVEAU", "6 skins à débloquer, dont Néon v7, le look de ta version d'avant."],
      ["NOUVEAU", "Bruitages de jeu et annonceur vocal, à couper dans les runes."],
      ["NOUVEAU", "Forge : crée tes propres items à stacks (anglais, lecture…)."],
      ["BUFF", "Le coach connaît ta partie (rang, boss, stacks) et explique avec des analogies LoL."],
      ["REFONTE", "Les réglages deviennent ta page de runes, avec ton pseudo."],
      ["AJUSTEMENT", "Toutes tes données sont gardées : rien à ressaisir."],
    ] },
  ],
};
/** Notes de patch de cette version */
export const PATCH = {
  v: "8.1",
  n: "L'Affiche",
  date: "novembre 2026",
  intro: "Même partie, nouveau visuel. Chaque onglet s'ouvre sur une affiche peinte à partir de tes données, comme un poster d'événement. Tes données et les règles du jeu n'ont pas bougé.",
  sections: [
    { t: "Les affiches", items: [
      ["NOUVEAU", "Base : le ciel suit l'heure de ta journée. Aube, journée, fin d'après-midi, crépuscule, nuit."],
      ["NOUVEAU", "Ton gold du jour en très grand, avec les montagnes qui passent devant."],
      ["NOUVEAU", "La nuit, le recall sous la lune : elle se remplit à mesure que tu dors."],
      ["NOUVEAU", "Farm : une affiche de jour de match, toi contre le boss de la semaine."],
      ["NOUVEAU", "Arène : damas cramoisi et ta mana de séance en grand."],
      ["NOUVEAU", "Profil : ta carte d'invocateur dans un cadre art déco, l'emblème de ton rang devant."],
    ] },
    { t: "Les pièces du jeu", items: [
      ["REFONTE", "Objectifs du jour : cinq cartes d'escouade qui se remplissent, puis s'allument."],
      ["REFONTE", "Inventaire : des médaillons, gris tant que l'item n'est pas fait aujourd'hui."],
      ["REFONTE", "Quêtes du jour : des contrats sur parchemin, tamponnés quand c'est fait."],
      ["REFONTE", "Boss de la semaine : une affiche cramoisie."],
      ["REFONTE", "Annonces : des tags au marqueur néon pour les kills, les niveaux et les records."],
      ["REFONTE", "Écran de chargement : l'affiche du match, toi contre le boss."],
      ["REFONTE", "Fin de partie : or pour une victoire, cramoisi pour une défaite."],
    ] },
    { t: "Skins", items: [
      ["AJUSTEMENT", "Les skins deviennent des ambiances qui habillent tous les onglets : Graffiti, Infernal, Abysse, Prestige, Challenger."],
      ["NOUVEAU", "Graffiti : des tags dessinés sur tes affiches."],
    ] },
  ],
  prev: PATCH80,
};
export const patchCount = (P = PATCH) => P.sections.reduce((a, s) => a + s.items.length, 0);
