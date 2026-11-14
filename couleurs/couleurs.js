// LightPhysics — Couleurs (4e : lumière blanche, synthèses additive et soustractive ; 5e : rayon lumineux)
// Version 1.1 — 14/11/2026
// VERHILLE Arnaud
// Copyleft GPL2
//
// Vue de côté, comme sur un schéma. Deux expériences :
// - « Lampes colorées » : trois projecteurs rouge, vert, bleu, orientables, un écran, un objet opaque
//   facultatif. Sur l'écran, chaque point reçoit la somme des lumières qui l'atteignent (synthèse
//   additive : R + V = jaune, R + B = magenta, V + B = cyan, R + V + B = blanc) ; l'objet donne
//   des ombres colorées.
// - « Faisceau et prisme » : un faisceau étroit de lumière blanche (ou rouge, verte, bleue), un prisme
//   en verre, des filtres colorés. Chaque radiation est suivie rayon par rayon : en ligne droite dans
//   l'air, déviée à chaque face du prisme (loi de la réfraction, n1 sin i1 = n2 sin i2, réflexion
//   totale si elle se produit), arrêtée par un filtre qui ne la transmet pas.
//
// Modèle des couleurs (celui du cours, filtres idéaux) :
// - la lumière blanche est représentée par 31 radiations de 400 à 700 nm ; leur couleur affichée va
//   du violet au rouge ; la somme de toutes donne le blanc ;
// - un filtre transmet une partie du spectre : rouge ≥ 595 nm, vert 495-565 nm, bleu ≤ 485 nm,
//   jaune = rouge + vert, cyan = vert + bleu, magenta = rouge + bleu ;
// - les lumières rouge, verte, bleue du faisceau ne contiennent qu'une radiation (620, 530, 465 nm),
//   comme un laser.
// Le verre du prisme suit la loi de Cauchy n = A + B / λ² ; l'étalement des couleurs est EXAGÉRÉ
// (n va de 1,60 à 1,70, environ 4 fois plus qu'un verre réel) pour qu'on le voie à cette échelle.
// La lumière réfléchie par les faces du prisme (en dehors de la réflexion totale) n'est pas dessinée.

'use strict';

const Couleurs = (() => {
  const W = 800, H = 600;
  const BAS_SCENE = 480;                        // sous cette ligne : les boutons
  const ECRAN = {haut: 26, bas: 466, epaisseur: 16};
  const ECRAN_X_MAX = W - 160;                  // à droite de l'écran : la place des étiquettes
  const DEMI_CONE = 10 * Math.PI / 180;         // ouverture des projecteurs
  const LARGEUR_FAISCEAU = 4, RAYONS_FAISCEAU = 7;
  const COTE_PRISME = 130, RAYON_OBJET = 36;
  const CAUCHY_A = 1.5515, CAUCHY_B = 23750;    // n(400 nm) = 1,70 ; n(700 nm) = 1,60 (exagéré)
  const GAIN_ECRAN = 2.6, GAIN_ESPACE = 3.2;    // luminosité d'affichage du faisceau
  const PRIMAIRES = {rouge: [1, 0, 0], vert: [0, 1, 0], bleu: [0, 0, 1]};

  // ---- Lumière et couleurs ------------------------------------------------

  // Couleur affichée d'une radiation (λ en nm), dans le modèle à trois couleurs du cours.
  function teinte(l) {
    if (l < 435) return [0.3, 0, 1];      // violet
    if (l < 485) return [0, 0, 1];        // bleu
    if (l < 495) return [0, 0.7, 1];      // bleu-vert
    if (l < 565) return [0, 1, 0];        // vert
    if (l < 585) return [1, 1, 0];        // jaune
    if (l < 595) return [1, 0.5, 0];      // orange
    return [1, 0, 0];                     // rouge
  }
  const SPECTRE = [];
  for (let l = 400; l <= 700; l += 10) SPECTRE.push(l);
  const NORME = [0, 1, 2].map(k => 1 / SPECTRE.reduce((s, l) => s + teinte(l)[k], 0));
  const LUMIERES = {
    blanche: SPECTRE.map(l => ({l, poids: teinte(l).map((v, k) => v * NORME[k])})),
    rouge: [{l: 620, poids: [1, 0, 0]}],
    verte: [{l: 530, poids: [0, 1, 0]}],
    bleue: [{l: 465, poids: [0, 0, 1]}],
  };
  const FILTRES = {
    rouge: {rgb: [1, 0, 0], passe: l => l >= 595},
    vert: {rgb: [0, 1, 0], passe: l => l >= 495 && l <= 565},
    bleu: {rgb: [0, 0, 1], passe: l => l <= 485},
    cyan: {rgb: [0, 1, 1], passe: l => l <= 565},
    magenta: {rgb: [1, 0, 1], passe: l => l <= 485 || l >= 595},
    jaune: {rgb: [1, 1, 0], passe: l => l >= 495},
  };
  const indice = l => CAUCHY_A + CAUCHY_B / (l * l);

  const NOMS = {'1,1,1': 'Blanc', '1,0,0': 'Rouge', '0,1,0': 'Vert', '0,0,1': 'Bleu',
                '1,1,0': 'Jaune', '1,0,1': 'Magenta', '0,1,1': 'Cyan', '0,0,0': 'Noir'};
  const quantifier = c => c.map(v => (v >= 0.35 ? 1 : 0));
  const nomCouleur = c => NOMS[quantifier(c).join(',')];
  const css = (c, a = 1) => `rgba(${Math.round(255 * Math.min(1, c[0]))},${Math.round(255 * Math.min(1, c[1]))},${Math.round(255 * Math.min(1, c[2]))},${a})`;

  // ---- État -----------------------------------------------------------------

  const viser = (x, y, cx, cy) => Math.atan2(cy - y, cx - x);
  const etat = {
    mode: 'lampes',
    projecteurs: [
      {couleur: 'rouge', x: 110, y: 140, angle: viser(110, 140, 640, 200), allume: true},
      {couleur: 'vert', x: 110, y: 240, angle: viser(110, 240, 640, 246), allume: false},
      {couleur: 'bleu', x: 110, y: 340, angle: viser(110, 340, 640, 292), allume: false},
    ],
    objet: {present: false, x: 360, y: 246},
    faisceau: {x: 60, y: 440, angle: -25 * Math.PI / 180, lumiere: 'blanche'},
    prisme: {present: false, x: 330, y: 280, phi: 0},
    filtres: [],                                   // {couleur, x, y}
    ecranX: 640,
    rayon: false,
    noms: false,
    aide: true,
  };

  let canvas = null, ctx = null, dpr = 1, ui = {}, prise = null, dessinPrevu = false, resultat = null;

  // ---- Géométrie --------------------------------------------------------------

  function rectEcran() {
    return {x0: etat.ecranX, y0: ECRAN.haut, x1: etat.ecranX + ECRAN.epaisseur, y1: ECRAN.bas};
  }
  const CADRE = {x0: 0, y0: 0, x1: W, y1: H};

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
    if (t1 > 1e-9) return t1;
    return Infinity;
  }
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
  // Rayon O + t·d contre le segment [A, B] : t > 0 et position u ∈ [0, 1] sur le segment.
  function impactSegment(ox, oy, dx, dy, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) return Infinity;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
    const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    return t > 1e-7 && u >= 0 && u <= 1 ? t : Infinity;
  }

  // Sommets du prisme (triangle équilatéral, pointe vers le haut quand phi = 0).
  function sommetsPrisme() {
    const p = etat.prisme, rc = COTE_PRISME / Math.sqrt(3);
    return [-90, 30, 150].map(d => {
      const a = (d * Math.PI / 180) + p.phi;
      return {x: p.x + rc * Math.cos(a), y: p.y + rc * Math.sin(a)};
    });
  }
  function dansTriangle(x, y, s) {
    const signe = (a, b) => (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    const d1 = signe(s[0], s[1]), d2 = signe(s[1], s[2]), d3 = signe(s[2], s[0]);
    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
  }
  const DEMI_FILTRE = 45;
  const poigneePrisme = () => { const s = sommetsPrisme()[0], p = etat.prisme, d = Math.hypot(s.x - p.x, s.y - p.y);
    return {x: p.x + (s.x - p.x) * (d + 30) / d, y: p.y + (s.y - p.y) * (d + 30) / d}; };
  const poignee = (source, distance = 44) => ({x: source.x + distance * Math.cos(source.angle), y: source.y + distance * Math.sin(source.angle)});

  // ---- Lampes colorées (synthèse additive) -------------------------------------

  // Le segment P → Q est-il coupé par l'objet opaque ?
  const cacheParObjet = (p, q) => etat.objet.present &&
    impactDisque(p.x, p.y, q.x - p.x, q.y - p.y, etat.objet.x, etat.objet.y, RAYON_OBJET) < 1 - 1e-9;
  const dansCone = (pr, x, y) => {
    let d = Math.atan2(y - pr.y, x - pr.x) - pr.angle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return Math.abs(d) <= DEMI_CONE;
  };

  function lancerSimple(ox, oy, a) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let t = Math.min(impactBoite(ox, oy, dx, dy, CADRE), impactBoite(ox, oy, dx, dy, rectEcran()));
    if (etat.objet.present) t = Math.min(t, impactDisque(ox, oy, dx, dy, etat.objet.x, etat.objet.y, RAYON_OBJET));
    return {x: ox + t * dx, y: oy + t * dy};
  }

  function polygoneProjecteur(pr) {
    const A = [];
    const a0 = pr.angle - DEMI_CONE, a1 = pr.angle + DEMI_CONE;
    for (let k = 0; k <= 80; k++) A.push(a0 + (a1 - a0) * k / 80);
    const ajouter = a => { let d = Math.atan2(Math.sin(a - pr.angle), Math.cos(a - pr.angle)); if (Math.abs(d) < DEMI_CONE) A.push(pr.angle + d); };
    if (etat.objet.present) {
      const o = etat.objet, d = Math.hypot(o.x - pr.x, o.y - pr.y);
      if (d > RAYON_OBJET) {
        const phi = Math.atan2(o.y - pr.y, o.x - pr.x), b = Math.asin(RAYON_OBJET / d);
        for (const a of [phi - b - 1e-4, phi - b + 1e-4, phi + b - 1e-4, phi + b + 1e-4]) ajouter(a);
      }
    }
    const e = rectEcran();
    for (const [x, y] of [[e.x0, e.y0], [e.x0, e.y1], [e.x1, e.y0], [e.x1, e.y1]]) {
      const a = Math.atan2(y - pr.y, x - pr.x);
      ajouter(a - 1e-4); ajouter(a + 1e-4);
    }
    A.sort((p, q) => {
      const dp = Math.atan2(Math.sin(p - pr.angle), Math.cos(p - pr.angle)), dq = Math.atan2(Math.sin(q - pr.angle), Math.cos(q - pr.angle));
      return dp - dq;
    });
    return [{x: pr.x, y: pr.y}, ...A.map(a => lancerSimple(pr.x, pr.y, a))];
  }

  function mesurerEcranLampes() {
    const x = etat.ecranX, valeurs = [];
    for (let y = ECRAN.haut; y <= ECRAN.bas; y++) {
      const c = [0, 0, 0];
      for (const pr of etat.projecteurs) {
        if (!pr.allume || pr.x >= x || !dansCone(pr, x, y) || cacheParObjet(pr, {x, y})) continue;
        PRIMAIRES[pr.couleur].forEach((v, k) => { c[k] += v; });
      }
      valeurs.push({y, c: c.map(v => Math.min(1, v))});
    }
    return valeurs;
  }

  // ---- Faisceau et prisme ------------------------------------------------------

  // Suit un rayon de longueur d'onde l : renvoie la ligne brisée et l'arrivée sur l'écran.
  function suivre(ox, oy, dx, dy, l) {
    const points = [{x: ox, y: oy}];
    const n = indice(l), sommets = etat.prisme.present ? sommetsPrisme() : null;
    let dansVerre = sommets ? dansTriangle(ox, oy, sommets) : false;
    let fin = {type: 'bord'}, reflexions = 0, refractions = 0;
    for (let etape = 0; etape < 16; etape++) {
      let t = impactBoite(ox, oy, dx, dy, CADRE), quoi = {type: 'bord'};
      const te = impactBoite(ox, oy, dx, dy, rectEcran());
      if (te < t) { t = te; quoi = {type: 'ecran'}; }
      for (const f of etat.filtres) {
        const tf = impactSegment(ox, oy, dx, dy, f.x, f.y - DEMI_FILTRE, f.x, f.y + DEMI_FILTRE);
        if (tf < t) { t = tf; quoi = {type: 'filtre', f}; }
      }
      if (sommets) {
        for (let i = 0; i < 3; i++) {
          const a = sommets[i], b = sommets[(i + 1) % 3];
          const ts = impactSegment(ox, oy, dx, dy, a.x, a.y, b.x, b.y);
          if (ts < t) { t = ts; quoi = {type: 'face', a, b}; }
        }
      }
      const x = ox + t * dx, y = oy + t * dy;
      points.push({x, y});
      if (quoi.type === 'bord') { fin = {type: 'bord'}; break; }
      if (quoi.type === 'ecran') {
        fin = Math.abs(x - etat.ecranX) < 1e-6 && dx > 0 ? {type: 'ecran', y} : {type: 'bord'};
        break;
      }
      if (quoi.type === 'filtre') {
        if (!FILTRES[quoi.f.couleur].passe(l)) { fin = {type: 'absorbe'}; break; }
        ox = x + dx * 1e-3; oy = y + dy * 1e-3;
        continue;
      }
      // Face du prisme : normale unitaire tournée vers le rayon incident.
      let nx = -(quoi.b.y - quoi.a.y), ny = quoi.b.x - quoi.a.x;
      const ln = Math.hypot(nx, ny); nx /= ln; ny /= ln;
      if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
      const eta = dansVerre ? n : 1 / n, cosi = -(nx * dx + ny * dy), k = 1 - eta * eta * (1 - cosi * cosi);
      if (k < 0) {                       // réflexion totale
        dx += 2 * cosi * nx; dy += 2 * cosi * ny;
        reflexions++;
      } else {                           // réfraction : n1 sin i1 = n2 sin i2
        const c = eta * cosi - Math.sqrt(k);
        dx = eta * dx + c * nx; dy = eta * dy + c * ny;
        dansVerre = !dansVerre;
        refractions++;
      }
      const ld = Math.hypot(dx, dy); dx /= ld; dy /= ld;
      ox = x + dx * 1e-6; oy = y + dy * 1e-6;
    }
    return {points, fin, direction: {x: dx, y: dy}, reflexions, refractions};
  }

  // Tous les rayons du faisceau, pour chaque radiation de la lumière choisie.
  function tracerFaisceau() {
    const F = etat.faisceau, ux = Math.cos(F.angle), uy = Math.sin(F.angle), px = -uy, py = ux;
    const depart = poignee(F, 26);
    return LUMIERES[F.lumiere].map(({l, poids}) => {
      const rayons = [];
      for (let i = 0; i < RAYONS_FAISCEAU; i++) {
        const o = -LARGEUR_FAISCEAU / 2 + LARGEUR_FAISCEAU * (i + 0.5) / RAYONS_FAISCEAU;
        rayons.push(suivre(depart.x + px * o, depart.y + py * o, ux, uy, l));
      }
      const centre = suivre(depart.x, depart.y, ux, uy, l);
      return {l, poids, rayons, centre};
    });
  }

  // Éclairement de l'écran : chaque rayon apporte sa couleur sur une largeur égale à l'écart avec
  // ses voisins (un faisceau étalé éclaire moins fort).
  function mesurerEcranFaisceau(trace) {
    const nb = ECRAN.bas - ECRAN.haut + 1, cumul = [new Float32Array(nb), new Float32Array(nb), new Float32Array(nb)];
    const pas0 = LARGEUR_FAISCEAU / RAYONS_FAISCEAU;
    for (const {poids, rayons} of trace) {
      const ys = rayons.map(r => (r.fin.type === 'ecran' ? r.fin.y : null));
      ys.forEach((y, i) => {
        if (y === null) return;
        const voisins = [ys[i - 1], ys[i + 1]].filter(v => v !== null && v !== undefined).map(v => Math.abs(v - y));
        const pas = Math.max(0.5, voisins.length ? voisins.reduce((a, b) => a + b, 0) / voisins.length : pas0);
        const debut = y - pas / 2, finY = y + pas / 2, valeur = pas0 / pas;
        for (let j = Math.floor(debut); j <= Math.ceil(finY); j++) {
          const part = Math.max(0, Math.min(finY, j + 0.5) - Math.max(debut, j - 0.5));
          const idx = j - ECRAN.haut;
          if (part > 0 && idx >= 0 && idx < nb) for (let k = 0; k < 3; k++) cumul[k][idx] += poids[k] * valeur * part;
        }
      });
    }
    const valeurs = [];
    for (let i = 0; i < nb; i++) {
      // Teinte de la lumière reçue, éclat porté vite au maximum : le bleu et le violet du spectre restent visibles.
      const v = [0, 1, 2].map(k => cumul[k][i]), max = Math.max(...v);
      valeurs.push({y: ECRAN.haut + i, c: max > 0 ? v.map(x => (x / max) * Math.min(1, GAIN_ECRAN * 3 * max)) : [0, 0, 0]});
    }
    return valeurs;
  }

  // Placer le prisme sur le trajet du faisceau, dans la position classique de déviation minimale
  // (pour le vert, 550 nm) : à l'intérieur du verre, le rayon est parallèle à la base, et
  // sin i = n sin(A/2) avec A = 60°. Le faisceau entre par une face, sort par l'autre, et la
  // lumière est déviée vers la base du prisme.
  function poserPrisme() {
    const F = etat.faisceau, depart = poignee(F, 26), p = etat.prisme;
    const ux = Math.cos(F.angle), uy = Math.sin(F.angle);
    const iMin = Math.asin(indice(550) * Math.sin(Math.PI / 6));
    const rc = COTE_PRISME / Math.sqrt(3), ex = -0.225 * COTE_PRISME, ey = -0.325 * rc;
    const traverse = l => { const r = suivre(depart.x, depart.y, ux, uy, l);
      return r.refractions === 2 && !r.reflexions && r.fin.type === 'ecran' && r.fin.y > ECRAN.haut + 40 && r.fin.y < ECRAN.bas - 40; };
    const configurations = longueur => {
      const bx = depart.x + ux * longueur, by = depart.y + uy * longueur;
      // Pointe d'un côté du faisceau (déviation vers l'autre côté), ou prisme symétrique.
      const phi = F.angle - (Math.PI / 6 - iMin), c = Math.cos(phi), sn = Math.sin(phi);
      const cx = bx - (ex * c - ey * sn), cy = by - (ex * sn + ey * c);
      const vx = cx - bx, vy = cy - by, along = vx * ux + vy * uy;
      return [[phi, cx, cy], [2 * F.angle - phi + Math.PI / 3, bx + 2 * along * ux - vx, by + 2 * along * uy - vy]];
    };
    // Le plus loin possible de l'écran (spectre plus étalé), pourvu que le violet et le rouge l'atteignent.
    const premier = configurations(120)[0];
    for (let longueur = 80; longueur <= 420; longueur += 20) {
      for (const [phi, x, y] of configurations(longueur)) {
        if (x + COTE_PRISME / 2 > etat.ecranX - 30) continue;
        Object.assign(p, {phi, x, y, present: true});
        if (traverse(400) && traverse(700)) return;
      }
    }
    Object.assign(p, {phi: premier[0], x: premier[1], y: premier[2], present: true});
  }

  // ---- Dessin ------------------------------------------------------------------

  function dessinerEcran(valeurs) {
    const e = rectEcran();
    ctx.fillStyle = '#26282c';
    ctx.fillRect(e.x0, e.y0, ECRAN.epaisseur, e.y1 - e.y0);
    const face = ctx.createLinearGradient(0, e.y0, 0, e.y1);
    const fond = 0.16;   // un écran blanc non éclairé reste gris foncé, distinct du noir
    for (const {y, c} of valeurs) {
      face.addColorStop((y - e.y0) / (e.y1 - e.y0), css(c.map(v => fond + (1 - fond) * v)));
    }
    ctx.fillStyle = face;
    ctx.fillRect(e.x0, e.y0, ECRAN.epaisseur - 4, e.y1 - e.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(e.x0 - 0.75, e.y0 - 0.75, ECRAN.epaisseur + 1.5, e.y1 - e.y0 + 1.5);
  }

  function dessinerBoitier(source, couleur, allume) {
    ctx.save();
    ctx.translate(source.x, source.y);
    ctx.rotate(source.angle);
    ctx.fillStyle = '#3a3f4b';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-26, -15, 46, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = allume ? css(couleur) : '#555';
    ctx.beginPath(); ctx.rect(20, -11, 7, 22); ctx.fill();
    ctx.restore();
    // Poignée pour orienter la lampe
    const p = poignee(source);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(source.x + 27 * Math.cos(source.angle), source.y + 27 * Math.sin(source.angle)); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }

  function dessinerObjet() {
    const o = etat.objet;
    ctx.fillStyle = '#20242e';
    ctx.beginPath(); ctx.arc(o.x, o.y, RAYON_OBJET, 0, 2 * Math.PI); ctx.fill();
    // Côtés éclairés : chaque projecteur allumé colore la calotte tournée vers lui (s'il l'atteint).
    ctx.save();
    ctx.beginPath(); ctx.arc(o.x, o.y, RAYON_OBJET, 0, 2 * Math.PI); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (const pr of etat.projecteurs) {
      if (!pr.allume) continue;
      const d = Math.hypot(pr.x - o.x, pr.y - o.y);
      if (d <= RAYON_OBJET) continue;
      const phi = Math.atan2(pr.y - o.y, pr.x - o.x), alpha = Math.acos(RAYON_OBJET / d);
      const b = Math.asin(RAYON_OBJET / d), versObjet = Math.atan2(o.y - pr.y, o.x - pr.x);
      let ecart = Math.atan2(Math.sin(versObjet - pr.angle), Math.cos(versObjet - pr.angle));
      if (Math.abs(ecart) > DEMI_CONE + b) continue;   // l'objet est hors du cône de lumière
      ctx.fillStyle = css(PRIMAIRES[pr.couleur].map(v => 0.8 * v));
      ctx.beginPath(); ctx.arc(o.x, o.y, RAYON_OBJET, phi - alpha, phi + alpha); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(o.x, o.y, RAYON_OBJET, 0, 2 * Math.PI); ctx.stroke();
  }

  function dessinerLampes(valeurs) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pr of etat.projecteurs) {
      if (!pr.allume) continue;
      const poly = polygoneProjecteur(pr);
      const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 800);
      g.addColorStop(0, css(PRIMAIRES[pr.couleur], 0.34));
      g.addColorStop(1, css(PRIMAIRES[pr.couleur], 0.16));
      ctx.fillStyle = g;
      ctx.beginPath();
      poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    dessinerEcran(valeurs);
    if (etat.objet.present) dessinerObjet();
    for (const pr of etat.projecteurs) dessinerBoitier(pr, PRIMAIRES[pr.couleur], pr.allume);
  }

  function dessinerPrisme() {
    const s = sommetsPrisme();
    ctx.save();
    ctx.fillStyle = 'rgba(170,215,255,0.16)';
    ctx.strokeStyle = 'rgba(200,230,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const h = poigneePrisme();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(h.x, h.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.arc(h.x, h.y, 8, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function dessinerFiltres() {
    for (const f of etat.filtres) {
      ctx.fillStyle = css(FILTRES[f.couleur].rgb, 0.55);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.rect(f.x - 5, f.y - DEMI_FILTRE, 10, 2 * DEMI_FILTRE); ctx.fill(); ctx.stroke();
    }
  }

  function fleche(x0, y0, x1, y1, couleur) {
    const a = Math.atan2(y1 - y0, x1 - x0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    ctx.save();
    ctx.translate(mx, my); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.stroke();
    ctx.fillStyle = couleur; ctx.fill();
    ctx.restore();
  }

  function dessinerFaisceau(trace) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LARGEUR_FAISCEAU / RAYONS_FAISCEAU * 1.5;
    for (const {poids, rayons} of trace) {
      ctx.strokeStyle = css(poids.map(v => Math.min(1, GAIN_ESPACE * v)));
      ctx.beginPath();
      for (const r of rayons) r.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Modèle du rayon lumineux : une ligne droite fléchée par segment. En lumière blanche, le rayon
  // reste blanc tant que les couleurs ne sont pas séparées, puis 7 rayons colorés en partent.
  function trait(pts, couleur) {
    if (pts.length < 2) return;
    ctx.save();
    for (const [largeur, c] of [[4, 'rgba(0,0,0,0.6)'], [1.8, couleur]]) {
      ctx.lineWidth = largeur; ctx.strokeStyle = c;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i + 1 < pts.length; i++) {
      if (Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) > 40) fleche(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, couleur);
    }
  }

  // Les radiations qui suivent le même chemin forment un seul rayon, de la couleur de leur somme ;
  // à chaque séparation (prisme) ou absorption (filtre), le rayon se divise ou change de couleur.
  // Après un prisme en lumière blanche, on ne trace que 7 radiations pour rester lisible.
  const REPRESENTANTS = [410, 460, 490, 530, 570, 620, 680];
  function couleurSomme(membres) {
    const somme = [0, 1, 2].map(k => membres.reduce((a, m) => a + m.poids[k], 0));
    const max = Math.max(...somme);
    return max > 0 ? somme.map(v => v / max) : [0, 0, 0];
  }
  const memePoint = (a, b) => a && b && Math.hypot(a.x - b.x, a.y - b.y) < 0.01;

  function dessinerGroupe(membres, debut) {
    // Partie commune à partir de l'indice debut
    let k = debut + 1;
    while (membres.every(m => m.pts.length > k) && membres.every(m => memePoint(m.pts[k], membres[0].pts[k]))) k++;
    trait(membres[0].pts.slice(debut, k), css(couleurSomme(membres)));
    // Ceux qui continuent, regroupés par point suivant
    const suite = membres.filter(m => m.pts.length > k);
    const groupes = [];
    for (const m of suite) {
      const g = groupes.find(x => memePoint(x[0].pts[k], m.pts[k]));
      if (g) g.push(m); else groupes.push([m]);
    }
    const choisis = groupes.length > 7 ? groupes.filter(g => g.some(m => REPRESENTANTS.includes(m.l))) : groupes;
    for (const g of choisis) dessinerGroupe(g, k - 1);
  }

  function dessinerRayonModele(trace) {
    dessinerGroupe(trace.map(t => ({l: t.l, poids: t.poids, pts: t.centre.points})), 0);
  }

  // ---- Étiquettes (« Noms ») -----------------------------------------------------

  const POLICE = '700 15px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const chevauche = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const dansScene = r => r.x0 >= 2 && r.x1 <= W - 2 && r.y0 >= 2 && r.y1 <= BAS_SCENE - 2;

  function obstacles() {
    const e = rectEcran(), zones = [{x0: e.x0 - 4, y0: e.y0 - 4, x1: e.x1 + 4, y1: e.y1 + 4}];
    const boite = (x, y, r) => ({x0: x - r, y0: y - r, x1: x + r, y1: y + r});
    if (etat.mode === 'lampes') {
      for (const pr of etat.projecteurs) { zones.push(boite(pr.x, pr.y, 30)); const q = poignee(pr); zones.push(boite(q.x, q.y, 14)); }
      if (etat.objet.present) zones.push(boite(etat.objet.x, etat.objet.y, RAYON_OBJET + 4));
    } else {
      zones.push(boite(etat.faisceau.x, etat.faisceau.y, 30));
      const pf = poignee(etat.faisceau); zones.push(boite(pf.x, pf.y, 14));
      if (etat.prisme.present) { const pp = poigneePrisme(); zones.push(boite(pp.x, pp.y, 14)); }
      if (etat.prisme.present) zones.push(boite(etat.prisme.x, etat.prisme.y, COTE_PRISME / Math.sqrt(3) + 4));
      for (const f of etat.filtres) zones.push({x0: f.x - 8, y0: f.y - DEMI_FILTRE, x1: f.x + 8, y1: f.y + DEMI_FILTRE});
    }
    if (etat.aide && ui.aide) zones.push({x0: ui.aide.offsetLeft - 4, y0: 0, x1: ui.aide.offsetLeft + ui.aide.offsetWidth + 4, y1: 8 + ui.aide.offsetHeight + 4});
    return zones;
  }

  function choisir(largeur, hauteur, candidats, occupe) {
    const rect = ([x, y]) => ({x0: x - largeur / 2, y0: y - hauteur / 2, x1: x + largeur / 2, y1: y + hauteur / 2});
    for (const c of candidats) {
      const r = rect(c);
      if (dansScene(r) && !occupe.some(z => chevauche(r, z))) return r;
    }
    const surface = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    let meilleur = null, moindre = Infinity;
    for (const [x, y] of candidats) {
      const r = rect([Math.max(largeur / 2 + 4, Math.min(W - largeur / 2 - 4, x)), Math.max(hauteur / 2 + 4, Math.min(BAS_SCENE - hauteur / 2 - 4, y))]);
      const recouvre = occupe.reduce((s, z) => s + surface(r, z), 0);
      if (recouvre < moindre) { moindre = recouvre; meilleur = r; }
    }
    return meilleur;
  }

  function dessinerEtiquettes(posees) {
    for (const {r, cibles} of posees) {
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
      for (const [x, y] of cibles) {
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI); ctx.fill();
      }
    }
    for (const {r, texte, pastille} of posees) {
      ctx.fillStyle = 'rgba(14,18,26,0.94)'; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.fill(); ctx.stroke();
      ctx.font = POLICE; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      let x = r.x0 + 8;
      if (pastille) {
        ctx.fillStyle = css(pastille); ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.rect(x, (r.y0 + r.y1) / 2 - 6, 12, 12); ctx.fill(); ctx.stroke();
        x += 18;
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(texte, x, (r.y0 + r.y1) / 2 + 1);
    }
  }

  // Couleurs reçues par l'écran en mode faisceau, d'après les rayons qui l'atteignent réellement.
  // Sans prisme, toutes les radiations transmises arrivent au même endroit : une seule tache, de la
  // couleur de leur somme. Avec le prisme, on lit les plages de l'écran (au moins 3 px).
  function couleursFaisceau(trace, valeurs) {
    const arrivees = trace.filter(t => t.centre.fin.type === 'ecran');
    if (!arrivees.length) return {aucune: true, taches: []};
    if (!etat.prisme.present) {
      const c = quantifier(couleurSomme(arrivees));
      return {aucune: false, taches: [{nom: NOMS[c.join(',')], c, y: arrivees.reduce((a, t) => a + t.centre.fin.y, 0) / arrivees.length}]};
    }
    return {aucune: false, taches: plagesCouleur(valeurs, 3).filter(p => p.nom !== 'Noir').map(p => ({nom: p.nom, c: p.c, y: (p.y0 + p.y1) / 2}))};
  }

  // Plages de même couleur sur l'écran (au moins « mini » px).
  function plagesCouleur(valeurs, mini = 6) {
    const res = [];
    let debut = 0;
    for (let i = 1; i <= valeurs.length; i++) {
      const fin = i === valeurs.length || nomCouleur(valeurs[i].c) !== nomCouleur(valeurs[debut].c);
      if (fin) {
        if (i - debut >= mini) res.push({nom: nomCouleur(valeurs[debut].c), y0: valeurs[debut].y, y1: valeurs[i - 1].y, c: quantifier(valeurs[debut].c)});
        debut = i;
      }
    }
    return res;
  }

  function dessinerNoms(valeurs, trace, occupe) {
    ctx.font = POLICE;
    const e = rectEcran(), droite = e.x1 + 14, posees = [];
    const poser = (texte, cibles, candidats, pastille) => {
      const l = ctx.measureText(texte).width + 16 + (pastille ? 18 : 0), h = 26;
      const r = choisir(l, h, candidats.map(([x, y, cote]) => [x + (cote || 0) * l / 2, y]), occupe);
      occupe.push(r);
      posees.push({texte, r, cibles, pastille});
    };
    const gauche = e.x0 - 14;
    const aDroite = y => [...[0, -30, 30, -60, 60, -90, 90, -120, 120].map(d => [droite, y + d, 1]),
                          ...[0, -30, 30, -60, 60, -90, 90].map(d => [gauche, y + d, -1])];
    poser('Écran', [[e.x1, e.y0 + 6]], [[droite, e.y0 + 14, 1], [droite, e.y0 + 44, 1]]);

    const bout = l => { const t = trace && trace.find(x => x.l === l); return t && t.centre.fin.type === 'ecran' ? t.centre : null; };
    const violet = bout(400), rouge = bout(700);
    if (etat.mode === 'faisceau' && etat.prisme.present && etat.faisceau.lumiere === 'blanche' &&
        violet && rouge && Math.abs(violet.fin.y - rouge.fin.y) > 8) {
      // Spectre : on nomme ses deux bouts ; à l'élève de comparer les déviations.
      const versHaut = y => [...[0, -30, -60, -90].map(d => [droite, y + d, 1]), ...[0, -30, -60, -90].map(d => [gauche, y + d, -1])];
      const versBas = y => [...[0, 30, 60, 90].map(d => [droite, y + d, 1]), ...[0, 30, 60, 90].map(d => [gauche, y + d, -1])];
      const violetEnBas = violet.fin.y > rouge.fin.y;
      poser('Violet', [[e.x0 + 2, violet.fin.y]], (violetEnBas ? versBas : versHaut)(violet.fin.y), [0.3, 0, 1]);
      poser('Rouge', [[e.x0 + 2, rouge.fin.y]], (violetEnBas ? versHaut : versBas)(rouge.fin.y), [1, 0, 0]);
    } else if (etat.mode === 'faisceau') {
      const {aucune, taches} = couleursFaisceau(trace, valeurs);
      if (aucune) {
        // Toute la lumière est absorbée (ou rate l'écran) : là où arriverait le faisceau sans filtre
        const F = etat.faisceau, d = poignee(F, 26), garde = etat.filtres;
        etat.filtres = [];
        const r = suivre(d.x, d.y, Math.cos(F.angle), Math.sin(F.angle), 550);
        etat.filtres = garde;
        if (r.fin.type === 'ecran' && garde.length) poser('Noir : aucune lumière', [[e.x0 + 2, r.fin.y]], aDroite(r.fin.y), [0, 0, 0]);
      }
      for (const t of taches) poser(t.nom, [[e.x0 + 2, t.y]], aDroite(t.y), t.c);
    } else {
      // Couleurs reçues par l'écran (le noir n'est nommé que s'il est entouré de lumière : une ombre)
      const plages = plagesCouleur(valeurs);
      plages.forEach((p, i) => {
        if (p.nom === 'Noir' && (i === 0 || i === plages.length - 1)) return;
        const y = (p.y0 + p.y1) / 2;
        poser(p.nom, [[e.x0 + 2, y]], aDroite(y), p.c);
      });
    }
    if (etat.mode === 'faisceau' && etat.prisme.present) {
      const p = etat.prisme;
      poser('Prisme (verre)', [[p.x, p.y]], [[p.x, p.y + 90], [p.x, p.y - 100], [p.x - 120, p.y], [p.x + 120, p.y]]);
    }
    if (etat.mode === 'lampes' && etat.objet.present) {
      const o = etat.objet;
      poser('Objet opaque', [[o.x, o.y]], [[o.x, o.y + RAYON_OBJET + 28], [o.x, o.y - RAYON_OBJET - 28], [o.x - 110, o.y], [o.x + 110, o.y]]);
    }
    dessinerEtiquettes(posees);
  }

  // ---- Boucle de dessin -----------------------------------------------------------

  function dessiner() {
    dessinPrevu = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    let valeurs, trace = null;
    if (etat.mode === 'lampes') {
      valeurs = mesurerEcranLampes();
      dessinerLampes(valeurs);
    } else {
      trace = tracerFaisceau();
      valeurs = mesurerEcranFaisceau(trace);
      dessinerFaisceau(trace);
      dessinerEcran(valeurs);
      if (etat.prisme.present) dessinerPrisme();
      dessinerFiltres();
      dessinerBoitier(etat.faisceau, etat.faisceau.lumiere === 'blanche' ? [1, 1, 1] : LUMIERES[etat.faisceau.lumiere][0].poids, true);
      if (etat.rayon) dessinerRayonModele(trace);
    }
    const occupe = obstacles(), n0 = occupe.length;
    if (etat.noms) dessinerNoms(valeurs, trace, occupe);
    resultat = {
      plages: plagesCouleur(valeurs).map(p => ({nom: p.nom, y0: p.y0, y1: p.y1})),
      recues: etat.mode === 'faisceau' ? couleursFaisceau(trace, valeurs).taches.map(t => t.nom)
        : plagesCouleur(valeurs).map(p => p.nom).filter(n => n !== 'Noir'),
      etiquettes: occupe.slice(n0),
      bouts: trace && trace.length > 1 ? Object.fromEntries([400, 550, 700].map(l => { const t = trace.find(x => x.l === l); return [l, t.centre.fin.type === 'ecran' ? t.centre.fin.y : null]; })) : null,
    };
    annoncer();
  }

  let annonce = '';
  function annoncer() {
    if (!ui.annonce || prise) return;
    const texte = etat.mode === 'lampes'
      ? 'Lampes allumées : ' + (etat.projecteurs.filter(p => p.allume).map(p => p.couleur).join(', ') || 'aucune') + '.' +
        (etat.noms ? ' Sur l’écran : ' + (resultat.recues.map(n => n.toLowerCase()).join(', ') || 'aucune lumière') + '.' : '')
      : 'Lumière ' + etat.faisceau.lumiere + (etat.prisme.present ? ', prisme' : '') +
        (etat.filtres.length ? ', filtres ' + etat.filtres.map(f => f.couleur).join(' et ') : '') + '.' +
        (etat.noms ? ' Sur l’écran : ' + (resultat.recues.map(n => n.toLowerCase()).join(', ') || 'aucune lumière') + '.' : '');
    if (texte !== annonce) { annonce = texte; ui.annonce.textContent = texte; }
  }

  function redessiner() {
    if (dessinPrevu) return;
    dessinPrevu = true;
    requestAnimationFrame(dessiner);
  }

  // ---- Déplacements ------------------------------------------------------------------

  const borner = (x, y, marge = 20) => ({
    x: Math.max(marge, Math.min(etat.ecranX - 24, x)),
    y: Math.max(marge, Math.min(BAS_SCENE - marge, y)),
  });

  function coordonnees(event) {
    const r = canvas.getBoundingClientRect();
    return {x: (event.clientX - r.left) * W / r.width, y: (event.clientY - r.top) * H / r.height};
  }

  // Ce qui est sous le doigt, du plus petit au plus grand.
  function quoiSous(p) {
    const pres = (q, r) => Math.hypot(p.x - q.x, p.y - q.y) <= r;
    if (etat.mode === 'lampes') {
      for (const pr of etat.projecteurs) if (pres(pr, 24)) return {quoi: 'deplacer', cible: pr};
      for (const pr of etat.projecteurs) if (pres(poignee(pr), 22)) return {quoi: 'orienter', cible: pr};
      if (etat.objet.present && pres(etat.objet, RAYON_OBJET + 10)) return {quoi: 'deplacer', cible: etat.objet};
    } else {
      if (pres(etat.faisceau, 24)) return {quoi: 'deplacer', cible: etat.faisceau};
      if (pres(poignee(etat.faisceau), 22)) return {quoi: 'orienter', cible: etat.faisceau};
      if (etat.prisme.present && pres(poigneePrisme(), 22)) return {quoi: 'tourner', cible: etat.prisme};
      for (const f of etat.filtres) if (Math.abs(p.x - f.x) <= 20 && Math.abs(p.y - f.y) <= DEMI_FILTRE + 8) return {quoi: 'deplacer', cible: f};
      if (etat.prisme.present && dansTriangle(p.x, p.y, sommetsPrisme())) return {quoi: 'deplacer', cible: etat.prisme};
    }
    if (Math.abs(p.x - (etat.ecranX + ECRAN.epaisseur / 2)) <= 26 && p.y >= ECRAN.haut - 16 && p.y <= ECRAN.bas + 16) return {quoi: 'ecran'};
    return null;
  }

  function appliquer(p) {
    const {quoi, cible, dx, dy} = prise;
    if (quoi === 'deplacer') {
      const b = borner(p.x + dx, p.y + dy, cible === etat.prisme ? COTE_PRISME / Math.sqrt(3) + 40 : 20);
      cible.x = b.x; cible.y = b.y;
    } else if (quoi === 'orienter') {
      cible.angle = Math.atan2(p.y - cible.y, p.x - cible.x);
    } else if (quoi === 'tourner') {
      cible.phi = Math.atan2(p.y - cible.y, p.x - cible.x) + Math.PI / 2;
    } else if (quoi === 'ecran') {
      const objets = etat.mode === 'lampes' ? [...etat.projecteurs, ...(etat.objet.present ? [etat.objet] : [])]
        : [etat.faisceau, ...etat.filtres, ...(etat.prisme.present ? [{x: etat.prisme.x + COTE_PRISME / 2}] : [])];
      const min = Math.max(...objets.map(o => o.x)) + 50;
      etat.ecranX = Math.max(Math.min(min, ECRAN_X_MAX), Math.min(ECRAN_X_MAX, p.x + dx));
    }
  }

  function installerSaisie() {
    canvas.addEventListener('pointerdown', event => {
      if (prise) return;
      const p = coordonnees(event);
      if (etat.aide) basculer('aide');
      const trouve = quoiSous(p);
      if (!trouve) return;
      event.preventDefault();
      const ref = trouve.quoi === 'ecran' ? {x: etat.ecranX, y: p.y} : trouve.cible;
      prise = {...trouve, id: event.pointerId, dx: ref.x - p.x, dy: ref.y - p.y};
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', event => {
      const p = coordonnees(event);
      if (!prise) { canvas.style.cursor = quoiSous(p) ? 'grab' : 'default'; return; }
      if (event.pointerId !== prise.id) return;
      appliquer(p);
      redessiner();
    });
    const lacher = event => {
      if (!prise || event.pointerId !== prise.id) return;
      prise = null;
      canvas.style.cursor = 'grab';
      redessiner();
    };
    canvas.addEventListener('pointerup', lacher);
    canvas.addEventListener('pointercancel', lacher);
    canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  // ---- Interface ---------------------------------------------------------------------

  // Position libre pour un nouveau filtre, sur le trajet du faisceau, avant le prisme.
  function placeFiltre() {
    const F = etat.faisceau, ux = Math.cos(F.angle), uy = Math.sin(F.angle);
    for (const d of [110, 150, 190, 70, 230]) {
      const x = F.x + ux * d, y = F.y + uy * d;
      if (!etat.filtres.some(f => Math.abs(f.x - x) < 24)) return borner(x, y, DEMI_FILTRE);
    }
    return borner(F.x + ux * 130, F.y + uy * 130, DEMI_FILTRE);
  }

  function basculer(cle, valeur) {
    if (cle === 'mode') { etat.mode = valeur; if (valeur === 'lampes') etat.rayon = false; }
    else if (cle === 'lampe') { const pr = etat.projecteurs.find(p => p.couleur === valeur); pr.allume = !pr.allume; }
    else if (cle === 'objet') etat.objet.present = !etat.objet.present;
    else if (cle === 'lumiere') etat.faisceau.lumiere = valeur;
    else if (cle === 'prisme') { if (etat.prisme.present) etat.prisme.present = false; else poserPrisme(); }
    else if (cle === 'filtre') {
      const i = etat.filtres.findIndex(f => f.couleur === valeur);
      if (i >= 0) etat.filtres.splice(i, 1); else etat.filtres.push({couleur: valeur, ...placeFiltre()});
    } else etat[cle] = !etat[cle];
    mettreAJourBoutons();
    redessiner();
  }

  function mettreAJourBoutons() {
    const presse = (b, v) => b && b.setAttribute('aria-pressed', String(!!v));
    presse(ui.modeLampes, etat.mode === 'lampes');
    presse(ui.modeFaisceau, etat.mode === 'faisceau');
    ui.barreLampes.hidden = etat.mode !== 'lampes';
    ui.barreFaisceau.hidden = etat.mode !== 'faisceau';
    ui.rayon.hidden = etat.mode !== 'faisceau';
    for (const pr of etat.projecteurs) presse(ui['lampe-' + pr.couleur], pr.allume);
    presse(ui.objet, etat.objet.present);
    for (const l of Object.keys(LUMIERES)) presse(ui['lumiere-' + l], etat.faisceau.lumiere === l);
    presse(ui.prisme, etat.prisme.present);
    for (const f of Object.keys(FILTRES)) presse(ui['filtre-' + f], etat.filtres.some(x => x.couleur === f));
    presse(ui.rayon, etat.rayon);
    presse(ui.noms, etat.noms);
    ui.aideBouton.setAttribute('aria-expanded', String(etat.aide));
    ui.aide.hidden = !etat.aide;
    ui.aideLampes.hidden = etat.mode !== 'lampes';
    ui.aideFaisceau.hidden = etat.mode !== 'faisceau';
    ui.aide.setAttribute('aria-labelledby', etat.mode === 'lampes' ? 'aide-titre' : 'aide-titre-faisceau');
  }

  function creerInterface() {
    const $ = id => document.getElementById(id);
    ui = {modeLampes: $('b-mode-lampes'), modeFaisceau: $('b-mode-faisceau'), barreLampes: $('barre-lampes'),
          barreFaisceau: $('barre-faisceau'), objet: $('b-objet'), prisme: $('b-prisme'), rayon: $('b-rayon'),
          noms: $('b-noms'), aideBouton: $('b-aide'), aide: $('aide'), aideLampes: $('aide-lampes'),
          aideFaisceau: $('aide-faisceau'), annonce: $('annonce')};
    ui.modeLampes.addEventListener('click', () => basculer('mode', 'lampes'));
    ui.modeFaisceau.addEventListener('click', () => basculer('mode', 'faisceau'));
    for (const c of ['rouge', 'vert', 'bleu']) { ui['lampe-' + c] = $('b-lampe-' + c); ui['lampe-' + c].addEventListener('click', () => basculer('lampe', c)); }
    for (const l of Object.keys(LUMIERES)) { ui['lumiere-' + l] = $('b-lumiere-' + l); ui['lumiere-' + l].addEventListener('click', () => basculer('lumiere', l)); }
    for (const f of Object.keys(FILTRES)) { ui['filtre-' + f] = $('b-filtre-' + f); ui['filtre-' + f].addEventListener('click', () => basculer('filtre', f)); }
    ui.objet.addEventListener('click', () => basculer('objet'));
    ui.prisme.addEventListener('click', () => basculer('prisme'));
    ui.rayon.addEventListener('click', () => basculer('rayon'));
    ui.noms.addEventListener('click', () => basculer('noms'));
    ui.aideBouton.addEventListener('click', () => basculer('aide'));
    // Page ouverte sur une expérience précise : couleurs/index.html#faisceau
    if (location.hash === '#faisceau') etat.mode = 'faisceau';
    mettreAJourBoutons();
  }

  function ajusterAffichage() {
    const echelle = Math.min(1.5, window.innerWidth / W, window.innerHeight / H);
    const scene = document.getElementById('scene');
    scene.style.transform = `scale(${echelle})`;
    scene.parentElement.style.width = W * echelle + 'px';
    scene.parentElement.style.height = H * echelle + 'px';
    const nouveau = Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, echelle));
    if (nouveau !== dpr || canvas.width !== Math.round(W * nouveau)) {
      dpr = nouveau;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    redessiner();
  }

  function demarrer() {
    canvas = document.getElementById('couleurs');
    ctx = canvas.getContext('2d');
    creerInterface();
    installerSaisie();
    ajusterAffichage();
    window.addEventListener('resize', ajusterAffichage);
  }

  function lire() {
    return JSON.parse(JSON.stringify({...etat, mesure: resultat}));
  }

  return {
    demarrer, etat: lire,
    basculer: (cle, valeur) => { basculer(cle, valeur); dessiner(); return lire(); },
    regler: (chemin, valeurs) => { Object.assign(chemin.split('.').reduce((o, k) => o[k], etat), valeurs); dessiner(); return lire(); },
    indice, teinte, _suivre: (...a) => suivre(...a),
  };
})();

window.addEventListener('DOMContentLoaded', Couleurs.demarrer);
