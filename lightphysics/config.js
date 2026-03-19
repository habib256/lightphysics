// 2D Raytracing Rendering for Matter.js
// VERHILLE Arnaud
// Copyleft GPL2

// Cauchy dispersion: n(λ) = A + B / λ²
function cauchyIndex(A, B, wavelengthNm) {
    return A + B / (wavelengthNm * wavelengthNm);
}

// Convert a wavelength (nm) in the visible spectrum to an approximate [r,g,b] (0-255).
// Based on Dan Bruton's approximation.
function wavelengthToRGB(wavelength) {
    let r = 0, g = 0, b = 0;
    if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
        r = 0;
        g = (wavelength - 440) / (490 - 440);
        b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
        r = 0;
        g = 1;
        b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (wavelength >= 580 && wavelength < 645) {
        r = 1;
        g = -(wavelength - 645) / (645 - 580);
        b = 0;
    } else if (wavelength >= 645 && wavelength <= 780) {
        r = 1;
        g = 0;
        b = 0;
    }
    // Intensity drop-off at edges of visible spectrum
    let factor;
    if (wavelength >= 380 && wavelength < 420) {
        factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
    } else if (wavelength >= 420 && wavelength <= 700) {
        factor = 1.0;
    } else if (wavelength > 700 && wavelength <= 780) {
        factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
    } else {
        factor = 0;
    }
    return [Math.round(255 * r * factor), Math.round(255 * g * factor), Math.round(255 * b * factor)];
}

const _CAUCHY_A = 1.5046;   // Base refractive index (Cauchy coefficient A, BK7-like)
const _CAUCHY_B = 4200;     // Dispersion strength (nm²), realistic BK7-like value

// 7 wavelengths spanning the visible spectrum for smooth rainbow dispersion
const _SPECTRUM_WAVELENGTHS = [420, 460, 490, 530, 580, 620, 660]; // nm (violet to red)

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
    CAUCHY_A: _CAUCHY_A,
    CAUCHY_B: _CAUCHY_B,

    // Multi-wavelength spectrum for dispersion
    SPECTRUM_WAVELENGTHS: _SPECTRUM_WAVELENGTHS,
    SPECTRUM_COLORS: _SPECTRUM_WAVELENGTHS.map(w => wavelengthToRGB(w)),
    SPECTRUM_INDICES: _SPECTRUM_WAVELENGTHS.map(w => cauchyIndex(_CAUCHY_A, _CAUCHY_B, w)),

    // Wavelength-dependent absorption (Beer-Lambert)
    // Shorter wavelengths absorbed more (Rayleigh-like)
    SPECTRUM_ABSORPTIONS: _SPECTRUM_WAVELENGTHS.map(w => 0.001 + 0.005 * (1 - (w - 380) / 400)),

    GLASS_SPAWN_PROBABILITY: 0.15,
    MAX_REFRACTION_DEPTH: 5,
    MAX_TIR_BOUNCES: 3,
    GLASS_ABSORPTION_COEFF: 0.003,    // Default (fallback)
    MIN_REFRACTED_INTENSITY: 0.001,   // Cutoff: don't trace rays dimmer than this
    REFRACTED_BEAM_INTENSITY_BOOST: 1.0,
    GRADIENT_EXTEND_FACTOR: 1.5,
    GLASS_ALPHA: 60,
    GLASS_STROKE_ALPHA: 120,
    REFRACTED_RAY_MAX_LENGTH: 1500,
    BOUNDARY_RAY_MIN_GAP: 2.0,
    GLASS_SHADOW_FACTOR: 0.35,        // How much main light is dimmed behind glass
    DIOPTRE_EXCLUDE_DISTANCE_SQ: 1.0, // Exclude dioptres within this distance² (adjacent glass)
    AIR_ATTENUATION_FACTOR: 0.00002,  // Inverse-square falloff for refracted beams in air
});
