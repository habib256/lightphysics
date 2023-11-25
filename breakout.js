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
let boxesImg= [];
let balls = [];
let ballsImg = [];
let paddles = [];

let dioptres = [];
let lights = [];
//let dynalights = [];
let backgrounds = [];
let backImg;
let layers = [];
let ballons = [];
let boites = [];

let songs = [];

// Select your best color for the lights
//let newcolor;

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
  songs.push(loadSound('music/rebond.wav'));
  songs.push(loadSound('music/rebond2.wav'));
  songs.push(loadSound('music/rebond3.wav'));
}

function setup() {
  let x = 800;
  let y = 600;
  createCanvas(x, y);
  layers[0]= createGraphics(x, y);
  //chartCanvas = createGraphics(x, y);
  //lightCanvas = createGraphics(x, y);

  // Initialiser le moteur et le monde
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  // Créer la Lumière
  let light = new Light(width / 2, height / 2, color(255, 255, 255, 50), dioptres);
  lights.push(light);
  selectimage = floor(random(0, backgrounds.length));

  //create runner
  let runner = Runner.create();
  Runner.run(runner, engine);

  // Scènes à sélectionner
  // *************************
  setupBreakout();
}

function draw() {
  background(0);
  resetDioptres();

  blendMode(BLEND);
  // Remplacer l'appel à drawBackground() par son code
  if (backImg) {
    image(backImg, 0, 0);
  }
  drawBoxes();
  drawBalls();
  blendMode(BLEND); // Utilise le mode de mélange ADD pour dessiner la lumière
  
  
  if (balls[0]) {
    lights[0].update(balls[0].getX(), balls[0].getY());
  }
  
  drawLights();
  //drawDioptres();

  // Scènes à sélectionner
  // *************************
  //drawBreakout();

  Engine.update(engine);
}

function mouseClicked() {
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }
  newcolor = color(random(255), random(255), random(255));
  newcolor.setAlpha(50);
  light = new Light(mouseX, mouseY, newcolor,dioptres);
  lights.push(light);
}


// Breakout
// **************************************
function setupBreakout() {

  // Mettre en place les briques
  var options = {
    isStatic: true,
    timeScale: 1
  }
  let box_;
  for (let i = 130; i < width - 100; i = i + 60) {
    for (let j = 70; j < 200; j = j + 60) {
      box_ = new Box(i, j, 30, 20, options, boxesImg);
      boxes.push(box_);
    }
  }
  // Mettre en place les bords du Breakout
  box_ = new Box(width / 2, -20, width, 60, options, boxesImg);
  boxes.push(box_);
  box_ = new Box(-20, height / 2, 60, height - 20, options, boxesImg);
  boxes.push(box_);
  box_ = new Box(width / 2, height + 20, width, 60, options, boxesImg);
  boxes.push(box_);
  box_ = new Box(width + 20, height / 2, 60, height - 20, options, boxesImg);
  boxes.push(box_);

  let ball_;
  // Mettre en place la balle
  var options = {
    timeScale: 1
  }
  ball_ = new Ball(width / 2, height / 2, 8, options, ballsImg);
  Body.setVelocity(ball_.body, { x: 3, y: 3 });
  //Body.setAngularVelocity(ball_.body, 0.1);
  ball_.body.friction = 0;
  ball_.body.frictionAir = 0;
  ball_.body.restitution = 1;
  balls.push(ball_);

  let paddle_;
  // Mettre en place la raquette
  var options = {
    isStatic: true,
    timeScale: 1
  }
  paddle_ = new Paddle(width / 2, height - 100, 130, 40, options);
  paddle_.body.restitution = 1.5;
  paddles.push(paddle_);

  // Mettre en place les evenements
  Matter.Events.on(engine, 'collisionEnd', ({ pairs }) => {
    pairs.forEach(({ bodyA, bodyB }) => {
      let id;
      if (bodyA.id == balls[0].body.id) {
        id = bodyB.id;
      } else {
        id = bodyA.id;
      }
      for (i = 0; i < boxes.length - 4; i++) {
        if (id == boxes[i].body.id) {
          if (random(0, 1) > 0.85) {
            // Créer la Lumière
            newcolor = color(random(255), random(255), random(255));
            newcolor.setAlpha(50);
            let light = new Light(boxes[i].body.position.x, boxes[i].body.position.y, newcolor, dioptres);
            lights.push(light);
          }
          boxes[i].removeFromWorld();
          boxes.splice(i, 1);
          i--;
          //song[1].play(); 
        }
      }
    });
  });
}


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////


function drawBreakout() {
  background(0);
  resetDioptres(0);

  // Gérer la raquette
  //paddles[0].pushDioptres();
  paddles[0].show();
  let y = mouseY - 20;
  if (y < height / 2) {
    y = height / 2;
  }
  Body.setPosition(paddles[0].body, { x: mouseX, y: y });

  // Gérer la vitesse de la balle
  let vx, vy, v;
  vx = balls[0].getVX();
  vy = balls[0].getVY();
  v = sqrt(vx * vx + vy * vy);
  if (v > 10) { vx = vx * 0.9; vy = vy * 0.9; }
  if (v < 3) { vx = vx * 1.2; vy = vy * 1.2; }
  Body.setVelocity(balls[0].body, { x: vx, y: vy });


  lights[0].update(balls[0].getX(), balls[0].getY());

  //BURN SOFT_LIGHT OVERLAY DARKEST MULTIPLY
  blend(backgrounds[selectimage], 0, 0, backgrounds[selectimage].width, backgrounds[selectimage].height, 0, 0, width, height, BURN);
  //blend(backgrounds[selectimage], 0, 0, backgrounds[selectimage].width, backgrounds[selectimage].height, 0, 0, width, height, BURN);
  //blend(layers[0], 0, 0, layers[0].width, layers[0].height, 0, 0, width, height, MULTIPLY);

drawLights();
drawBoxes();
drawBalls();
 
  Engine.update(engine);
}

function resetDioptres() {
  dioptres = [];
  // Limites de l'écran pour les rayons de lumière
  dioptres.push(new Dioptre(0, 0, width, 0));
  dioptres.push(new Dioptre(width, 0, width, height));
  dioptres.push(new Dioptre(width, height, 0, height));
  dioptres.push(new Dioptre(0, height, 0, 0));
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
    if (boxes[i].isOffScreen()) {
      boxes[i].removeFromWorld();
      boxes.splice(i, 1);
      i--;
    }
    boxes[i].show();
  }
}

function drawBalls() {
  for (let i = balls.length - 1; i >= 0; i--) {
    if (balls[i].isOffScreen()) {
      balls[i].removeFromWorld();
      balls.splice(i, 1);
    } else {
      balls[i].show();
    }
  }
}

