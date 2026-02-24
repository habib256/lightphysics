// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html


class Light {
  constructor(x, y, color, dioptres) {
    this.pos = createVector(x, y);
    this.color = color;
    this.rays = [];
    this.dioptres = dioptres;
    this.showRays = false;
    this.grid = null;
    this.initRays();
  }

  initRays() {
    this.rays = [];
    for (let a = 0; a < 360; a += CONFIG.RAY_ANGLE_STEP) {
      this.rays.push(new Ray(this.pos, radians(a), this.color));
    }
  }

  update(x, y) {
    this.pos.set(x, y);
  }

  updateColor(color) {
    this.color = color;
    for (const ray of this.rays) {
      ray.updateColor(color);
    }
  }

  show() {
    this.lookRayCollision();

    fill(this.color);
    noStroke();
    beginShape();
    for (const ray of this.rays) {
      vertex(ray.end.x, ray.end.y);
    }
    endShape(CLOSE);

    if (this.showRays) {
      this.renderBestRays();
    }
  }

  compareNumbers(a, b) {
    return a - b;
  }

  lookRayCollision() {
    if (this.grid) {
      for (const ray of this.rays) {
        ray.calculateIntersectionWithGrid(dioptres, this.grid);
      }
    } else {
      for (const ray of this.rays) {
        ray.calculateIntersection(dioptres, dioptreCount);
      }
    }
  }

  renderRays() {
    for (const ray of this.rays) {
      ray.show();
    }
  }

  renderBestRays() {
    stroke(color(255, 0, 0, 255));
    for (const ray of this.rays) {
      ray.show();
    }
  }
}
