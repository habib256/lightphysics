// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html


class Ray {
  constructor(pos, angle, color) {
    this.pos = pos;
    this.dir = p5.Vector.fromAngle(angle);
    this.color = color;
  }

  lookAt(x, y) {
    this.dir.x = x - this.pos.x;
    this.dir.y = y - this.pos.y;
    this.dir.normalize();
  }

  updateColor(color) {
    this.color = color;
  }
 show() {
    stroke(this.color);
    push();
    translate(this.pos.x, this.pos.y);
    line(0, 0, this.dir.x * 1000, this.dir.y * 1000);
    pop();
 }

 calculateIntersection(dioptres) {
  let closest = null;
  let record = Infinity;
  for (let dioptre of dioptres) {
    const pt = this.cast(dioptre);
    if (pt) {
      const d = p5.Vector.dist(this.pos, pt);
      if (d < record) {
        record = d;
        closest = pt;
      }
    }
  }
  return closest;
}

  cast(surface) {
    const x1 = surface.a.x;
    const y1 = surface.a.y;
    const x2 = surface.b.x;
    const y2 = surface.b.y;

    const x3 = this.pos.x;
    const y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den == 0) {
      return;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t > 0 && t < 1 && u > 0) {
      const pt = createVector();
      pt.x = x1 + t * (x2 - x1);
      pt.y = y1 + t * (y2 - y1);
      return pt;
    } else {
      return;
    }
  }
}
