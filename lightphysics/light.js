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
    this.refractedSegments = [];
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

  updateColor(color) {
    this.color = color;
    for (const ray of this.rays) {
      ray.updateColor(color);
    }
  }

  show() {
    this.lookRayCollision();
    this.computeRefractedRays();

    // Compute max ray distance for gradient radius
    let maxDistSq = 0;
    for (const ray of this.rays) {
      const dx = ray.end.x - this.pos.x;
      const dy = ray.end.y - this.pos.y;
      const dSq = dx * dx + dy * dy;
      if (dSq > maxDistSq) maxDistSq = dSq;
    }
    const maxDist = Math.sqrt(maxDistSq);

    // Extract RGBA components
    const r = red(this.color);
    const g = green(this.color);
    const b = blue(this.color);
    const a = alpha(this.color) / 255;

    // Create radial gradient via native Canvas 2D API
    const ctx = drawingContext;
    const gradient = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, maxDist
    );
    gradient.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    // Draw light polygon with gradient fill
    ctx.fillStyle = gradient;
    noStroke();
    beginShape();
    for (const ray of this.rays) {
      vertex(ray.end.x, ray.end.y);
    }
    endShape(CLOSE);

    // Draw refracted colored rays
    this.drawRefractedRays();

    if (this.showRays) {
      this.renderBestRays();
    }
  }

  compareNumbers(a, b) {
    return a - b;
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

  computeRefractedRays() {
    this.refractedSegments.length = 0;

    // Derive refracted beam colors from source light (energy conservation)
    const srcR = red(this.color);
    const srcG = green(this.color);
    const srcB = blue(this.color);
    const srcA = alpha(this.color) / 255;

    const colorIndices = [
      { n: CONFIG.GLASS_REFRACTIVE_INDEX_R, r: srcR, g: 0, b: 0, intensity: srcA },
      { n: CONFIG.GLASS_REFRACTIVE_INDEX_G, r: 0, g: srcG, b: 0, intensity: srcA },
      { n: CONFIG.GLASS_REFRACTIVE_INDEX_B, r: 0, g: 0, b: srcB, intensity: srcA },
    ];

    for (const ray of this.rays) {
      if (ray.hitDioptreIndex < 0) continue;
      const hitDioptre = dioptres[ray.hitDioptreIndex];
      if (!hitDioptre.isGlass) continue;

      // Compute surface normal of the hit dioptre
      const edgeDx = hitDioptre.bx - hitDioptre.ax;
      const edgeDy = hitDioptre.by - hitDioptre.ay;
      const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
      if (edgeLen < 1e-8) continue;

      // Normal perpendicular to edge
      let nx = -edgeDy / edgeLen;
      let ny = edgeDx / edgeLen;

      // Ensure normal faces against the incoming ray
      const dot = ray.dir.x * nx + ray.dir.y * ny;
      if (dot > 0) {
        nx = -nx;
        ny = -ny;
      }

      const cosI = -(ray.dir.x * nx + ray.dir.y * ny);

      for (const idx of colorIndices) {
        const ratio = 1.0 / idx.n; // air to glass
        const sinT2 = ratio * ratio * (1.0 - cosI * cosI);

        // Total internal reflection check
        if (sinT2 > 1.0) continue;

        const cosT = Math.sqrt(1.0 - sinT2);

        // Schlick's approximation for Fresnel transmission
        const r0 = ((1.0 - idx.n) / (1.0 + idx.n)) ** 2;
        const fresnel = r0 + (1.0 - r0) * ((1.0 - cosI) ** 5);
        const beamIntensity = idx.intensity * (1.0 - fresnel);

        // Snell's law refracted direction
        const refDirX = ratio * ray.dir.x + (ratio * cosI - cosT) * nx;
        const refDirY = ratio * ray.dir.y + (ratio * cosI - cosT) * ny;

        const rLen = Math.sqrt(refDirX * refDirX + refDirY * refDirY);
        if (rLen < 1e-10) continue;
        const normRefDirX = refDirX / rLen;
        const normRefDirY = refDirY / rLen;

        // Offset origin slightly to avoid self-intersection
        const originX = ray.end.x + normRefDirX * 0.5;
        const originY = ray.end.y + normRefDirY * 0.5;

        this.castRefractedBeam(
          originX, originY, normRefDirX, normRefDirY,
          ray.end.x, ray.end.y,
          idx.r, idx.g, idx.b, idx.n, 0, beamIntensity
        );
      }
    }
  }

  castRefractedBeam(originX, originY, dirX, dirY, drawFromX, drawFromY, cr, cg, cb, refractiveIndex, depth, intensity) {
    // Find closest intersection
    let record = CONFIG.REFRACTED_RAY_MAX_LENGTH * CONFIG.REFRACTED_RAY_MAX_LENGTH;
    let bestX = originX + dirX * CONFIG.REFRACTED_RAY_MAX_LENGTH;
    let bestY = originY + dirY * CONFIG.REFRACTED_RAY_MAX_LENGTH;
    let bestDioptreIdx = -1;

    const x3 = originX;
    const y3 = originY;
    const x4 = originX + dirX;
    const y4 = originY + dirY;

    let candidateIndices = null;
    if (this.grid) {
      candidateIndices = this.grid.getDioptresForRay(originX, originY, dirX, dirY);
    }

    const count = candidateIndices ? candidateIndices.length : dioptreCount;

    for (let i = 0; i < count; i++) {
      const idx = candidateIndices ? candidateIndices[i] : i;
      const surface = dioptres[idx];
      const x1 = surface.ax;
      const y1 = surface.ay;
      const x2 = surface.bx;
      const y2 = surface.by;

      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-10) continue;

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

      if (t > 0 && t < 1 && u > 0.001) {
        const ptX = x1 + t * (x2 - x1);
        const ptY = y1 + t * (y2 - y1);
        const dx = ptX - originX;
        const dy = ptY - originY;
        const dSq = dx * dx + dy * dy;
        if (dSq < record) {
          record = dSq;
          bestX = ptX;
          bestY = ptY;
          bestDioptreIdx = idx;
        }
      }
    }

    // Store this segment for rendering
    this.refractedSegments.push({
      x1: drawFromX, y1: drawFromY,
      x2: bestX, y2: bestY,
      r: cr, g: cg, b: cb,
      intensity: intensity
    });

    // If hit another glass surface and depth allows, refract again
    if (bestDioptreIdx >= 0 && depth < CONFIG.MAX_REFRACTION_DEPTH
        && dioptres[bestDioptreIdx].isGlass) {
      const hitDioptre = dioptres[bestDioptreIdx];
      const edgeDx = hitDioptre.bx - hitDioptre.ax;
      const edgeDy = hitDioptre.by - hitDioptre.ay;
      const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
      if (edgeLen > 1e-8) {
        let nx = -edgeDy / edgeLen;
        let ny = edgeDx / edgeLen;
        const dot = dirX * nx + dirY * ny;
        if (dot > 0) { nx = -nx; ny = -ny; }
        const cosI = -(dirX * nx + dirY * ny);

        // Exiting glass: ratio = n_glass / n_air
        const ratio = refractiveIndex;
        const sinT2 = ratio * ratio * (1.0 - cosI * cosI);

        if (sinT2 <= 1.0) {
          const cosT = Math.sqrt(1.0 - sinT2);

          // Schlick's approximation for Fresnel transmission at exit
          const r0Exit = ((refractiveIndex - 1.0) / (refractiveIndex + 1.0)) ** 2;
          const fresnelExit = r0Exit + (1.0 - r0Exit) * ((1.0 - cosI) ** 5);
          const exitIntensity = intensity * (1.0 - fresnelExit);

          const refDirX = ratio * dirX + (ratio * cosI - cosT) * nx;
          const refDirY = ratio * dirY + (ratio * cosI - cosT) * ny;
          const rLen = Math.sqrt(refDirX * refDirX + refDirY * refDirY);
          if (rLen > 1e-10) {
            const exitOriginX = bestX + (refDirX / rLen) * 0.5;
            const exitOriginY = bestY + (refDirY / rLen) * 0.5;
            this.castRefractedBeam(
              exitOriginX, exitOriginY,
              refDirX / rLen, refDirY / rLen,
              bestX, bestY,
              cr, cg, cb, refractiveIndex, depth + 1, exitIntensity
            );
          }
        }
      }
    }
  }

  drawRefractedRays() {
    if (this.refractedSegments.length === 0) return;

    const ctx = drawingContext;

    for (const seg of this.refractedSegments) {
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;

      // Per-segment intensity with configurable boost, clamped to [0,1]
      const alphaVal = Math.min(seg.intensity * CONFIG.REFRACTED_BEAM_INTENSITY_BOOST, 1.0);
      const endAlphaVal = alphaVal * 0.3;

      // Perpendicular for beam width at endpoint
      const perpX = -dy / len * 10;
      const perpY = dx / len * 10;

      // Narrower width at start point
      const startPerpX = perpX * 0.3;
      const startPerpY = perpY * 0.3;

      // Draw as a ribbon (quad) with gradient that retains opacity at the end
      const gradient = ctx.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2);
      gradient.addColorStop(0, `rgba(${seg.r},${seg.g},${seg.b},${alphaVal})`);
      gradient.addColorStop(1, `rgba(${seg.r},${seg.g},${seg.b},${endAlphaVal})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(seg.x1 + startPerpX, seg.y1 + startPerpY);
      ctx.lineTo(seg.x2 + perpX, seg.y2 + perpY);
      ctx.lineTo(seg.x2 - perpX, seg.y2 - perpY);
      ctx.lineTo(seg.x1 - startPerpX, seg.y1 - startPerpY);
      ctx.closePath();
      ctx.fill();
    }
  }
}
