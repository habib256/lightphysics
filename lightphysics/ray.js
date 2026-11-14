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
    const count = dioptreCount !== undefined ? dioptreCount : dioptres.length;
    this._commencer();
    for (let i = 0; i < count; i++) {
      this._tester(dioptres[i], i);
    }
  }

  calculateIntersectionWithGrid(dioptres, grid) {
    this._commencer();
    const indices = grid.getDioptresForRay(this.pos.x, this.pos.y, this.dir.x, this.dir.y);
    for (let i = 0; i < indices.length; i++) {
      this._tester(dioptres[indices[i]], indices[i]);
    }
  }

  _commencer() {
    this._record = Infinity;
    this.end.x = this.pos.x;
    this.end.y = this.pos.y;
    this.hitDioptreIndex = -1;
  }

  // Garde le point d'impact le plus proche de la source.
  _tester(surface, index) {
    const posX = this.pos.x;
    const posY = this.pos.y;
    const dirX = this.dir.x;
    const dirY = this.dir.y;
    let ptX, ptY;

    if (surface.r > 0) {
      // Cercle : P = O + t·d avec |P − C| = r, on garde la plus petite racine t > 0
      // (la sortie du cercle si la source est à l'intérieur, comme avec les segments).
      const fx = posX - surface.ax;
      const fy = posY - surface.ay;
      const a = dirX * dirX + dirY * dirY;
      const b = fx * dirX + fy * dirY;
      const c = fx * fx + fy * fy - surface.r * surface.r;
      const disc = b * b - a * c;
      if (disc < 0) return;
      const racine = Math.sqrt(disc);
      let t = (-b - racine) / a;
      if (t <= 0) t = (-b + racine) / a;
      if (t <= 0) return;
      ptX = posX + t * dirX;
      ptY = posY + t * dirY;
    } else {
      const x1 = surface.ax;
      const y1 = surface.ay;
      const x2 = surface.bx;
      const y2 = surface.by;
      // Droite du rayon : (x3, y3) = source, (x4, y4) = source + direction
      const den = (x1 - x2) * (-dirY) - (y1 - y2) * (-dirX);
      if (Math.abs(den) < 1e-10) return;
      const t = ((x1 - posX) * (-dirY) - (y1 - posY) * (-dirX)) / den;
      const u = -((x1 - x2) * (y1 - posY) - (y1 - y2) * (x1 - posX)) / den;
      if (!(t > 0 && t < 1 && u > 0)) return;
      ptX = x1 + t * (x2 - x1);
      ptY = y1 + t * (y2 - y1);
    }

    const dx = ptX - posX;
    const dy = ptY - posY;
    const dSq = dx * dx + dy * dy;
    if (dSq < this._record) {
      this._record = dSq;
      this.end.x = ptX;
      this.end.y = ptY;
      this.hitDioptreIndex = index;
    }
  }
}
