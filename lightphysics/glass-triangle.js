// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// Triangular glass prism with refractive properties

class GlassTriangle extends PhysicsObject {
    constructor(x, y, base, h, options) {
        // Create triangular body using Matter.js polygon (3 sides)
        // We define vertices for an equilateral-ish triangle
        const halfBase = base / 2;
        const vertices = [
            { x: -halfBase, y: h / 3 },
            { x: halfBase, y: h / 3 },
            { x: 0, y: -2 * h / 3 }
        ];
        const body = Bodies.fromVertices(x, y, vertices, options);
        super(body);
        this.base = base;
        this.h = h;
        // Store original vertices relative to center for dioptre computation
        this._localVerts = vertices;
    }

    show() {
        const pos = this.body.position;
        const angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);

        // Glass fill: semi-transparent light blue
        noStroke();
        fill(180, 220, 255, CONFIG.GLASS_ALPHA);
        triangle(
            this._localVerts[0].x, this._localVerts[0].y,
            this._localVerts[1].x, this._localVerts[1].y,
            this._localVerts[2].x, this._localVerts[2].y
        );

        // Glass edge highlight
        strokeWeight(1.5);
        stroke(200, 230, 255, CONFIG.GLASS_STROKE_ALPHA);
        noFill();
        triangle(
            this._localVerts[0].x, this._localVerts[0].y,
            this._localVerts[1].x, this._localVerts[1].y,
            this._localVerts[2].x, this._localVerts[2].y
        );

        pop();
    }

    pushDioptres() {
        const angle = this.body.angle;
        const cx = this.body.position.x;
        const cy = this.body.position.y;

        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        // Transform local vertices to world space
        const verts = this._localVerts;
        const world = [];
        for (let i = 0; i < verts.length; i++) {
            world.push(rotatePt(cx + verts[i].x, cy + verts[i].y, cx, cy, cosA, sinA));
        }

        // Register all 3 edges as glass dioptres
        for (let i = 0; i < world.length; i++) {
            const j = (i + 1) % world.length;
            pushDioptre(world[i].x, world[i].y, world[j].x, world[j].y, true);
        }
    }
}
