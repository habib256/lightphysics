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
    this.end = { x: pos.x, y: pos.y };
    this.hitDioptreIndex = -1;
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
    stroke(255, 0, 0, 255);
    line(this.pos.x, this.pos.y, this.end.x, this.end.y);
    const midX = (this.pos.x + this.end.x) / 2;
    const midY = (this.pos.y + this.end.y) / 2;
    const dx = this.end.x - this.pos.x;
    const dy = this.end.y - this.pos.y;
    const angle = Math.atan2(dy, dx);
    const arrowSize = 2;
    push();
    translate(midX, midY);
    rotate(angle);
    line(0, 0, -arrowSize, -arrowSize);
    line(0, 0, -arrowSize, arrowSize);
    pop();
  }

  calculateIntersection(dioptres, dioptreCount) {
    let record = Infinity;
    const posX = this.pos.x;
    const posY = this.pos.y;
    const dirX = this.dir.x;
    const dirY = this.dir.y;
    const x3 = posX;
    const y3 = posY;
    const x4 = posX + dirX;
    const y4 = posY + dirY;
    const count = dioptreCount !== undefined ? dioptreCount : dioptres.length;

    this.end.x = posX;
    this.end.y = posY;
    this.hitDioptreIndex = -1;

    for (let i = 0; i < count; i++) {
      const surface = dioptres[i];
      const x1 = surface.ax;
      const y1 = surface.ay;
      const x2 = surface.bx;
      const y2 = surface.by;

      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-10) {
        continue;
      }

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
      if (t > 0 && t < 1 && u > 0) {
        const ptX = x1 + t * (x2 - x1);
        const ptY = y1 + t * (y2 - y1);
        const dx = ptX - posX;
        const dy = ptY - posY;
        const dSq = dx * dx + dy * dy;
        if (dSq < record) {
          record = dSq;
          this.end.x = ptX;
          this.end.y = ptY;
          this.hitDioptreIndex = i;
        }
      }
    }
  }

  calculateIntersectionWithGrid(dioptres, grid) {
    let record = Infinity;
    const posX = this.pos.x;
    const posY = this.pos.y;
    const dirX = this.dir.x;
    const dirY = this.dir.y;
    const x3 = posX;
    const y3 = posY;
    const x4 = posX + dirX;
    const y4 = posY + dirY;

    this.end.x = posX;
    this.end.y = posY;
    this.hitDioptreIndex = -1;

    const indices = grid.getDioptresForRay(posX, posY, dirX, dirY);

    for (let i = 0; i < indices.length; i++) {
      const surface = dioptres[indices[i]];
      const x1 = surface.ax;
      const y1 = surface.ay;
      const x2 = surface.bx;
      const y2 = surface.by;

      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-10) {
        continue;
      }

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
      if (t > 0 && t < 1 && u > 0) {
        const ptX = x1 + t * (x2 - x1);
        const ptY = y1 + t * (y2 - y1);
        const dx = ptX - posX;
        const dy = ptY - posY;
        const dSq = dx * dx + dy * dy;
        if (dSq < record) {
          record = dSq;
          this.end.x = ptX;
          this.end.y = ptY;
          this.hitDioptreIndex = indices[i];
        }
      }
    }
  }
}
