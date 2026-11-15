// LightPhysics — Masse et poids, module pédagogique (v1.0, 2026-11-14)
// VERHILLE Arnaud
// Copyleft GPL2
//
// Masse et poids (cours de 4e) : choix de l'astre, masse et poids de l'objet touché,
// flèche du poids, carte d'aide, pause, « Lâcher ensemble ».
//
// Ce qui est exact par construction :
// - l'intensité de la pesanteur de la simulation suit g : Terre 9,8 ; Lune 1,6 ; Mars 3,7 N/kg
//   (engine.gravity.y = g / 9,8 : la Terre garde le réglage d'origine de Matter.js) ;
// - la masse affichée est celle que le moteur utilise (Body.setMass), arrondie à sa création ;
// - P = m × g est calculé en nombres entiers (centièmes de kg × dixièmes de N/kg), sans arrondi ;
// - la flèche du poids part du centre de gravité G, verticale, vers le bas, et sa longueur est
//   proportionnelle à P (échelle propre à l'objet, affichée, et la même sur tous les astres).
// Les objets ne sont pas freinés par l'air (frictionAir = 0) : la chute ne dépend pas de la masse.
// Les masses sont des valeurs de modèle, plausibles et croissantes avec la taille de l'objet.

const Pesanteur = (() => {
  // g en dixièmes de N/kg (entiers : calcul exact de P = m × g).
  const ASTRES = {
    terre: {nom: 'Terre', sur: 'sur Terre', g: 98},
    lune: {nom: 'Lune', sur: 'sur la Lune', g: 16},
    mars: {nom: 'Mars', sur: 'sur Mars', g: 37},
  };
  const G_TERRE = ASTRES.terre.g;

  // Échelle de la flèche : un segment de BARRE pixels représente X newtons. X est pris dans
  // la suite 1-2-5 pour que la flèche mesure de 40 à 100 px sur Terre (plus courte ailleurs).
  const BARRE = 20;
  const ECHELLES_MN = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];  // en millinewtons

  const COULEUR_FLECHE = '#ff5a4f';
  const COULEUR_SELECTION = '#ffd166';

  let astre = 'terre';
  let selection = null;      // objet choisi (Box ou Ball)
  let enPause = false;
  let aideOuverte = true;    // carte d'aide ouverte au lancement
  let canvas = null, contrainte = null, runner = null, moteur = null;
  let ui = {};
  let ficheAffichee = '';    // pour ne réécrire la fiche (zone lue par les lecteurs d'écran) qu'au changement

  // ---- Grandeurs ----------------------------------------------------------

  // Masses de modèle, en centièmes de kg (entier).
  // Caisse en bois : 1 kg pour 500 px² de face, arrondi au kilogramme (de 5 à 45 kg).
  // Ballon (enveloppe gonflée, masse proportionnelle à sa surface) : 0,5 kg pour un rayon de 25 px,
  // arrondi au centième de kg sous 1 kg, au dixième au-dessus (de 0,08 à 2 kg).
  function masseCaisse(w, h) {
    return Math.max(1, Math.round(w * h / 500)) * 100;
  }
  function masseBallon(r) {
    const m = 0.5 * (r / 25) * (r / 25);
    return m < 1 ? Math.max(1, Math.round(m * 100)) : Math.round(m * 10) * 10;
  }

  // Appelée à la création de chaque objet mobile (sketch.js).
  function donnerMasse(objet) {
    const caisse = objet instanceof Box;
    objet.type = caisse ? 'caisse' : 'ballon';
    objet.masseCentiemes = caisse ? masseCaisse(objet.w, objet.h) : masseBallon(objet.r);
    Body.setMass(objet.body, objet.masseCentiemes / 100);
    objet.body.frictionAir = 0;  // air négligé : comme dans le vide
  }

  function poidsMilliN(objet, cle = astre) {  // P en millinewtons, exact
    return objet.masseCentiemes * ASTRES[cle].g;
  }

  function echelleMilliN(objet) {  // dépend de la masse seulement : la même sur tous les astres
    const pTerre = poidsMilliN(objet, 'terre');
    return ECHELLES_MN.find(x => pTerre <= 5 * x) || ECHELLES_MN[ECHELLES_MN.length - 1];
  }

  function longueurFleche(objet) {
    return poidsMilliN(objet) / echelleMilliN(objet) * BARRE;
  }

  // Écriture française d'un entier représentant une valeur à n décimales : 784, 3 -> « 0,784 ».
  function decimal(entier, n) {
    const signe = entier < 0 ? '−' : '';
    let s = String(Math.abs(entier)).padStart(n + 1, '0');
    let ent = s.slice(0, s.length - n), dec = s.slice(s.length - n).replace(/0+$/, '');
    return signe + ent + (dec ? ',' + dec : '');
  }

  // ---- Interface (HTML par-dessus le canvas) --------------------------------

  // Écran large : colonne à gauche. Téléphone tenu droit (largeur ≤ 560 px) : bandeau en haut.
  // Téléphone couché (hauteur ≤ 430 px) : colonne à gauche, plus étroite et plus serrée.
  // Les tailles sont en pixels de l'écran (pas à l'échelle de la simulation) : un bouton reste
  // assez grand pour le doigt sur tous les appareils.
  const STYLE = `
  #pesanteur { position: fixed; inset: 0; pointer-events: none; z-index: 2;
    font: 15px/1.3 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #fff; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  #pesanteur .pz-colonne { position: absolute; left: 8px; top: 62px; bottom: 8px; width: 184px; display: flex; flex-direction: column; gap: 6px; }
  #pesanteur .pz-colonne > * { flex: 0 0 auto; }
  #pesanteur button { pointer-events: auto; min-height: 58px; margin: 0; padding: 0 4px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.45); background: rgba(14,18,26,.82); color: #fff; font-family: inherit;
    font-size: 16px; font-weight: 600; line-height: 1.1; cursor: pointer; touch-action: manipulation; }
  #pesanteur button:focus-visible { outline: 3px solid ${COULEUR_SELECTION}; outline-offset: 1px; }
  #pesanteur button[aria-pressed="true"], #pesanteur button[aria-expanded="true"] { background: ${COULEUR_SELECTION}; color: #111; border-color: ${COULEUR_SELECTION}; }
  #pesanteur .pz-astres, #pesanteur .pz-ligne { display: flex; gap: 5px; }
  #pesanteur .pz-astres button, #pesanteur .pz-ligne button { flex: 1 1 0; min-width: 0; }
  #pesanteur .pz-g { margin: 0; padding: 3px 8px; border-radius: 8px; background: rgba(14,18,26,.82); font-weight: 600; }
  #pesanteur .pz-colonne > .pz-carte { flex: 0 1 auto; min-height: 0; overflow-y: auto; }  /* jamais coupée : défile si la police est plus grande */
  #pesanteur .pz-carte { pointer-events: auto; margin: 0; padding: 8px 10px; border-radius: 10px;
    background: rgba(14,18,26,.88); border: 1px solid rgba(255,255,255,.3); }
  #pesanteur .pz-carte h2 { margin: 0 0 4px; font-size: 16px; }
  #pesanteur .pz-carte p { margin: 0 0 5px; }
  #pesanteur .pz-carte p:last-child { margin-bottom: 0; }
  #pesanteur .pz-p { color: #ff8a80; font-weight: 700; }
  #pesanteur .pz-barre { display: inline-block; width: var(--pz-barre, ${BARRE}px); height: 4px; margin: 0 4px 3px 2px; vertical-align: middle;
    background: ${COULEUR_FLECHE}; border-left: 2px solid #fff; border-right: 2px solid #fff; box-sizing: border-box; }
  #pesanteur .pz-petit { font-size: 14px; opacity: .9; }
  #pesanteur [hidden] { display: none; }
  @media (min-width: 561px) and (max-height: 430px) {
    #pesanteur { font-size: 14px; }
    #pesanteur .pz-colonne { top: 6px; bottom: 6px; left: 6px; width: 172px; gap: 5px; }
    #pesanteur button { min-height: 44px; font-size: 15px; }
    #pesanteur .pz-carte { padding: 6px 8px; }
  }
  @media (max-width: 560px) {
    #pesanteur .pz-colonne { left: 6px; right: 6px; top: 6px; bottom: auto; width: auto; max-height: calc(100% - 12px);
      flex-direction: row; flex-wrap: wrap; align-content: flex-start; gap: 5px; }
    #pesanteur button { min-height: 46px; font-size: 15px; }
    #pesanteur .pz-astres { flex: 1 1 100%; }
    #pesanteur .pz-g { flex: 1 1 100%; padding: 2px 8px; }
    #pesanteur .pz-ligne { flex: 1.2 1 0; min-width: 0; }
    #pesanteur .pz-bouton-ensemble { flex: 1 1 0; min-width: 0; }
    #pesanteur .pz-colonne > .pz-carte { flex: 0 1 100%; max-height: 42vh; }
  }
  `;

  function creerInterface() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const racine = document.createElement('div');
    racine.id = 'pesanteur';
    racine.innerHTML = `
      <div class="pz-colonne">
        <div class="pz-astres" role="group" aria-label="Choix de l'astre">
          <button type="button" data-astre="terre" aria-pressed="true">Terre</button>
          <button type="button" data-astre="lune" aria-pressed="false">Lune</button>
          <button type="button" data-astre="mars" aria-pressed="false">Mars</button>
        </div>
        <p class="pz-g" aria-live="polite"></p>
        <div class="pz-ligne">
          <button type="button" class="pz-bouton-pause" aria-pressed="false">Pause</button>
          <button type="button" class="pz-bouton-aide" aria-expanded="true" aria-controls="pz-aide">Aide</button>
        </div>
        <button type="button" class="pz-bouton-ensemble">Lâcher ensemble</button>
        <section id="pz-aide" class="pz-carte" aria-label="Aide&nbsp;: masse et poids">
          <p>1. Touche un objet&nbsp;: tu vois sa masse <i>m</i> et son poids <i>P</i> (<span class="pz-p">flèche rouge</span>).</p>
          <p>2. Passe sur la Lune ou sur Mars&nbsp;: <i>P</i> change, <i>m</i> reste la même.</p>
          <p>3. «&nbsp;Lâcher ensemble&nbsp;»&nbsp;: une caisse de 20&nbsp;kg et un ballon de 0,32&nbsp;kg tombent ensemble.</p>
          <p class="pz-petit">L’air est négligé, comme dans le vide.</p>
        </section>
        <section class="pz-carte pz-fiche" role="status" aria-live="polite" hidden></section>
      </div>`;
    document.body.appendChild(racine);

    ui = {
      racine,
      colonne: racine.querySelector('.pz-colonne'),
      astres: [...racine.querySelectorAll('[data-astre]')],
      g: racine.querySelector('.pz-g'),
      pause: racine.querySelector('.pz-bouton-pause'),
      aide: racine.querySelector('.pz-bouton-aide'),
      ensemble: racine.querySelector('.pz-bouton-ensemble'),
      carte: racine.querySelector('#pz-aide'),
      fiche: racine.querySelector('.pz-fiche'),
    };
    ui.astres.forEach(b => b.addEventListener('click', () => choisirAstre(b.dataset.astre)));
    ui.pause.addEventListener('click', () => mettreEnPause(!enPause));
    ui.aide.addEventListener('click', () => { aideOuverte = !aideOuverte; majPanneaux(); });
    ui.ensemble.addEventListener('click', lacherEnsemble);
  }

  // Le calque couvre la fenêtre, comme le canvas. Seule la barre d'échelle de la fiche suit
  // l'échelle de la simulation : elle doit avoir à l'écran la longueur du segment de la flèche.
  function placerInterface() {
    if (!ui.racine) return;
    ui.racine.style.setProperty('--pz-barre', (BARRE * Ecran.monde().s) + 'px');
  }

  // Bandeau en haut (téléphone tenu droit) ou colonne à gauche (les autres écrans).
  function menuEnHaut() {
    return !!ui.colonne && getComputedStyle(ui.colonne).flexDirection === 'row';
  }

  // Zone du monde que le menu ne recouvre pas (les cartes d'aide et de fiche, repliables, ne
  // comptent pas), en unités de la simulation. Le plateau et les objets y sont placés.
  function zoneLibre() {
    const m = Ecran.monde();
    const zone = {x0: 0, y0: 0, x1: m.w, y1: m.h, lampes: {x: 30, y: 30}};
    if (!ui.colonne) return zone;
    const colonne = ui.colonne.getBoundingClientRect();
    if (menuEnHaut()) {
      zone.y0 = Math.min(m.h * 0.5, (ui.ensemble.getBoundingClientRect().bottom + 6) / m.s);
      zone.lampes.y = zone.y0 + 30;
    } else {
      zone.x0 = Math.min(m.w * 0.5, (colonne.right + 8) / m.s);
      // Colonne qui monte jusqu'en haut (téléphone couché) : les lampes passent à sa droite pour rester visibles.
      if (colonne.top < 50) zone.lampes.x = zone.x0 + 30;
    }
    return zone;
  }

  function majPanneaux() {
    ui.aide.setAttribute('aria-expanded', String(aideOuverte));
    ui.carte.hidden = !aideOuverte;
    ui.fiche.hidden = aideOuverte || !selection;
    majFiche();
  }

  function majFiche() {
    let html = '';
    if (selection) {
      const A = ASTRES[astre];
      const m = decimal(selection.masseCentiemes, 2);
      html = `<h2>${selection.type === 'caisse' ? 'Caisse' : 'Ballon'} <span class="pz-petit">(masse de simulation)</span></h2>
        <p>Masse&nbsp;: <b><i>m</i> = ${m}&nbsp;kg</b><br><span class="pz-petit">la même sur tous les astres</span></p>
        <p>Poids ${A.sur}&nbsp;:<br><i>P</i> = <i>m</i> × <i>g</i><br><i>P</i> = ${m}&nbsp;kg × ${decimal(A.g, 1)}&nbsp;N/kg<br>
        <b class="pz-p"><i>P</i> = ${decimal(poidsMilliN(selection), 3)}&nbsp;N</b></p>
        <p class="pz-petit">Échelle de cet objet&nbsp;: <span class="pz-barre" aria-hidden="true"></span> = ${decimal(echelleMilliN(selection), 3)}&nbsp;N (elle change d’un objet à l’autre). Seul le poids est dessiné (pas le support ni la main).</p>`;
    }
    if (html !== ficheAffichee) {
      ficheAffichee = html;
      ui.fiche.innerHTML = html;
    }
  }

  function choisirAstre(cle) {
    if (!ASTRES[cle]) return;
    astre = cle;
    moteur.gravity.y = ASTRES[cle].g / G_TERRE;  // rapport exact : Lune 16/98, Mars 37/98
    ui.astres.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.astre === cle)));
    ui.g.innerHTML = `${ASTRES[cle].nom}&nbsp;: <i>g</i> = ${decimal(ASTRES[cle].g, 1)}&nbsp;N/kg`;
    majFiche();
  }

  // Pause voulue par l'élève : la physique s'arrête (runner.enabled, indépendant de la pause
  // automatique de ecran.js), l'affichage continue pour pouvoir toucher un objet et lire sa fiche.
  function mettreEnPause(pause) {
    enPause = pause;
    runner.enabled = !pause;
    ui.pause.setAttribute('aria-pressed', String(pause));
    ui.pause.textContent = pause ? 'Reprendre' : 'Pause';
  }

  // Une caisse lourde et un ballon léger, le bas des deux objets à la même hauteur,
  // de part et d'autre du milieu du plateau.
  function lacherEnsemble() {
    const zone = zoneLibre();
    const bas = zone.y0 + 30;
    const centre = (zone.x0 + zone.x1) / 2;
    const ecart = Math.max(70, Math.min(110, (zone.x1 - zone.x0) * 0.33 - 60));
    generateBox(centre - ecart, bas - 50, 100, 100, boxesImg);           // 20 kg
    generateBall(centre + ecart, bas - 20, 20, {timeScale: 1}, ballsImg); // 0,32 kg
    if (enPause) mettreEnPause(false);
  }

  // ---- Choix d'un objet au doigt ou à la souris -------------------------------

  function objetSous(point) {
    const objets = [...boxes, ...balls].filter(o => !o.body.isStatic && o.masseCentiemes);
    const touches = Matter.Query.point(objets.map(o => o.body), point);
    if (!touches.length) return null;
    return objets.find(o => o.body === touches[touches.length - 1]) || null;
  }

  function toucher() {
    // Matter.Mouse a déjà converti la position (ses écouteurs sont installés avant celui-ci).
    selection = objetSous(contrainte.mouse.position);
    if (selection) aideOuverte = false;
    majPanneaux();
  }

  // ---- Dessin dans le canvas (appelé à la fin de draw()) ----------------------

  function dessiner() {
    if (selection && !boxes.includes(selection) && !balls.includes(selection)) {
      selection = null;  // sorti de l'écran
      majPanneaux();
    }
    if (!selection) return;
    const corps = selection.body;
    const x = corps.position.x, y = corps.position.y;
    const L = longueurFleche(selection);
    const tete = Math.min(12, L * 0.5);

    push();
    blendMode(BLEND);
    // Contour de l'objet choisi.
    noFill();
    stroke(COULEUR_SELECTION);
    strokeWeight(2);
    beginShape();
    for (const v of corps.vertices) vertex(v.x, v.y);
    endShape(CLOSE);

    // Flèche du poids : de G, verticale, vers le bas, longueur proportionnelle à P.
    strokeCap(SQUARE);
    stroke(0, 0, 0, 190); strokeWeight(7);
    line(x, y, x, y + L - tete);
    stroke(COULEUR_FLECHE); strokeWeight(3.5);
    line(x, y, x, y + L - tete);
    stroke(0, 0, 0, 190); strokeWeight(1.5); fill(COULEUR_FLECHE);
    triangle(x - 7, y + L - tete, x + 7, y + L - tete, x, y + L);

    // Point d'application G.
    fill(255); stroke(0); strokeWeight(1.5);
    circle(x, y, 8);

    // Étiquettes « G » et « P » (avec la flèche des vecteurs). Sur un petit écran, la simulation
    // est réduite : les lettres sont agrandies d'autant pour rester lisibles (k = 1 ailleurs).
    const k = 1 / Math.min(1, Ecran.monde().s);
    textSize(16 * k); textStyle(BOLD); textAlign(LEFT, CENTER);
    stroke(0); strokeWeight(3 * k);
    fill(255);
    text('G', x - 20 * k, y - 8 * k);
    const yp = y + Math.max(L / 2, 10 * k);
    fill(COULEUR_FLECHE);
    text('P', x + 10 * k, yp + 2 * k);
    strokeWeight(2 * k); stroke(COULEUR_FLECHE);
    line(x + 10 * k, yp - 10 * k, x + 21 * k, yp - 10 * k);
    line(x + 21 * k, yp - 10 * k, x + 17 * k, yp - 13 * k);
    line(x + 21 * k, yp - 10 * k, x + 17 * k, yp - 7 * k);
    pop();
  }

  // ---- Installation ---------------------------------------------------------

  function installer(canvasElt, mouseConstraint, matterRunner, matterEngine) {
    canvas = canvasElt;
    contrainte = mouseConstraint;
    runner = matterRunner;
    moteur = matterEngine;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Simulation : des caisses et des ballons tombent sous une lampe et projettent leur ombre. On peut les attraper au doigt ou à la souris. Une flèche rouge représente le poids de l’objet touché ; sa masse et son poids sont écrits dans la fiche du menu.');
    creerInterface();
    choisirAstre('terre');
    majPanneaux();
    canvas.addEventListener('mousedown', toucher);
    canvas.addEventListener('touchstart', toucher, {passive: true});
    // Un objet tenu d'un doigt pendant qu'un autre doigt touche un bouton (Lune, Pause…) :
    // dès qu'aucun doigt ne reste sur la simulation, l'objet est lâché, même si le dernier
    // doigt levé est celui du bouton (ecran.js ne voit que les doigts posés sur le canvas).
    const leverDoigts = event => {
      if (![...event.touches].some(t => t.target === canvas)) contrainte.mouse.button = -1;
    };
    document.addEventListener('touchend', leverDoigts, {capture: true, passive: true});
    document.addEventListener('touchcancel', leverDoigts, {capture: true, passive: true});
    placerInterface();
  }

  // État lisible depuis la console (et par les tests automatiques).
  function etat() {
    return {
      astre, g: ASTRES[astre].g / 10, gravityY: moteur ? moteur.gravity.y : null, enPause, aideOuverte,
      selection: selection ? {id: selection.body.id, type: selection.type, masseKg: selection.masseCentiemes / 100,
        masseMoteur: selection.body.mass, poidsN: poidsMilliN(selection) / 1000, echelleN: echelleMilliN(selection) / 1000,
        longueurFleche: longueurFleche(selection)} : null,
      fiche: ui.fiche ? ui.fiche.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  }

  return {installer, donnerMasse, dessiner, choisirAstre, mettreEnPause, lacherEnsemble, longueurFleche,
          placerInterface, zoneLibre, menuEnHaut,
          enPause: () => enPause, etat, ASTRES};
})();
