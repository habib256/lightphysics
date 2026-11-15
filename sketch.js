// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

// Matter.js module aliases
const Engine = Matter.Engine,
  World = Matter.World,
  Runner = Matter.Runner,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  MouseConstraint = Matter.MouseConstraint,
  Mouse = Matter.Mouse;

let engine;
let world;
let boxes = [];
let boxesImg = [];
let balls = [];
let ballsImg = [];
let lights = [];
let dioptres = [];
let mouseConstraint;
let runner;
let spatialGrid;

function preload() {
  const ballImages = ['ballon.png', 'basket.png', 'smiley.png', 'tennis.png'];
  boxesImg.push(loadImage('graphics/crate01.jpg'));
  boxesImg.push(loadImage('graphics/crate02.jpg'));
  ballImages.forEach(img => {
    ballsImg.push(loadImage(`graphics/${img}`));
  });
}

function setup() {
  // Le monde prend les proportions de la fenêtre (lightphysics/ecran.js).
  const depart = Ecran.calculerMonde();
  const rendu = createCanvas(depart.w, depart.h);

  engine = Engine.create();
  world = engine.world;

  // Souris et doigt : Matter.Mouse écoute le canvas lui-même (rendu.elt).
  // Ses coordonnées tiennent compte de la taille affichée du canvas et de pixelDensity().
  const mouse = Mouse.create(rendu.elt);
  mouse.pixelRatio = pixelDensity();

  mouseConstraint = MouseConstraint.create(engine, { mouse: mouse });
  World.add(world, mouseConstraint);

  runner = Runner.create();
  Runner.run(runner, engine);

  // Téléphones, tablettes et iframe : taille de la fenêtre, tactile, pause hors écran (lightphysics/ecran.js).
  Ecran.installer(rendu.elt, mouse, runner);

  // Masse et poids : astre, fiche de l'objet touché, flèche du poids, aide (lightphysics/pesanteur.js).
  Pesanteur.installer(rendu.elt, mouseConstraint, runner, engine);

  for (let i = 0; i < 3; i++) lights.push(new Light(0, 0, color(255, 255, 255, 50), dioptres));

  // Plateau, lampes et grille suivent la fenêtre et la place prise par le menu.
  amenagerMonde();
  Ecran.apresRedimension(amenagerMonde);
}

// Place le décor dans la zone laissée libre par le menu (à gauche sur un écran large, en haut
// sur un téléphone tenu droit) : le plateau est centré dans cette zone, pas dans la fenêtre.
// Rappelée à chaque changement de taille ou d'orientation.
function amenagerMonde() {
  Pesanteur.placerInterface();
  const zone = Pesanteur.zoneLibre();

  spatialGrid = new SpatialGrid(width, height, CONFIG.GRID_CELL_SIZE);

  // Plateau à 100 unités du bas : la place sous les objets posés permet de dessiner la flèche du poids.
  const largeurLibre = zone.x1 - zone.x0;
  const largeurPlateau = Math.max(140, Math.min(700, largeurLibre * 0.66));
  const centre = (zone.x0 + zone.x1) / 2;
  const ancien = boxes[0] && boxes[0].estPlateau ? boxes[0] : null;
  if (ancien) ancien.removeFromWorld();
  const plateau = new Box(centre, height - 100, largeurPlateau, 20, {isStatic: true, timeScale: 1}, ancien && ancien.img ? [ancien.img] : boxesImg);
  plateau.estPlateau = true;
  if (ancien) boxes[0] = plateau; else boxes.unshift(plateau);

  // Trois lampes en triangle, en haut à gauche, là où le menu ne les cache pas.
  const centreX = zone.lampes.x, centreY = zone.lampes.y, rayon = 20;
  lights.forEach((lampe, i) => {
    const angle = TWO_PI / 3 * i;
    lampe.update(centreX + cos(angle) * rayon, centreY + sin(angle) * rayon);
  });

  resetDioptres();
}

// Abscisses où apparaissent les objets : au-dessus de la zone libre, loin des bords.
function zoneApparition() {
  const zone = Pesanteur.zoneLibre();
  const gauche = Math.max(zone.x0, 60);
  const droite = Math.max(gauche + 40, width - Math.min(150, width * 0.15));
  return [gauche, droite];
}

function draw() {
  Ecran.surveillerCadence();

  if (!Pesanteur.enPause()) manageObjects();

  updateDioptres();

  blendMode(BLEND);
  background(0);
  drawBoxes();
  drawBalls();

  drawLights();

  Pesanteur.dessiner();

  if (CONFIG.SHOW_FPS) {
    blendMode(BLEND);
    noStroke();
    fill(255, 255, 0);
    textSize(14);
    textAlign(RIGHT, BOTTOM);
    text('FPS: ' + frameRate().toFixed(1), width - 10, height - 8);
  }

}

function updateDioptres() {
  resetDioptres();
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].pushDioptres();
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].pushDioptres();
  }
  spatialGrid.updateMaxDioptres(dioptreCount);
  spatialGrid.build(dioptres, dioptreCount);
  for (const light of lights) {
    light.grid = spatialGrid;
  }
}

function generateBox(x, y, w, h, img) {
  const options = {
    timeScale: 1
  };
  const caisse = new Box(x, y, w, h, options, img);
  Pesanteur.donnerMasse(caisse);  // masse en kg, air négligé
  boxes.push(caisse);
}

function generateBall(x, y, r, options, ballsImg) {
  options.restitution = CONFIG.BALL_RESTITUTION;
  const ballon = new Ball(x, y, r, options, ballsImg);
  Pesanteur.donnerMasse(ballon);
  balls.push(ballon);
}

function manageObjects() {
  manageOffScreenObjects(boxes);
  manageOffScreenObjects(balls);

  if (frameCount % CONFIG.SPAWN_INTERVAL === 0) {
    const [gauche, droite] = zoneApparition();
    if (Math.random() < CONFIG.SPAWN_PROBABILITY) {
      generateBox(random(gauche, droite), 0, random(50, 150), random(50, 150), boxesImg);
    } else {
      generateBall(random(gauche, droite), 0, random(10, 50), { timeScale: 1 }, ballsImg);
    }
  }

  function manageOffScreenObjects(objects) {
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].isOffScreen()) {
        objects[i].removeFromWorld();
        objects.splice(i, 1);
      }
    }
  }
}
