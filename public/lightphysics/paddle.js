// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2
//
// This work started with the help of : Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/145-2d-ray-casting.html

function Paddle(x, y, w, h, options) {
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

    this.removeFromWorld = function () {
        World.remove(world, this.body);
    }

    this.renderP5 = function () {
        push();
        let pos = this.body.position;
        let angle = this.body.angle;
        strokeWeight(1);
        stroke(255);
        fill(127);
        translate(pos.x, pos.y+this.h/2);
        beginShape();
            vertex(0,0 );
            vertex(this.w/2,0);
            vertex(this.w/2,-this.h*2/3);
            vertex(this.w/4,-this.h);
            vertex(-this.w/4,-this.h);
            vertex(-this.w/2,-this.h*2/3);
            vertex(-this.w/2,0 );
            vertex(0,0 );
        endShape(CLOSE);

        pop();
    }

    this.pushDioptres = function () {
        let pos = this.body.position;
        let angle = this.body.angle;
        // Fabriquer les dioptres de notre Paddle
        dioptres.push(new Dioptre(pos.x-this.w/2, pos.y+this.h/2, pos.x+this.w/2, pos.y+this.h/2));
        dioptres.push(new Dioptre(pos.x+this.w/2, pos.y+this.h/2, pos.x+this.w/2, pos.y+this.h/2-this.h*2/3));
        dioptres.push(new Dioptre(pos.x+this.w/2, pos.y+this.h/2-this.h*2/3,pos.x+this.w/4,pos.y+this.h/2-this.h ));    
        dioptres.push(new Dioptre(pos.x+this.w/4,pos.y+this.h/2-this.h,pos.x-this.w/4,pos.y+this.h/2-this.h ));  
        dioptres.push(new Dioptre(pos.x-this.w/4,pos.y+this.h/2-this.h,pos.x-this.w/2, pos.y+this.h/2-this.h*2/3));  
        dioptres.push(new Dioptre(pos.x-this.w/2, pos.y+this.h/2-this.h*2/3,pos.x-this.w/2,pos.y+this.h/2 ));
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
