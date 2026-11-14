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
    this.showRays = false;
    this.grid = null;
    this.preparerCouleurs();
    this.initRays();
  }

  initRays() {
    this.rays = [];
    for (let a = 0; a < 360; a += CONFIG.RAY_ANGLE_STEP) {
      this.rays.push(new Ray(this.pos, radians(a), this.color));
    }
  }

  update(x, y) {
    this.pos.set(x, y);
  }

  // Couleurs du dégradé (centre, bord) préparées une fois, pas à chaque image.
  preparerCouleurs() {
    const r = red(this.color);
    const g = green(this.color);
    const b = blue(this.color);
    const a = alpha(this.color) / 255;
    this.couleurCentre = `rgba(${r},${g},${b},${a})`;
    this.couleurBord = `rgba(${r},${g},${b},0)`;
  }

  updateColor(color) {
    this.color = color;
    this.preparerCouleurs();
    for (const ray of this.rays) {
      ray.updateColor(color);
    }
  }

  show() {
    this.lookRayCollision();

    // Compute max ray distance for gradient radius
    let maxDistSq = 0;
    for (const ray of this.rays) {
      const dx = ray.end.x - this.pos.x;
      const dy = ray.end.y - this.pos.y;
      const dSq = dx * dx + dy * dy;
      if (dSq > maxDistSq) maxDistSq = dSq;
    }
    const maxDist = Math.sqrt(maxDistSq);

    // Create radial gradient via native Canvas 2D API
    const ctx = drawingContext;
    const gradient = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, maxDist
    );
    gradient.addColorStop(0, this.couleurCentre);
    gradient.addColorStop(1, this.couleurBord);

    // Polygone éclairé tracé directement (Canvas 2D), sans passer par beginShape/vertex de p5.
    const rays = this.rays;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(rays[0].end.x, rays[0].end.y);
    for (let i = 1; i < rays.length; i++) {
      ctx.lineTo(rays[i].end.x, rays[i].end.y);
    }
    ctx.closePath();
    ctx.fill();

    if (this.showRays) {
      this.renderBestRays();
    }
  }

  lookRayCollision() {
    if (this.grid) {
      for (const ray of this.rays) {
        ray.calculateIntersectionWithGrid(dioptres, this.grid);
      }
    } else {
      for (const ray of this.rays) {
        ray.calculateIntersection(dioptres, dioptreCount);
      }
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
}
