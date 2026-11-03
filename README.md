# Isma Daily

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
  - `test/e2e8.py` et `test/shots8.py` : le parcours complet et les captures du patch 8.
- `radar/` : Radar Perth, l'appli des sorties à Perth (https://contactvisulink-stack.github.io/Tracker-/radar/).
  Les sorties sont dans `radar/data/` et une tâche planifiée Claude les met à jour chaque matin.
  `radar/data/prefs.json` garde les envies et retours d'Isma, lus à chaque mise à jour.

Les données restent dans le téléphone (stockage du navigateur). La clé API Claude n'est jamais dans le code :
elle se colle dans les runes (réglages) et reste sur le téléphone.
