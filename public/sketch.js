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
let backgrounds = [];
let layers = [];
let ballons = [];
let boites = [];

let song = [];



// Select your best color for the lights
let newcolor;

// Will draw some graph a day ...
let chartCanvas;

function preload() {
  boites.push(loadImage('graphics/carre.png'));
  ballons.push(loadImage('graphics/ballon.png'));
  ballons.push(loadImage('graphics/basket.png'));
  ballons.push(loadImage('graphics/vaisseau.png'));
  ballons.push(loadImage('graphics/smiley.png'));
  ballons.push(loadImage('graphics/tennis.png'));
  ballons.push(loadImage('graphics/petanque.png'));
  ballons.push(loadImage('graphics/bowling.png'));
  ballons.push(loadImage('graphics/soleil.png'));
  backgrounds.push(loadImage('graphics/mur01.jpg'));
  backgrounds.push(loadImage('graphics/mur02.jpg'));
  backgrounds.push(loadImage('graphics/mur03.jpg'));
  backgrounds.push(loadImage('graphics/mur04.jpg'));
  backgrounds.push(loadImage('graphics/mur05.jpg'));
  backgrounds.push(loadImage('graphics/mur06.jpg'));
  backgrounds.push(loadImage('graphics/mur07.jpg'));
  song.push(loadSound('music/rebond.wav'));
  song.push(loadSound('music/rebond2.wav'));
  song.push(loadSound('music/rebond3.wav'));
  song.push(loadSound('music/envol.wav'));
}

function setup() {
  let x = 800;
  let y = 600;
  createCanvas(x, y);
  //layers[0]= createGraphics(x, y);
  //chartCanvas = createGraphics(x, y);
  //lightCanvas = createGraphics(x, y);

  // Initialiser le moteur et le monde
  engine = Engine.create();
  world = engine.world;

  // Créer la Lumière
  let light = new Light(width / 2, height / 2, color(255, 255, 255, 50));
  lights.push(light);
  selectimage = floor(random(0, backgrounds.length));

  //create runner
  //var runner = Runner.create();
  //Runner.run(runner, engine);
  Engine.run(engine);

  // Scènes à sélectionner
  // *************************
  setupBreakout();
}

function draw() {
  // Scènes à sélectionner
  // *************************
  drawBreakout();
}

function mouseClicked() {
  newcolor = color(random(255), random(255), random(255));
  newcolor.setAlpha(50);
  light = new Light(mouseX, mouseY, newcolor);
  lights.push(light);
}


// Breakout
// **************************************
function setupBreakout() {

  engine.world.gravity.y = 0;

  // Mettre en place les briques
  var options = {
    isStatic: true,
    timeScale: 1
  }
  let box_;
  for (let i = 130; i < width - 100; i = i + 60) {
    for (let j = 70; j < 200; j = j + 60) {
      box_ = new Box(i, j, 30, 20, options);
      boxes.push(box_);
    }
  }
  // Mettre en place les bords du Breakout
  box_ = new Box(width / 2, -20, width, 60, options);
  boxes.push(box_);
  box_ = new Box(-20, height / 2, 60, height - 20, options);
  boxes.push(box_);
  box_ = new Box(width / 2, height + 20, width, 60, options);
  boxes.push(box_);
  box_ = new Box(width + 20, height / 2, 60, height - 20, options);
  boxes.push(box_);

  let ball_;
  // Mettre en place la balle
  var options = {
    timeScale: 1
  }
  ball_ = new Ball(width / 2, height / 2, 8, options);
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
            let light = new Light(boxes[i].body.position.x, boxes[i].body.position.y, newcolor);
            lights.push(light);
          }
          boxes[i].removeFromWorld();
          boxes.splice(i, 1);
          i--;
          song[1].play(); 
        }
      }
    });
  });
}


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////


function drawBreakout() {
  background(0);
  dioptres = [];
  for (let i = 0; i < boxes.length; i++) {

    if (boxes[i].isOffScreen()) {
      boxes[i].removeFromWorld();
      boxes.splice(i, 1);
      i--;
    }
    boxes[i].pushDioptres();
  }

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

  for (let light of lights) {
    light.show();
  }

  //BURN SOFT_LIGHT OVERLAY DARKEST MULTIPLY
  blend(backgrounds[selectimage], 0, 0, backgrounds[selectimage].width, backgrounds[selectimage].height, 0, 0, width, height, BURN);
  //blend(layers[0], 0, 0, layers[0].width, layers[0].height, 0, 0, width, height, MULTIPLY);

  for (let light of lights) {
    light.showLighted();
  }
 
 // image(balls[0].renderP5(), balls[0].getX()-balls[0].getR(), balls[0].getY()-balls[0].getR());
  image(balls[0].render2D(ballons[7]), balls[0].getX(), balls[0].getY());
 
  Engine.update(engine);
}


