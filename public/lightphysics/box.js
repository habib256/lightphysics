// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

function Box(x, y, w, h, options) {
    this.body = Bodies.rectangle(x, y, w, h, options);
    this.w = w;
    this.h = h;
    World.add(engine.world, this.body);

    this.getX = function () {
        return this.body.position.x;
    }
    this.getY = function () {
        return this.body.position.y;
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

    this.renderP5 = function () {
        push();
        let pos = this.body.position;
        let angle = this.body.angle;
        strokeWeight(1);
        stroke(255);
        fill(127);
        rectMode(CENTER);
        translate(pos.x, pos.y);
        rotate(angle);
        rect(0, 0, this.w, this.h);
        pop();
    }

    this.render2D = function (img){

        let c = color(0, 0, 0);
        let pos = this.body.position;
        let angle = this.body.angle;
        let layer = createGraphics(2*this.r, 2*this.r);
        layer.translate(this.r, this.r);
        layer.imageMode(CENTER);
        layer.rotate(angle);
        layer.image(img,0,0,2*this.r,2*this.r);
        imageMode(CENTER);
        return layer;
    }

    this.pushDioptres = function () {
        let pos = this.body.position;
        let angle = this.body.angle;
        // Fabriquer les dioptres de notre boite Rectangle a,b,c,d à mettre en rotation
        let cx = this.body.position.x;
        let cy = this.body.position.y;
        let minx = cx - (this.w) / 2;
        let maxx = cx + (this.w) / 2;
        let miny = cy - (this.h) / 2;
        let maxy = cy + (this.h) / 2;

        let a = this.rotatePt(minx, miny, cx, cy, angle);
        let b = this.rotatePt(maxx, miny, cx, cy, angle);
        let c = this.rotatePt(maxx, maxy, cx, cy, angle);
        let d = this.rotatePt(minx, maxy, cx, cy, angle);

        let l1 = new Dioptre(a.x, a.y, b.x, b.y);
        dioptres.push(l1);
        let l2 = new Dioptre(b.x, b.y, c.x, c.y);
        dioptres.push(l2);
        let l3 = new Dioptre(c.x, c.y, d.x, d.y);
        dioptres.push(l3);
        let l4 = new Dioptre(d.x, d.y, a.x, a.y);
        dioptres.push(l4);
    }

    this.show = function () {

        //this.renderP5();
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
