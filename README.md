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
- **Taille d'écran** : la simulation calcule toujours en 800 × 600. Si la fenêtre ou l'iframe est plus petite (tablette en portrait 768 × 1024, illustration réduite dans un cours), l'affichage est réduit pour tenir sans défilement, sans agrandissement au-delà de 100 %. Le fond de page est noir.
- **Économie** : l'animation et la physique se mettent en pause quand l'onglet est caché ou quand l'iframe sort de l'écran (page du cours défilée), et repartent au retour.
- **Appareil lent** : si la cadence reste sous 40 images par seconde pendant deux mesures de 2 s (après 3 s de démarrage), l'affichage passe en définition réduite (1 pixel de calcul par pixel CSS au lieu de 2 ou 3 sur un écran haute densité). Le calcul des rayons, des ombres et de la physique ne change pas ; un ordinateur qui tient la cadence garde l'affichage d'origine. `Ecran.etat()` dans la console indique l'état (définition, pause).
- Ce réglage se trouve dans `lightphysics/ecran.js` ; aucune ressource externe n'est chargée et aucune donnée n'est collectée.
