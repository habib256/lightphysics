# lightphysics

C'est un projet de simulation physique utilisant la bibliothèque Matter.js pour la gestion de la physique et p5.js pour le rendu. Il gère aussi du raycasting 2D.

## Caractéristiques

- Simulation physique avec Matter.js
- Raycasting 2D pour une Gestion de la lumière

## Version en ligne

Vous pouvez tester la version en ligne à l'adresse suivante :
[Lien vers la version en ligne](https://habib256.github.io/lightphysics/)

## Utilisation au doigt (tablettes) et à la souris

- **Attraper un objet** : poser le doigt (ou cliquer) sur une caisse ou un ballon, puis glisser. L'objet suit le doigt ; quand on le lâche, il retombe.
- Un seul doigt à la fois : un deuxième doigt posé pendant qu'on tient un objet est ignoré.
- Sur la simulation, le geste ne fait ni défiler ni zoomer la page, et l'appui long n'ouvre pas de menu. En dehors de la simulation (texte d'un cours autour de l'iframe), la page défile normalement ; la molette de la souris fait toujours défiler la page.
- **Taille d'écran** (version du 15 novembre 2026) : la simulation remplit toute la fenêtre qu'on lui donne (téléphone tenu droit ou couché, tablette, ordinateur, iframe d'un cours) et se réadapte quand on tourne l'écran. Le « monde » de la simulation prend les proportions de la fenêtre et garde une surface proche de 800 × 600 unités : les objets ont à peu près la même taille relative partout. L'échelle est bornée (de 0,5 à 1,4 pixel par unité) : sur un grand écran, le monde s'agrandit au lieu de grossir sans fin.
- **Menu** : colonne à gauche sur un écran large (plus étroite sur un téléphone couché), bandeau en haut sur un téléphone tenu droit (largeur de 560 px au plus). Les boutons gardent une taille en pixels de l'écran (44 px de haut au moins).
- **Plateau** : il est centré dans la zone que le menu laisse libre, donc décalé vers la droite quand le menu est à gauche ; les objets apparaissent au-dessus de cette zone.
- **Vérification** : `tests/verifier-ecran.mjs` (Chrome headless, tactile émulé) contrôle sept tailles et la rotation. Aucun essai sur un vrai téléphone ni sur une vraie tablette.
- **Économie** : l'animation et la physique se mettent en pause quand l'onglet est caché ou quand l'iframe sort de l'écran (page du cours défilée), et repartent au retour.
- **Appareil lent** : si la cadence reste sous 40 images par seconde pendant deux mesures de 2 s (après 3 s de démarrage), l'affichage passe en définition réduite (1 pixel de calcul par pixel CSS au lieu de 2 ou 3 sur un écran haute densité). Le calcul des rayons, des ombres et de la physique ne change pas ; un ordinateur qui tient la cadence garde l'affichage d'origine. `Ecran.etat()` dans la console indique l'état (définition, pause).
- Ce réglage se trouve dans `lightphysics/ecran.js` ; aucune ressource externe n'est chargée et aucune donnée n'est collectée.

## Masse et poids (illustration du cours de 4e)

Version 1.0 du 14 novembre 2026.

L'app illustre le chapitre « Masse et poids » (4e) : le poids d'un objet dépend de l'astre, sa masse non. Tout se trouve dans `lightphysics/pesanteur.js` ; les commandes sont dans une colonne à gauche, là où ne tombe aucun objet, pour laisser voir la lumière et les ombres.

- **Choix de l'astre** : boutons Terre, Lune, Mars. L'intensité de la pesanteur de la simulation suit g = 9,8 / 1,6 / 3,7 N/kg (`engine.gravity.y = g / 9,8` : la Terre garde le réglage d'origine). Sur la Lune, la vitesse d'un objet qui tombe augmente 9,8 / 1,6 ≈ 6 fois moins vite que sur Terre (accélération mesurée dans l'app : 163,3 px/s² contre 1 000 px/s²).
- **Fiche de l'objet touché** (doigt ou souris, aussi en pause) : masse *m* en kg, « la même sur tous les astres », puis P = m × g avec les unités et le résultat en N. Le calcul est fait en nombres entiers (centièmes de kg × dixièmes de N/kg) : le résultat affiché est exact, avec la virgule décimale.
- **Flèche du poids** sur l'objet touché, selon les conventions du cours (4e, représentation des forces) : point d'application G (centre de gravité), direction verticale, sens vers le bas, longueur proportionnelle à P. L'échelle est indiquée dans la fiche (un segment de 20 px représente de 0,2 N à 100 N selon l'objet, valeur choisie d'après la masse de l'objet pour que la flèche mesure de 40 à 100 px sur Terre) ; elle ne change pas avec l'astre, donc la flèche raccourcit sur la Lune. La fiche précise que l'échelle change d'un objet à l'autre (comparer les valeurs de P, pas les longueurs) et que seul le poids est dessiné, pas l'action du support ou de la main (voir le cours sur la représentation des forces). Le plateau a été remonté de 80 px pour que la flèche d'un objet posé tienne toujours dans l'image.
- **Aide** (ouverte au lancement, repliable) : trois observations guidées et la mention « l'air est négligé, comme dans le vide ». Elle se referme quand on touche un objet.
- **Pause / Reprendre** : la physique s'arrête (aucun objet n'apparaît), l'affichage continue pour toucher un objet et lire sa fiche. Elle est indépendante de la pause automatique (onglet caché, iframe hors de l'écran).
- **Lâcher ensemble** : une caisse de 20 kg et un ballon de 0,32 kg partent avec le bas à la même hauteur ; ils descendent exactement ensemble (écart mesuré < 10⁻¹² px avant de toucher un obstacle).

**Ce qui est un modèle, et non une mesure** : les masses. Matter.js n'a pas d'unités ; les masses sont choisies plausibles et croissantes avec la taille, et c'est cette masse que le moteur utilise (`Body.setMass`) : caisse en bois = 1 kg pour 500 px² de face, arrondi au kilogramme (5 à 45 kg) ; ballon (enveloppe gonflée, masse proportionnelle à sa surface) = 0,5 kg pour un rayon de 25 px, arrondi au centième de kg sous 1 kg et au dixième au-dessus (0,08 à 2 kg). Les images (ballon de football, de tennis…) sont décoratives : un « ballon » est un ballon générique, et la fiche l'annonce : « masse de simulation ». Aucune vitesse, hauteur ou durée n'est affichée, faute d'échelle de longueur honnête.

**Air négligé** : les objets n'ont plus de frottement de l'air (`frictionAir = 0`, au lieu de 0,01 qui freinait tous les objets de la même façon). La chute ne dépend donc pas de la masse, comme dans le vide ; dans l'air réel, un objet léger et large (une feuille) est freiné davantage.

**Au doigt** : boutons de 58 px (45 px une fois l'illustration réduite à 78 % dans le cours) ; un objet tenu est lâché dès qu'aucun doigt ne reste sur la simulation, même si un autre doigt touche un bouton. Dans Chrome, toucher un bouton pendant qu'un autre doigt tient un objet ne déclenche pas le bouton (le navigateur ne produit un « clic » que pour un doigt seul) : choisir l'astre d'abord, puis attraper l'objet.

`Pesanteur.etat()` dans la console donne l'astre, g, la pause et la fiche de l'objet choisi. Aucune ressource externe, aucune donnée collectée.

## Mode « Ombres » (illustration du cours de 6e, signaux et optique)

`ombres/index.html` : vue de côté, comme sur un schéma, d'une source de lumière, d'un objet opaque (ballon ou caisse) et d'un écran, que l'on fait glisser au doigt ou à la souris. Écrit en Canvas 2D, sans p5 ni Matter.js (environ 40 ko) ; rien n'est recalculé tant que rien ne bouge.

- **Source ponctuelle ou étendue** (disque de 80 px de diamètre) : la pénombre n'apparaît qu'avec la source étendue.
- **Écran** : chaque point de sa face reçoit la fraction de la source qu'il voit sans que l'objet la cache (0 = ombre portée, entre 0 et 1 = pénombre). **Objet** : le côté opposé à la source reste sombre (ombre propre).
- **Rayons lumineux** : les rayons qui frôlent l'objet (tangentes communes à la source et à l'objet) ; en trait plein les limites de l'ombre, en pointillés celles de la pénombre.
- **Noms** : étiquettes Source de lumière, Objet opaque, Ombre propre, Ombre portée, Pénombre, Écran, pour vérifier son vocabulaire après avoir cherché (consignes dans l'aide).
- Vérifié : la taille de l'ombre portée mesurée sur l'écran coïncide à 1 px près avec le calcul par Thalès et avec les rayons tangents, pour la source ponctuelle et pour la source étendue (ombre et pénombre).
- `Ombres.etat()` dans la console donne les positions et les plages d'ombre et de pénombre sur l'écran. Aucune ressource externe, aucune donnée collectée.

## Mode « Couleurs » (cours de 4e sur les couleurs, cours de 5e sur la lumière)

`couleurs/index.html` (ouvrir `couleurs/index.html#faisceau` pour la seconde expérience) : vue de côté, Canvas 2D sans bibliothèque.

- **Lampes colorées** (synthèse additive, TP 1 du cours) : trois projecteurs rouge, vert, bleu, déplaçables et orientables (rond blanc), un écran, un objet opaque facultatif. Chaque point de l'écran reçoit la somme des lumières qui l'atteignent : R + V = jaune, R + B = magenta, V + B = cyan, R + V + B = blanc ; l'objet donne des ombres colorées.
- **Faisceau et prisme** : faisceau étroit de lumière blanche (31 radiations de 400 à 700 nm) ou rouge, verte, bleue (une seule radiation, comme un laser). Prisme en verre : réfraction à chaque face (n1 sin i1 = n2 sin i2, réflexion totale), indice de Cauchy n = 1,5515 + 23 750 / λ² (1,60 à 700 nm, 1,70 à 400 nm : dispersion **exagérée** environ 4 fois, signalée dans l'aide). Déviations vérifiées à la main : 46,3° (700 nm), 49,2° (550 nm, déviation minimale), 56,8° (400 nm). Filtres idéaux (TP 2) : rouge ≥ 595 nm, vert 495-565 nm, bleu ≤ 485 nm, jaune, cyan, magenta = sommes de deux bandes ; C + M = bleu, C + J = vert, M + J = rouge, C + M + J = noir.
- **Rayon lumineux** : le modèle du cours de 5e (droite fléchée) ; les radiations qui suivent le même chemin forment un seul rayon de la couleur de leur somme.
- **Noms** : nomme les couleurs reçues par l'écran (et les bouts « Violet », « Rouge » du spectre), pour vérifier après avoir cherché.
- `Couleurs.etat()` dans la console. Aucune ressource externe, aucune donnée collectée.

## Performances (14/11/2026)

- **Chargement : 6,7 Mo → 1,6 Mo** (43 → 27 requêtes) : les 7 fonds `graphics/mur0*.jpg` (2,4 Mo) n'étaient jamais affichés et ne sont plus chargés par `sketch.js` (ils restent pour `breakout.js`) ; images des ballons réduites à 256 px (la balle de tennis faisait 1 806 px et 2,1 Mo pour être dessinée sur 100 px au plus) ; `crate02.png`, opaque, devient `crate02.jpg` (315 → 51 ko) ; `p5.sound` et `paddle.js`, inutilisés par `index.html`, ne sont plus chargés (`index_debug.html` les garde).
- **Ombres des ballons** : un ballon arrête la lumière comme un **cercle exact** (un test d'intersection rayon-cercle) au lieu d'un polygone de 30 segments. Scène de 15 objets : 272 → 40 surfaces, calcul des rayons −37 %, image complète −52 % (Chrome, processeur ralenti 4 fois). Les contours de lumière sont identiques à 0,24 px près pour 99 % des 1 800 rayons ; les 2 rayons qui changent rasent le bord d'un ballon et sont maintenant arrêtés, comme ils doivent l'être.
- **Lumière** : polygone éclairé tracé directement sur le canvas, couleurs du dégradé préparées une seule fois.
