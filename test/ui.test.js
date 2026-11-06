'use strict';
// End-to-end browser test over file://. Optional: needs `playwright-core` and a
// Chromium binary (set CHROMIUM_PATH, or it tries common locations). Skipped otherwise.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

let chromium = null;
try { ({ chromium } = require('playwright-core')); } catch (e) { /* optional */ }
const exe = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
    .find((p) => p && fs.existsSync(p));
const skip = !chromium || !exe ? 'playwright-core or a Chromium binary is not available' : false;

/** Writes a small gradient PNG (no dependencies) and returns its path. */
function makePng(file, w = 120, h = 80) {
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const o = y * (w * 3 + 1) + 1 + x * 3;
        raw[o] = (x * 255) / w; raw[o + 1] = (y * 255) / h; raw[o + 2] = 160;
    }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

test('browser: upload, filter, apply, compare, reset, download, new image', { skip }, async (t) => {
    const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pixelforge-'));
    const png = path.join(tmp, 'photo.png');
    makePng(png);

    const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    t.after(async () => { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
    const ctx = await browser.newContext({ acceptDownloads: true });
    // CDN fonts/icons are cosmetic; keep the test hermetic.
    await ctx.route(/^https?:/, (r) => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });

    await page.goto('file://' + path.join(__dirname, '..', 'index.html'));

    // Hero: seven keyboard-reachable prints; three.js or the documented fallback ran
    const heroMode = await page.evaluate(() => document.documentElement.dataset.hero);
    assert.ok(['webgl', 'fallback'].includes(heroMode), `hero mode: ${heroMode}`);
    assert.equal(await page.locator('.print-btn').count(), 7);
    if (heroMode === 'webgl') {
        const size = await page.evaluate(() => { const c = document.getElementById('heroCanvas'); return [c.width, c.height]; });
        assert.ok(size[0] > 100 && size[1] > 100);
    }

    // Initial state
    assert.equal(await page.locator('.filter-btn').count(), 13);
    assert.equal(await page.locator('.preset-card').count(), 12);
    await page.click('#loadMorePresets');
    assert.equal(await page.locator('.preset-card').count(), 24);

    // Filtering by every category yields cards of that category only
    for (const cat of await page.locator('.filter-btn').evaluateAll((b) => b.map((x) => x.dataset.category))) {
        await page.click(`.filter-btn[data-category="${cat}"]`);
        const cats = await page.locator('.preset-card').evaluateAll((e) => [...new Set(e.map((x) => x.dataset.category))]);
        assert.ok(cats.length >= 1, cat);
        if (cat !== 'all') assert.deepEqual(cats, [cat]);
    }
    await page.click('.filter-btn[data-category="all"]');

    // Clicking a hero print with no photo loaded opens the sample photo with that look applied
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.print-btn').nth(2).dispatchEvent('click');
    await page.waitForSelector('.notification.success');
    await page.waitForSelector('#imageWorkspace', { state: 'visible' });
    assert.equal(await page.evaluate(() => document.getElementById('originalImage').naturalWidth), 960);
    assert.equal(await page.evaluate(() => document.getElementById('editedImage').hasAttribute('src')), true);
    await page.click('#newImage');
    await page.waitForSelector('#uploadArea', { state: 'visible' });
    await page.evaluate(() => document.querySelectorAll('.notification').forEach((n) => n.remove()));

    // Applying with no image gives an error toast, not an alert
    await page.locator('.preset-card').first().click();
    await page.waitForSelector('.notification.error');

    // Upload via the file input (click on the area opens the chooser)
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#uploadArea')]);
    await chooser.setFiles(png);
    await page.waitForSelector('#imageWorkspace', { state: 'visible' });
    assert.equal(await page.evaluate(() => document.getElementById('originalImage').naturalWidth), 120);
    assert.ok(await page.locator('.preset-preview canvas').count() >= 12, 'thumbnails rendered from the uploaded image');

    // Thumbnails differ between presets
    const sums = await page.locator('.preset-preview canvas').evaluateAll((cs) => cs.slice(0, 6).map((c) => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i++) s += d[i]; return s;
    }));
    assert.ok(new Set(sums).size > 1);

    // Apply a B&W preset and verify the real output is greyscale
    await page.click('.filter-btn[data-category="black-white"]');
    await page.locator('.preset-card').first().click();
    await page.waitForSelector('.notification.success');
    await page.waitForFunction(() => document.getElementById('editedImage').complete && document.getElementById('editedImage').naturalWidth > 0);
    const grey = await page.evaluate(() => {
        const img = document.getElementById('editedImage');
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let max = 0; for (let i = 0; i < d.length; i += 4) max = Math.max(max, Math.abs(d[i] - d[i + 1]), Math.abs(d[i + 1] - d[i + 2]));
        return max;
    });
    assert.ok(grey <= 3, `JPEG greyscale drift ${grey}`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('editedImage')).opacity), '1');

    // Compare toggles, reset clears
    await page.click('#toggleView');
    await page.waitForFunction(() => document.getElementById('editedImage').style.opacity === '0');
    await page.click('#toggleView');
    await page.waitForFunction(() => document.getElementById('editedImage').style.opacity === '1');
    await page.click('#resetImage');
    assert.equal(await page.evaluate(() => document.getElementById('editedImage').hasAttribute('src')), false);

    // Download produces a PNG
    await page.locator('.preset-card').first().click();
    await page.waitForFunction(() => document.querySelector('.preset-card.selected'));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#downloadImage')]);
    assert.match(download.suggestedFilename(), /^edited-.*\.png$/);
    const saved = path.join(tmp, 'out.png');
    await download.saveAs(saved);
    assert.deepEqual([...fs.readFileSync(saved).subarray(0, 4)], [137, 80, 78, 71]);

    // New image returns to upload, and the same file can be chosen again
    await page.click('#newImage');
    await page.waitForSelector('#uploadArea', { state: 'visible' });
    await page.setInputFiles('#imageInput', png);
    await page.waitForSelector('#imageWorkspace', { state: 'visible' });

    // Non-image files and sample image
    await page.click('#newImage');
    const txt = path.join(tmp, 'a.txt'); fs.writeFileSync(txt, 'hello');
    await page.setInputFiles('#imageInput', txt);
    await page.waitForSelector('.notification.error');
    await page.click('#sampleImage');
    await page.waitForSelector('#imageWorkspace', { state: 'visible' });
    assert.equal(await page.evaluate(() => document.getElementById('originalImage').naturalWidth), 960);

    // Mobile nav
    await page.setViewportSize({ width: 390, height: 800 });
    await page.click('.mobile-toggle');
    assert.ok(await page.locator('.nav-menu.active').count());

    assert.deepEqual(errors, []);
});

test('browser: hero falls back to a printed row when WebGL is unavailable', { skip }, async (t) => {
    const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu', '--disable-webgl', '--disable-3d-apis'] });
    t.after(() => browser.close());
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
    await page.route(/^https?:/, (r) => r.abort());
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await page.waitForFunction(() => document.documentElement.dataset.hero);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.hero), 'fallback');
    assert.equal(await page.locator('.print-btn canvas').count(), 7);
    // The printed row must not run into the headline.
    const rowBottom = await page.evaluate(() => document.getElementById('heroPrints').getBoundingClientRect().bottom);
    const titleTop = await page.evaluate(() => document.querySelector('.hero-title').getBoundingClientRect().top);
    assert.ok(rowBottom <= titleTop, `prints (${rowBottom}) overlap headline (${titleTop})`);
    await page.locator('.print-btn').nth(0).click();
    await page.waitForSelector('#imageWorkspace', { state: 'visible' });
    assert.deepEqual(errors, []);
});
