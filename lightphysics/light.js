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

    // Draw light polygon with gradient fill, attenuating through glass
    ctx.fillStyle = gradient;
    noStroke();
    beginShape();
    for (const ray of this.rays) {
      // Dim vertices where ray passes through glass
      if (ray.glassShadow < 1.0) {
        ctx.fillStyle = gradient; // keep same gradient, shadow applied via separate pass
      }
      vertex(ray.end.x, ray.end.y);
    }
    endShape(CLOSE);

    // Draw shadow overlay where glass blocks light
    this._drawGlassShadow(r, g, b, a, maxDist);

    // Draw refracted light polygons
    this.drawRefractedPolygons();

    if (this.showRays) {
      this.renderBestRays();
    }
  }

  _drawGlassShadow(r, g, b, a, maxDist) {
    // Draw a darkened polygon for ray segments that pass through glass
    // This creates the shadow effect behind glass objects
    const ctx = drawingContext;
    let inShadow = false;
    let shadowStart = -1;

    for (let i = 0; i <= this.rays.length; i++) {
      const ray = this.rays[i % this.rays.length];
      const isShadowed = ray.glassShadow < 1.0;

      if (isShadowed && !inShadow) {
        shadowStart = i;
        inShadow = true;
      } else if ((!isShadowed || i === this.rays.length) && inShadow) {
        // Draw shadow polygon for this run of shadowed rays
        const shadowFactor = 1.0 - CONFIG.GLASS_SHADOW_FACTOR;
        const gradient2 = ctx.createRadialGradient(
          this.pos.x, this.pos.y, 0,
          this.pos.x, this.pos.y, maxDist
        );
        gradient2.addColorStop(0, `rgba(0,0,0,${a * shadowFactor})`);
        gradient2.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = gradient2;

        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        for (let j = shadowStart; j < i; j++) {
          const sr = this.rays[j % this.rays.length];
          ctx.lineTo(sr.end.x, sr.end.y);
        }
        ctx.closePath();
        ctx.fill();

        inShadow = false;
      }
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

  closeGroup(group) {
    if (group && group.count >= 1) {
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

    // Snell's law: air to glass (n1=1, n2=n)
    const ratio = 1.0 / colorIdx.n;
    const sinT2 = ratio * ratio * (1.0 - cosI * cosI);
    if (sinT2 > 1.0) return;

    const cosT = Math.sqrt(1.0 - sinT2);

    // No Fresnel reflection on glass — full intensity transmitted
    const beamIntensity = colorIdx.intensity;

    if (beamIntensity < CONFIG.MIN_REFRACTED_INTENSITY) return;

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
      group, 0, true, dioptreIdx, colorIdx.absorption
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

  _buildColorIndices() {
    const srcR = red(this.color);
    const srcG = green(this.color);
    const srcB = blue(this.color);
    const srcA = alpha(this.color) / 255;
    // Normalize source color to get per-channel weight
    const srcMax = Math.max(srcR, srcG, srcB, 1);

    const indices = [];
    const wavelengths = CONFIG.SPECTRUM_WAVELENGTHS;
    const colors = CONFIG.SPECTRUM_COLORS;
    const refIndices = CONFIG.SPECTRUM_INDICES;
    const absorptions = CONFIG.SPECTRUM_ABSORPTIONS;

    for (let i = 0; i < wavelengths.length; i++) {
      const [wr, wg, wb] = colors[i];
      // Scale spectral color by light source color
      const cr = Math.round(wr * srcR / 255);
      const cg = Math.round(wg * srcG / 255);
      const cb = Math.round(wb * srcB / 255);
      if (cr + cg + cb <= 0) continue;

      indices.push({
        n: refIndices[i],
        r: cr, g: cg, b: cb,
        intensity: srcA,
        absorption: absorptions[i],
        wavelength: wavelengths[i]
      });
    }
    return indices;
  }

  computeRefractedRays() {
    this.refractedPolygons.length = 0;

    const colorIndices = this._buildColorIndices();
    const numChannels = colorIndices.length;
    if (numChannels === 0) return;

    // Per-channel active polygon groups and tracking
    const currentGroups = new Array(numChannels).fill(null);
    const lastDioptre = new Array(numChannels).fill(-1);
    const lastHitX = new Array(numChannels).fill(0);
    const lastHitY = new Array(numChannels).fill(0);

    for (const ray of this.rays) {
      if (ray.hitGlassDioptreIndex < 0) {
        // No glass hit: close all active groups with trailing boundary
        for (let c = 0; c < numChannels; c++) {
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
        for (let c = 0; c < numChannels; c++) {
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

      for (let c = 0; c < numChannels; c++) {
        const idx = colorIndices[c];

        // If dioptre changed, close previous group with trailing boundary and start fresh
        if (ray.hitGlassDioptreIndex !== lastDioptre[c] && currentGroups[c] !== null) {
          this.closeGroupWithTrailingBoundary(
            currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], idx
          );
          currentGroups[c] = null;
        }
        lastDioptre[c] = ray.hitGlassDioptreIndex;

        // Air→glass: ratio = 1/n, sinT2 always < 1 (no TIR possible)
        const ratio = 1.0 / idx.n;
        const sinT2 = ratio * ratio * (1.0 - cosI * cosI);

        // sinT2 > 1 is physically impossible for air→glass (n>1),
        // but guard against numerical edge cases
        if (sinT2 >= 1.0) {
          continue;
        }

        const cosT = Math.sqrt(1.0 - sinT2);

        // No Fresnel reflection on glass — full intensity transmitted
        const beamIntensity = idx.intensity;

        if (beamIntensity < CONFIG.MIN_REFRACTED_INTENSITY) continue;

        // Snell's law refracted direction
        const refDirX = ratio * ray.dir.x + (ratio * cosI - cosT) * nx;
        const refDirY = ratio * ray.dir.y + (ratio * cosI - cosT) * ny;

        const rLen = Math.sqrt(refDirX * refDirX + refDirY * refDirY);
        if (rLen < 1e-10) {
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
          currentGroups[c], 0, true, ray.hitGlassDioptreIndex, idx.absorption
        );

        // Track last hit point for trailing boundary
        lastHitX[c] = ray.glassEnd.x;
        lastHitY[c] = ray.glassEnd.y;
      }
    }

    // Close any remaining open groups with trailing boundary
    for (let c = 0; c < numChannels; c++) {
      this.closeGroupWithTrailingBoundary(
        currentGroups[c], lastDioptre[c], lastHitX[c], lastHitY[c], colorIndices[c]
      );
    }
  }

  _isDioptreNear(idx, x, y) {
    // Check if a dioptre's midpoint is too close to a position (adjacent glass detection)
    const d = dioptres[idx];
    const mx = (d.ax + d.bx) * 0.5;
    const my = (d.ay + d.by) * 0.5;
    const dx = mx - x;
    const dy = my - y;
    return (dx * dx + dy * dy) < CONFIG.DIOPTRE_EXCLUDE_DISTANCE_SQ;
  }

  castRefractedBeamForPolygon(originX, originY, dirX, dirY, drawFromX, drawFromY, refractiveIndex, depth, intensity, group, tirBounces = 0, inGlass = true, excludeDioptreIdx = -1, absorptionCoeff = CONFIG.GLASS_ABSORPTION_COEFF) {
    // Intensity cutoff: don't trace nearly invisible rays
    if (intensity < CONFIG.MIN_REFRACTED_INTENSITY) {
      group.entryPoints.push({ x: drawFromX, y: drawFromY });
      group.exitPoints.push({ x: originX + dirX * 10, y: originY + dirY * 10 });
      group.intensity += intensity;
      group.count++;
      return;
    }

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
      if (idx === excludeDioptreIdx) continue;

      // Skip dioptres that overlap with the excluded one (adjacent glass boxes)
      if (excludeDioptreIdx >= 0 && dioptres[idx].isGlass) {
        const exD = dioptres[excludeDioptreIdx];
        const curD = dioptres[idx];
        const midX = (exD.ax + exD.bx) * 0.5;
        const midY = (exD.ay + exD.by) * 0.5;
        const curMidX = (curD.ax + curD.bx) * 0.5;
        const curMidY = (curD.ay + curD.by) * 0.5;
        const ddx = midX - curMidX;
        const ddy = midY - curMidY;
        if (ddx * ddx + ddy * ddy < CONFIG.DIOPTRE_EXCLUDE_DISTANCE_SQ) continue;
      }

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

    // Beer-Lambert absorption: attenuate based on actual distance traveled through glass
    const segDist = Math.sqrt(record);
    if (inGlass) {
      // Cap absorption distance to avoid over-absorption when no exit surface found
      const cappedDist = bestDioptreIdx >= 0 ? segDist : Math.min(segDist, 200);
      intensity *= Math.exp(-absorptionCoeff * cappedDist);
    } else {
      // Attenuate refracted beams traveling through air (inverse-square falloff)
      // This prevents bright colored spots on opaque surfaces that look like reflections
      const airAttenuation = 1.0 / (1.0 + segDist * segDist * CONFIG.AIR_ATTENUATION_FACTOR);
      intensity *= airAttenuation;
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
        // glass→air: η = n/1 = n ; air→glass: η = 1/n
        const ratio = inGlass ? refractiveIndex : (1.0 / refractiveIndex);
        const sinT2 = ratio * ratio * (1.0 - cosI * cosI);

        if (sinT2 <= 1.0) {
          const cosT = Math.sqrt(1.0 - sinT2);

          // No Fresnel reflection — full intensity transmitted at exit
          const exitIntensity = intensity;

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
              group, 0, !inGlass, bestDioptreIdx, absorptionCoeff
            );
          } else {
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
                group, tirBounces + 1, inGlass, bestDioptreIdx, absorptionCoeff
              );
            } else {
              group.entryPoints.push({ x: drawFromX, y: drawFromY });
              group.exitPoints.push({ x: bestX, y: bestY });
              group.intensity += intensity;
              group.count++;
            }
          } else {
            group.entryPoints.push({ x: drawFromX, y: drawFromY });
            group.exitPoints.push({ x: bestX, y: bestY });
            group.intensity += intensity;
            group.count++;
          }
        }
      } else {
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
      if (group.count < 1 || group.maxDist < 1) continue;

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
