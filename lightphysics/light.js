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
    this.lightImg = createGraphics(width, height);
    this.showRays = false;
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

  generateBasicRays() {
    this.rays = [];
    for (let a = 0; a < 360; a += CONFIG.RAY_ANGLE_STEP) {
      this.rays.push(new Ray(this.pos, radians(a), this.color));
    }
  }

  show() {
    this.generateLightImg();
    image(this.lightImg, 0, 0);

    if (this.showRays) {
      this.renderBestRays();
    }
  }

  generateLightImg() {
    this.generateBasicRays();
    this.lookRayCollision();

    this.lightImg.clear();
    this.lightImg.push();
    this.lightImg.fill(this.color);
    this.lightImg.noStroke();
    this.lightImg.beginShape();
    for (const ray of this.rays) {
      this.lightImg.vertex(ray.end.x, ray.end.y);
    }
    this.lightImg.endShape(CLOSE);
    this.lightImg.pop();
  }

  compareNumbers(a, b) {
    return a - b;
  }

  lookRayCollision() {
    for (const ray of this.rays) {
      ray.calculateIntersection(dioptres);
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

  cleanBadRays() {
    const epsilon = 20;

    for (let i = 1; i < this.rays.length - 1; i++) {
      const prev = this.rays[i - 1];
      const current = this.rays[i];
      const next = this.rays[i + 1];

      const distPrev = Math.sqrt(Math.pow(current.end.x - prev.end.x, 2) + Math.pow(current.end.y - prev.end.y, 2));
      const distNext = Math.sqrt(Math.pow(current.end.x - next.end.x, 2) + Math.pow(current.end.y - next.end.y, 2));

      if (distPrev < epsilon || distNext < epsilon) {
        this.rays.splice(i, 1);
        i--;
      }
    }
    this.rays.splice(0, 1);
    this.rays.splice(this.rays.length - 1, 1);
  }

  renderLightPolygon() {
    fill(this.color);
    noStroke();

    beginShape();
    for (let i = 0; i < this.closests.length; i++) {
      vertex(this.closests[i].x, this.closests[i].y);
    }
    endShape(CLOSE);
  }

  renderLightPolygonLimits() {
    noFill();
    stroke(255, 255, 255, 128);

    let px = this.closests[0].x;
    let py = this.closests[0].y;
    for (let i = 0; i < this.closests.length; i++) {
      if (!((px === 0) || (py === 0) || (px === width) || (py === height))) {
        if (!((this.closests[i].x === 0) || (this.closests[i].y === 0) || (this.closests[i].x === width) || (this.closests[i].y === height))) {
          if (this.dioptreNbrs[i - 1] === this.dioptreNbrs[i]) {
            line(px, py, this.closests[i].x, this.closests[i].y);
          }
        }
      }
      px = this.closests[i].x;
      py = this.closests[i].y;
    }
  }
}
