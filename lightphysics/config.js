// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2

// Cauchy dispersion: n(λ) = A + B / λ²
function cauchyIndex(A, B, wavelengthNm) {
    return A + B / (wavelengthNm * wavelengthNm);
}

const _CAUCHY_A = 1.2935;   // Base refractive index (Cauchy coefficient A)
const _CAUCHY_B = 66112;    // Dispersion strength (nm²), higher = more rainbow spread
const _WAVELENGTH_R = 650;  // Red wavelength (nm)
const _WAVELENGTH_G = 550;  // Green wavelength (nm)
const _WAVELENGTH_B = 450;  // Blue wavelength (nm)

const CONFIG = Object.freeze({
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    RAY_ANGLE_STEP: 0.6,
    BALL_SEGMENTS: 30,
    SPAWN_INTERVAL: 80,
    SPAWN_PROBABILITY: 0.5,
    LIGHT_SPAWN_PROBABILITY: 0.85,
    BALL_SPEED_MAX: 10,
    BALL_SPEED_MIN: 3,
    OFF_SCREEN_MARGIN: 100,
    BALL_RESTITUTION: 0.8,
    VELOCITY_DAMPING: 0.9,
    VELOCITY_BOOST: 1.2,
    BREAKOUT_BALL_VELOCITY: 3,
    BREAKOUT_BALL_RADIUS: 8,
    GRID_CELL_SIZE: 80,
    SHOW_FPS: true,

    // Glass refraction — Cauchy dispersion: n(λ) = CAUCHY_A + CAUCHY_B / λ²
    WAVELENGTH_R: _WAVELENGTH_R,
    WAVELENGTH_G: _WAVELENGTH_G,
    WAVELENGTH_B: _WAVELENGTH_B,
    CAUCHY_A: _CAUCHY_A,
    CAUCHY_B: _CAUCHY_B,

    // Refractive indices computed from Cauchy formula
    GLASS_REFRACTIVE_INDEX_R: cauchyIndex(_CAUCHY_A, _CAUCHY_B, _WAVELENGTH_R),
    GLASS_REFRACTIVE_INDEX_G: cauchyIndex(_CAUCHY_A, _CAUCHY_B, _WAVELENGTH_G),
    GLASS_REFRACTIVE_INDEX_B: cauchyIndex(_CAUCHY_A, _CAUCHY_B, _WAVELENGTH_B),

    GLASS_SPAWN_PROBABILITY: 0.15,
    MAX_REFRACTION_DEPTH: 5,
    MAX_TIR_BOUNCES: 3,
    GLASS_ABSORPTION_COEFF: 0.003,    // Default (fallback)
    GLASS_ABSORPTION_COEFF_R: 0.001,  // Red: least absorbed
    GLASS_ABSORPTION_COEFF_G: 0.003,  // Green: moderate absorption
    GLASS_ABSORPTION_COEFF_B: 0.006,  // Blue: most absorbed (warm glass tint)
    REFRACTED_BEAM_INTENSITY_BOOST: 1.0,
    GRADIENT_EXTEND_FACTOR: 1.5,
    GLASS_ALPHA: 60,
    GLASS_STROKE_ALPHA: 120,
    REFRACTED_RAY_MAX_LENGTH: 1500,
    BOUNDARY_RAY_MIN_GAP: 2.0,
});
