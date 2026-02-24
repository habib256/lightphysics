// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

class Box extends PhysicsObject {
    constructor(x, y, w, h, options, boxesImg) {
        const body = Bodies.rectangle(x, y, w, h, options);
        super(body);
        this.w = w;
        this.h = h;
        this.img = (boxesImg && boxesImg.length > 0)
            ? boxesImg[Math.floor(Math.random() * boxesImg.length)]
            : null;
    }

    show() {
        const pos = this.body.position;
        const angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        if (this.img) {
            imageMode(CENTER);
            image(this.img, 0, 0, this.w, this.h);
        } else {
            rectMode(CENTER);
            fill(127);
            rect(0, 0, this.w, this.h);
        }
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

        dioptres.push(new Dioptre(a.x, a.y, b.x, b.y));
        dioptres.push(new Dioptre(b.x, b.y, c.x, c.y));
        dioptres.push(new Dioptre(c.x, c.y, d.x, d.y));
        dioptres.push(new Dioptre(d.x, d.y, a.x, a.y));
    }
}
