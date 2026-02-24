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
  MyBody = Matter.Body,
  MouseConstraint = Matter.MouseConstraint,
  Mouse = Matter.Mouse;

let engine;
let world;

let boxes = [];
let boxesImg = [];
let balls = [];
let ballsImg = [];
let paddle;

let dioptres = [];
let lights = [];
let backgrounds = [];

let songs = [];
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
  songs.push(loadSound('music/rebond.wav'));
  songs.push(loadSound('music/rebond2.wav'));
  songs.push(loadSound('music/rebond3.wav'));
}

function setup() {
  createCanvas(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  spatialGrid = new SpatialGrid(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.GRID_CELL_SIZE);

  lights.push(new Light(width / 2, height / 2, color(255, 255, 255, 64), dioptres));

  for (let i = 0; i < 4; i++) {
    lights.push(new Light((width / 4) * (4 - i), 10, color(255, 255, 255, 50), dioptres));
  }

  const runner = Runner.create();
  Runner.run(runner, engine);

  const options = {
    isStatic: true,
    timeScale: 1
  };

  setupMouseConstraint();
  setupBricks(options);
  setupBorders(options);
  setupBall();
  setupPaddle();
  setupCollisionEvents();
}


function setupMouseConstraint() {
  const mouse = Mouse.create(canvas.elt);
  const options = {
    mouse: mouse,
    constraint: {
      stiffness: 0.2
    }
  };
  const mouseConstraint = MouseConstraint.create(engine, options);
  World.add(world, mouseConstraint);
}

function setupBricks(options) {
  for (let i = 130; i < width - 100; i = i + 60) {
    for (let j = 70; j < 200; j = j + 60) {
      boxes.push(new Box(i, j, 30, 20, options, boxesImg));
    }
  }
}

function setupBorders(options) {
  boxes.push(new Box(width / 2, -20, width, 60, options, boxesImg));
  boxes.push(new Box(-20, height / 2, 60, height - 20, options, boxesImg));
  boxes.push(new Box(width / 2, height + 20, width, 60, options, boxesImg));
  boxes.push(new Box(width + 20, height / 2, 60, height - 20, options, boxesImg));
}

function setupBall() {
  const options = {
    timeScale: 1
  };
  const ball = new Ball(width / 2, height / 2, CONFIG.BREAKOUT_BALL_RADIUS, options, ballsImg);
  MyBody.setVelocity(ball.body, { x: CONFIG.BREAKOUT_BALL_VELOCITY, y: CONFIG.BREAKOUT_BALL_VELOCITY });
  ball.body.friction = 0.001;
  ball.body.frictionAir = 0;
  ball.body.restitution = 1;
  balls.push(ball);
}

function setupPaddle() {
  const options = {
    isStatic: false,
    timeScale: 1,
    friction: 0.001,
    restitution: 1
  };
  const mouseConstraint = MouseConstraint.create(engine, {
    constraint: {
      render: { visible: false },
      stiffness: 0.8
    }
  });
  paddle = new Paddle(width / 2, height - 100, 130, 40, options, mouseConstraint);
}


function setupCollisionEvents() {
  Matter.Events.on(engine, 'collisionEnd', ({ pairs }) => {
    pairs.forEach(({ bodyA, bodyB }) => {
      let id;
      if (bodyA.id === balls[0].body.id) {
        id = bodyB.id;
      } else {
        id = bodyA.id;
      }
      for (let i = 0; i < boxes.length - 4; i++) {
        if (id === boxes[i].body.id) {
          if (random(0, 1) > CONFIG.LIGHT_SPAWN_PROBABILITY) {
            const newcolor = color(random(255), random(255), random(255));
            newcolor.setAlpha(50);
            lights.push(new Light(boxes[i].body.position.x, boxes[i].body.position.y, newcolor, dioptres));
          }
          boxes[i].removeFromWorld();
          boxes.splice(i, 1);
          i--;
        }
      }
    });
  });
}


function draw() {
  updateDioptres();

  background(0);

  let vx = balls[0].getVX();
  let vy = balls[0].getVY();
  const v = sqrt(vx * vx + vy * vy);
  if (v > CONFIG.BALL_SPEED_MAX) { vx = vx * CONFIG.VELOCITY_DAMPING; vy = vy * CONFIG.VELOCITY_DAMPING; }
  if (v < CONFIG.BALL_SPEED_MIN) { vx = vx * CONFIG.VELOCITY_BOOST; vy = vy * CONFIG.VELOCITY_BOOST; }
  MyBody.setVelocity(balls[0].body, { x: vx, y: vy });

  if (boxes.length === 1) {
    const options = {
      isStatic: true,
      timeScale: 1
    };
    setupBricks(options);
  }

  lights[0].update(balls[0].getX(), balls[0].getY());

  drawBoxes();
  drawBalls();
  drawPaddle();
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
  paddle.pushDioptres();
  spatialGrid.updateMaxDioptres(dioptreCount);
  spatialGrid.build(dioptres, dioptreCount);
  for (const light of lights) {
    light.grid = spatialGrid;
  }
}

function drawBoxes() {
  for (let i = boxes.length - 1; i >= 0; i--) {
    if (boxes[i].isOffScreen()) {
      boxes[i].removeFromWorld();
      boxes.splice(i, 1);
    } else {
      boxes[i].show();
    }
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
  paddle.show();
}
