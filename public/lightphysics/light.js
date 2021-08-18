// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html


class Light {
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.color = color;
    this.rays = [];
    this.closests = [];
  }

  update(x, y) {
    this.pos.set(x, y);
  }
  updateColor(color) {
    this.color = color;
    for (let ray of this.rays) {
      ray.updateColor(color);
    }
  }

  basicRays() {
    this.rays = [];
    for (let a = 0; a < 360; a += 1) {
      this.rays.push(new Ray(this.pos, radians(a)));
    }
  }

  compareNumbers(a, b) {
    return a - b;
  }

  bestRays(dioptres) {
    let bestAngles = [];
    let bestangle1, bestangle2;
    let v1, v2;
    let precision = 0.001;
    for (let i = 0; i < dioptres.length; i++) {

      v1 = new p5.Vector((dioptres[i].a.x - this.pos.x), (dioptres[i].a.y - this.pos.y));
      v2 = new p5.Vector((dioptres[i].b.x - this.pos.x), (dioptres[i].b.y - this.pos.y));

      bestangle1 = v1.heading();
      bestangle2 = v2.heading();

      bestAngles.push(bestangle1 - precision);
      bestAngles.push(bestangle1);
      bestAngles.push(bestangle1 + precision);

      bestAngles.push(bestangle2 - precision);
      bestAngles.push(bestangle2);
      bestAngles.push(bestangle2 + precision);
    }
    bestAngles.sort(this.compareNumbers);

    this.rays = [];
    for (let angle of bestAngles) {
      this.rays.push(new Ray(this.pos, angle));
    }
  }

  look(dioptres) {
    this.closests = [];
    this.dioptreNbrs = [];
    // Lancer de rayons pour trouver l'intersection la plus proche
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      let closest = null;
      let dioptreNbr = null;
      let record = Infinity;
      for (let j = 0; j < dioptres.length; j++) {
        const pt = ray.cast(dioptres[j]);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record) {
            record = d;
            closest = pt;
            dioptreNbr = j;
          }
        }
      }
      if (closest) {
        // C'est le point le plus près. On le stocke
        this.closests.push(closest);
        this.dioptreNbrs.push(dioptreNbr);
      }
    }
    let u, v;
    for (let i = 2; i < this.closests.length; i++) {
      // Tester la colinéarité pour virer les points inutiles
      u = {
        x: (this.closests[i - 1].x - this.closests[i - 2].x),
        y: (this.closests[i - 1].y - this.closests[i - 2].y)
      };
      v = {
        x: (this.closests[i].x - this.closests[i - 1].x),
        y: (this.closests[i].y - this.closests[i - 1].y)
      };
      if (u.x*v.y-v.x*u.y == 0) {
        this.closests.splice(i-1, 1);
        this.dioptreNbrs.splice(i-1, 1);
        i--;
      }
    }
  }

  renderRays() {
    strokeWeight(0.1);
    stroke(this.color);
    for (let i = 0; i < this.closests.length; i++) {
      line(this.pos.x, this.pos.y, this.closests[i].x, this.closests[i].y);
    }
  }

  renderLighted() {
    push();
    let c = this.color;
    c.setAlpha(100);
    strokeWeight(4);
    stroke(c);
    let px = this.closests[0].x;
    let py = this.closests[0].y;
    for (let i = 1; i < this.closests.length; i++) {
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
    pop();
  }

  renderPolygon() {
    push();
    noStroke();
    fill(this.color);
    beginShape();
    for (let i = 0; i < this.closests.length; i++) {
      vertex(this.closests[i].x, this.closests[i].y);
    }
    vertex(this.closests[0].x, this.closests[0].y);
    endShape(CLOSE);
    pop();
  }

  show() {
    this.bestRays(dioptres);
    this.look(dioptres);
    this.renderPolygon();
    //this.renderLighted();
  }
  showLighted() {
    this.renderLighted();
  }
}
