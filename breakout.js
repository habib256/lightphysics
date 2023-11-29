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
  MyBody = Matter.Body, // Renamed Body to MyBody
  MouseConstraint = Matter.MouseConstraint,
  Mouse = Matter.Mouse;

let engine;
let world;

let boxes = [];
let boxesImg = [];
let balls = [];
let ballsImg = [];
let paddle = Bodies.rectangle(400, 600, 80, 20, { isStatic: true });

let dioptres = [];
let lights = [];
let backgrounds = [];

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
  createCanvas(800, 600);
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  // Créer la Lumière
  let light = new Light(width / 2, height / 2, color(255, 255, 255, 64), dioptres);
  lights.push(light);

  for (let i = 0; i < 4; i++) {
    let light = new Light((width / 4) * (4 - i), 10, color(255, 255, 255, 50), dioptres);
    lights.push(light);
  }

  selectimage = floor(random(0, backgrounds.length));

  //create runner
  let runner = Runner.create();
  Runner.run(runner, engine);

  let options = {
    isStatic: true,
    timeScale: 1
  }

  setupMouseConstraint();
  setupBricks(options);
  setupBorders(options);
  setupBall();
  setupPaddle(options);
  setupCollisionEvents();
}


function setupMouseConstraint() {
  let mouse = Mouse.create(canvas.elt);
  let options = {
    mouse: mouse,
    constraint: {
      stiffness: 0.2
    }
  };
  mouseConstraint = MouseConstraint.create(engine, options);
  World.add(world, mouseConstraint);
}

function setupBricks(options) {
  let box_;
  for (let i = 130; i < width - 100; i = i + 60) {
    for (let j = 70; j < 200; j = j + 60) {
      box_ = new Box(i, j, 30, 20, options, boxesImg);
      boxes.push(box_);
    }
  }
}

function setupBorders(options) {
  let box_;
  box_ = new Box(width / 2, -20, width, 60, options, boxesImg);
  boxes.push(box_);
  box_ = new Box(-20, height / 2, 60, height - 20, options, boxesImg);
  boxes.push(box_);
  box_ = new Box(width / 2, height + 20, width, 60, options, boxesImg);
  boxes.push(box_);
  box_ = new Box(width + 20, height / 2, 60, height - 20, options, boxesImg);
  boxes.push(box_);
}

function setupBall() {
  let ball_;
  var options = {
    timeScale: 1
  }
  ball_ = new Ball(width / 2, height / 2, 8, options, ballsImg);
  MyBody.setVelocity(ball_.body, { x: 3, y: 3 }); // Changed Body to MyBody
  ball_.body.friction = 0.001;
  ball_.body.frictionAir = 0;
  ball_.body.restitution = 1;
  balls.push(ball_);
}

function setupPaddle(options) {
  var options = {
    isStatic: false,
    timeScale: 1,
    friction: 0.001,
    restitution: 1
  }
  let mouseConstraint = MouseConstraint.create(engine, {
    constraint: {
      render: { visible: false },
      stiffness: 0.8
    }
  });
  paddle = new Paddle(width / 2, height - 100, 130, 40, options, dioptres, mouseConstraint);
}


function setupCollisionEvents() {
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


// Breakout
// **************************************


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function draw() {
  updateDioptres();

  background(0);

  // Gérer la vitesse de la balle
  let vx, vy, v;
  vx = balls[0].getVX();
  vy = balls[0].getVY();
  v = sqrt(vx * vx + vy * vy);
  if (v > 10) { vx = vx * 0.9; vy = vy * 0.9; }
  if (v < 3) { vx = vx * 1.2; vy = vy * 1.2; }
  MyBody.setVelocity(balls[0].body, { x: vx, y: vy });

  if (boxes.length === 1) {
    // Recrée les briques
    let options = {
      isStatic: true,
      timeScale: 1
    }
    setupBricks(options);
  }

  lights[0].update(balls[0].getX(), balls[0].getY());


  drawBoxes();
  drawBalls();
  drawPaddle();
  drawLights();

  Engine.update(engine);
}

function updateDioptres() {
  resetDioptres();
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].pushDioptres();
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
function drawPaddle() {
  paddle.pushDioptres();
  paddle.show();
}
