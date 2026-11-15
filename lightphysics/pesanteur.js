// LightPhysics — Masse et poids, module pédagogique (v1.1, 2026-11-15)
// VERHILLE Arnaud
// Copyleft GPL2
//
// Masse et poids (cours de 4e) : choix de l'astre, masse et poids de l'objet touché,
// flèche du poids, carte du protocole, pause, « Lâcher ensemble ».
//
// Le protocole donne des actions et des observations à relever, jamais la conclusion :
// l'élève la trouve lui-même (ni le protocole, ni la fiche, ni le libellé du canvas ne la disent).
// « Lâcher ensemble » est une expérience propre : la scène est vidée (le plateau reste), la caisse et
// le ballon partent le bas à la même hauteur, au-dessus du plateau et sans pouvoir se toucher, on ne
// peut pas les attraper avant leur arrivée, aucun objet n'apparaît avant qu'ils aient touché le plateau
// (plus 2 s pour voir le résultat), et un changement de taille de la fenêtre la relance sur le nouveau plateau.
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
  let protocoleOuvert = true;  // carte du protocole ouverte au lancement
  let canvas = null, contrainte = null, runner = null, moteur = null;
  let ui = {};
  let ficheAffichee = '';    // pour ne réécrire la fiche (zone lue par les lecteurs d'écran) qu'au changement
  let lacher = null;         // expérience « Lâcher ensemble » : en cours, ou la dernière (lue par etat())
  const DELAI_APRES_LACHER = 2000;    // ms de simulation après l'arrivée des deux objets, sans apparition
  const DUREE_MAX_LACHER = 20000;     // sécurité : les apparitions reprennent quoi qu'il arrive
  // Catégorie de collision de la saisie au doigt ou à la souris (Matter.MouseConstraint). Les objets
  // ordinaires (masque complet) restent saisissables ; la caisse et le ballon de « Lâcher ensemble » ne
  // le sont pas pendant leur chute (masque sans cette catégorie). Leurs collisions ne changent pas.
  const SAISIE = 0x0002;

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
  /* Protocole : plus serré que la fiche, pour tenir entier dans la colonne (cadre d'un cours de 620 px
     de haut compris) et couvrir le moins possible de la simulation dans le bandeau du téléphone. */
  #pesanteur .pz-protocole { font-size: 13px; line-height: 1.2; padding: 6px 8px; }
  #pesanteur .pz-protocole p { margin-bottom: 2px; }
  #pesanteur .pz-protocole .pz-petit { font-size: 12px; }
  /* « suite ↓ » : collé au bas de la carte tant qu'il reste du texte plus bas (barre de défilement
     invisible sur un téléphone). Hauteur nulle : il ne change pas la hauteur du contenu. */
  #pesanteur .pz-suite { position: sticky; bottom: 0; height: 0; margin: 0; }
  #pesanteur .pz-suite span { position: absolute; left: -8px; right: -8px; bottom: -6px; padding: 14px 10px 4px; text-align: right;
    font-size: 13px; font-weight: 700; color: ${COULEUR_SELECTION}; pointer-events: none;
    background: linear-gradient(rgba(14,18,26,0), rgba(14,18,26,.97) 50%); border-radius: 0 0 10px 10px; }
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
    #pesanteur .pz-protocole { font-size: 14px; padding-top: 5px; padding-bottom: 5px; }
    #pesanteur .pz-protocole p { margin-bottom: 0; }
    #pesanteur .pz-protocole .pz-petit { font-size: 13px; }
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
          <button type="button" class="pz-bouton-protocole" aria-expanded="true" aria-controls="pz-protocole">Protocole</button>
        </div>
        <button type="button" class="pz-bouton-ensemble">Lâcher ensemble</button>
        <section id="pz-protocole" class="pz-carte pz-protocole" aria-label="Protocole&nbsp;: masse et poids">
          <p>1. Mets en pause et touche un objet&nbsp;: relève sa masse <i>m</i> et son poids <i>P</i> sur Terre.</p>
          <p>2. Relève-les sur la Lune, puis sur Mars. Qu’est-ce qui change&nbsp;? Qu’est-ce qui ne change pas&nbsp;?</p>
          <p>3. Prévois et écris&nbsp;: la caisse de 20&nbsp;kg arrivera-t-elle sur le plateau avant le ballon de 0,32&nbsp;kg, après lui, ou en même temps&nbsp;?</p>
          <p>4. «&nbsp;Lâcher ensemble&nbsp;»&nbsp;: observe l’instant où chacun touche le plateau.</p>
          <p><b>Conclus</b> en deux phrases&nbsp;: étapes 1-2, puis 3-4.</p>
          <p class="pz-petit">Dans cette simulation, on ne tient pas compte de l’air.</p>
          <div class="pz-suite" aria-hidden="true" hidden><span>suite ↓</span></div>
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
      protocole: racine.querySelector('.pz-bouton-protocole'),
      ensemble: racine.querySelector('.pz-bouton-ensemble'),
      carte: racine.querySelector('#pz-protocole'),
      suite: racine.querySelector('#pz-protocole .pz-suite'),
      fiche: racine.querySelector('.pz-fiche'),
    };
    ui.astres.forEach(b => b.addEventListener('click', () => choisirAstre(b.dataset.astre)));
    ui.pause.addEventListener('click', () => mettreEnPause(!enPause));
    ui.protocole.addEventListener('click', () => { protocoleOuvert = !protocoleOuvert; majPanneaux(); });
    ui.ensemble.addEventListener('click', () => lacherEnsemble());
    ui.carte.addEventListener('scroll', majSuite, {passive: true});
  }

  // Le calque couvre la fenêtre, comme le canvas. Seule la barre d'échelle de la fiche suit
  // l'échelle de la simulation : elle doit avoir à l'écran la longueur du segment de la flèche.
  function placerInterface() {
    if (!ui.racine) return;
    ui.racine.style.setProperty('--pz-barre', (BARRE * Ecran.monde().s) + 'px');
    majPanneaux();  // la place disponible a changé (rotation, fenêtre redimensionnée)
  }

  // Bandeau en haut (téléphone tenu droit) ou colonne à gauche (les autres écrans).
  function menuEnHaut() {
    return !!ui.colonne && getComputedStyle(ui.colonne).flexDirection === 'row';
  }

  // Zone du monde que le menu ne recouvre pas (les cartes du protocole et de la fiche, repliables, ne
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

  // Protocole et fiche affichés ensemble, la fiche sous le protocole, si la colonne a la place de les
  // montrer entiers tous les deux (grand écran). Sinon (téléphone, tablette couchée…), une seule carte
  // à la fois : toucher un objet replie le protocole, le rouvrir cache la fiche.
  function deuxCartesTiennent() {
    if (!selection || !ui.colonne || menuEnHaut()) return false;
    const carteCachee = ui.carte.hidden, ficheCachee = ui.fiche.hidden;
    ui.carte.hidden = false;
    ui.fiche.hidden = false;
    const tiennent = [ui.carte, ui.fiche].every(c => c.scrollHeight <= c.clientHeight + 1);
    ui.carte.hidden = carteCachee;
    ui.fiche.hidden = ficheCachee;
    return tiennent;
  }

  function majPanneaux() {
    if (!ui.carte) return;
    majFiche();
    ui.protocole.setAttribute('aria-expanded', String(protocoleOuvert));
    ui.carte.hidden = !protocoleOuvert;
    ui.fiche.hidden = !selection || (protocoleOuvert && !deuxCartesTiennent());
    majSuite();
  }

  // Indice « suite ↓ » tant que le bas du protocole n'est pas visible.
  function majSuite() {
    const c = ui.carte;
    ui.suite.hidden = c.hidden || c.scrollHeight - c.clientHeight - c.scrollTop <= 2;
  }

  function majFiche() {
    let html = '';
    if (selection) {
      const A = ASTRES[astre];
      const m = decimal(selection.masseCentiemes, 2);
      html = `<h2>${selection.type === 'caisse' ? 'Caisse' : 'Ballon'} <span class="pz-petit">(masse de simulation)</span></h2>
        <p>Masse&nbsp;: <b><i>m</i> = ${m}&nbsp;kg</b></p>
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
    majPanneaux();  // la fiche du même objet suit l'astre
  }

  // Pause voulue par l'élève : la physique s'arrête (runner.enabled, indépendant de la pause
  // automatique de ecran.js), l'affichage continue pour pouvoir toucher un objet et lire sa fiche.
  function mettreEnPause(pause) {
    enPause = pause;
    runner.enabled = !pause;
    ui.pause.setAttribute('aria-pressed', String(pause));
    ui.pause.textContent = pause ? 'Reprendre' : 'Pause';
  }

  // ---- « Lâcher ensemble » : une expérience propre ---------------------------

  // Retire tous les objets mobiles (le plateau reste). Un objet tenu au doigt est lâché, et un doigt
  // resté posé n'attrape plus rien tant qu'il n'est pas levé puis reposé.
  function viderScene() {
    for (const liste of [boxes, balls]) {
      for (let i = liste.length - 1; i >= 0; i--) {
        if (liste[i].estPlateau) continue;
        liste[i].removeFromWorld();
        liste.splice(i, 1);
      }
    }
    contrainte.constraint.bodyB = null;
    contrainte.body = null;
    contrainte.mouse.button = -1;
    if (selection) {
      selection = null;  // l'objet choisi a été retiré : la fiche se ferme
      majPanneaux();
    }
  }

  // Une caisse lourde et un ballon léger, le bas des deux objets exactement à la même hauteur, de part
  // et d'autre du milieu du plateau, au moins 20 unités entre eux. Chacun est entièrement au-dessus du
  // plateau quand celui-ci mesure au moins 190 unités (toujours aux tailles testées : 343 unités au
  // moins) ; sur un plateau plus court (140 unités au minimum), la caisse dépasse un peu du bord, mais
  // son centre reste au-dessus du plateau.
  // Appui de l'élève : la simulation repart si elle était en pause (le bouton redevient « Pause ») ; sur
  // un téléphone tenu droit, la carte du protocole se replie pour laisser voir le départ de la chute.
  // Relance après un changement de taille (garderPause) : la pause de l'élève est conservée.
  function lacherEnsemble(garderPause = false) {
    if (!garderPause && protocoleOuvert && menuEnHaut()) {
      protocoleOuvert = false;
      majPanneaux();
    }
    const relances = lacher && lacher.enCours && garderPause ? lacher.relances + 1 : 0;
    viderScene();
    const plateau = boxes.find(b => b.estPlateau);
    const centre = plateau.body.position.x;
    const ecart = Math.max(45, Math.min(110, plateau.w / 2 - 55));
    const bas = zoneLibre().y0 + 30;
    generateBox(centre - ecart, bas - 50, 100, 100, boxesImg);            // 20 kg
    generateBall(centre + ecart, bas - 20, 20, {timeScale: 1}, ballsImg);  // 0,32 kg
    const caisse = boxes[boxes.length - 1], ballon = balls[balls.length - 1];
    // Matter.js dessine le ballon comme un polygone à bas plat, un peu au-dessus du cercle : on l'aligne.
    Body.translate(ballon.body, {x: 0, y: caisse.body.bounds.max.y - ballon.body.bounds.max.y});
    // Pas de saisie pendant la chute (toucher l'objet pour lire sa fiche reste possible).
    for (const o of [caisse, ballon]) o.body.collisionFilter.mask &= ~SAISIE;
    lacher = {caisse, ballon, plateau, debut: moteur.timing.timestamp, contacts: {}, fin: null, enCours: true, relances};
    if (enPause && !garderPause) mettreEnPause(false);
  }

  // L'objet redevient saisissable (à son arrivée, ou à la fin de l'expérience).
  function rendreSaisissable(objet) {
    objet.body.collisionFilter.mask |= SAISIE;
  }

  function terminerLacher() {
    lacher.enCours = false;
    rendreSaisissable(lacher.caisse);
    rendreSaisissable(lacher.ballon);
  }

  // Premier contact de chacun des deux objets (avec le plateau, ou avec autre chose).
  function surContact(evenement) {
    if (!lacher || !lacher.enCours) return;
    for (const paire of evenement.pairs) {
      const a = paire.bodyA.parent, b = paire.bodyB.parent;
      for (const cle of ['caisse', 'ballon']) {
        const corps = lacher[cle].body;
        if (lacher.contacts[cle] || (a !== corps && b !== corps)) continue;
        const autre = a === corps ? b : a;
        lacher.contacts[cle] = {avec: autre === lacher.plateau.body ? 'plateau' : 'objet', t: moteur.timing.timestamp};
        rendreSaisissable(lacher[cle]);
      }
    }
    if (lacher.contacts.caisse && lacher.contacts.ballon && lacher.fin === null) {
      lacher.fin = moteur.timing.timestamp + DELAI_APRES_LACHER;
    }
  }

  // Appelée par sketch.js avant de faire apparaître un objet : non pendant l'expérience.
  function apparitionsPermises() {
    if (!lacher || !lacher.enCours) return true;
    const t = moteur.timing.timestamp;
    const presents = boxes.includes(lacher.caisse) && balls.includes(lacher.ballon) && boxes.includes(lacher.plateau);
    if (!presents || (lacher.fin !== null && t >= lacher.fin) || t - lacher.debut > DUREE_MAX_LACHER) terminerLacher();
    return !lacher.enCours;
  }

  // Appelée par sketch.js quand le plateau a été reconstruit (rotation, fenêtre ou cadre redimensionnés,
  // y compris juste après un appui, le redimensionnement étant différé de 80 ms) : une expérience en
  // cours est relancée sur le nouveau plateau ; une expérience déjà arrivée est simplement terminée.
  function apresAmenagement() {
    if (!lacher || !lacher.enCours) return;
    if (lacher.contacts.caisse && lacher.contacts.ballon) terminerLacher();
    else lacherEnsemble(true);
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
    majFiche();
    if (selection && protocoleOuvert && !deuxCartesTiennent()) protocoleOuvert = false;
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
    Matter.Events.on(moteur, 'collisionStart', surContact);
    contrainte.collisionFilter.category = SAISIE;
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
      astre, g: ASTRES[astre].g / 10, gravityY: moteur ? moteur.gravity.y : null, enPause, protocoleOuvert,
      selection: selection ? {id: selection.body.id, type: selection.type, masseKg: selection.masseCentiemes / 100,
        masseMoteur: selection.body.mass, poidsN: poidsMilliN(selection) / 1000, echelleN: echelleMilliN(selection) / 1000,
        longueurFleche: longueurFleche(selection)} : null,
      fiche: ui.fiche ? ui.fiche.textContent.replace(/\s+/g, ' ').trim() : '',
      deuxCartes: !!ui.carte && !ui.carte.hidden && !ui.fiche.hidden,
      lacher: lacher ? {enCours: lacher.enCours, caisse: lacher.caisse.body.id, ballon: lacher.ballon.body.id,
        contacts: JSON.parse(JSON.stringify(lacher.contacts)),
        ecartMs: lacher.contacts.caisse && lacher.contacts.ballon ? lacher.contacts.caisse.t - lacher.contacts.ballon.t : null,
        pasMs: moteur.timing.lastDelta, relances: lacher.relances, plateau: lacher.plateau.body.id,
        saisissables: [lacher.caisse, lacher.ballon].map(o => Matter.Detector.canCollide(o.body.collisionFilter, contrainte.collisionFilter))} : null,
    };
  }

  return {installer, donnerMasse, dessiner, choisirAstre, mettreEnPause, lacherEnsemble, longueurFleche,
          placerInterface, zoneLibre, menuEnHaut, apparitionsPermises, apresAmenagement,
          enPause: () => enPause, etat, ASTRES};
})();
