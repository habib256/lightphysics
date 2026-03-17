// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

class Paddle extends PhysicsObject {
    constructor(x, y, w, h, options, mouseConstraint) {
        const body = Bodies.rectangle(x, y, w, h, options);
        super(body);
        this.w = w;
        this.h = h;
        World.add(engine.world, mouseConstraint);
    }

    pushDioptres() {
        const cx = this.body.position.x;
        const cy = this.body.position.y;
        const angle = this.body.angle;
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        // Local-space vertices (relative to body center, offset by h/2)
        const localVerts = [
            { x: -this.w / 2, y: this.h / 2 },
            { x: this.w / 2, y: this.h / 2 },
            { x: this.w / 2, y: this.h / 2 - this.h * 2 / 3 },
            { x: this.w / 4, y: -this.h / 2 },
            { x: -this.w / 4, y: -this.h / 2 },
            { x: -this.w / 2, y: this.h / 2 - this.h * 2 / 3 },
        ];

        // Transform to world space with rotation
        const worldVerts = localVerts.map(v => rotatePt(cx + v.x, cy + v.y, cx, cy, cosA, sinA));

        for (let i = 0; i < worldVerts.length; i++) {
            const next = (i + 1) % worldVerts.length;
            pushDioptre(worldVerts[i].x, worldVerts[i].y, worldVerts[next].x, worldVerts[next].y);
        }
    }

    show() {
        push();
        const pos = this.body.position;
        const angle = this.body.angle;
        strokeWeight(1);
        stroke(255);
        fill(127);
        translate(pos.x, pos.y);
        rotate(angle);
        beginShape();
        vertex(-this.w / 2, this.h / 2);
        vertex(this.w / 2, this.h / 2);
        vertex(this.w / 2, this.h / 2 - this.h * 2 / 3);
        vertex(this.w / 4, -this.h / 2);
        vertex(-this.w / 4, -this.h / 2);
        vertex(-this.w / 2, this.h / 2 - this.h * 2 / 3);
        endShape(CLOSE);
        pop();
    }
}
