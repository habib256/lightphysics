// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html


class Light {
  constructor(x, y, color, dioptres) {
    this.pos = createVector(x, y); // Initialise la position de la lumière
    this.color = color; // Initialise la couleur de la lumière
    this.rays = []; // Initialise un tableau pour stocker les rayons de la lumière
    this.closests = []; // Initialise un tableau pour stocker les points d'intersection les plus proches
    this.dioptres = dioptres;
  }


  update(x, y) { // Met à jour la position de la lumière
    this.pos.set(x, y);
  }
  updateColor(color) { // Met à jour la couleur de la lumière
    this.color = color;
    for (let ray of this.rays) {
      ray.updateColor(color); // Met à jour la couleur de chaque rayon
    }
  }

  generateBasicRays() {
    this.rays = [];
    for (let a = 0; a < 360; a += 0.5) {
      this.rays.push(new Ray(this.pos, radians(a), this.color));
    }
  }

  compareNumbers(a, b) {
    return a - b;
  }

  lookRayCollision () {
    this.closests = [];
    this.dioptreNbrs = [];
    // Lancer de rayons pour trouver l'intersection la plus proche
    for (let ray of this.rays) {
      const pt = ray.calculateIntersection(dioptres);
      if (pt) {
        this.closests.push(pt);
      }
    }
    let u, v;
    let epsilon = 0.0001; // Choisissez une valeur appropriée pour votre cas
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
      if (Math.abs(u.x*v.y-v.x*u.y) < epsilon) {
        this.closests.splice(i-1, 1);
        this.dioptreNbrs.splice(i-1, 1);
        i--;
      }
    }
  }

  renderBestRays() {
    // Dessine le rayon de sa source à sa fin
    stroke(color(255,0,0,60));
    for (let i = 0; i < this.closests.length; i++) {
      line(this.pos.x, this.pos.y, this.closests[i].x, this.closests[i].y);
    }
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
    stroke(255,255,255,128);

    let px = this.closests[0].x;
    let py = this.closests[0].y;
    for (let i = 0; i < this.closests.length; i++) {
      if (!((px === 0) || (py === 0) || (px === width) || (py === height))) {
        if (!((this.closests[i].x === 0) || (this.closests[i].y === 0) || (this.closests[i].x === width) || (this.closests[i].y === height))) {
          if (this.dioptreNbrs[i - 1] === this.dioptreNbrs[i]) {
            // Ajout d'un éclairage aux bords des objets illuminés
            line(px, py, this.closests[i].x, this.closests[i].y);    
          }
        }
      }
      px = this.closests[i].x;
      py = this.closests[i].y;
    }
  }

  show() {
    this.generateBasicRays();
    this.lookRayCollision(dioptres);
    this.renderLightPolygon();
    //this.renderBestRays();
    this.renderLightPolygonLimits();
   
  }
}
