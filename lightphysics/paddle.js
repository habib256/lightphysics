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
        const pos = this.body.position;
        dioptres.push(new Dioptre(pos.x - this.w / 2, pos.y + this.h / 2, pos.x + this.w / 2, pos.y + this.h / 2));
        dioptres.push(new Dioptre(pos.x + this.w / 2, pos.y + this.h / 2, pos.x + this.w / 2, pos.y + this.h / 2 - this.h * 2 / 3));
        dioptres.push(new Dioptre(pos.x + this.w / 2, pos.y + this.h / 2 - this.h * 2 / 3, pos.x + this.w / 4, pos.y + this.h / 2 - this.h));
        dioptres.push(new Dioptre(pos.x + this.w / 4, pos.y + this.h / 2 - this.h, pos.x - this.w / 4, pos.y + this.h / 2 - this.h));
        dioptres.push(new Dioptre(pos.x - this.w / 4, pos.y + this.h / 2 - this.h, pos.x - this.w / 2, pos.y + this.h / 2 - this.h * 2 / 3));
        dioptres.push(new Dioptre(pos.x - this.w / 2, pos.y + this.h / 2 - this.h * 2 / 3, pos.x - this.w / 2, pos.y + this.h / 2));
    }

    show() {
        push();
        const pos = this.body.position;
        strokeWeight(1);
        stroke(255);
        fill(127);
        translate(pos.x, pos.y + this.h / 2);
        beginShape();
        vertex(0, 0);
        vertex(this.w / 2, 0);
        vertex(this.w / 2, -this.h * 2 / 3);
        vertex(this.w / 4, -this.h);
        vertex(-this.w / 4, -this.h);
        vertex(-this.w / 2, -this.h * 2 / 3);
        vertex(-this.w / 2, 0);
        vertex(0, 0);
        endShape(CLOSE);
        pop();
    }
}
