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
  Detector = Matter.Detector,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  MouseConstraint = Matter.MouseConstraint,
  Mouse = Matter.Mouse;

let engine;
let world;

let boxes = [];
let balls = [];
let paddles = [];

let dioptres = [];
//let rays = [];
let lights = [];
//let dynalights = [];
let images = [];

// Select your best color for the lights
let newcolor;

// Will draw some graph a day ...
let chartCanvas;



function preload() {
  images.push(loadImage('graphics/mur01.jpg'));
  images.push(loadImage('graphics/mur02.jpg'));
  images.push(loadImage('graphics/mur03.jpg'));
  images.push(loadImage('graphics/mur04.jpg'));
  images.push(loadImage('graphics/mur05.jpg'));
  images.push(loadImage('graphics/mur06.jpg'));
  images.push(loadImage('graphics/mur07.jpg'));
}

function setup() {
  let x = 800;
  let y = 600;
  createCanvas(x, y);
  //chartCanvas = createGraphics(x, y);
  //lightCanvas = createGraphics(x, y);

  // Initialiser le moteur et le monde
  engine = Engine.create();
  world = engine.world;

  // Créer la Lumière
  let light = new Light(width / 2, height / 2, color(255, 255, 255, 50));
  lights.push(light);
  selectimage = floor(random(0, images.length));
  //lights[0].updateColor(newcolor);

  //create runner
  //var runner = Runner.create();
  //Runner.run(runner, engine);
  Engine.run(engine);

  // Scènes à sélectionner
  // *************************

  setupWalls();

}

function draw() {
  // Scènes à sélectionner
  // *************************

  drawWalls();

}

function mouseClicked() {
  newcolor = color(random(255), random(255), random(255));
  newcolor.setAlpha(50);
  light = new Light(mouseX, mouseY, newcolor);
  
  lights.push(light);
}



// Walls : Box falling from sky under 2D RayTracing Renderer
// ************************************************************
function setupWalls() {
    let box_;
    // Mettre en place une box scène physique
    var options = {
      isStatic: true,
      timeScale: 1
    }
    box_ = new Box(width / 2, height - 20, width - 400, 20, options);
    boxes.push(box_);
  
    // Initialiser avec un premier bloc
    var options = {
      timeScale: 1
    }
    box_ = new Box(300, 0, 200, 100, options);
    boxes.push(box_);
  }


//////////////////////////////////////////////////////////////////////

  function drawWalls() {
    background(0);
  
    if (frameCount % 60 == 0) {
      generateBox(random(200, width - 150), 0, random(50, 150), random(50, 150));
    }
  
    dioptres = [];
    for (let i = 0; i < boxes.length; i++) {
  
      if (boxes[i].isOffScreen()) {
        boxes[i].removeFromWorld();
        boxes.splice(i, 1);
        i--;
      }
      boxes[i].show();
    }
    // Limites de l'écran
    dioptres.push(new Dioptre(0, 0, width, 0));
    dioptres.push(new Dioptre(width, 0, width, height));
    dioptres.push(new Dioptre(width, height, 0, height));
    dioptres.push(new Dioptre(0, height, 0, 0));
  

    lights[0].update(mouseX, mouseY);
  
    for (let light of lights) {
      light.show();
    }
  
    //BURN SOFT_LIGHT OVERLAY DARKEST MULTIPLY
    blend(images[selectimage], 0, 0, images[selectimage].width, images[selectimage].height, 0, 0, width, height, MULTIPLY);
  
    Engine.update(engine);
    //console.log(boxes.length, world.bodies.length);
  }
  
  function generateBox(x, y, w, h, options) {
    var options = {
      timeScale: 1
    }
    let box_ = new Box(x, y, w, h, options);
    boxes.push(box_);
  }
  
  