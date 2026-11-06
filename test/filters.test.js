'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const F = require('../filters.js');

/** Deterministic test image with a spread of colours (RGBA). */
function makeImage(w = 16, h = 12) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        data[i * 4] = (i * 37) % 256;
        data[i * 4 + 1] = (i * 91 + 40) % 256;
        data[i * 4 + 2] = (i * 17 + 200) % 256;
        data[i * 4 + 3] = 255;
    }
    return { w, h, data };
}

function chroma(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        sum += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    }
    return sum / (data.length / 4);
}

function meanOf(data, ch) {
    let sum = 0;
    for (let i = ch; i < data.length; i += 4) sum += data[i];
    return sum / (data.length / 4);
}

const run = (img, settings) => {
    const copy = new Uint8ClampedArray(img.data);
    F.applySettings(copy, img.w, img.h, settings);
    return copy;
};

test('default settings leave the image untouched', () => {
    const img = makeImage();
    assert.deepEqual(run(img, {}), img.data);
    assert.deepEqual(run(img, F.DEFAULT_SETTINGS), img.data);
    assert.deepEqual(run(img, undefined), img.data);
});

test('alpha channel is never modified', () => {
    const img = makeImage();
    const out = run(img, { brightness: 20, contrast: 30, saturation: 20, vignette: 20, grain: 10, sharpen: 8, hue: 30 });
    for (let i = 3; i < out.length; i += 4) assert.equal(out[i], 255);
});

test('saturation moves chroma in the right direction', () => {
    const img = makeImage();
    const base = chroma(img.data);
    assert.ok(chroma(run(img, { saturation: 30 })) > base);
    assert.ok(chroma(run(img, { saturation: -30 })) < base);
    assert.ok(chroma(run(img, { saturation: -100 })) < 1);
});

test('vibrance boosts chroma', () => {
    const img = makeImage();
    assert.ok(chroma(run(img, { vibrance: 40 })) > chroma(img.data));
});

test('brightness and contrast behave sensibly', () => {
    const img = makeImage();
    assert.ok(meanOf(run(img, { brightness: 20 }), 0) > meanOf(img.data, 0));
    assert.ok(meanOf(run(img, { brightness: -20 }), 0) < meanOf(img.data, 0));
    const spread = (d) => { let v = 0, m = meanOf(d, 1); for (let i = 1; i < d.length; i += 4) v += (d[i] - m) ** 2; return v; };
    assert.ok(spread(run(img, { contrast: 30 })) > spread(img.data));
    assert.ok(spread(run(img, { contrast: -30 })) < spread(img.data));
});

test('warmth shifts red up / blue down and vice versa', () => {
    const img = makeImage();
    const warm = run(img, { warmth: 25 });
    const cool = run(img, { warmth: -25 });
    assert.ok(meanOf(warm, 0) > meanOf(img.data, 0) && meanOf(warm, 2) < meanOf(img.data, 2));
    assert.ok(meanOf(cool, 0) < meanOf(img.data, 0) && meanOf(cool, 2) > meanOf(img.data, 2));
});

test('shadows lift dark pixels more than bright ones', () => {
    const data = new Uint8ClampedArray([20, 20, 20, 255, 235, 235, 235, 255]);
    F.applySettings(data, 2, 1, { shadows: 20 });
    assert.ok(data[0] - 20 > data[4] - 235);
});

test('hue rotation changes colours but keeps greys', () => {
    const data = new Uint8ClampedArray([200, 50, 50, 255, 128, 128, 128, 255]);
    F.applySettings(data, 2, 1, { hue: 90 });
    assert.notDeepEqual(Array.from(data.slice(0, 3)), [200, 50, 50]);
    assert.ok(Math.abs(data[4] - 128) <= 1 && Math.abs(data[5] - 128) <= 1 && Math.abs(data[6] - 128) <= 1);
});

test('mono produces r=g=b', () => {
    const out = run(makeImage(), { mono: true, contrast: 20, sharpen: 5, vignette: 10, grain: 8 });
    for (let i = 0; i < out.length; i += 4) {
        assert.equal(out[i], out[i + 1]);
        assert.equal(out[i + 1], out[i + 2]);
    }
});

test('vignette darkens corners more than the centre; grain is deterministic', () => {
    const w = 21, h = 21;
    const flat = new Uint8ClampedArray(w * h * 4).fill(128);
    for (let i = 3; i < flat.length; i += 4) flat[i] = 255;
    const v = new Uint8ClampedArray(flat);
    F.applySettings(v, w, h, { vignette: 20 });
    const centre = (10 * w + 10) * 4;
    assert.equal(v[centre], 128);
    assert.ok(v[0] < v[centre]);

    const a = new Uint8ClampedArray(flat), b = new Uint8ClampedArray(flat);
    F.applySettings(a, w, h, { grain: 10 });
    F.applySettings(b, w, h, { grain: 10 });
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, flat);
});

test('sharpen increases edge contrast without touching flat areas', () => {
    const w = 5, h = 3;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const v = x < 2 ? 100 : 150;
        data[p] = data[p + 1] = data[p + 2] = v; data[p + 3] = 255;
    }
    F.applySettings(data, w, h, { sharpen: 10 });
    const mid = w * 4 + 4 * 1; // row 1, x=1 (just left of edge)
    assert.ok(data[mid] < 100);
    assert.ok(data[w * 4 + 4 * 2] > 150);
});

test('output is always within 0-255 even for extreme settings (plain arrays)', () => {
    const img = makeImage();
    const plain = Array.from(img.data);
    F.applySettings(plain, img.w, img.h, { brightness: 200, contrast: 90, saturation: 100, vibrance: 100, hue: 180, warmth: 100, tint: 100, shadows: 100, highlights: 100, vignette: 100, grain: 100, sharpen: 10 });
    for (const v of plain) assert.ok(Number.isInteger(v) && v >= 0 && v <= 255, `bad value ${v}`);
});

test('presets: at least 300, deterministic, unique ids and sane settings', () => {
    const a = F.createPresets();
    const b = F.createPresets();
    assert.ok(a.length >= 300);
    assert.deepEqual(a, b);
    assert.equal(new Set(a.map((p) => p.id)).size, a.length);
    for (const p of a) {
        for (const k of F.SETTING_KEYS) assert.ok(k in p.settings, `${p.name} missing ${k}`);
        assert.ok(p.name && p.name.trim() === p.name);
    }
});

test('preset names are unique within a category', () => {
    for (const cat of F.CATEGORIES) {
        const names = F.createPresets().filter((p) => p.category === cat.id).map((p) => p.name);
        assert.equal(new Set(names).size, names.length, cat.id);
    }
});

test('every category has presets and category traits hold', () => {
    const presets = F.createPresets();
    for (const cat of F.CATEGORIES) {
        const list = presets.filter((p) => p.category === cat.id);
        assert.ok(list.length >= 25, `${cat.id} has ${list.length}`);
    }
    const of = (id) => presets.filter((p) => p.category === id);
    assert.ok(of('black-white').every((p) => p.settings.mono === true));
    assert.ok(presets.filter((p) => p.category !== 'black-white').every((p) => p.settings.mono === false));
    assert.ok(of('warm').every((p) => p.settings.warmth > 0));
    assert.ok(of('cool').every((p) => p.settings.warmth < 0));
    assert.ok(of('bright').every((p) => p.settings.brightness > 0));
    assert.ok(of('moody').every((p) => p.settings.brightness < 0));
    assert.ok(of('vintage').every((p) => p.settings.saturation < 0 && p.settings.grain > 0));
});

test('applying a B&W preset yields a greyscale image; a warm preset warms it', () => {
    const img = makeImage();
    const presets = F.createPresets();
    const bw = presets.find((p) => p.category === 'black-white');
    const out = run(img, bw.settings);
    for (let i = 0; i < out.length; i += 4) assert.ok(out[i] === out[i + 1] && out[i + 1] === out[i + 2]);
    const warm = run(img, presets.find((p) => p.category === 'warm').settings);
    assert.ok(meanOf(warm, 0) - meanOf(warm, 2) > meanOf(img.data, 0) - meanOf(img.data, 2));
});

test('fitSize never upscales, keeps aspect and stays >= 1px', () => {
    assert.deepEqual(F.fitSize(100, 50, 240), { width: 100, height: 50 });
    assert.deepEqual(F.fitSize(4000, 2000, 200), { width: 200, height: 100 });
    assert.deepEqual(F.fitSize(3, 4000, 200), { width: 1, height: 200 });
});

test('index.html: filter buttons match categories; every dependency exists', () => {
    const root = path.join(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const buttons = [...html.matchAll(/class="filter-btn[^"]*" data-category="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(buttons, ['all', ...F.CATEGORIES.map((c) => c.id)]);

    for (const m of html.matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
    for (const [a, b] of [['vendor/three.min.js', 'hero.js'], ['filters.js', 'sample.js'], ['sample.js', 'hero.js'], ['hero.js', 'script.js']]) assert.ok(html.indexOf(a) < html.indexOf(b), `${a} must load before ${b}`);

    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(m[1]), `dead anchor #${m[1]}`);
    for (const id of ['uploadArea', 'imageInput', 'imageWorkspace', 'originalImage', 'editedImage', 'toggleView', 'resetImage', 'downloadImage', 'newImage', 'heroStage', 'heroCanvas', 'heroPrints', 'presetsGrid', 'loadMorePresets', 'loadingOverlay', 'sampleImage']) {
        assert.ok(ids.has(id), `missing #${id}`);
    }
    assert.ok(!/href="#"/.test(html), 'placeholder href="#" found');
});
