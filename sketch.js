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
let backgrounds = [];
let backImg;
let lightImage;


function preload() {
  let ballImages = ['ballon.png', 'basket.png', 'smiley.png', 'tennis.png'];
  boxesImg.push(loadImage('graphics/crate01.jpg'));
  boxesImg.push(loadImage('graphics/crate02.png'));
  ballImages.forEach(image => {
    ballsImg.push(loadImage(`graphics/${image}`));
  });
  for (let i = 1; i <= 7; i++) {
    backgrounds.push(loadImage(`graphics/mur0${i}.jpg`));
  }
} 

function setup() {
  createCanvas(800, 600);
  
  engine = Engine.create(); // Définir 'engine' avant d'appeler 'createWalls()'
  world = engine.world;

  backImg = backgrounds[4];
  
  createWalls(); // Appeler 'createWalls()' après la définition de 'engine'
  resetDioptres();

  // La couleur doit avoir un alpha de 20
  lights.push(new Light(40,40, color(255, 255, 255, 100), dioptres));
  lights.push(new Light(80,0, color(255, 255, 255, 100), dioptres));
  lights.push(new Light(0,80, color(255, 255, 255, 100), dioptres));

  Runner.run(Runner.create(), engine);
}

function draw() {
  manageObjects();

  updateDioptres();
  //drawDioptres();

  blendMode(BLEND);
  background(0);
  //drawBackground();
  drawBoxes();
  drawBalls();

  drawLights();

  Engine.update(engine);
}

function updateDioptres () {
  resetDioptres();
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].pushDioptres();
  }
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
  
  let ball = new Ball(mouseX, mouseY, random(20, 40),{restitution : 0.8}, ballsImg);
  balls.push(ball);

}

// Walls : Box falling from sky under 2D RayTracing Renderer
function createWalls() {
  let options = {
    isStatic: true,
    timeScale: 1
  }
  // Box de limite inférieure
  boxes.push(new Box(width / 2, height - 20, width - 400, 20, options, boxesImg));
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

function drawBoxes() {
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].show();
  }
}

function drawBalls() {
  for (let i = balls.length - 1; i >= 0; i--) {
      balls[i].show();
  }
}

function generateBox(x, y, w, h, img) {
  let options = {
    timeScale: 1
  }
  boxes.push(new Box(x, y, w, h, options, img));
}

function generateBall(x, y, r, options, ballsImg) {
  options.restitution = 0.8; 
  balls.push(new Ball(x, y, r, options, ballsImg));
}

function manageObjects() {
  manageOffScreenObjects(boxes);
  manageOffScreenObjects(balls);

  if (frameCount % 120 == 0) {
    
    if (Math.random() < 0.5) {
      generateBox(random(200, width - 150), 0, random(50, 150), random(50, 150), boxesImg);
    } else {
      generateBall(random(200, width - 150), 0, random(10, 50), {timeScale: 1}, ballsImg);
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