# Isma Daily

Tracker perso en néon : le carburant du jour (calories face au rythme idéal), la prochaine chose
à faire, les tuiles protéines, eau, sommeil et salle, les rituels (lumière, créatine, minoxidil,
posture), la routine posture guidée de 5 minutes, les photos glow-up avant / après, la semaine en
matrice, la trajectoire du poids, les séances Hevy et le coach.
Ouvert sur iPhone depuis l'écran d'accueil : https://contactvisulink-stack.github.io/Tracker-/

- `index.html` : l'app (un seul fichier, rien à installer).
- `ancien.html` : la toute première version, gardée en secours. Elle lit les mêmes données.
- `dev/` : le code source lisible. Pour reconstruire `index.html` : `cd dev && npm install && npm run build`.
- `radar/` : Radar Perth, l'appli des sorties à Perth (https://contactvisulink-stack.github.io/Tracker-/radar/).
  Les sorties sont dans `radar/data/` et une tâche planifiée Claude les met à jour chaque matin.
  `radar/data/prefs.json` garde les envies et retours d'Isma, lus à chaque mise à jour.

Les données restent dans le téléphone (stockage du navigateur). La clé API Claude n'est jamais dans le code :
elle se colle dans Réglages et reste sur le téléphone.
