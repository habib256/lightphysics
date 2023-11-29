// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

// Matter.js module aliases
let Engine = Matter.Engine,
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
let lightImage;
let canvasCentre;
let time = 0;

function preload() {
  let ballImages = ['ballon.png', 'basket.png', 'smiley.png', 'tennis.png'];
  ballImages.forEach(image => {
    ballsImg.push(loadImage(`graphics/${image}`));
  });
}

function setup() {
  createCanvas(800, 600);
  canvasCentre = { x: canvas.width / 2, y: canvas.height / 2 };

  engine = Engine.create();
  world = engine.world;

  resetDioptres();

  // Créer un cercle de lumière de centre 
    lights.push(new Light(canvasCentre.x, canvasCentre.y, color(255, 255, 255, 128), dioptres));
    lights[0].showRays = true;

  balls.push(new Ball(80, 80, 40, {airFriction : 0,friction: 0, restitution: 1}, ballsImg));
  balls.push(new Ball(100, 80, 10, {airFriction : 0,friction: 0, restitution: 1}, ballsImg));

  // Supprimer la gravité
  engine.world.gravity.y = 0;

  Runner.run(Runner.create(), engine);
}

function draw() {
  manageObjects();

  updateDioptres();
  background(0);

  drawBalls();
  drawLights();

  Engine.update(engine);
}

function updateDioptres() {
  resetDioptres();
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].pushDioptres();
  }
}

function resetDioptres() {
  dioptres = [];
  // Limites de l'écran pour les rayons de lumière
  dioptres.push(new Dioptre(0, 0, width, 0));
  dioptres.push(new Dioptre(width, 0, width, height));
  dioptres.push(new Dioptre(width, height, 0, height));
  dioptres.push(new Dioptre(0, height, 0, 0));
}

function mouseClicked() {

}

function drawBackground() {
  image(backImg, 0, 0);
}

function drawLights() {
  for (let light of lights) {
    light.show();
  }
}

function drawDioptres() {
  for (let dioptre of dioptres) {
    dioptre.show();
  }
}

function drawBalls() {
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].show();
  }
}

function generateBall(x, y, r, options, ballsImg) {
  options.restitution = 0.8;
  balls.push(new Ball(x, y, r, options, ballsImg));
}

function manageObjects() {
  //manageOffScreenObjects(balls);

  balls[0].body.position.x = 150*cos(time)+ canvasCentre.x ;
  balls[0].body.position.y = 150*sin(time) + canvasCentre.y ;
  balls[1].body.position.x = 100*cos(3*time) + balls[0].body.position.x;
  balls[1].body.position.y = 100*sin(3*time) + balls[0].body.position.y;
  time= time+0.01;
}

function manageOffScreenObjects(objects) {
  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].isOffScreen()) {
      objects[i].removeFromWorld();
      objects.splice(i, 1);
    }
  }
}
