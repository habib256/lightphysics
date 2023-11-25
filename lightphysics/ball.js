// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

function Ball(x, y, r, options, ballsImg) {
    this.body = Bodies.circle(x, y, r, options);
    this.r = r;
    this.img = ballsImg[Math.floor(Math.random() * 4)]; // Ajouté cette ligne
    World.add(engine.world, this.body);

    this.getX = function () {
        return this.body.position.x;
    }
    this.getY = function () {
        return this.body.position.y;
    }
    this.getR = function () {
        return this.r;
    }
    this.getVX = function () {
        return this.body.velocity.x;
    }
    this.getVY = function () {
        return this.body.velocity.y;
    }
    this.isOffScreen = function () {
        var pos = this.body.position;
        return (pos.y > height + 100);
    }

    this.removeFromWorld = function () 
    {
        World.remove(world, this.body);
    }

    this.pushDioptres = function () {
        let pos = this.body.position;
        let angle = this.body.angle;
        let cx = this.body.position.x;
        let cy = this.body.position.y;
        let minx = cx - this.r;
        let maxx = cx + this.r;
        let miny = cy - this.r;
        let maxy = cy + this.r;

        let a = this.rotatePt(minx, miny, cx, cy, angle);
        let b = this.rotatePt(maxx, miny, cx, cy, angle);
        let c = this.rotatePt(maxx, maxy, cx, cy, angle);
        let d = this.rotatePt(minx, maxy, cx, cy, angle);

        let angleStep = 2 * Math.PI / 30;
        for (let i = 0; i < 30; i++) {
            let angle1 = i * angleStep;
            let angle2 = ((i + 1) % 30) * angleStep;
            let pt1 = this.rotatePt(cx + this.r * Math.cos(angle1), cy + this.r * Math.sin(angle1), cx, cy, angle);
            let pt2 = this.rotatePt(cx + this.r * Math.cos(angle2), cy + this.r * Math.sin(angle2), cx, cy, angle);
            let dioptre = new Dioptre(pt1.x, pt1.y, pt2.x, pt2.y);
            dioptres.push(dioptre);
        }
    }

    this.show = function () {
        let pos = this.body.position;
        let angle = this.body.angle;
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        if (this.img) {
            imageMode(CENTER);
            image(this.img, 0, 0, this.r*2, this.r*2);
        } else {
            rectMode(CENTER);
            fill(127);
            circle(0, 0, this.r*2, this.r*2);
        }
        pop();
        this.pushDioptres();
    }
  
    this.rotatePt = function (Mx, My, Ox, Oy, angle) {
        // https://www.stashofcode.fr/rotation-dun-point-autour-dun-centre/
        var xM, yM, x, y;
        // angle *= Math.PI / 180;
        angle = -angle;
        xM = Mx - Ox;
        yM = My - Oy;
        x = xM * Math.cos(angle) + yM * Math.sin(angle) + Ox;
        y = - xM * Math.sin(angle) + yM * Math.cos(angle) + Oy;
        return ({ x: Math.round(x), y: Math.round(y) });
    }
}
