# Isma Daily

v11 : le jeu est retiré et l'interface est celle d'une vraie appli iPhone (verre dépoli, dégradés, grands titres,
police système SF Pro, barre d'onglets flottante). Peu d'éléments par écran, une action évidente.
- Aujourd'hui : la prochaine action avec son bouton, 4 systèmes (carburant, récup, masse, entraînement), les alertes,
  le protocole du jour et la semaine en matrice.
- Bouton + (« Noter ») : une ligne pour tout noter (« 2 oeufs, 150 g riz, créa, eau 1 l, poids 53,6, dodo »). Lecture locale
  sans IA, aperçu avant d'enregistrer, un seul « Annuler » pour tout.
- Repas : total, macros, projection de fin de journée tirée de tes habitudes, suggestions en un appui, journal.
- Sport : forme du jour expliquée, charges exactes par exercice, +1 rep, courbe de force, volume par semaine,
  records, tests de mobilité et routine posture.
- Analyse : maintenance mesurée sur tes vrais chiffres (mangé − variation de poids × 7 700), calories à viser
  selon la prise voulue, courbe de poids avec projection, régularité sur 5 semaines, constats, moyennes, photos.
Toutes les données d'avant sont gardées telles quelles.
Ouvert sur iPhone depuis l'écran d'accueil : https://contactvisulink-stack.github.io/Tracker-/

- `index.html` : l'app (un seul fichier, rien à installer).
- `ancien.html` : la toute première version, gardée en secours. Elle lit les mêmes données.
- `dev/` : le code source lisible. Pour reconstruire `index.html` : `cd dev && npm install && npm run build`.
  - `src/engine.js` : les calculs (systèmes, projection, maintenance réelle, alertes, constats, régularité).
    Rien n'est stocké en double : tout se recalcule depuis les journées notées.
  - `src/command.js` : la lecture de la console. `src/lib.js` : stockage, aliments, sommeil, séances, IA.
  - `src/status.jsx`, `fuel.jsx`, `train.jsx`, `lab.jsx` : les 4 écrans. `console.jsx` : la console.
  - `src/base.css` : formulaires et fiches. `src/app.css` : couleurs, verre, dégradés et écrans.
  - Tests : `node test/command.test.mjs`, `node test/mech.test.mjs`, `python3 test/e2e10.py SORTIE index.html`
    (parcours complet) et `test/shots10.py` (captures).
- `radar/` : Radar Perth, l'appli des sorties à Perth (https://contactvisulink-stack.github.io/Tracker-/radar/).
  Les sorties sont dans `radar/data/` et une tâche planifiée Claude les met à jour chaque matin.
  `radar/data/prefs.json` garde les envies et retours d'Isma, lus à chaque mise à jour.

Les données restent dans le téléphone (stockage du navigateur). La clé API Claude n'est jamais dans le code :
elle se colle dans les réglages et reste sur le téléphone.
