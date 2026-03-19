// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// Biconvex glass lens approximated by polygon segments

class GlassLens extends PhysicsObject {
    constructor(x, y, diameter, thickness, segments, options) {
        // segments: number of line segments per curved side (more = smoother)
        const segs = segments || 8;
        const radius = diameter / 2;

        // Compute lens profile vertices (biconvex: two arcs)
        const halfThick = thickness / 2;
        const vertices = GlassLens._computeVertices(radius, halfThick, segs);

        const body = Bodies.fromVertices(x, y, vertices, options);
        super(body);
        this.diameter = diameter;
        this.thickness = thickness;
        this.segments = segs;
        this._localVerts = vertices;
    }

    static _computeVertices(radius, halfThick, segs) {
        // Compute the radius of curvature from chord (diameter) and sagitta (halfThick)
        // For a circular arc: R = (h² + r²) / (2h) where h=sagitta, r=half-chord
        const sagitta = halfThick;
        const R = (sagitta * sagitta + radius * radius) / (2 * sagitta);

        const verts = [];

        // Right curved surface (center of curvature at x = halfThick - R)
        const cx1 = halfThick - R;
        for (let i = 0; i <= segs; i++) {
            const frac = i / segs;
            const y = -radius + frac * (2 * radius);
            // x from circle equation: (x - cx1)² + y² = R²
            const xSq = R * R - y * y;
            if (xSq < 0) continue;
            const x = cx1 + Math.sqrt(xSq);
            verts.push({ x, y });
        }

        // Left curved surface (center of curvature at x = -(halfThick - R) = R - halfThick)
        const cx2 = R - halfThick;
        for (let i = segs; i >= 0; i--) {
            const frac = i / segs;
            const y = -radius + frac * (2 * radius);
            const xSq = R * R - y * y;
            if (xSq < 0) continue;
            const x = cx2 - Math.sqrt(xSq);
            verts.push({ x, y });
        }

        return verts;
    }

    show() {
        const pos = this.body.position;
        const angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);

        // Glass fill
        noStroke();
        fill(180, 220, 255, CONFIG.GLASS_ALPHA);
        beginShape();
        for (const v of this._localVerts) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);

        // Glass edge highlight
        strokeWeight(1.5);
        stroke(200, 230, 255, CONFIG.GLASS_STROKE_ALPHA);
        noFill();
        beginShape();
        for (const v of this._localVerts) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);

        pop();
    }

    pushDioptres() {
        const angle = this.body.angle;
        const cx = this.body.position.x;
        const cy = this.body.position.y;

        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        // Transform local vertices to world space
        const world = [];
        for (const v of this._localVerts) {
            world.push(rotatePt(cx + v.x, cy + v.y, cx, cy, cosA, sinA));
        }

        // Register all edges as glass dioptres
        for (let i = 0; i < world.length; i++) {
            const j = (i + 1) % world.length;
            pushDioptre(world[i].x, world[i].y, world[j].x, world[j].y, true);
        }
    }
}
