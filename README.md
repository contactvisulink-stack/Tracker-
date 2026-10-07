# Isma Daily

Tracker perso en mode focus : un viseur à trois anneaux (calories, protéines, sommeil),
la prochaine chose à faire, les missions du jour, les séances Hevy et le poids.
Ouvert sur iPhone depuis l'écran d'accueil : https://contactvisulink-stack.github.io/Tracker-/

- `index.html` : l'app (un seul fichier, rien à installer).
- `ancien.html` : la toute première version, gardée en secours. Elle lit les mêmes données.
- `dev/` : le code source lisible. Pour reconstruire `index.html` : `cd dev && npm install && npm run build`.

Les données restent dans le téléphone (stockage du navigateur). La clé API Claude n'est jamais dans le code :
elle se colle dans Réglages et reste sur le téléphone.
