// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// Glass block with refractive properties

class GlassBox extends PhysicsObject {
    constructor(x, y, w, h, options) {
        const body = Bodies.rectangle(x, y, w, h, options);
        super(body);
        this.w = w;
        this.h = h;
    }

    show() {
        const pos = this.body.position;
        const angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        rectMode(CENTER);

        // Glass fill: semi-transparent light blue
        noStroke();
        fill(180, 220, 255, CONFIG.GLASS_ALPHA);
        rect(0, 0, this.w, this.h);

        // Glass edge highlight
        strokeWeight(1.5);
        stroke(200, 230, 255, CONFIG.GLASS_STROKE_ALPHA);
        noFill();
        rect(0, 0, this.w, this.h);

        pop();
    }

    pushDioptres() {
        const angle = this.body.angle;
        const cx = this.body.position.x;
        const cy = this.body.position.y;
        const halfW = this.w / 2;
        const halfH = this.h / 2;
        const minx = cx - halfW;
        const maxx = cx + halfW;
        const miny = cy - halfH;
        const maxy = cy + halfH;

        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        const a = rotatePt(minx, miny, cx, cy, cosA, sinA);
        const b = rotatePt(maxx, miny, cx, cy, cosA, sinA);
        const c = rotatePt(maxx, maxy, cx, cy, cosA, sinA);
        const d = rotatePt(minx, maxy, cx, cy, cosA, sinA);

        pushDioptre(a.x, a.y, b.x, b.y, true);
        pushDioptre(b.x, b.y, c.x, c.y, true);
        pushDioptre(c.x, c.y, d.x, d.y, true);
        pushDioptre(d.x, d.y, a.x, a.y, true);
    }
}
