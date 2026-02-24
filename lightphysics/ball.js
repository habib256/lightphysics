// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

class Ball extends PhysicsObject {
    constructor(x, y, r, options, ballsImg) {
        const body = Bodies.circle(x, y, r, options);
        super(body);
        this.r = r;
        this.img = (ballsImg && ballsImg.length > 0)
            ? ballsImg[Math.floor(Math.random() * ballsImg.length)]
            : null;
    }

    getR() {
        return this.r;
    }

    pushDioptres() {
        const angle = this.body.angle;
        const cx = this.body.position.x;
        const cy = this.body.position.y;

        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        const angleStep = 2 * Math.PI / CONFIG.BALL_SEGMENTS;
        for (let i = 0; i < CONFIG.BALL_SEGMENTS; i++) {
            const angle1 = i * angleStep;
            const angle2 = ((i + 1) % CONFIG.BALL_SEGMENTS) * angleStep;
            const pt1 = rotatePt(cx + this.r * Math.cos(angle1), cy + this.r * Math.sin(angle1), cx, cy, cosA, sinA);
            const pt2 = rotatePt(cx + this.r * Math.cos(angle2), cy + this.r * Math.sin(angle2), cx, cy, cosA, sinA);
            dioptres.push(new Dioptre(pt1.x, pt1.y, pt2.x, pt2.y));
        }
    }

    show() {
        const pos = this.body.position;
        const angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        if (this.img) {
            imageMode(CENTER);
            image(this.img, 0, 0, this.r * 2, this.r * 2);
        } else {
            rectMode(CENTER);
            fill(127);
            circle(0, 0, this.r * 2, this.r * 2);
        }
        pop();
    }
}
