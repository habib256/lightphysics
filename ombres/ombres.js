// LightPhysics — Ombres (6e, chapitre « Signaux et optique » : ombre propre, ombre portée, pénombre)
// Version 1.1 — 14/11/2026
// VERHILLE Arnaud
// Copyleft GPL2
//
// Vue de côté, comme sur un schéma : une source de lumière, un objet opaque, un écran.
// On les fait glisser au doigt ou à la souris. Même principe que LightPhysics : la lumière
// part de la source en ligne droite et s'arrête sur le premier obstacle rencontré.
//
// Ce qui est exact par construction (géométrie, propagation rectiligne) :
// - la zone éclairée autour de chaque point de la source est calculée rayon par rayon, avec des
//   rayons supplémentaires visés exactement sur les bords de l'objet et de l'écran ;
// - sur l'écran, chaque point reçoit la fraction de la source qu'il « voit » sans que l'objet
//   la cache : 0 = ombre portée, entre 0 et 1 = pénombre, 1 = pleine lumière ;
// - sur l'objet, un point de sa surface est éclairé par les points de la source situés du côté
//   de sa face (objet convexe) : le côté opposé à la source est l'ombre propre ;
// - les « rayons qui frôlent l'objet » sont les tangentes communes à la source et à l'objet :
//   tangentes extérieures = limites de l'ombre, tangentes intérieures = limites de la pénombre.
// Modèle : vue en coupe (2D), source étendue = disque, échantillonné en 37 points pour l'écran et
// l'objet, 65 points pour l'éclairage du fond (calculé en demi-définition puis lissé, pour une
// pénombre continue). Pas de lumière renvoyée par l'écran ou les murs.

'use strict';

const Ombres = (() => {
  const W = 800, H = 600;
  const BAS_SCENE = 522;                       // sous cette ligne : la barre de boutons
  const ECRAN = {haut: 40, bas: 500, epaisseur: 16};
  const ECRAN_X_MAX = W - 160;                 // à droite de l'écran : la place des étiquettes
  const R_ETENDUE = 40;                        // rayon de la source étendue (px)
  const R_DESSIN_PONCTUELLE = 7;               // la source ponctuelle est dessinée comme un petit point
  const RAYON_BALLON = 45, COTE_CAISSE = 90;
  const LUMIERE = '255,244,214';
  const JAUNE = '#ffd166', ORANGE = '#ff9f43';

  const etat = {
    source: {x: 130, y: 340, etendue: false},
    objet: {x: 380, y: 340, forme: 'ballon'},
    ecranX: 640,
    rayons: false,
    noms: false,
    aide: true,
  };

  let canvas = null, ctx = null, dpr = 1, ui = {}, prise = null, dessinPrevu = false;
  let resultat = null;   // dernières mesures (pour les tests et la console)
  let calque = null, ctxCalque = null;   // lumière du fond, en demi-définition

  // ---- Géométrie --------------------------------------------------------

  const rayonSource = () => (etat.source.etendue ? R_ETENDUE : 0);
  const demiTaille = () => (etat.objet.forme === 'ballon' ? RAYON_BALLON : COTE_CAISSE / 2);
  // Rayon d'un disque qui contient l'objet (pour éviter que la source et l'objet se chevauchent).
  const rayonEnveloppe = () => (etat.objet.forme === 'ballon' ? RAYON_BALLON : COTE_CAISSE / Math.SQRT2);

  function boite() {
    const h = COTE_CAISSE / 2, {x, y} = etat.objet;
    return {x0: x - h, y0: y - h, x1: x + h, y1: y + h};
  }
  function rectEcran() {
    return {x0: etat.ecranX, y0: ECRAN.haut, x1: etat.ecranX + ECRAN.epaisseur, y1: ECRAN.bas};
  }
  const CADRE = {x0: 0, y0: 0, x1: W, y1: H};

  // Points lumineux qui représentent la source : un seul (ponctuelle) ou un disque échantillonné.
  function pointsSource(fin) {
    const {x, y} = etat.source, R = rayonSource();
    if (!R) return [{x, y}];
    const points = [{x, y}];
    const anneaux = fin ? [[R / 2, 12], [R, 24]] : [[R / 2, 16], [R, 48]];
    for (const [r, n] of anneaux) {
      for (let k = 0; k < n; k++) {
        const a = 2 * Math.PI * k / n;
        points.push({x: x + r * Math.cos(a), y: y + r * Math.sin(a)});
      }
    }
    return points;
  }

  // Rayon O + t·d (d quelconque) : plus petit t > 0 où il rencontre la surface ; Infinity sinon.
  function impactDisque(ox, oy, dx, dy, cx, cy, r) {
    const fx = ox - cx, fy = oy - cy;
    const a = dx * dx + dy * dy, b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r;
    const disc = b * b - a * c;
    if (disc < 0) return Infinity;
    const s = Math.sqrt(disc);
    let t = (-b - s) / a;
    if (t <= 1e-9) t = (-b + s) / a;
    return t > 1e-9 ? t : Infinity;
  }
  function impactBoite(ox, oy, dx, dy, b) {
    let t0 = -Infinity, t1 = Infinity;
    for (const [o, d, lo, hi] of [[ox, dx, b.x0, b.x1], [oy, dy, b.y0, b.y1]]) {
      if (Math.abs(d) < 1e-12) {
        if (o < lo || o > hi) return Infinity;
      } else {
        let ta = (lo - o) / d, tb = (hi - o) / d;
        if (ta > tb) [ta, tb] = [tb, ta];
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
      }
    }
    if (t0 > t1) return Infinity;
    if (t0 > 1e-9) return t0;
    if (t1 > 1e-9) return t1;   // départ à l'intérieur (cadre du dessin) : on en sort
    return Infinity;
  }
  function impactObjet(ox, oy, dx, dy) {
    const o = etat.objet;
    return o.forme === 'ballon'
      ? impactDisque(ox, oy, dx, dy, o.x, o.y, RAYON_BALLON)
      : impactBoite(ox, oy, dx, dy, boite());
  }

  // Point où s'arrête la lumière partie de (ox, oy) dans la direction a.
  function lancer(ox, oy, a, avecObjet, cadre = CADRE) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let t = Math.min(impactBoite(ox, oy, dx, dy, cadre), impactBoite(ox, oy, dx, dy, rectEcran()));
    if (avecObjet) t = Math.min(t, impactObjet(ox, oy, dx, dy));
    return {x: ox + t * dx, y: oy + t * dy};
  }

  // Le segment P → Q est-il coupé par l'objet ? (t exprimé en unités de Q − P)
  const cache = (p, q) => impactObjet(p.x, p.y, q.x - p.x, q.y - p.y) < 1 - 1e-9;

  // Directions des rayons : 360 régulières + visées exactes de part et d'autre des bords.
  function directions(p) {
    const A = [];
    for (let k = 0; k < 360; k++) A.push(-Math.PI + k * Math.PI / 180);
    const viser = (x, y) => { const a = Math.atan2(y - p.y, x - p.x); A.push(a - 1e-4, a, a + 1e-4); };
    const o = etat.objet;
    if (o.forme === 'ballon') {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d > RAYON_BALLON) {
        const phi = Math.atan2(o.y - p.y, o.x - p.x), b = Math.asin(RAYON_BALLON / d);
        A.push(phi - b - 1e-4, phi - b + 1e-4, phi + b - 1e-4, phi + b + 1e-4);
        for (let k = 1; k < 24; k++) A.push(phi - b + 2 * b * k / 24);   // face éclairée bien ronde
      }
    } else {
      const b = boite();
      for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]) viser(x, y);
    }
    const e = rectEcran();
    for (const [x, y] of [[e.x0, e.y0], [e.x1, e.y0], [e.x1, e.y1], [e.x0, e.y1]]) viser(x, y);
    for (const [x, y] of [[0, 0], [W, 0], [W, H], [0, H]]) viser(x, y);
    return A.sort((a, b) => a - b);
  }

  // Éclairement de l'écran : fraction de la source vue par chaque point de sa face avant.
  function mesurerEcran(points) {
    const x = etat.ecranX, valeurs = [];
    for (let y = ECRAN.haut; y <= ECRAN.bas; y += 1) {
      let vus = 0;
      for (const s of points) if (s.x < x && !cache(s, {x, y})) vus++;
      valeurs.push({y, f: vus / points.length});
    }
    // Plages : ombre (f = 0), pénombre (0 < f < 1)
    const plages = (test) => {
      const res = [];
      let debut = null;
      for (const v of valeurs) {
        if (test(v.f)) { if (debut === null) debut = v.y; }
        else if (debut !== null) { res.push([debut, v.y - 1]); debut = null; }
      }
      if (debut !== null) res.push([debut, ECRAN.bas]);
      return res;
    };
    return {valeurs, ombre: plages(f => f === 0), penombre: plages(f => f > 0 && f < 1)};
  }

  // Tangentes communes à la source et à l'objet (rayons qui frôlent l'objet).
  // type 'ombre' : la source et l'objet du même côté (limite de l'ombre) ;
  // type 'penombre' : de part et d'autre (limite de la pénombre). Source ponctuelle : 2 rayons.
  function tangentes() {
    const S = etat.source, R = rayonSource(), o = etat.objet, res = [];
    if (o.forme === 'ballon') {
      const r = RAYON_BALLON, d = Math.hypot(o.x - S.x, o.y - S.y), phi = Math.atan2(o.y - S.y, o.x - S.x);
      const ajouter = (cosinus, signe, type) => {
        if (Math.abs(cosinus) > 1) return;
        const th = Math.acos(cosinus);
        for (const s of [-1, 1]) {
          const nx = Math.cos(phi + s * th), ny = Math.sin(phi + s * th);
          res.push({type, T: {x: S.x + R * nx, y: S.y + R * ny}, V: {x: o.x + signe * r * nx, y: o.y + signe * r * ny}});
        }
      };
      ajouter((R - r) / d, 1, 'ombre');
      if (R > 0) ajouter((R + r) / d, -1, 'penombre');
      return res;
    }
    const b = boite(), coins = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
    for (const [vx, vy] of coins) {
      const d = Math.hypot(vx - S.x, vy - S.y), phi = Math.atan2(vy - S.y, vx - S.x);
      const departs = R === 0 ? [{x: S.x, y: S.y}]
        : [-1, 1].map(s => { const a = phi + s * Math.acos(R / d); return {x: S.x + R * Math.cos(a), y: S.y + R * Math.sin(a)}; });
      for (const T of departs) {
        const lx = vx - T.x, ly = vy - T.y, n = Math.hypot(lx, ly);
        const cote = (x, y) => (lx * (y - T.y) - ly * (x - T.x)) / n;   // distance signée à la droite
        const vals = coins.map(([x, y]) => cote(x, y));
        const mn = Math.min(...vals), mx = Math.max(...vals);
        if (mn < -1e-6 && mx > 1e-6) continue;                          // la droite coupe l'objet
        const type = R === 0 || Math.sign(cote(S.x, S.y)) === Math.sign(mn + mx) ? 'ombre' : 'penombre';
        // Même droite déjà trouvée (une face parallèle au rayon touche deux coins) ?
        if (res.some(t => t.type === type && Math.abs(cote(t.V.x, t.V.y)) < 1e-6 && Math.abs(cote(t.T.x, t.T.y)) < 1e-6)) continue;
        res.push({type, T, V: {x: vx, y: vy}});
      }
    }
    return res;
  }

  // ---- Dessin -----------------------------------------------------------

  // Lumière du fond : un polygone éclairé par point de la source, additionnés, dessinés sur un
  // calque en demi-définition puis agrandi avec lissage (pénombre continue, sans rayures).
  function dessinerLumiere() {
    if (!calque) {
      calque = document.createElement('canvas');
      calque.width = W / 2;
      calque.height = H / 2;
      ctxCalque = calque.getContext('2d');
    }
    // Aplats (sans dégradé : pas de trame) ; la baisse d'éclairement avec la distance est
    // appliquée ensuite, en une seule fois, autour du centre de la source.
    const c = ctxCalque, points = pointsSource(false), part = Math.round(0.62 * 255 / points.length) / 255;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    c.fillRect(0, 0, calque.width, calque.height);
    c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(${LUMIERE},${part})`;
    for (const p of points) {
      c.beginPath();
      const angles = directions(p);
      for (let i = 0; i < angles.length; i++) {
        const q = lancer(p.x, p.y, angles[i], true);
        if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y);
      }
      c.closePath();
      c.fill();
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(calque, 0, 0, W, H);
    const S = etat.source, attenuation = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, 900);
    attenuation.addColorStop(0, '#ffffff');
    attenuation.addColorStop(1, '#3a3a3a');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = attenuation;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // L'écran est une surface blanche : là où la lumière n'arrive pas, il reste gris, bien distinct
  // du noir de l'espace ; un liseré clair dessine son contour.
  function dessinerEcran(mesure) {
    const e = rectEcran();
    ctx.fillStyle = '#26282c';                           // tranche et dos de l'écran
    ctx.fillRect(e.x0, e.y0, ECRAN.epaisseur, e.y1 - e.y0);
    const face = ctx.createLinearGradient(0, e.y0, 0, e.y1);
    for (const {y, f} of mesure.valeurs) {
      const c = Math.round(70 + f * (246 - 70));
      face.addColorStop((y - e.y0) / (e.y1 - e.y0), `rgb(${c},${Math.round(c * 0.98)},${Math.round(c * 0.92)})`);
    }
    ctx.fillStyle = face;
    ctx.fillRect(e.x0, e.y0, ECRAN.epaisseur - 4, e.y1 - e.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(e.x0 - 0.75, e.y0 - 0.75, ECRAN.epaisseur + 1.5, e.y1 - e.y0 + 1.5);
  }

  function cheminObjet() {
    const o = etat.objet;
    ctx.beginPath();
    if (o.forme === 'ballon') ctx.arc(o.x, o.y, RAYON_BALLON, 0, 2 * Math.PI);
    else { const b = boite(); ctx.rect(b.x0, b.y0, COTE_CAISSE, COTE_CAISSE); }
  }

  // Teintes : dans l'ombre propre (sombre) et en pleine lumière (clair).
  const TEINTES = {ballon: [[34, 40, 56], [196, 210, 236]], caisse: [[46, 32, 18], [232, 192, 140]]};
  const melange = (a, b, f) => a.map((v, i) => Math.round(v + f * (b[i] - v)));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  // Ballon : chaque point de la source éclaire la calotte tournée vers lui, limitée par la corde
  // qui joint les deux points de tangence ; les calottes s'additionnent (source étendue).
  // Caisse : chaque face est éclairée par les points de la source situés devant elle.
  // Le côté qui reste sombre est l'ombre propre.
  function dessinerObjet() {
    const points = pointsSource(true), o = etat.objet, [sombre, clair] = TEINTES[o.forme];
    if (o.forme === 'ballon') {
      cheminObjet();
      ctx.fillStyle = rgb(sombre);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ecart = clair.map((v, i) => v - sombre[i]);
      ctx.fillStyle = `rgba(${ecart[0]},${ecart[1]},${ecart[2]},${1 / points.length})`;
      for (const s of points) {
        const d = Math.hypot(s.x - o.x, s.y - o.y);
        if (d <= RAYON_BALLON) continue;
        const phi = Math.atan2(s.y - o.y, s.x - o.x), alpha = Math.acos(RAYON_BALLON / d);
        ctx.beginPath();
        ctx.arc(o.x, o.y, RAYON_BALLON, phi - alpha, phi + alpha);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else {
      const b = boite(), e = 13;
      ctx.fillStyle = rgb(melange(sombre, clair, 0.45));
      ctx.fillRect(b.x0, b.y0, COTE_CAISSE, COTE_CAISSE);
      const faces = [
        {nx: 0, ny: -1, p: [[b.x0, b.y0], [b.x1, b.y0], [b.x1 - e, b.y0 + e], [b.x0 + e, b.y0 + e]]},
        {nx: 1, ny: 0, p: [[b.x1, b.y0], [b.x1, b.y1], [b.x1 - e, b.y1 - e], [b.x1 - e, b.y0 + e]]},
        {nx: 0, ny: 1, p: [[b.x1, b.y1], [b.x0, b.y1], [b.x0 + e, b.y1 - e], [b.x1 - e, b.y1 - e]]},
        {nx: -1, ny: 0, p: [[b.x0, b.y1], [b.x0, b.y0], [b.x0 + e, b.y0 + e], [b.x0 + e, b.y1 - e]]},
      ];
      for (const face of faces) {
        const [fx, fy] = face.p[0];
        let vus = 0;
        for (const s of points) if ((s.x - fx) * face.nx + (s.y - fy) * face.ny > 0) vus++;
        ctx.fillStyle = rgb(melange(sombre, clair, vus / points.length));
        ctx.beginPath();
        face.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
      }
    }
    cheminObjet();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
  }

  function dessinerSource() {
    const {x, y} = etat.source, R = rayonSource() || R_DESSIN_PONCTUELLE;
    const halo = ctx.createRadialGradient(x, y, R * 0.5, x, y, R + 18);
    halo.addColorStop(0, 'rgba(255,230,120,0.7)');
    halo.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, R + 18, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#fff6c9';
    ctx.beginPath(); ctx.arc(x, y, R, 0, 2 * Math.PI); ctx.fill();
  }

  function fleche(x0, y0, x1, y1, couleur) {
    const a = Math.atan2(y1 - y0, x1 - x0), mx = x0 + (x1 - x0) * 0.45, my = y0 + (y1 - y0) * 0.45;
    ctx.save();
    ctx.setLineDash([]);
    ctx.translate(mx, my); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
    ctx.fillStyle = couleur; ctx.fill();
    ctx.restore();
  }

  // Rayons qui frôlent l'objet, de la source jusqu'à l'écran (ou au bord de la scène).
  // Un contour sombre les garde lisibles sur le fond éclairé.
  function dessinerRayons(liste) {
    const cadre = {x0: 0, y0: 0, x1: W, y1: BAS_SCENE};
    ctx.save();
    for (const {type, T, V} of liste) {
      const fin = lancer(T.x, T.y, Math.atan2(V.y - T.y, V.x - T.x), false, cadre);
      const couleur = type === 'ombre' ? JAUNE : ORANGE;
      ctx.setLineDash(type === 'ombre' ? [] : [9, 6]);
      for (const [largeur, teinte] of [[4.5, 'rgba(0,0,0,0.65)'], [2, couleur]]) {
        ctx.lineWidth = largeur; ctx.strokeStyle = teinte;
        ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(fin.x, fin.y); ctx.stroke();
      }
      fleche(T.x, T.y, fin.x, fin.y, couleur);
    }
    ctx.restore();
  }

  // ---- Étiquettes (« Noms ») et légende, placées sans se chevaucher ------

  const POLICE = '700 15px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const chevauche = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const dansScene = r => r.x0 >= 2 && r.x1 <= W - 2 && r.y0 >= 2 && r.y1 <= BAS_SCENE - 2;

  // Zones à ne pas couvrir : source, objet, écran, aide ouverte.
  function obstacles() {
    const S = etat.source, o = etat.objet, h = demiTaille(), rs = (rayonSource() || R_DESSIN_PONCTUELLE) + 8, e = rectEcran();
    const zones = [
      {x0: S.x - rs, y0: S.y - rs, x1: S.x + rs, y1: S.y + rs},
      {x0: o.x - h - 4, y0: o.y - h - 4, x1: o.x + h + 4, y1: o.y + h + 4},
      {x0: e.x0 - 4, y0: e.y0 - 4, x1: e.x1 + 4, y1: e.y1 + 4},
    ];
    if (etat.aide && ui.aide) zones.push({x0: 0, y0: 0, x1: 8 + ui.aide.offsetWidth + 4, y1: 8 + ui.aide.offsetHeight + 4});
    return zones;
  }

  // Première position candidate (centre du texte) qui reste dans la scène sans rien recouvrir.
  function choisir(largeur, hauteur, candidats, occupe) {
    const rect = ([x, y]) => ({x0: x - largeur / 2, y0: y - hauteur / 2, x1: x + largeur / 2, y1: y + hauteur / 2});
    for (const c of candidats) {
      const r = rect(c);
      if (dansScene(r) && !occupe.some(z => chevauche(r, z))) return r;
    }
    // Pas de place libre : la position (ramenée dans la scène) qui recouvre le moins de surface.
    const surface = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    let meilleur = null, moindre = Infinity;
    for (const [x, y] of candidats) {
      const r = rect([Math.max(largeur / 2 + 4, Math.min(W - largeur / 2 - 4, x)),
                      Math.max(hauteur / 2 + 4, Math.min(BAS_SCENE - hauteur / 2 - 4, y))]);
      const recouvre = occupe.reduce((somme, z) => somme + surface(r, z), 0);
      if (recouvre < moindre) { moindre = recouvre; meilleur = r; }
    }
    return meilleur;
  }

  function dessinerTraits(r, cibles) {
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    ctx.save();
    for (const [x, y] of cibles) {
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.restore();
  }

  function dessinerCadre(texte, r) {
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(14,18,26,0.94)';
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.fill(); ctx.stroke();
    ctx.font = POLICE;
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(texte, cx, cy + 1);
    ctx.restore();
  }

  const milieu = p => (p[0] + p[1]) / 2;
  const plusGrande = plages => plages.reduce((m, p) => (!m || p[1] - p[0] > m[1] - m[0] ? p : m), null);

  // Les étiquettes de l'écran se placent à droite de l'écran (dans le noir, hors de la zone
  // d'ombre de l'espace) ; « Ombre propre » du côté de l'objet opposé à la source ;
  // « Objet opaque » est accroché au centre de l'objet.
  function dessinerNoms(mesure, occupe) {
    const S = etat.source, o = etat.objet, h = demiTaille(), Rd = rayonSource() || R_DESSIN_PONCTUELLE;
    const e = rectEcran(), droite = e.x1 + 14, gauche = e.x0 - 14;
    ctx.font = POLICE;
    const taille = texte => [ctx.measureText(texte).width + 16, 26];
    const poser = (texte, cibles, candidats) => {
      const [l, hh] = taille(texte);
      const r = choisir(l, hh, candidats.map(([x, y, cote]) => [x + (cote || 0) * l / 2, y]), occupe);
      occupe.push(r);
      posees.push([texte, r, cibles]);
    };
    const posees = [];

    // Sur l'écran
    const ombre = plusGrande(mesure.ombre);
    const ys = [];
    if (ombre) ys.push(milieu(ombre));
    const decalages = [0, -32, 32, -64, 64, -96, 96];
    if (ombre) {
      const y = milieu(ombre);
      poser('Ombre portée', [[e.x0 + 3, y]], [...decalages.map(d => [droite, y + d, 1]), [gauche, y, -1]]);
    }
    if (mesure.penombre.length) {
      const cibles = mesure.penombre.map(p => [e.x0 + 3, milieu(p)]);
      const yb = Math.max(...cibles.map(c => c[1])), yh = Math.min(...cibles.map(c => c[1]));
      poser('Pénombre', cibles, [...decalages.map(d => [droite, yb + d, 1]), ...decalages.map(d => [droite, yh + d, 1]), [gauche, yb, -1]]);
    }
    poser('Écran', [[e.x1, e.y0 + 6]], [[droite, e.y0 + 14, 1], [droite, e.y0 + 46, 1], [(e.x0 + e.x1) / 2, e.y0 - 18], [gauche, e.y0 + 14, -1]]);

    // Ombre propre : côté de l'objet opposé à la source
    const d = Math.hypot(o.x - S.x, o.y - S.y) || 1, ux = (o.x - S.x) / d, uy = (o.y - S.y) / d;
    let px, py;
    if (o.forme === 'ballon') { px = o.x + (RAYON_BALLON - 9) * ux; py = o.y + (RAYON_BALLON - 9) * uy; }
    else if (Math.abs(ux) >= Math.abs(uy)) { px = o.x + Math.sign(ux) * (h - 7); py = o.y; }
    else { px = o.x; py = o.y + Math.sign(uy) * (h - 7); }
    // Positions autour d'un point, en partant de la direction voulue ; puis un second tour plus loin.
    const autour = (cx, cy, rayon, angle0) => [rayon, rayon + 60].flatMap(ray =>
      [0, 40, -40, 80, -80, 120, -120, 160, -160, 180].map(deg => {
        const a = angle0 + deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
        return [cx + dx * ray, cy + dy * (ray - 6), Math.abs(dx) > 0.3 ? Math.sign(dx) : 0];
      }));
    poser('Ombre propre', [[px, py]], autour(o.x, o.y, h + 30, Math.atan2(uy, ux)));
    poser('Objet opaque', [[o.x, o.y]], autour(o.x, o.y, h + 30, Math.PI / 2));
    poser(S.etendue ? 'Source de lumière (étendue)' : 'Source de lumière', [[S.x, S.y]],
      autour(S.x, S.y, Rd + 30, -Math.PI / 2));
    // Tous les traits d'abord, puis tous les cadres : aucun trait ne barre une étiquette.
    for (const [, r, cibles] of posees) dessinerTraits(r, cibles);
    for (const [texte, r] of posees) dessinerCadre(texte, r);
  }

  // Légende des rayons : seulement avec « Noms » (elle dit ce que limitent les rayons : c'est
  // la réponse à la question 4), dans un coin libre.
  function dessinerLegende(occupe) {
    const lignes = [['Rayons qui frôlent l’objet :'], [JAUNE, [], 'limites de l’ombre']];
    if (etat.source.etendue) lignes.push([ORANGE, [9, 6], 'limites de la pénombre']);
    const largeur = 236, hauteur = 10 + 20 * lignes.length;
    const coins = [[8, BAS_SCENE - 8 - hauteur], [8, 8], [250, BAS_SCENE - 8 - hauteur], [250, 8], [ECRAN_X_MAX - largeur - 30, BAS_SCENE - 8 - hauteur]];
    const r = choisir(largeur, hauteur, coins.map(([x, y]) => [x + largeur / 2, y + hauteur / 2]), occupe);
    occupe.push(r);
    ctx.save();
    ctx.font = '600 14px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(14,18,26,0.9)';
    ctx.fillRect(r.x0, r.y0, largeur, hauteur);
    lignes.forEach((ligne, i) => {
      const x = r.x0 + 8, y = r.y0 + 15 + 20 * i;
      ctx.fillStyle = '#fff';
      if (ligne.length === 1) { ctx.fillText(ligne[0], x, y); return; }
      const [couleur, tirets, texte] = ligne;
      ctx.strokeStyle = couleur; ctx.lineWidth = 2; ctx.setLineDash(tirets);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y); ctx.stroke();
      ctx.fillText(texte, x + 42, y);
    });
    ctx.restore();
  }

  function dessiner() {
    dessinPrevu = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const mesure = mesurerEcran(pointsSource(true));
    dessinerLumiere();
    dessinerEcran(mesure);
    dessinerObjet();
    dessinerSource();
    const liste = tangentes();
    if (etat.rayons) dessinerRayons(liste);
    const occupe = obstacles();
    if (etat.noms && etat.rayons) dessinerLegende(occupe);
    if (etat.noms) dessinerNoms(mesure, occupe);
    const surEcran = liste.map(({type, T, V}) => {
      const fin = lancer(T.x, T.y, Math.atan2(V.y - T.y, V.x - T.x), false);
      return {type, y: Math.abs(fin.x - etat.ecranX) < 0.5 ? fin.y : null};
    });
    resultat = {ombre: mesure.ombre, penombre: mesure.penombre, tangentesSurEcran: surEcran,
                etiquettes: etat.noms ? occupe.slice(obstacles().length) : []};
    annoncer(mesure);
  }

  // Résumé lu par les lecteurs d'écran (sans les noms des zones tant que « Noms » est fermé).
  let annonce = '';
  function annoncer(mesure) {
    if (!ui.annonce) return;
    const texte = (etat.source.etendue ? 'Source étendue' : 'Source ponctuelle') + ', ' +
      (etat.objet.forme === 'ballon' ? 'ballon' : 'caisse') + '. ' +
      (etat.noms
        ? 'Ombre portée sur l’écran : ' + (mesure.ombre.length ? 'oui' : 'non') + '. Pénombre sur l’écran : ' + (mesure.penombre.length ? 'oui' : 'non') + '.'
        : 'Partie sombre sur l’écran : ' + (mesure.ombre.length || mesure.penombre.length ? 'oui' : 'non') + '.');
    if (texte !== annonce && !prise) { annonce = texte; ui.annonce.textContent = texte; }
  }

  function redessiner() {
    if (dessinPrevu) return;
    dessinPrevu = true;
    requestAnimationFrame(dessiner);
  }

  // ---- Déplacements -----------------------------------------------------

  // Garde source et objet séparés, dans la scène, à gauche de l'écran.
  function placer(quoi, x, y) {
    const S = etat.source, o = etat.objet;
    const rs = Math.max(rayonSource(), R_DESSIN_PONCTUELLE), h = demiTaille();
    const ecart = rayonSource() + rayonEnveloppe() + 14;
    if (quoi === 'ecran') {
      const min = Math.max(S.x + rs, o.x + h) + 40;
      etat.ecranX = Math.max(Math.min(min, ECRAN_X_MAX), Math.min(ECRAN_X_MAX, x));
      return;
    }
    const moi = quoi === 'source' ? S : o, autre = quoi === 'source' ? o : S;
    const marge = quoi === 'source' ? rs : h;
    const borner = () => {
      x = Math.max(marge + 4, Math.min(etat.ecranX - 30 - marge, x));
      y = Math.max(marge + 4, Math.min(BAS_SCENE - marge, y));
    };
    borner();
    const d = Math.hypot(x - autre.x, y - autre.y);
    if (d < ecart) {
      const ux = d > 1e-6 ? (x - autre.x) / d : -1, uy = d > 1e-6 ? (y - autre.y) / d : 0;
      x = autre.x + ux * ecart; y = autre.y + uy * ecart;
      borner();
      if (Math.hypot(x - autre.x, y - autre.y) < ecart - 0.5) return;   // pas de place : on ne bouge pas
    }
    moi.x = x; moi.y = y;
  }

  // Après un changement de taille (source étendue, caisse) : tout remettre en place.
  function reajuster() {
    placer('objet', etat.objet.x, etat.objet.y);
    placer('source', etat.source.x, etat.source.y);
    if (Math.hypot(etat.source.x - etat.objet.x, etat.source.y - etat.objet.y) < rayonSource() + rayonEnveloppe() + 13) {
      etat.objet.x = etat.source.x + rayonSource() + rayonEnveloppe() + 20;   // dernier recours
      placer('objet', etat.objet.x, etat.objet.y);
    }
    placer('ecran', etat.ecranX, 0);
  }

  function coordonnees(event) {
    const r = canvas.getBoundingClientRect();
    return {x: (event.clientX - r.left) * W / r.width, y: (event.clientY - r.top) * H / r.height};
  }

  function quoiSous(p) {
    const S = etat.source, o = etat.objet, h = demiTaille();
    if (Math.hypot(p.x - S.x, p.y - S.y) <= Math.max(rayonSource(), R_DESSIN_PONCTUELLE) + 18) return 'source';
    if (o.forme === 'ballon' ? Math.hypot(p.x - o.x, p.y - o.y) <= h + 12
                             : Math.abs(p.x - o.x) <= h + 12 && Math.abs(p.y - o.y) <= h + 12) return 'objet';
    if (Math.abs(p.x - (etat.ecranX + ECRAN.epaisseur / 2)) <= 26 && p.y >= ECRAN.haut - 20 && p.y <= ECRAN.bas + 20) return 'ecran';
    return null;
  }

  function installerSaisie() {
    canvas.addEventListener('pointerdown', event => {
      if (prise) return;                                  // un seul doigt à la fois
      const p = coordonnees(event), quoi = quoiSous(p);
      if (etat.aide) basculer('aide');                    // toucher la scène ferme l'aide
      if (!quoi) return;
      event.preventDefault();
      const cible = quoi === 'source' ? etat.source : quoi === 'objet' ? etat.objet : {x: etat.ecranX, y: p.y};
      prise = {quoi, id: event.pointerId, dx: cible.x - p.x, dy: cible.y - p.y};
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', event => {
      const p = coordonnees(event);
      if (!prise) { canvas.style.cursor = quoiSous(p) ? 'grab' : 'default'; return; }
      if (event.pointerId !== prise.id) return;
      placer(prise.quoi, p.x + prise.dx, p.y + prise.dy);
      redessiner();
    });
    const lacher = event => {
      if (!prise || event.pointerId !== prise.id) return;
      prise = null;
      canvas.style.cursor = 'grab';
      redessiner();   // met à jour le résumé pour les lecteurs d'écran
    };
    canvas.addEventListener('pointerup', lacher);
    canvas.addEventListener('pointercancel', lacher);
    canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  // ---- Interface --------------------------------------------------------

  function basculer(cle, valeur) {
    if (cle === 'source') etat.source.etendue = valeur;
    else if (cle === 'objet') etat.objet.forme = valeur;
    else etat[cle] = !etat[cle];
    if (cle === 'source' || cle === 'objet') reajuster();
    mettreAJourBoutons();
    redessiner();
  }

  function mettreAJourBoutons() {
    ui.ponctuelle.setAttribute('aria-pressed', String(!etat.source.etendue));
    ui.etendue.setAttribute('aria-pressed', String(etat.source.etendue));
    ui.ballon.setAttribute('aria-pressed', String(etat.objet.forme === 'ballon'));
    ui.caisse.setAttribute('aria-pressed', String(etat.objet.forme === 'caisse'));
    ui.rayons.setAttribute('aria-pressed', String(etat.rayons));
    ui.noms.setAttribute('aria-pressed', String(etat.noms));
    ui.aideBouton.setAttribute('aria-expanded', String(etat.aide));
    ui.aide.hidden = !etat.aide;
  }

  function creerInterface() {
    const $ = id => document.getElementById(id);
    ui = {ponctuelle: $('b-ponctuelle'), etendue: $('b-etendue'), ballon: $('b-ballon'), caisse: $('b-caisse'),
          rayons: $('b-rayons'), noms: $('b-noms'), aideBouton: $('b-aide'), aide: $('aide'), annonce: $('annonce')};
    ui.ponctuelle.addEventListener('click', () => basculer('source', false));
    ui.etendue.addEventListener('click', () => basculer('source', true));
    ui.ballon.addEventListener('click', () => basculer('objet', 'ballon'));
    ui.caisse.addEventListener('click', () => basculer('objet', 'caisse'));
    ui.rayons.addEventListener('click', () => basculer('rayons'));
    ui.noms.addEventListener('click', () => basculer('noms'));
    ui.aideBouton.addEventListener('click', () => basculer('aide'));
    mettreAJourBoutons();
  }

  // La scène garde ses 800×600 et se réduit à la taille de la fenêtre (iframe d'un cours, tablette).
  function ajusterAffichage() {
    const echelle = Math.min(1.5, window.innerWidth / W, window.innerHeight / H);
    const scene = document.getElementById('scene');
    scene.style.transform = `scale(${echelle})`;
    scene.parentElement.style.width = W * echelle + 'px';
    scene.parentElement.style.height = H * echelle + 'px';
    const nouveau = Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, echelle));   // net aussi une fois agrandi
    if (nouveau !== dpr || canvas.width !== W * nouveau) {
      dpr = nouveau;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    redessiner();
  }

  function demarrer() {
    canvas = document.getElementById('ombres');
    ctx = canvas.getContext('2d');
    creerInterface();
    installerSaisie();
    ajusterAffichage();
    window.addEventListener('resize', ajusterAffichage);
  }

  // État lisible depuis la console (et par les tests automatiques).
  function lire() {
    return JSON.parse(JSON.stringify({...etat, rayonSource: rayonSource(), mesure: resultat}));
  }

  return {demarrer, etat: lire, placer: (quoi, x, y) => { placer(quoi, x, y); dessiner(); return lire(); },
          basculer: (cle, valeur) => { basculer(cle, valeur); dessiner(); return lire(); }};
})();

window.addEventListener('DOMContentLoaded', Ombres.demarrer);
