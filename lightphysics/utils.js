// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2

// Rotation d'un point autour d'un centre
// https://www.stashofcode.fr/rotation-dun-point-autour-dun-centre/
function rotatePt(Mx, My, Ox, Oy, cosA, sinA) {
    const xM = Mx - Ox;
    const yM = My - Oy;
    return {
        x: Math.round(xM * cosA + yM * sinA + Ox),
        y: Math.round(-xM * sinA + yM * cosA + Oy)
    };
}

function resetDioptres() {
    dioptres.length = 0;
    dioptres.push(new Dioptre(0, 0, width, 0));
    dioptres.push(new Dioptre(width, 0, width, height));
    dioptres.push(new Dioptre(width, height, 0, height));
    dioptres.push(new Dioptre(0, height, 0, 0));
}

function drawLights() {
    for (const light of lights) {
        light.show();
    }
}

function drawDioptres() {
    for (const dioptre of dioptres) {
        dioptre.show();
    }
}

function drawBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
        balls[i].show();
    }
}

function drawBoxes() {
    for (let i = 0; i < boxes.length; i++) {
        boxes[i].show();
    }
}
