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
  Body = Matter.Body;

let engine;
let world;
let balls = [];
let ballsImg = [];
let lights = [];
let dioptres = [];
let canvasCentre;
let time = 0;
let spatialGrid;

function preload() {
  const ballImages = ['ballon.png', 'basket.png', 'smiley.png', 'tennis.png'];
  ballImages.forEach(img => {
    ballsImg.push(loadImage(`graphics/${img}`));
  });
}

function setup() {
  createCanvas(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  canvasCentre = { x: canvas.width / 2, y: canvas.height / 2 };

  engine = Engine.create();
  world = engine.world;

  spatialGrid = new SpatialGrid(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.GRID_CELL_SIZE);

  resetDioptres();

  lights.push(new Light(canvasCentre.x, canvasCentre.y, color(255, 255, 255, 128), dioptres));
  lights[0].showRays = true;

  balls.push(new Ball(80, 80, 40, { airFriction: 0, friction: 0, restitution: 1 }, ballsImg));
  balls.push(new Ball(100, 80, 10, { airFriction: 0, friction: 0, restitution: 1 }, ballsImg));

  engine.world.gravity.y = 0;

  Runner.run(Runner.create(), engine);
}

function draw() {
  manageObjects();

  updateDioptres();
  background(0);

  drawBalls();
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
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].pushDioptres();
  }
  spatialGrid.updateMaxDioptres(dioptreCount);
  spatialGrid.build(dioptres, dioptreCount);
  for (const light of lights) {
    light.grid = spatialGrid;
  }
}

function manageObjects() {
  balls[0].body.position.x = 150 * cos(time) + canvasCentre.x;
  balls[0].body.position.y = 150 * sin(time) + canvasCentre.y;
  balls[1].body.position.x = 100 * cos(3 * time) + balls[0].body.position.x;
  balls[1].body.position.y = 100 * sin(3 * time) + balls[0].body.position.y;
  time = time + 0.01;
}

function manageOffScreenObjects(objects) {
  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].isOffScreen()) {
      objects[i].removeFromWorld();
      objects.splice(i, 1);
    }
  }
}
