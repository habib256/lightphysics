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
    this.end = this.pos; // J'initialise un rayon à sa source pour éviter les undefined
  }

  lookAt(x, y) {
    this.dir.x = x - this.pos.x;
    this.dir.y = y - this.pos.y;
    this.dir.normalize();
  }

  updateColor(color) {
    this.color = color;
  }

  update(end) {
    this.end = end;
  }

  show() {
    stroke(255,0,0,255);
    line(this.pos.x,this.pos.y, this.end.x, this.end.y);
    let midX = (this.pos.x + this.end.x) / 2;
      let midY = (this.pos.y + this.end.y) / 2;
      let dx = this.end.x - this.pos.x;
      let dy = this.end.y - this.pos.y;
      let angle = Math.atan2(dy, dx);
      let arrowSize = 2;
      push();
      translate(midX, midY);
      rotate(angle);
      line(0, 0, -arrowSize, -arrowSize);
      line(0, 0, -arrowSize, arrowSize);
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
          this.end = closest;
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
