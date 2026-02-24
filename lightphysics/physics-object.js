// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2

class PhysicsObject {
    constructor(body) {
        this.body = body;
        World.add(engine.world, this.body);
    }

    getX() {
        return this.body.position.x;
    }

    getY() {
        return this.body.position.y;
    }

    getVX() {
        return this.body.velocity.x;
    }

    getVY() {
        return this.body.velocity.y;
    }

    isOffScreen() {
        return this.body.position.y > height + CONFIG.OFF_SCREEN_MARGIN;
    }

    removeFromWorld() {
        World.remove(world, this.body);
    }
}
