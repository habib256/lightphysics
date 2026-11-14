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

    // Le ballon arrête la lumière comme un cercle exact (sa rotation ne change rien à son ombre).
    pushDioptres() {
        pushCercle(this.body.position.x, this.body.position.y, this.r);
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
