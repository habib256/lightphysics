// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// Spatial grid for accelerating ray-dioptre intersection tests.
// Divides the canvas into cells. Each dioptre is registered in
// every cell it overlaps. A ray only tests dioptres in cells
// along its path (DDA traversal).

class SpatialGrid {
  constructor(canvasWidth, canvasHeight, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(canvasWidth / cellSize);
    this.rows = Math.ceil(canvasHeight / cellSize);
    this.cells = new Array(this.cols * this.rows);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = [];
    }
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  build(dioptres, count) {
    this.clear();
    for (let i = 0; i < count; i++) {
      this.insertDioptre(dioptres[i], i);
    }
  }

  insertDioptre(dioptre, index) {
    const cs = this.cellSize;
    const minX = Math.max(0, Math.floor(Math.min(dioptre.ax, dioptre.bx) / cs));
    const maxX = Math.min(this.cols - 1, Math.floor(Math.max(dioptre.ax, dioptre.bx) / cs));
    const minY = Math.max(0, Math.floor(Math.min(dioptre.ay, dioptre.by) / cs));
    const maxY = Math.min(this.rows - 1, Math.floor(Math.max(dioptre.ay, dioptre.by) / cs));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.cells[y * this.cols + x].push(index);
      }
    }
  }

  getDioptresForRay(originX, originY, dirX, dirY) {
    const cs = this.cellSize;
    const cols = this.cols;
    const rows = this.rows;

    // Collect unique dioptre indices along the ray path using DDA
    const seen = this._seen || (this._seen = new Uint8Array(1024));
    const seenLen = this._seenLen || 0;

    // Grow seen array if needed
    if (seen.length < this._maxDioptres) {
      this._seen = new Uint8Array(this._maxDioptres);
    }

    const result = this._resultBuf || (this._resultBuf = []);
    result.length = 0;

    // Clamp origin to canvas bounds for grid traversal
    let x = Math.floor(originX / cs);
    let y = Math.floor(originY / cs);

    if (x < 0) x = 0;
    if (x >= cols) x = cols - 1;
    if (y < 0) y = 0;
    if (y >= rows) y = rows - 1;

    const stepX = dirX >= 0 ? 1 : -1;
    const stepY = dirY >= 0 ? 1 : -1;

    // Distance along ray for one full cell in X and Y
    const tDeltaX = dirX !== 0 ? Math.abs(cs / dirX) : Infinity;
    const tDeltaY = dirY !== 0 ? Math.abs(cs / dirY) : Infinity;

    // Distance to first cell boundary
    let tMaxX, tMaxY;
    if (dirX >= 0) {
      tMaxX = dirX !== 0 ? ((x + 1) * cs - originX) / dirX : Infinity;
    } else {
      tMaxX = dirX !== 0 ? (x * cs - originX) / dirX : Infinity;
    }
    if (dirY >= 0) {
      tMaxY = dirY !== 0 ? ((y + 1) * cs - originY) / dirY : Infinity;
    } else {
      tMaxY = dirY !== 0 ? (y * cs - originY) / dirY : Infinity;
    }

    // Use a generation counter to avoid clearing the seen array each call
    this._generation = (this._generation || 0) + 1;
    const gen = this._generation;
    if (gen > 250) {
      // Reset to avoid overflow of Uint8Array values
      this._generation = 1;
      this._seen.fill(0);
    }
    const seenArr = this._seen;

    // Traverse grid cells along ray
    const maxSteps = cols + rows;
    for (let step = 0; step < maxSteps; step++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        const cell = this.cells[y * cols + x];
        for (let i = 0; i < cell.length; i++) {
          const idx = cell[i];
          if (seenArr[idx] !== gen) {
            seenArr[idx] = gen;
            result.push(idx);
          }
        }
      } else {
        break;
      }

      // Step to next cell
      if (tMaxX < tMaxY) {
        x += stepX;
        tMaxX += tDeltaX;
      } else {
        y += stepY;
        tMaxY += tDeltaY;
      }
    }

    return result;
  }

  updateMaxDioptres(count) {
    this._maxDioptres = count;
    if (!this._seen || this._seen.length < count) {
      this._seen = new Uint8Array(Math.max(count, 256));
      this._generation = 0;
    }
  }
}
