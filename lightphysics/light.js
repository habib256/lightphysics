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
    this.refractedPolygons = [];
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

    // Draw refracted light polygons
    this.drawRefractedPolygons();

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

  closeGroup(group) {
    if (group && group.count >= 2) {
      this.finalizePolygonGroup(group);
      this.refractedPolygons.push(group);
    }
  }

  addBoundaryRay(dioptreIdx, endpointX, endpointY, colorIdx, group) {
    // Direction from light source to dioptre endpoint
    const dirX = endpointX - this.pos.x;
    const dirY = endpointY - this.pos.y;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dirLen < 1e-8) return;
    const nDirX = dirX / dirLen;
    const nDirY = dirY / dirLen;

    // Compute surface normal of the dioptre
    const d = dioptres[dioptreIdx];
    const edgeDx = d.bx - d.ax;
    const edgeDy = d.by - d.ay;
    const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
    if (edgeLen < 1e-8) return;

    let nx = -edgeDy / edgeLen;
    let ny = edgeDx / edgeLen;

    // Ensure normal faces against the incoming direction
    const dot = nDirX * nx + nDirY * ny;
    if (dot > 0) { nx = -nx; ny = -ny; }

    const cosI = -(nDirX * nx + nDirY * ny);
    if (cosI <= 0) return;

    // Snell's law: air to glass
    const ratio = 1.0 / colorIdx.n;
    const sinT2 = ratio * ratio * (1.0 - cosI * cosI);
    if (sinT2 > 1.0) return; // Total internal reflection

    const cosT = Math.sqrt(1.0 - sinT2);

    // Schlick's approximation for Fresnel transmission
    const r0 = ((1.0 - colorIdx.n) / (1.0 + colorIdx.n)) ** 2;
    const fresnel = r0 + (1.0 - r0) * ((1.0 - cosI) ** 5);
    const beamIntensity = colorIdx.intensity * (1.0 - fresnel);

    // Refracted direction
    const refDirX = ratio * nDirX + (ratio * cosI - cosT) * nx;
    const refDirY = ratio * nDirY + (ratio * cosI - cosT) * ny;
    const rLen = Math.sqrt(refDirX * refDirX + refDirY * refDirY);
    if (rLen < 1e-10) return;

    const normRefDirX = refDirX / rLen;
    const normRefDirY = refDirY / rLen;

    // Offset origin slightly inside the glass to avoid self-intersection
    const originX = endpointX + normRefDirX * 0.5;
    const originY = endpointY + normRefDirY * 0.5;

    this.castRefractedBeamForPolygon(
      originX, originY, normRefDirX, normRefDirY,
      endpointX, endpointY,
      colorIdx.n, 0, beamIntensity,
      group
    );
  }

  closeGroupWithTrailingBoundary(group, dioptreIdx, lastHitX, lastHitY, colorIdx) {
    if (group === null) return;

    if (dioptreIdx >= 0) {
      const d = dioptres[dioptreIdx];
      // Use the endpoint opposite to the leading boundary
      let epX, epY;
      if (group.leadingIsA) {
        epX = d.bx; epY = d.by;
      } else {
        epX = d.ax; epY = d.ay;
      }

      const gapSq = (lastHitX - epX) * (lastHitX - epX) + (lastHitY - epY) * (lastHitY - epY);
      if (gapSq > CONFIG.BOUNDARY_RAY_MIN_GAP * CONFIG.BOUNDARY_RAY_MIN_GAP) {
        this.addBoundaryRay(dioptreIdx, epX, epY, colorIdx, group);
      }
    }

    this.closeGroup(group);
  }

  computeRefractedRays() {
    this.refractedPolygons.length = 0;

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

    // Per-channel active polygon groups and tracking
    const currentGroups = [null, null, null];
    const lastDioptre = [-1, -1, -1];
    const lastHitX = [0, 0, 0];
    const lastHitY = [0, 0, 0];

    for (const ray of this.rays) {
      if (ray.hitGlassDioptreIndex < 0) {
        // No glass hit: close all active groups with trailing boundary
        for (let c = 0; c < 3; c++) {
          this.closeGroupWithTrailingBoundary(
            currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], colorIndices[c]
          );
          currentGroups[c] = null;
          lastDioptre[c] = -1;
        }
        continue;
      }

      const hitDioptre = dioptres[ray.hitGlassDioptreIndex];

      // Compute surface normal of the hit dioptre
      const edgeDx = hitDioptre.bx - hitDioptre.ax;
      const edgeDy = hitDioptre.by - hitDioptre.ay;
      const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
      if (edgeLen < 1e-8) {
        for (let c = 0; c < 3; c++) {
          this.closeGroupWithTrailingBoundary(
            currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], colorIndices[c]
          );
          currentGroups[c] = null;
          lastDioptre[c] = -1;
        }
        continue;
      }

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

      for (let c = 0; c < 3; c++) {
        const idx = colorIndices[c];

        // If dioptre changed, close previous group with trailing boundary and start fresh
        if (ray.hitGlassDioptreIndex !== lastDioptre[c] && currentGroups[c] !== null) {
          this.closeGroupWithTrailingBoundary(
            currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], idx
          );
          currentGroups[c] = null;
        }
        lastDioptre[c] = ray.hitGlassDioptreIndex;

        const ratio = 1.0 / idx.n; // air to glass
        const sinT2 = ratio * ratio * (1.0 - cosI * cosI);

        // Total internal reflection: close the group for this channel
        if (sinT2 > 1.0) {
          this.closeGroupWithTrailingBoundary(
            currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], idx
          );
          currentGroups[c] = null;
          lastDioptre[c] = -1;
          continue;
        }

        const cosT = Math.sqrt(1.0 - sinT2);

        // Schlick's approximation for Fresnel transmission
        const r0 = ((1.0 - idx.n) / (1.0 + idx.n)) ** 2;
        const fresnel = r0 + (1.0 - r0) * ((1.0 - cosI) ** 5);
        const beamIntensity = idx.intensity * (1.0 - fresnel);

        // Snell's law refracted direction
        const refDirX = ratio * ray.dir.x + (ratio * cosI - cosT) * nx;
        const refDirY = ratio * ray.dir.y + (ratio * cosI - cosT) * ny;

        const rLen = Math.sqrt(refDirX * refDirX + refDirY * refDirY);
        if (rLen < 1e-10) {
          this.closeGroupWithTrailingBoundary(
            currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], idx
          );
          currentGroups[c] = null;
          lastDioptre[c] = -1;
          continue;
        }
        const normRefDirX = refDirX / rLen;
        const normRefDirY = refDirY / rLen;

        // Offset origin slightly to avoid self-intersection
        const originX = ray.glassEnd.x + normRefDirX * 0.5;
        const originY = ray.glassEnd.y + normRefDirY * 0.5;

        // Create group if needed, with leading boundary ray
        if (currentGroups[c] === null) {
          currentGroups[c] = {
            r: idx.r, g: idx.g, b: idx.b,
            intensity: 0,
            count: 0,
            entryPoints: [],
            exitPoints: [],
            centroidX: 0, centroidY: 0,
            maxDist: 0,
            leadingIsA: true
          };

          // Determine which endpoint is closest to the first hit point
          const d = hitDioptre;
          const distA = (ray.glassEnd.x - d.ax) * (ray.glassEnd.x - d.ax) + (ray.glassEnd.y - d.ay) * (ray.glassEnd.y - d.ay);
          const distB = (ray.glassEnd.x - d.bx) * (ray.glassEnd.x - d.bx) + (ray.glassEnd.y - d.by) * (ray.glassEnd.y - d.by);

          let leadEpX, leadEpY;
          if (distA <= distB) {
            leadEpX = d.ax; leadEpY = d.ay;
            currentGroups[c].leadingIsA = true;
          } else {
            leadEpX = d.bx; leadEpY = d.by;
            currentGroups[c].leadingIsA = false;
          }

          const gapSq = Math.min(distA, distB);
          if (gapSq > CONFIG.BOUNDARY_RAY_MIN_GAP * CONFIG.BOUNDARY_RAY_MIN_GAP) {
            this.addBoundaryRay(ray.hitGlassDioptreIndex, leadEpX, leadEpY, idx, currentGroups[c]);
          }
        }

        // Trace refracted beam and collect terminal points into the group
        this.castRefractedBeamForPolygon(
          originX, originY, normRefDirX, normRefDirY,
          ray.glassEnd.x, ray.glassEnd.y,
          idx.n, 0, beamIntensity,
          currentGroups[c]
        );

        // Track last hit point for trailing boundary
        lastHitX[c] = ray.glassEnd.x;
        lastHitY[c] = ray.glassEnd.y;
      }
    }

    // Close any remaining open groups with trailing boundary
    for (let c = 0; c < 3; c++) {
      this.closeGroupWithTrailingBoundary(
        currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], colorIndices[c]
      );
    }
  }

  castRefractedBeamForPolygon(originX, originY, dirX, dirY, drawFromX, drawFromY, refractiveIndex, depth, intensity, group, tirBounces = 0, inGlass = true) {
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

      if (t > 0 && t < 1 && u > 0) {
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

    // Beer-Lambert absorption: attenuate based on distance traveled through glass
    if (inGlass) {
      const segDist = Math.sqrt(record);
      intensity *= Math.exp(-CONFIG.GLASS_ABSORPTION_COEFF * segDist);
    }

    // Check if this beam will recurse (hit another glass surface)
    const willRecurse = (bestDioptreIdx >= 0 && depth < CONFIG.MAX_REFRACTION_DEPTH
        && dioptres[bestDioptreIdx].isGlass);

    if (!willRecurse) {
      // Terminal segment: add entry/exit points to polygon group
      group.entryPoints.push({ x: drawFromX, y: drawFromY });
      group.exitPoints.push({ x: bestX, y: bestY });
      group.intensity += intensity;
      group.count++;
    }

    // If hit another glass surface and depth allows, refract again
    if (willRecurse) {
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

        // Snell's law ratio depends on current medium
        const ratio = inGlass ? refractiveIndex : (1.0 / refractiveIndex);
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
            this.castRefractedBeamForPolygon(
              exitOriginX, exitOriginY,
              refDirX / rLen, refDirY / rLen,
              bestX, bestY,
              refractiveIndex, depth + 1, exitIntensity,
              group, 0, !inGlass
            );
          } else {
            // Can't compute exit direction: treat as terminal
            group.entryPoints.push({ x: drawFromX, y: drawFromY });
            group.exitPoints.push({ x: bestX, y: bestY });
            group.intensity += intensity;
            group.count++;
          }
        } else {
          // Total internal reflection: reflect ray and continue bouncing inside glass
          if (tirBounces < CONFIG.MAX_TIR_BOUNCES && depth < CONFIG.MAX_REFRACTION_DEPTH) {
            const dotDN = dirX * nx + dirY * ny;
            const reflDirX = dirX - 2.0 * dotDN * nx;
            const reflDirY = dirY - 2.0 * dotDN * ny;
            const reflLen = Math.sqrt(reflDirX * reflDirX + reflDirY * reflDirY);
            if (reflLen > 1e-10) {
              const nReflX = reflDirX / reflLen;
              const nReflY = reflDirY / reflLen;
              const reflOriginX = bestX + nReflX * 0.5;
              const reflOriginY = bestY + nReflY * 0.5;
              this.castRefractedBeamForPolygon(
                reflOriginX, reflOriginY,
                nReflX, nReflY,
                bestX, bestY,
                refractiveIndex, depth + 1, intensity,
                group, tirBounces + 1
              );
            } else {
              group.entryPoints.push({ x: drawFromX, y: drawFromY });
              group.exitPoints.push({ x: bestX, y: bestY });
              group.intensity += intensity;
              group.count++;
            }
          } else {
            // Depth or TIR bounce limit exhausted: treat as terminal
            group.entryPoints.push({ x: drawFromX, y: drawFromY });
            group.exitPoints.push({ x: bestX, y: bestY });
            group.intensity += intensity;
            group.count++;
          }
        }
      } else {
        // Degenerate dioptre: treat as terminal
        group.entryPoints.push({ x: drawFromX, y: drawFromY });
        group.exitPoints.push({ x: bestX, y: bestY });
        group.intensity += intensity;
        group.count++;
      }
    }
  }

  finalizePolygonGroup(group) {
    if (group.count === 0) return;

    // Average intensity
    group.intensity = group.intensity / group.count;

    // Compute centroid of entry points
    let cx = 0, cy = 0;
    for (const p of group.entryPoints) {
      cx += p.x;
      cy += p.y;
    }
    group.centroidX = cx / group.entryPoints.length;
    group.centroidY = cy / group.entryPoints.length;

    // Compute max distance from centroid to any exit point
    let maxDSq = 0;
    for (const p of group.exitPoints) {
      const dx = p.x - group.centroidX;
      const dy = p.y - group.centroidY;
      const dSq = dx * dx + dy * dy;
      if (dSq > maxDSq) maxDSq = dSq;
    }
    group.maxDist = Math.sqrt(maxDSq);
  }

  drawRefractedPolygons() {
    if (this.refractedPolygons.length === 0) return;

    const ctx = drawingContext;

    for (const group of this.refractedPolygons) {
      if (group.count < 2 || group.maxDist < 1) continue;

      const alphaVal = Math.min(group.intensity * CONFIG.REFRACTED_BEAM_INTENSITY_BOOST, 1.0);

      // Compute centroid of exit points for linear gradient direction
      let exitCX = 0, exitCY = 0;
      for (const p of group.exitPoints) {
        exitCX += p.x;
        exitCY += p.y;
      }
      exitCX /= group.exitPoints.length;
      exitCY /= group.exitPoints.length;

      // Linear gradient from entry centroid, through exit centroid, extending beyond
      const extF = CONFIG.GRADIENT_EXTEND_FACTOR;
      const gradEndX = group.centroidX + (exitCX - group.centroidX) * extF;
      const gradEndY = group.centroidY + (exitCY - group.centroidY) * extF;

      const gradient = ctx.createLinearGradient(
        group.centroidX, group.centroidY,
        gradEndX, gradEndY
      );
      gradient.addColorStop(0, `rgba(${group.r},${group.g},${group.b},${alphaVal * 0.3})`);
      gradient.addColorStop(0.3, `rgba(${group.r},${group.g},${group.b},${alphaVal})`);
      gradient.addColorStop(1, `rgba(${group.r},${group.g},${group.b},0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();

      // Traverse entry points forward (along the glass surface)
      const ep = group.entryPoints;
      const xp = group.exitPoints;

      ctx.moveTo(ep[0].x, ep[0].y);
      for (let i = 1; i < ep.length; i++) {
        ctx.lineTo(ep[i].x, ep[i].y);
      }

      // Traverse exit points in reverse (far boundary)
      for (let i = xp.length - 1; i >= 0; i--) {
        ctx.lineTo(xp[i].x, xp[i].y);
      }

      ctx.closePath();
      ctx.fill();
    }
  }
}
