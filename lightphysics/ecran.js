// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// Adaptation à l'écran : tablettes, doigt, iframe, économie d'énergie.
// La simulation reste en 800×600 (CONFIG) : seul l'affichage CSS du canvas
// est réduit quand la fenêtre est plus petite. La physique n'est pas touchée.

const Ecran = (() => {
  let elt = null;      // élément <canvas> de p5
  let souris = null;   // Matter.Mouse (souris et doigt)
  let runner = null;   // Matter.Runner (boucle de la physique)

  // Pause quand l'onglet est caché ou que le canvas sort de l'écran
  // (iframe d'un cours que l'élève a fait défiler plus loin).
  let ongletCache = false;
  let horsEcran = false;
  let enPause = false;

  // Adaptation automatique à un appareil lent : si la cadence reste sous
  // SEUIL_IPS pendant FENETRES_LENTES mesures successives, on dessine en
  // définition 1 pixel CSS = 1 pixel (pixelDensity(1)) au lieu de 2 ou 3.
  // Le calcul (rayons, ombres, physique) est identique ; seule la finesse
  // des bords change. Un ordinateur qui tient la cadence n'est pas concerné.
  const FENETRE_MS = 2000;
  const SEUIL_IPS = 40;
  const FENETRES_LENTES = 2;
  const ATTENTE_DEMARRAGE_MS = 3000;
  let reprise = 0;
  let debutFenetre = 0;
  let imagesFenetre = 0;
  let fenetresLentes = 0;
  let definitionReduite = false;

  // Doigt en cours (pour bloquer le menu contextuel de l'appui long).
  let doigtPose = false;
  let finDoigt = 0;

  // Affiche le canvas à la plus grande taille possible sans dépasser 800×600
  // (aucun agrandissement : sur ordinateur, l'affichage reste à 100 %).
  function ajusterAffichage() {
    if (!elt) return;
    const largeur = window.innerWidth;
    const hauteur = window.innerHeight;
    if (largeur <= 0 || hauteur <= 0) return;
    const echelle = Math.min(1, largeur / CONFIG.CANVAS_WIDTH, hauteur / CONFIG.CANVAS_HEIGHT);
    elt.style.width = (CONFIG.CANVAS_WIDTH * echelle) + 'px';
    elt.style.height = (CONFIG.CANVAS_HEIGHT * echelle) + 'px';
  }

  function preparerSaisie() {
    // Pas de molette : la roulette doit continuer à faire défiler la page du cours.
    elt.removeEventListener('mousewheel', souris.mousewheel);
    elt.removeEventListener('DOMMouseScroll', souris.mousewheel);

    // Un seul doigt à la fois : un deuxième doigt posé sur l'écran est ignoré
    // (sinon l'objet saisi sauterait d'un doigt à l'autre).
    const ignorerAutresDoigts = event => {
      if (event.touches.length > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    elt.addEventListener('touchstart', ignorerAutresDoigts, {capture: true, passive: false});
    elt.addEventListener('touchmove', ignorerAutresDoigts, {capture: true, passive: false});
    elt.addEventListener('touchend', event => {
      // Un doigt levé alors qu'un autre reste posé : on garde la saisie.
      if (event.touches.length > 0) event.stopImmediatePropagation();
    }, {capture: true});

    // Geste interrompu par le système (notification, geste du navigateur) : on lâche l'objet.
    elt.addEventListener('touchcancel', souris.mouseup);

    // Bouton relâché ou souris déplacée hors du canvas pendant une saisie :
    // l'objet suit toujours le pointeur et il est bien lâché.
    window.addEventListener('mouseup', event => { if (event.target !== elt) souris.mouseup(event); });
    window.addEventListener('mousemove', event => { if (event.target !== elt) souris.mousemove(event); });

    // Appui long au doigt : pas de menu contextuel (le clic droit à la souris reste normal).
    elt.addEventListener('touchstart', () => { doigtPose = true; }, {passive: true});
    const leverDoigt = () => { doigtPose = false; finDoigt = performance.now(); };
    elt.addEventListener('touchend', leverDoigt, {passive: true});
    elt.addEventListener('touchcancel', leverDoigt, {passive: true});
    elt.addEventListener('contextmenu', event => {
      if (doigtPose || event.pointerType === 'touch' || performance.now() - finDoigt < 1000) event.preventDefault();
    });
  }

  function mettreAJourPause() {
    const pause = ongletCache || horsEcran;
    if (pause === enPause) return;
    enPause = pause;
    if (pause) {
      souris.button = -1;  // un objet tenu au moment de la pause est lâché
      noLoop();
      Runner.stop(runner);
    } else {
      Runner.run(runner, engine);
      loop();
      reprise = performance.now();  // la mesure de cadence repart de zéro
    }
  }

  function surveillerVisibilite() {
    ongletCache = document.hidden;
    document.addEventListener('visibilitychange', () => {
      ongletCache = document.hidden;
      mettreAJourPause();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entrees => {
        horsEcran = !entrees[entrees.length - 1].isIntersecting;
        mettreAJourPause();
      }).observe(elt);
    }
    mettreAJourPause();
  }

  function reduireDefinition() {
    definitionReduite = true;
    pixelDensity(1);          // redimensionne le canvas (et remet sa taille CSS à 800×600)
    souris.pixelRatio = 1;    // les coordonnées du doigt suivent la nouvelle définition
    ajusterAffichage();
    console.info('LightPhysics : appareil lent, affichage en définition réduite (pixelDensity 1).');
  }

  // Appelée au début de draw(), avant tout dessin.
  function surveillerCadence() {
    if (definitionReduite || pixelDensity() <= 1) return;
    const maintenant = performance.now();
    if (maintenant - reprise < ATTENTE_DEMARRAGE_MS) {
      debutFenetre = maintenant;
      imagesFenetre = 0;
      return;
    }
    imagesFenetre++;
    const duree = maintenant - debutFenetre;
    if (duree < FENETRE_MS) return;
    const ips = imagesFenetre * 1000 / duree;
    fenetresLentes = ips < SEUIL_IPS ? fenetresLentes + 1 : 0;
    debutFenetre = maintenant;
    imagesFenetre = 0;
    if (fenetresLentes >= FENETRES_LENTES) reduireDefinition();
  }

  function installer(canvasElt, matterMouse, matterRunner) {
    elt = canvasElt;
    souris = matterMouse;
    runner = matterRunner;
    reprise = performance.now();
    ajusterAffichage();
    window.addEventListener('resize', ajusterAffichage);
    preparerSaisie();
    surveillerVisibilite();
  }

  // État lisible depuis la console (et par les tests automatiques).
  function etat() {
    return {pixelDensity: pixelDensity(), definitionReduite, enPause, ongletCache, horsEcran,
            affichage: elt ? [elt.clientWidth, elt.clientHeight] : null};
  }

  return {installer, ajusterAffichage, surveillerCadence, etat};
})();
