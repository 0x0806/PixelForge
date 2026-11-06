/*
 * PixelForge filter engine.
 *
 * Pure, DOM-free pixel maths shared by the browser UI (loaded as a classic
 * <script>, so index.html keeps working from file://) and the Node test suite.
 */
(function (root) {
    'use strict';

    const CATEGORIES = [
        { id: 'portrait', label: 'Portrait' },
        { id: 'landscape', label: 'Landscape' },
        { id: 'vintage', label: 'Vintage' },
        { id: 'cinematic', label: 'Cinematic' },
        { id: 'black-white', label: 'B&W' },
        { id: 'street', label: 'Street' },
        { id: 'nature', label: 'Nature' },
        { id: 'urban', label: 'Urban' },
        { id: 'moody', label: 'Moody' },
        { id: 'bright', label: 'Bright & Airy' },
        { id: 'warm', label: 'Warm' },
        { id: 'cool', label: 'Cool' }
    ];

    const PRESETS_PER_CATEGORY = 25;

    const DEFAULT_SETTINGS = Object.freeze({
        brightness: 0,   // -255..255 added to each channel
        contrast: 0,     // percent, -100..100
        saturation: 0,   // percent, -100..100
        hue: 0,          // degrees
        shadows: 0,      // lifts (+) / crushes (-) dark tones
        highlights: 0,   // lifts (+) / recovers (-) bright tones
        vibrance: 0,     // saturation boost weighted to muted colours
        warmth: 0,       // + warm (orange), - cool (blue)
        tint: 0,         // + magenta, - green
        vignette: 0,     // 0..100 corner darkening
        grain: 0,        // 0..100 film grain amplitude
        sharpen: 0,      // 0..10
        mono: false      // convert to black & white
    });

    const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

    // [min, max] ranges per category; omitted settings stay neutral.
    const PROFILES = {
        portrait: { brightness: [2, 10], contrast: [-12, -2], saturation: [-6, 6], hue: [-4, 4], shadows: [5, 15], highlights: [-10, -2], vibrance: [8, 20], warmth: [4, 14], tint: [0, 5], vignette: [0, 6], grain: [0, 3], sharpen: [1, 3] },
        landscape: { brightness: [-4, 6], contrast: [8, 22], saturation: [10, 25], hue: [-6, 6], shadows: [4, 14], highlights: [-14, -4], vibrance: [14, 30], warmth: [-4, 8], vignette: [0, 8], sharpen: [2, 6] },
        vintage: { brightness: [0, 8], contrast: [-18, -4], saturation: [-28, -10], hue: [-8, 8], shadows: [6, 18], highlights: [-12, -4], warmth: [8, 22], tint: [2, 10], vignette: [8, 20], grain: [6, 15] },
        cinematic: { brightness: [-8, 0], contrast: [14, 32], saturation: [-12, 8], hue: [-10, 10], shadows: [-10, 6], highlights: [-12, 0], vibrance: [0, 12], warmth: [-16, 16], tint: [-6, 6], vignette: [10, 20], grain: [0, 6], sharpen: [1, 4] },
        'black-white': { brightness: [-8, 8], contrast: [5, 30], shadows: [-12, 12], highlights: [-12, 12], vignette: [0, 14], grain: [0, 12], sharpen: [0, 5], mono: true },
        street: { brightness: [-6, 2], contrast: [12, 28], saturation: [-18, -2], shadows: [-8, 8], highlights: [-10, 0], vibrance: [-4, 8], warmth: [-6, 6], vignette: [4, 14], grain: [5, 14], sharpen: [3, 8] },
        nature: { brightness: [-2, 6], contrast: [4, 16], saturation: [10, 28], hue: [-8, 4], shadows: [4, 12], highlights: [-10, -2], vibrance: [16, 32], warmth: [-2, 10], tint: [-10, -2], vignette: [0, 6], sharpen: [2, 5] },
        urban: { brightness: [-6, 2], contrast: [12, 28], saturation: [-24, -8], hue: [-6, 6], shadows: [-6, 6], highlights: [-8, 0], warmth: [-14, -2], tint: [-4, 4], vignette: [4, 14], grain: [2, 9], sharpen: [3, 8] },
        moody: { brightness: [-18, -6], contrast: [10, 26], saturation: [-26, -6], hue: [-8, 8], shadows: [-14, -2], highlights: [-16, -4], warmth: [-12, 6], tint: [0, 8], vignette: [12, 20], grain: [2, 10] },
        bright: { brightness: [8, 20], contrast: [-18, -4], saturation: [2, 16], shadows: [10, 24], highlights: [-6, 6], vibrance: [4, 18], warmth: [0, 8], vignette: [0, 3], sharpen: [0, 3] },
        warm: { brightness: [0, 8], contrast: [0, 12], saturation: [0, 14], hue: [-4, 4], shadows: [0, 10], vibrance: [4, 16], warmth: [14, 30], tint: [0, 6], vignette: [0, 8] },
        cool: { brightness: [0, 6], contrast: [0, 14], saturation: [-4, 12], hue: [-4, 4], shadows: [0, 10], vibrance: [4, 14], warmth: [-30, -14], tint: [-6, 0], vignette: [0, 8] }
    };

    const NAME_WORDS = {
        portrait: [['Soft', 'Radiant', 'Creamy', 'Natural', 'Glow'], ['Skin', 'Studio', 'Face', 'Closeup', 'Beauty']],
        landscape: [['Vivid', 'Open', 'Grand', 'Crisp', 'Epic'], ['Valley', 'Horizon', 'Ridge', 'Vista', 'Panorama']],
        vintage: [['Faded', 'Retro', 'Dusty', 'Old', 'Nostalgic'], ['Film', 'Polaroid', 'Postcard', 'Album', 'Memory']],
        cinematic: [['Epic', 'Noir', 'Dramatic', 'Blockbuster', 'Teal'], ['Scene', 'Trailer', 'Frame', 'Reel', 'Take']],
        'black-white': [['Classic', 'Silver', 'Deep', 'Crisp', 'Soft'], ['Mono', 'Noir', 'Ink', 'Charcoal', 'Slate']],
        street: [['Gritty', 'Raw', 'Candid', 'Punchy', 'Late'], ['Walk', 'Corner', 'Alley', 'Crowd', 'Night']],
        nature: [['Lush', 'Fresh', 'Wild', 'Mossy', 'Dewy'], ['Forest', 'Meadow', 'Leaf', 'Canopy', 'Bloom']],
        urban: [['Concrete', 'Steel', 'Neon', 'Metro', 'Smoky'], ['City', 'Tower', 'Skyline', 'Grid', 'Bridge']],
        moody: [['Dark', 'Brooding', 'Stormy', 'Muted', 'Velvet'], ['Mood', 'Shadow', 'Dusk', 'Haze', 'Rain']],
        bright: [['Airy', 'Clean', 'Sunny', 'Light', 'Pure'], ['Breeze', 'Morning', 'Cloud', 'Linen', 'Daylight']],
        warm: [['Golden', 'Amber', 'Honey', 'Sunset', 'Toasty'], ['Hour', 'Glow', 'Ember', 'Haze', 'Tone']],
        cool: [['Icy', 'Glacier', 'Frosty', 'Ocean', 'Steel'], ['Blue', 'Wave', 'Mist', 'Tide', 'Breeze']]
    };

    const THUMBNAIL_GRADIENTS = {
        portrait: 'linear-gradient(135deg, #ff9a8b 0%, #fecfef 100%)',
        landscape: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)',
        vintage: 'linear-gradient(135deg, #d4a574 0%, #f4e2d7 100%)',
        cinematic: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'black-white': 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)',
        street: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
        nature: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
        urban: 'linear-gradient(135deg, #485563 0%, #29323c 100%)',
        moody: 'linear-gradient(135deg, #2c3e50 0%, #fd746c 100%)',
        bright: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        warm: 'linear-gradient(135deg, #ff9a8b 0%, #fad0c4 100%)',
        cool: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };

    /** Small deterministic PRNG so presets and grain are identical on every load. */
    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    /** Builds the full, deterministic preset list (12 categories x 25 = 300). */
    function createPresets() {
        const presets = [];
        let id = 1;
        CATEGORIES.forEach((cat, ci) => {
            const profile = PROFILES[cat.id];
            const words = NAME_WORDS[cat.id];
            for (let i = 0; i < PRESETS_PER_CATEGORY; i++) {
                const rand = mulberry32(ci * 1000 + i + 1);
                const settings = Object.assign({}, DEFAULT_SETTINGS);
                Object.keys(profile).forEach((key) => {
                    const range = profile[key];
                    if (key === 'mono') {
                        settings.mono = range === true;
                    } else {
                        settings[key] = round2(range[0] + (range[1] - range[0]) * rand());
                    }
                });
                presets.push({
                    id: id++,
                    name: `${words[0][i % 5]} ${words[1][Math.floor(i / 5)]}`,
                    category: cat.id,
                    thumbnail: THUMBNAIL_GRADIENTS[cat.id],
                    settings
                });
            }
        });
        return presets;
    }

    function clamp255(v) {
        return v < 0 ? 0 : v > 255 ? 255 : v;
    }

    /**
     * Applies a preset's settings to RGBA pixel data in place.
     * `data` is a Uint8ClampedArray (or any array of 0-255 numbers) of length width*height*4.
     * With default (all-zero) settings the pixels are returned unchanged.
     */
    function applySettings(data, width, height, settings) {
        const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
        const len = width * height * 4;

        const c255 = s.contrast * 2.55;
        const contrastFactor = (259 * (c255 + 255)) / (255 * (259 - c255));
        const hueRad = (s.hue * Math.PI) / 180;
        const cos = Math.cos(hueRad);
        const sin = Math.sin(hueRad);
        // Same matrix as the CSS hue-rotate() filter.
        const m = [
            0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
            0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
            0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072
        ];
        const tonal = s.shadows !== 0 || s.highlights !== 0;
        const temp = s.warmth !== 0 || s.tint !== 0;
        const color = s.saturation !== 0 || s.vibrance !== 0;

        for (let i = 0; i < len; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (s.brightness !== 0) {
                r += s.brightness; g += s.brightness; b += s.brightness;
            }
            if (s.contrast !== 0) {
                r = contrastFactor * (r - 128) + 128;
                g = contrastFactor * (g - 128) + 128;
                b = contrastFactor * (b - 128) + 128;
            }
            if (tonal) {
                const lum = clamp255(0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const d = s.shadows * (1 - lum) * (1 - lum) + s.highlights * lum * lum;
                r += d; g += d; b += d;
            }
            if (temp) {
                r += s.warmth * 0.5 + s.tint * 0.2;
                g += s.warmth * 0.1 - s.tint * 0.4;
                b += -s.warmth * 0.5 + s.tint * 0.2;
            }
            r = clamp255(r); g = clamp255(g); b = clamp255(b);

            if (s.hue !== 0) {
                const nr = r * m[0] + g * m[1] + b * m[2];
                const ng = r * m[3] + g * m[4] + b * m[5];
                const nb = r * m[6] + g * m[7] + b * m[8];
                r = clamp255(nr); g = clamp255(ng); b = clamp255(nb);
            }
            if (color) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
                const f = Math.max(0, 1 + s.saturation / 100 + (s.vibrance / 100) * (1 - chroma));
                r = gray + f * (r - gray);
                g = gray + f * (g - gray);
                b = gray + f * (b - gray);
            }
            if (s.mono) {
                r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
            }

            data[i] = Math.round(clamp255(r));
            data[i + 1] = Math.round(clamp255(g));
            data[i + 2] = Math.round(clamp255(b));
        }

        if (s.sharpen > 0 && width > 2 && height > 2) {
            const src = Array.prototype.slice.call(data, 0, len);
            const amount = s.sharpen * 0.06;
            const stride = width * 4;
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const p = y * stride + x * 4;
                    for (let ch = 0; ch < 3; ch++) {
                        const k = p + ch;
                        const edge = 4 * src[k] - src[k - 4] - src[k + 4] - src[k - stride] - src[k + stride];
                        data[k] = Math.round(clamp255(src[k] + amount * edge));
                    }
                }
            }
        }

        if (s.vignette > 0) {
            const cx = (width - 1) / 2 || 1;
            const cy = (height - 1) / 2 || 1;
            const strength = (s.vignette / 100) * 2.5;
            for (let y = 0; y < height; y++) {
                const dy = (y - cy) / cy;
                for (let x = 0; x < width; x++) {
                    const dx = (x - cx) / cx;
                    const factor = 1 - strength * ((dx * dx + dy * dy) / 2);
                    const p = (y * width + x) * 4;
                    data[p] = Math.round(clamp255(data[p] * factor));
                    data[p + 1] = Math.round(clamp255(data[p + 1] * factor));
                    data[p + 2] = Math.round(clamp255(data[p + 2] * factor));
                }
            }
        }

        if (s.grain > 0) {
            const rand = mulberry32(1337);
            for (let i = 0; i < len; i += 4) {
                const noise = (rand() - 0.5) * s.grain * 2;
                data[i] = Math.round(clamp255(data[i] + noise));
                data[i + 1] = Math.round(clamp255(data[i + 1] + noise));
                data[i + 2] = Math.round(clamp255(data[i + 2] + noise));
            }
        }

        return data;
    }

    /** Scales (w, h) to fit inside a max x max box, never upscaling, never below 1px. */
    function fitSize(w, h, max) {
        const scale = Math.min(1, max / Math.max(w, h));
        return {
            width: Math.max(1, Math.round(w * scale)),
            height: Math.max(1, Math.round(h * scale))
        };
    }

    const api = {
        CATEGORIES,
        DEFAULT_SETTINGS,
        SETTING_KEYS,
        createPresets,
        applySettings,
        fitSize,
        mulberry32
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.PixelForgeFilters = api;
})(typeof window !== 'undefined' ? window : globalThis);
