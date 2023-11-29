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
    this.dioptres = dioptres;
    this.lightImg = createGraphics(width, height);
    this.showRays = false;
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
    for (let a = 0; a < 360; a += 1) {
      this.rays.push(new Ray(this.pos, radians(a), this.color));
    }
  }

  show() {
    this.lightImg = this.generateLightImg();
    image(this.lightImg, 0, 0);

    if (this.showRays) {
      //this.renderRays();
      this.renderBestRays();
    }
    //this.renderLightPolygon();
    //this.renderLightPolygonLimits();

  }

  generateLightImg() {
    this.generateBasicRays();
    this.lookRayCollision(dioptres);

    this.lightImg.clear();
    this.lightImg.push();
    this.lightImg.fill(this.color);
    this.lightImg.noStroke();
    this.lightImg.beginShape();
     for (let ray of this.rays) {
      this.lightImg.vertex(ray.end.x, ray.end.y);
    }
    this.lightImg.endShape(CLOSE);
    this.lightImg.pop();
    return this.lightImg;
  }

  compareNumbers(a, b) {
    return a - b;
  }

  lookRayCollision() {
    // Lancer de rayons pour trouver l'intersection la plus proche
    for (let ray of this.rays) {
      const pt = ray.calculateIntersection(dioptres);
    }
  }

  renderRays() {
    for (let ray of this.rays) {
      ray.show();
    }
  }
  renderBestRays() {
    // Dessine les meilleurs rayons de leur source à leur fin
    this.cleanBadRays();
    stroke(color(255, 0, 0, 255));
    for (let ray of this.rays) {
      ray.show();
    }
  }

  cleanBadRays() {
    let epsilon = 15; // Choisissez une valeur appropriée pour votre cas
    for (let i = 1; i < this.rays.length - 1; i++) {
      let prev = this.rays[i - 1];
      let current = this.rays[i];
      let next = this.rays[i + 1];

      // Calculer la distance entre le rayon courant et les rayons précédent et suivant
      let distPrev = Math.sqrt(Math.pow(current.end.x - prev.end.x, 2) + Math.pow(current.end.y - prev.end.y, 2));
      let distNext = Math.sqrt(Math.pow(current.end.x - next.end.x, 2) + Math.pow(current.end.y - next.end.y, 2));

      // Si le rayon courant est très proche du rayon précédent ou suivant, le supprimer
      if (distPrev < epsilon || distNext < epsilon) {
        this.rays.splice(i, 1);
        i--; // Ajuster l'index après la suppression d'un élément
      }
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
    stroke(255, 255, 255, 128);

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
}
