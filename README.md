# Isma Daily

Patch 9 « Le Client » : l'interface s'inspire d'un client de jeu compétitif. Fond nuit, surfaces plates,
séparations fines, l'or pour l'essentiel et le bleu pour la mana. Plus d'affiches peintes, de parchemins ni de
particules : un seul système visuel pour les quatre onglets. Base devient un centre de contrôle (gold du jour,
5 objectifs en lignes, inventaire avec rareté selon les stacks, quêtes, semaine, boss, rang), Farm met le journal
des repas en avant, l'Arène a une sélection de séance façon champion select. Le patch corrige aussi des mécaniques
qui affichaient l'inverse de ce qu'elles faisaient (mana « pleine » trop tôt, « journée bouclée » avec des quêtes
restantes, alerte de séance pour un exercice fait en plus, totaux arrondis qui ne tombaient pas juste).
Les icônes peintes des items sont dans `art/items/`. Aucun art de Riot.

Patch 8 « Le Reforge » : le tracker devient une partie de League of Legends, calculée à partir des vraies données.
Les calories sont le gold du farm du jour, le sommeil remplit les PV (le recall), la créatine est un item à stacks
qui monte la mana max, chaque rituel devient un item, les séances A, B et C sont les sorts Q, W et E, et le poids
donne le rang classé (Fer IV au départ, Challenger au poids visé). En plus : 5 objectifs par jour jusqu'au pentakill,
boss de la semaine, quêtes du jour, succès, codex « expliqué en LoL », écran de fin de partie et notes de patch.
Tout le reste est gardé : ajout des repas (texte, photo, recherche), séances Hevy, routine posture guidée,
photos glow-up et coach.
Ouvert sur iPhone depuis l'écran d'accueil : https://contactvisulink-stack.github.io/Tracker-/

- `index.html` : l'app (un seul fichier, rien à installer).
- `ancien.html` : la toute première version, gardée en secours. Elle lit les mêmes données.
- `dev/` : le code source lisible. Pour reconstruire `index.html` : `cd dev && npm install && npm run build`.
  - `src/game.js` : le moteur de jeu (stacks, mana, rang, boss, quêtes, succès). Rien n'est stocké en double :
    tout se recalcule depuis les journées notées.
  - `src/content.js` : le codex, les astuces de chargement et les notes de patch.
  - `src/client.jsx` : les pièces communes de l'interface (en-tête, jauges, anneaux d'état, sections).
  - `src/glyphs.jsx` : les pictogrammes (glyphes du jeu, items, emblèmes de rang, boss, pièce). Les items peints
    viennent de `art/items/`. Les icônes au trait sont dans `src/ui.jsx`.
  - `src/base.css` : remise à zéro, boutons, formulaires et fiches. `src/client.css` : les couleurs, les polices
    et les écrans principaux. Les skins ne changent que la couleur d'accent.
  - `test/e2e8.py` et `test/shots8.py` : le parcours complet et les captures. `test/mech9.test.mjs` : les mécaniques
    corrigées au patch 9 (`node test/mech9.test.mjs`).
- `radar/` : Radar Perth, l'appli des sorties à Perth (https://contactvisulink-stack.github.io/Tracker-/radar/).
  Les sorties sont dans `radar/data/` et une tâche planifiée Claude les met à jour chaque matin.
  `radar/data/prefs.json` garde les envies et retours d'Isma, lus à chaque mise à jour.

Les données restent dans le téléphone (stockage du navigateur). La clé API Claude n'est jamais dans le code :
elle se colle dans les runes (réglages) et reste sur le téléphone.
