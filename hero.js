/*
 * Hero: seven prints of the sample photo, each graded by the real PixelForge engine
 * (filters.js) and shown on a three.js "contact table". Falls back to a plain row of the
 * same prints when WebGL or three.js is unavailable. document.documentElement.dataset.hero
 * is 'webgl' or 'fallback' so the path is observable.
 */
(function () {
    'use strict';

    const F = window.PixelForgeFilters;
    const Sample = window.PixelForgeSample;
    const stage = document.getElementById('heroStage');
    const canvas = document.getElementById('heroCanvas');
    const list = document.getElementById('heroPrints');
    if (!F || !Sample || !stage || !canvas || !list) return;

    const PICKS = ['vintage', 'cinematic', 'black-white', 'nature', 'moody', 'bright', 'cool'];
    const PRINT_W = 480;
    const PRINT_H = 420;
    const PHOTO_W = 440;
    const PHOTO_H = 293;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const presets = F.createPresets();
    const chosen = PICKS.map((cat) => presets.find((p) => p.category === cat));
    const label = (id) => F.CATEGORIES.find((c) => c.id === id).label;

    function drawPrint(preset) {
        const c = document.createElement('canvas');
        c.width = PRINT_W;
        c.height = PRINT_H;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#f3f3f1';
        x.fillRect(0, 0, PRINT_W, PRINT_H);

        const photo = Sample.draw(PHOTO_W, PHOTO_H);
        const px = photo.getContext('2d', { willReadFrequently: true });
        const img = px.getImageData(0, 0, PHOTO_W, PHOTO_H);
        F.applySettings(img.data, PHOTO_W, PHOTO_H, preset.settings);
        px.putImageData(img, 0, 0);
        x.drawImage(photo, 20, 20);

        x.fillStyle = '#000';
        x.font = '600 30px Archivo, system-ui, sans-serif';
        x.fillText(preset.name, 20, 358);
        x.fillStyle = '#55575a';
        x.font = '400 22px Archivo, system-ui, sans-serif';
        x.fillText(label(preset.category), 20, 392);
        return c;
    }

    function openPreset(id) {
        if (window.pixelForge) window.pixelForge.openPreset(id);
    }

    // One real button per print: keyboard access, and the visible row when WebGL is unavailable.
    const buttons = chosen.map((preset) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'print-btn';
        btn.dataset.presetId = preset.id;
        btn.setAttribute('aria-label', `Try ${preset.name} (${label(preset.category)}) in the editor`);
        btn.addEventListener('click', () => openPreset(preset.id));
        li.appendChild(btn);
        list.appendChild(li);
        return btn;
    });

    function showFallback(canvases) {
        document.documentElement.dataset.hero = 'fallback';
        stage.classList.add('hero-stage--fallback');
        canvases.forEach((c, i) => buttons[i].appendChild(c));
    }

    function start() {
        const canvases = chosen.map(drawPrint);
        let renderer;
        try {
            if (!window.THREE) throw new Error('three.js missing');
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        } catch (e) {
            showFallback(canvases);
            return;
        }
        document.documentElement.dataset.hero = 'webgl';
        stage.classList.add('hero-stage--webgl');

        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
        camera.position.z = 12;
        const group = new THREE.Group();
        scene.add(group);

        const PW = 3.2;
        const PH = PW * (PRINT_H / PRINT_W);

        // Soft shadow shared by every print.
        const sc = document.createElement('canvas');
        sc.width = sc.height = 128;
        const sx = sc.getContext('2d');
        sx.shadowColor = 'rgba(0,0,0,0.75)';
        sx.shadowBlur = 22;
        sx.fillStyle = '#000';
        sx.fillRect(24, 24, 80, 80);
        const shadowTex = new THREE.CanvasTexture(sc);
        shadowTex.minFilter = THREE.LinearFilter;
        shadowTex.generateMipmaps = false;
        const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.32, depthWrite: false });
        const geo = new THREE.PlaneGeometry(PW, PH);
        const shadowGeo = new THREE.PlaneGeometry(PW * 1.6, PH * 1.6);

        const meshes = canvases.map((c, i) => {
            const tex = new THREE.CanvasTexture(c);
            tex.encoding = THREE.sRGBEncoding;
            tex.minFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: reduceMotion ? 1 : 0 });
            const mesh = new THREE.Mesh(geo, mat);
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.position.set(0.1, -0.22, -0.02);
            mesh.add(shadow);
            mesh.userData = { index: i, fin: { x: 0, y: 0, z: 0, rz: 0, ry: 0 }, hover: 0 };
            mesh.position.set(0, -1.2, -3);
            group.add(mesh);
            return mesh;
        });

        let hovered = -1;
        let pointerX = 0;
        let pointerY = 0;
        let raf = 0;
        let last = 0;
        const startTime = performance.now();
        const ENTRANCE_STEP = 90;

        function layout() {
            const w = stage.clientWidth;
            const h = stage.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            const visH = 2 * camera.position.z * Math.tan((camera.fov / 2) * Math.PI / 180);
            const visW = visH * camera.aspect;
            const wide = w > 820 && w / h > 1.05;
            const spacing = wide ? 1.35 : 0.95;
            const fanW = 6 * spacing + PW;
            let s;
            if (wide) {
                const frac = 0.5;
                s = Math.min((visW * frac) / fanW, (visH * 0.62) / PH);
                group.position.set(visW / 2 - (visW * frac) / 2 - visW * 0.03, visH * 0.1, 0);
            } else {
                s = Math.min((visW * 0.94) / fanW, (visH * 0.26) / PH);
                group.position.set(0, visH * 0.27, 0);
            }
            group.scale.setScalar(s);
            meshes.forEach((m, i) => {
                const t = i - 3;
                m.userData.fin = {
                    x: t * spacing,
                    y: -Math.abs(t) * 0.14 + (i % 2 ? 0.08 : -0.04),
                    z: -Math.abs(t) * 0.3 + i * 0.01,
                    rz: -t * 0.07,
                    ry: -t * 0.1
                };
            });
            kick();
        }

        function tick(now) {
            raf = 0;
            const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
            last = now;
            const k = 1 - Math.exp(-dt * 9);
            const elapsed = now - startTime;
            let moving = false;

            meshes.forEach((m, i) => {
                const f = m.userData.fin;
                const entered = reduceMotion || elapsed > i * ENTRANCE_STEP;
                const lift = i === hovered ? 1 : 0;
                const tx = f.x;
                const ty = entered ? f.y + lift * 0.25 : -1.2;
                const tz = entered ? f.z + lift * 1.4 : -3;
                const trz = lift ? 0 : f.rz;
                const try_ = lift ? 0 : f.ry;
                const ts = 1 + lift * 0.06;
                const to = entered ? 1 : 0;
                const kk = reduceMotion ? 1 : (entered ? k : 0);
                const ko = reduceMotion ? 1 : (entered ? 1 - Math.exp(-dt * 5) : 0);

                m.position.x += (tx - m.position.x) * kk;
                m.position.y += (ty - m.position.y) * kk;
                m.position.z += (tz - m.position.z) * kk;
                m.rotation.z += (trz - m.rotation.z) * kk;
                m.rotation.y += (try_ - m.rotation.y) * kk;
                const sNext = m.scale.x + (ts - m.scale.x) * kk;
                m.scale.set(sNext, sNext, 1);
                m.material.opacity += (to - m.material.opacity) * ko;

                if (!entered || Math.abs(ty - m.position.y) > 0.002 || Math.abs(tz - m.position.z) > 0.002 ||
                    Math.abs(trz - m.rotation.z) > 0.001 || Math.abs(ts - sNext) > 0.001 ||
                    Math.abs(to - m.material.opacity) > 0.01) {
                    moving = true;
                }
            });

            const gk = reduceMotion ? 1 : k;
            const rx = reduceMotion ? 0 : -pointerY * 0.06;
            const ry = reduceMotion ? 0 : pointerX * 0.12;
            group.rotation.x += (rx - group.rotation.x) * gk;
            group.rotation.y += (ry - group.rotation.y) * gk;
            if (Math.abs(rx - group.rotation.x) > 0.0005 || Math.abs(ry - group.rotation.y) > 0.0005) moving = true;

            renderer.render(scene, camera);
            if (moving && visible && !document.hidden) raf = requestAnimationFrame(tick);
        }

        let visible = true;
        function kick() {
            if (!raf && visible) raf = requestAnimationFrame(tick);
        }

        // Pointer: parallax and hover on mouse; tap acts as click on touch.
        function ndc(e) {
            const r = canvas.getBoundingClientRect();
            return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
        }
        const ray = new THREE.Raycaster();
        function pick(e) {
            ray.setFromCamera(ndc(e), camera);
            const hit = ray.intersectObjects(meshes, false)[0];
            return hit ? hit.object.userData.index : -1;
        }
        canvas.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse') return;
            const p = ndc(e);
            pointerX = p.x;
            pointerY = p.y;
            const idx = pick(e);
            if (idx !== hovered) {
                hovered = idx;
                canvas.style.cursor = idx >= 0 ? 'pointer' : '';
            }
            kick();
        });
        canvas.addEventListener('pointerleave', () => {
            hovered = -1;
            pointerX = pointerY = 0;
            canvas.style.cursor = '';
            kick();
        });
        canvas.addEventListener('click', (e) => {
            const idx = pick(e);
            if (idx >= 0) openPreset(chosen[idx].id);
        });
        buttons.forEach((b, i) => {
            b.addEventListener('focus', () => { hovered = i; kick(); });
            b.addEventListener('blur', () => { hovered = -1; kick(); });
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                if (visible) kick();
            }).observe(stage);
        }
        document.addEventListener('visibilitychange', kick);
        if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
        else window.addEventListener('resize', layout);

        const run = () => { layout(); last = performance.now(); kick(); };
        // Fonts are drawn into the captions; redraw once they are ready.
        const redraw = () => {
            chosen.forEach((p, i) => {
                const c = drawPrint(p);
                const ctx = meshes[i].material.map.image.getContext('2d');
                ctx.drawImage(c, 0, 0);
                meshes[i].material.map.needsUpdate = true;
            });
            kick();
        };
        run();
        if (document.fonts && document.fonts.load) {
            Promise.all([document.fonts.load('600 30px Archivo'), document.fonts.load('400 22px Archivo')])
                .then(redraw).catch(() => {});
        }
    }

    start();
})();
