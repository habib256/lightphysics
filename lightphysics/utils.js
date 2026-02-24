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

let dioptreCount = 0;

function resetDioptres() {
    dioptreCount = 0;
    pushDioptre(0, 0, width, 0);
    pushDioptre(width, 0, width, height);
    pushDioptre(width, height, 0, height);
    pushDioptre(0, height, 0, 0);
}

function pushDioptre(x1, y1, x2, y2) {
    if (dioptreCount < dioptres.length) {
        dioptres[dioptreCount].set(x1, y1, x2, y2);
    } else {
        dioptres.push(new Dioptre(x1, y1, x2, y2));
    }
    dioptreCount++;
}

function drawLights() {
    blendMode(ADD);
    for (const light of lights) {
        light.show();
    }
    blendMode(BLEND);
}

function drawDioptres() {
    for (let i = 0; i < dioptreCount; i++) {
        dioptres[i].show();
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
