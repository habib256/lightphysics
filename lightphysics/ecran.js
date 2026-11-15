// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// Adaptation à l'écran : téléphones, tablettes, ordinateurs, iframe, doigt, économie d'énergie.
// La simulation remplit toute la fenêtre qu'on lui donne, à toute taille et dans les deux
// orientations. Le « monde » (unités de la physique et du dessin) garde les proportions de la
// fenêtre et une surface proche de 800×600 : les objets gardent donc à peu près la même taille
// relative sur un téléphone et sur un grand écran. L'échelle (pixels CSS par unité du monde)
// est bornée : sur un très grand écran, le monde s'agrandit au lieu de grossir sans fin.

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

  // Monde : largeur et hauteur en unités de la simulation, s = pixels CSS par unité.
  const SURFACE = CONFIG.CANVAS_WIDTH * CONFIG.CANVAS_HEIGHT;
  const ECHELLE_MIN = 0.5, ECHELLE_MAX = 1.4;
  const DEFINITION_MAX = 3;
  let monde = {w: CONFIG.CANVAS_WIDTH, h: CONFIG.CANVAS_HEIGHT, s: 1};
  let apresRedimension = null;   // fonction de sketch.js : replace le plateau, les lampes, la grille
  let attente = 0;

  function calculerMonde() {
    const largeur = window.innerWidth, hauteur = window.innerHeight;
    if (largeur <= 0 || hauteur <= 0) return monde;   // iframe pas encore affichée
    const s = Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, Math.sqrt(largeur * hauteur / SURFACE)));
    return {w: Math.round(largeur / s), h: Math.round(hauteur / s), s};
  }

  // Finesse du dessin : un pixel du canvas par pixel de l'écran (borné), ou 1 par unité sur un appareil lent.
  function definitionVoulue() {
    if (definitionReduite) return 1;
    return Math.max(1, Math.min(DEFINITION_MAX, (window.devicePixelRatio || 1) * monde.s));
  }

  // Met le canvas à la taille de la fenêtre. Renvoie true si le monde a changé de dimensions.
  function ajusterAffichage() {
    if (!elt) return false;
    const nouveau = calculerMonde();
    const change = nouveau.w !== width || nouveau.h !== height;
    monde = nouveau;
    const definition = definitionVoulue();
    if (Math.abs(pixelDensity() - definition) > 0.01) pixelDensity(definition);
    // Sans redessiner tout de suite (troisième argument) : un dessin entre le changement de taille du canvas
    // et le réaménagement du monde (plateau, zone libre) retirerait comme « hors de l'écran » le plateau et
    // des objets encore placés pour l'ancienne taille.
    if (change) resizeCanvas(monde.w, monde.h, true);
    // p5 remet la taille CSS aux dimensions du monde : on impose celle de la fenêtre.
    elt.style.width = window.innerWidth + 'px';
    elt.style.height = window.innerHeight + 'px';
    if (souris) souris.pixelRatio = pixelDensity();
    return change;
  }

  function redimensionner() {
    ajusterAffichage();
    if (apresRedimension) apresRedimension();
  }

  // Rotation de l'écran, plein écran, barre d'adresse du téléphone : on attend la fin du geste.
  function surRedimension() {
    clearTimeout(attente);
    attente = setTimeout(redimensionner, 80);
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
    ajusterAffichage();       // applique la définition 1 et remet la taille CSS de la fenêtre
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
    window.addEventListener('resize', surRedimension);
    window.addEventListener('orientationchange', surRedimension);
    preparerSaisie();
    surveillerVisibilite();
  }

  // État lisible depuis la console (et par les tests automatiques).
  function etat() {
    return {pixelDensity: pixelDensity(), definitionReduite, enPause, ongletCache, horsEcran,
            affichage: elt ? [elt.clientWidth, elt.clientHeight] : null,
            fenetre: [window.innerWidth, window.innerHeight], monde: {...monde}};
  }

  return {installer, ajusterAffichage, redimensionner, surveillerCadence, etat,
          monde: () => monde, calculerMonde,
          apresRedimension: f => { apresRedimension = f; }};
})();
