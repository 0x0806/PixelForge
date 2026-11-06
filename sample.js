/* Generated sample photo (a dusk landscape) used by the hero prints and the editor demo. */
(function (root) {
    'use strict';

    /** Returns a canvas of width x height containing the sample photo. */
    function draw(width, height) {
        const W = 960;
        const H = 640;
        const src = document.createElement('canvas');
        src.width = W;
        src.height = H;
        const x = src.getContext('2d');

        const sky = x.createLinearGradient(0, 0, 0, 400);
        sky.addColorStop(0, '#3b6fb6');
        sky.addColorStop(0.6, '#f4b183');
        sky.addColorStop(1, '#fde7c4');
        x.fillStyle = sky;
        x.fillRect(0, 0, W, H);

        x.fillStyle = '#fff3b0';
        x.beginPath();
        x.arc(680, 300, 70, 0, Math.PI * 2);
        x.fill();

        [['#6b8f71', 420, 90], ['#3f6b4f', 480, 70], ['#27493a', 540, 50]].forEach(([color, base, amp], n) => {
            x.fillStyle = color;
            x.beginPath();
            x.moveTo(0, H);
            for (let px = 0; px <= W; px += 10) {
                x.lineTo(px, base + Math.sin(px / (110 + n * 40) + n * 2) * amp * 0.5);
            }
            x.lineTo(W, H);
            x.closePath();
            x.fill();
        });

        x.fillStyle = '#c0392b';
        x.fillRect(180, 470, 70, 60);
        x.fillStyle = '#7b241c';
        x.beginPath();
        x.moveTo(170, 470);
        x.lineTo(215, 430);
        x.lineTo(260, 470);
        x.closePath();
        x.fill();

        if (width === W && height === H) return src;
        const out = document.createElement('canvas');
        out.width = width;
        out.height = height;
        const o = out.getContext('2d');
        o.imageSmoothingQuality = 'high';
        o.drawImage(src, 0, 0, width, height);
        return out;
    }

    root.PixelForgeSample = { draw };
})(window);
