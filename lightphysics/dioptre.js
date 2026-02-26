// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html


class Dioptre {
  constructor(x1, y1, x2, y2, isGlass) {
    this.ax = x1;
    this.ay = y1;
    this.bx = x2;
    this.by = y2;
    this.isGlass = isGlass || false;
  }

  set(x1, y1, x2, y2, isGlass) {
    this.ax = x1;
    this.ay = y1;
    this.bx = x2;
    this.by = y2;
    this.isGlass = isGlass || false;
  }

  show() {
    strokeWeight(1);
    stroke(this.isGlass ? 180 : 100);
    line(this.ax, this.ay, this.bx, this.by);
  }
}
