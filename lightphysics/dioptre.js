// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html


// Une surface qui arrête la lumière : un segment [A, B] (r = 0),
// ou un cercle de centre A et de rayon r (ballon).
class Dioptre {
  constructor(x1, y1, x2, y2) {
    this.set(x1, y1, x2, y2);
  }

  set(x1, y1, x2, y2) {
    this.ax = x1;
    this.ay = y1;
    this.bx = x2;
    this.by = y2;
    this.r = 0;
  }

  // Cercle exact : un seul test d'intersection au lieu de 30 segments.
  setCercle(cx, cy, r) {
    this.ax = cx;
    this.ay = cy;
    this.bx = cx;
    this.by = cy;
    this.r = r;
  }

  show() {
    strokeWeight(1);
    stroke(100);
    if (this.r > 0) {
      noFill();
      circle(this.ax, this.ay, 2 * this.r);
    } else {
      line(this.ax, this.ay, this.bx, this.by);
    }
  }
}
