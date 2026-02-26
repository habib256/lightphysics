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
let glassBoxes = [];
let lights = [];
let dioptres = [];
let backgrounds = [];
let backImg;
let mouseConstraint;
let spatialGrid;

function preload() {
  const ballImages = ['ballon.png', 'basket.png', 'smiley.png', 'tennis.png'];
  boxesImg.push(loadImage('graphics/crate01.jpg'));
  boxesImg.push(loadImage('graphics/crate02.png'));
  ballImages.forEach(img => {
    ballsImg.push(loadImage(`graphics/${img}`));
  });
  for (let i = 1; i <= 7; i++) {
    backgrounds.push(loadImage(`graphics/mur0${i}.jpg`));
  }
}

function setup() {
  createCanvas(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  engine = Engine.create();
  world = engine.world;

  const mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();

  mouseConstraint = MouseConstraint.create(engine, { mouse: mouse });
  World.add(world, mouseConstraint);

  backImg = backgrounds[4];

  spatialGrid = new SpatialGrid(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.GRID_CELL_SIZE);

  createWalls();
  resetDioptres();

  const centreX = 30;
  const centreY = 30;
  const rayon = 20;
  for (let i = 0; i < 3; i++) {
    const angle = TWO_PI / 3 * i;
    const x = centreX + cos(angle) * rayon;
    const y = centreY + sin(angle) * rayon;
    lights.push(new Light(x, y, color(255, 255, 255, 50), dioptres));
  }

  Runner.run(Runner.create(), engine);
}

function draw() {
  manageObjects();

  updateDioptres();

  blendMode(BLEND);
  background(0);
  drawBoxes();
  drawBalls();
  drawGlassBoxes();

  drawLights();

  if (CONFIG.SHOW_FPS) {
    blendMode(BLEND);
    noStroke();
    fill(255, 255, 0);
    textSize(14);
    text('FPS: ' + frameRate().toFixed(1), 10, 20);
  }

  Engine.update(engine);
}

function updateDioptres() {
  resetDioptres();
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].pushDioptres();
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].pushDioptres();
  }
  for (let i = 0; i < glassBoxes.length; i++) {
    glassBoxes[i].pushDioptres();
  }
  spatialGrid.updateMaxDioptres(dioptreCount);
  spatialGrid.build(dioptres, dioptreCount);
  for (const light of lights) {
    light.grid = spatialGrid;
  }
}

function createWalls() {
  const options = {
    isStatic: true,
    timeScale: 1
  };
  boxes.push(new Box(width / 2, height - 20, width - 400, 20, options, boxesImg));
}

function drawBackground() {
  image(backImg, 0, 0);
}

function generateBox(x, y, w, h, img) {
  const options = {
    timeScale: 1
  };
  boxes.push(new Box(x, y, w, h, options, img));
}

function generateBall(x, y, r, options, ballsImg) {
  options.restitution = CONFIG.BALL_RESTITUTION;
  balls.push(new Ball(x, y, r, options, ballsImg));
}

function generateGlassBox(x, y, w, h) {
  const options = {
    timeScale: 1
  };
  glassBoxes.push(new GlassBox(x, y, w, h, options));
}

function manageObjects() {
  manageOffScreenObjects(boxes);
  manageOffScreenObjects(balls);
  manageOffScreenObjects(glassBoxes);

  if (frameCount % CONFIG.SPAWN_INTERVAL === 0) {
    const rand = Math.random();
    if (rand < CONFIG.GLASS_SPAWN_PROBABILITY) {
      generateGlassBox(random(200, width - 150), 0, random(40, 120), random(40, 120));
    } else if (rand < CONFIG.GLASS_SPAWN_PROBABILITY + (1 - CONFIG.GLASS_SPAWN_PROBABILITY) * CONFIG.SPAWN_PROBABILITY) {
      generateBox(random(200, width - 150), 0, random(50, 150), random(50, 150), boxesImg);
    } else {
      generateBall(random(200, width - 150), 0, random(10, 50), { timeScale: 1 }, ballsImg);
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
