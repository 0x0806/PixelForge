// PixelForge UI. Pixel maths lives in filters.js (window.PixelForgeFilters).
class PixelForge {
    constructor() {
        this.F = window.PixelForgeFilters;
        this.presets = this.F.createPresets();
        this.filteredPresets = [...this.presets];
        this.activeCategory = 'all';
        this.loadedPresetsCount = 0;
        this.presetsPerLoad = 12;

        this.currentImage = null;
        this.currentPreset = null;
        this.showingEdited = false;
        this.busy = false;
        this.originalUrl = null;
        this.editedUrl = null;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Small copy of the uploaded image used for the preset thumbnails.
        this.thumbBase = null;
        this.thumbCache = new Map();

        this.el = {
            uploadArea: document.getElementById('uploadArea'),
            imageInput: document.getElementById('imageInput'),
            workspace: document.getElementById('imageWorkspace'),
            original: document.getElementById('originalImage'),
            edited: document.getElementById('editedImage'),
            toggle: document.getElementById('toggleView'),
            reset: document.getElementById('resetImage'),
            download: document.getElementById('downloadImage'),
            newImage: document.getElementById('newImage'),
            grid: document.getElementById('presetsGrid'),
            loadMore: document.getElementById('loadMorePresets'),
            overlay: document.getElementById('loadingOverlay')
        };

        this.setupUpload();
        this.bindEvents();
        this.renderPresets();
    }

    // ---------- Upload ----------

    setupUpload() {
        const { uploadArea, imageInput } = this.el;

        uploadArea.addEventListener('click', (e) => {
            // The hidden input lives inside the area; ignore its own bubbling click.
            if (e.target === imageInput) return;
            imageInput.click();
        });
        uploadArea.addEventListener('keydown', (e) => {
            if (e.target === uploadArea && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                imageInput.click();
            }
        });
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer && e.dataTransfer.files[0];
            if (file) this.handleImageUpload(file);
        });
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleImageUpload(file);
            // Allow choosing the same file again later.
            imageInput.value = '';
        });
    }

    handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showErrorMessage('Please upload a valid image file (JPEG, PNG, GIF, WebP).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.showErrorMessage('Image file is too large. Please choose a file smaller than 10MB.');
            return;
        }
        this.loadImageFromUrl(URL.createObjectURL(file), true);
    }

    loadImageFromUrl(url, isObjectUrl) {
        this.showLoading('Loading your image...');
        const img = new Image();
        img.onload = () => {
            if (img.naturalWidth > 4000 || img.naturalHeight > 4000) {
                if (isObjectUrl) URL.revokeObjectURL(url);
                this.hideLoading();
                this.showErrorMessage('Image dimensions are too large. Maximum supported size is 4000x4000 pixels.');
                return;
            }
            if (this.originalUrl) URL.revokeObjectURL(this.originalUrl);
            this.originalUrl = isObjectUrl ? url : null;
            this.setupImageWorkspace(img);
            this.hideLoading();
        };
        img.onerror = () => {
            if (isObjectUrl) URL.revokeObjectURL(url);
            this.hideLoading();
            this.showErrorMessage('Failed to load image. Please try a different file.');
        };
        img.src = url;
    }

    /** Draws a generated landscape so the editor can be tried without a file. */
    loadSampleImage() {
        const c = document.createElement('canvas');
        c.width = 960;
        c.height = 640;
        const x = c.getContext('2d');
        const sky = x.createLinearGradient(0, 0, 0, 400);
        sky.addColorStop(0, '#3b6fb6');
        sky.addColorStop(0.6, '#f4b183');
        sky.addColorStop(1, '#fde7c4');
        x.fillStyle = sky;
        x.fillRect(0, 0, 960, 640);
        x.fillStyle = '#fff3b0';
        x.beginPath();
        x.arc(680, 300, 70, 0, Math.PI * 2);
        x.fill();
        const hills = [['#6b8f71', 420, 90], ['#3f6b4f', 480, 70], ['#27493a', 540, 50]];
        hills.forEach(([color, base, amp], n) => {
            x.fillStyle = color;
            x.beginPath();
            x.moveTo(0, 640);
            for (let px = 0; px <= 960; px += 10) {
                x.lineTo(px, base + Math.sin(px / (110 + n * 40) + n * 2) * amp * 0.5);
            }
            x.lineTo(960, 640);
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
        this.loadImageFromUrl(c.toDataURL('image/png'), false);
    }

    setupImageWorkspace(img) {
        this.currentImage = img;
        this.currentPreset = null;
        this.showingEdited = false;

        this.el.uploadArea.style.display = 'none';
        this.el.workspace.style.display = 'block';

        this.canvas.width = img.naturalWidth;
        this.canvas.height = img.naturalHeight;
        this.ctx.drawImage(img, 0, 0);

        this.el.original.src = img.src;
        this.clearEdited();

        // Build the shared thumbnail source once per image.
        const size = this.F.fitSize(img.naturalWidth, img.naturalHeight, 240);
        const t = document.createElement('canvas');
        t.width = size.width;
        t.height = size.height;
        const tctx = t.getContext('2d', { willReadFrequently: true });
        tctx.drawImage(img, 0, 0, size.width, size.height);
        this.thumbBase = tctx.getImageData(0, 0, size.width, size.height);
        this.thumbCache.clear();

        this.loadedPresetsCount = 0;
        this.renderPresets();
        this.updateControls();

        setTimeout(() => {
            document.getElementById('presets').scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }

    showUploadArea() {
        this.currentImage = null;
        this.currentPreset = null;
        this.thumbBase = null;
        this.thumbCache.clear();
        this.clearEdited();
        if (this.originalUrl) {
            URL.revokeObjectURL(this.originalUrl);
            this.originalUrl = null;
        }
        this.el.original.removeAttribute('src');
        this.el.workspace.style.display = 'none';
        this.el.uploadArea.style.display = '';
        this.loadedPresetsCount = 0;
        this.renderPresets();
        this.updateControls();
    }

    // ---------- Events ----------

    bindEvents() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterPresets(btn.dataset.category);
            });
        });

        this.el.loadMore.addEventListener('click', () => this.renderPresets());
        this.el.toggle.addEventListener('click', () => this.toggleImageComparison());
        this.el.reset.addEventListener('click', () => this.resetImage());
        this.el.download.addEventListener('click', () => this.downloadImage());
        this.el.newImage.addEventListener('click', () => this.showUploadArea());

        const demo = document.getElementById('sampleImage');
        if (demo) {
            demo.addEventListener('click', () => {
                document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
                this.loadSampleImage();
            });
        }

        this.bindNavigation();
    }

    bindNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const mobileToggle = document.querySelector('.mobile-toggle');
        const navMenu = document.querySelector('.nav-menu');

        const closeMenu = () => {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
            mobileToggle.setAttribute('aria-expanded', 'false');
        };

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const target = document.querySelector(link.getAttribute('href'));
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                closeMenu();
            });
        });

        mobileToggle.addEventListener('click', () => {
            const open = navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active', open);
            mobileToggle.setAttribute('aria-expanded', String(open));
        });
        document.addEventListener('click', (e) => {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) closeMenu();
        });

        // Highlight the nav link of the section in view.
        if ('IntersectionObserver' in window) {
            const byId = new Map();
            navLinks.forEach((l) => byId.set(l.getAttribute('href').slice(1), l));
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    navLinks.forEach((l) => l.classList.remove('active'));
                    const link = byId.get(entry.target.id);
                    if (link) link.classList.add('active');
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            byId.forEach((_, id) => {
                const section = document.getElementById(id);
                if (section) observer.observe(section);
            });
        }
    }

    // ---------- Presets grid ----------

    filterPresets(category) {
        this.activeCategory = category;
        this.filteredPresets = category === 'all'
            ? [...this.presets]
            : this.presets.filter((p) => p.category === category);
        this.loadedPresetsCount = 0;
        this.renderPresets();
    }

    renderPresets() {
        const grid = this.el.grid;
        if (this.loadedPresetsCount === 0) grid.innerHTML = '';

        const end = Math.min(this.loadedPresetsCount + this.presetsPerLoad, this.filteredPresets.length);
        for (let i = this.loadedPresetsCount; i < end; i++) {
            grid.appendChild(this.createPresetCard(this.filteredPresets[i]));
        }
        this.loadedPresetsCount = end;
        this.el.loadMore.style.display = end < this.filteredPresets.length ? '' : 'none';
    }

    getThumbnail(preset) {
        if (!this.thumbBase) return null;
        let canvas = this.thumbCache.get(preset.id);
        if (!canvas) {
            const { width, height, data } = this.thumbBase;
            const copy = new ImageData(new Uint8ClampedArray(data), width, height);
            this.F.applySettings(copy.data, width, height, preset.settings);
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').putImageData(copy, 0, 0);
            this.thumbCache.set(preset.id, canvas);
        }
        return canvas;
    }

    createPresetCard(preset) {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.dataset.presetId = preset.id;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Apply preset ${preset.name}`);
        if (this.currentPreset && this.currentPreset.id === preset.id) card.classList.add('selected');

        const preview = document.createElement('div');
        preview.className = 'preset-preview';
        const thumb = this.getThumbnail(preset);
        if (thumb) {
            preview.appendChild(thumb);
        } else {
            const swatch = document.createElement('div');
            swatch.className = 'preset-swatch';
            swatch.style.background = preset.thumbnail;
            preview.appendChild(swatch);
        }
        const overlay = document.createElement('div');
        overlay.className = 'preset-overlay';
        const apply = document.createElement('span');
        apply.className = 'preset-apply';
        apply.textContent = 'Apply Preset';
        overlay.appendChild(apply);
        preview.appendChild(overlay);

        const info = document.createElement('div');
        info.className = 'preset-info';
        const name = document.createElement('h3');
        name.className = 'preset-name';
        name.textContent = preset.name;
        const cat = document.createElement('p');
        cat.className = 'preset-category';
        cat.textContent = preset.category;
        info.append(name, cat);

        card.append(preview, info);
        card.addEventListener('click', () => this.applyPreset(preset.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.applyPreset(preset.id);
            }
        });
        return card;
    }

    // ---------- Editing ----------

    async applyPreset(presetId) {
        if (!this.currentImage) {
            this.showErrorMessage('Please upload an image first!');
            document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (this.busy) return;
        const preset = this.presets.find((p) => p.id === presetId);
        if (!preset) return;

        this.busy = true;
        this.showLoading('Applying preset...');
        // Let the overlay paint before the (blocking) pixel work.
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        try {
            const { naturalWidth: w, naturalHeight: h } = this.currentImage;
            this.canvas.width = w;
            this.canvas.height = h;
            this.ctx.drawImage(this.currentImage, 0, 0);
            const imageData = this.ctx.getImageData(0, 0, w, h);
            this.F.applySettings(imageData.data, w, h, preset.settings);
            this.ctx.putImageData(imageData, 0, 0);

            const blob = await new Promise((resolve) => this.canvas.toBlob(resolve, 'image/jpeg', 0.92));
            if (!blob) throw new Error('Could not encode image');
            this.clearEdited();
            this.editedUrl = URL.createObjectURL(blob);
            this.el.edited.src = this.editedUrl;

            this.currentPreset = preset;
            this.showingEdited = true;
            this.updateControls();
            document.querySelectorAll('.preset-card.selected').forEach((c) => c.classList.remove('selected'));
            const card = this.el.grid.querySelector(`[data-preset-id="${preset.id}"]`);
            if (card) card.classList.add('selected');
            this.showSuccessMessage(`Applied preset: ${preset.name}`);
        } catch (error) {
            console.error('Error applying preset:', error);
            this.showErrorMessage('Failed to apply preset. Please try again.');
        } finally {
            this.busy = false;
            this.hideLoading();
        }
    }

    clearEdited() {
        if (this.editedUrl) {
            URL.revokeObjectURL(this.editedUrl);
            this.editedUrl = null;
        }
        this.el.edited.removeAttribute('src');
        this.showingEdited = false;
    }

    toggleImageComparison() {
        if (!this.currentPreset) {
            this.showErrorMessage('Apply a preset first to compare.');
            return;
        }
        this.showingEdited = !this.showingEdited;
        this.updateControls();
    }

    updateControls() {
        const hasEdit = !!this.currentPreset;
        this.el.edited.style.opacity = hasEdit && this.showingEdited ? '1' : '0';
        this.el.toggle.setAttribute('aria-pressed', String(hasEdit && !this.showingEdited));
        const showOriginalLabel = hasEdit && !this.showingEdited;
        this.el.toggle.innerHTML = showOriginalLabel
            ? '<i class="fas fa-eye-slash"></i> Show Edit'
            : '<i class="fas fa-eye"></i> Compare';
        this.el.toggle.title = showOriginalLabel ? 'Show the edited image' : 'Show the original image';
    }

    resetImage() {
        if (!this.currentImage) return;
        this.currentPreset = null;
        this.clearEdited();
        this.canvas.width = this.currentImage.naturalWidth;
        this.canvas.height = this.currentImage.naturalHeight;
        this.ctx.drawImage(this.currentImage, 0, 0);
        document.querySelectorAll('.preset-card.selected').forEach((c) => c.classList.remove('selected'));
        this.updateControls();
    }

    downloadImage() {
        if (!this.currentImage) {
            this.showErrorMessage('No image to download! Upload one first.');
            return;
        }
        const filename = this.currentPreset
            ? `edited-${this.currentPreset.name.toLowerCase().replace(/\s+/g, '-')}.png`
            : 'edited-image.png';
        this.canvas.toBlob((blob) => {
            if (!blob) {
                this.showErrorMessage('Failed to export the image.');
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.showSuccessMessage('Image downloaded successfully!');
        }, 'image/png');
    }

    // ---------- Feedback ----------

    showLoading(message = 'Loading...') {
        this.el.overlay.querySelector('p').textContent = message;
        this.el.overlay.classList.add('active');
    }

    hideLoading() {
        this.el.overlay.classList.remove('active');
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'success') {
        const note = document.createElement('div');
        note.className = `notification ${type}`;
        note.setAttribute('role', type === 'error' ? 'alert' : 'status');
        const icon = document.createElement('i');
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        note.append(icon, document.createTextNode(` ${message}`));
        document.body.appendChild(note);
        setTimeout(() => {
            note.classList.add('leaving');
            setTimeout(() => note.remove(), 300);
        }, 3000);
    }
}

function scrollToEditor() {
    const editor = document.getElementById('editor');
    if (editor) editor.scrollIntoView({ behavior: 'smooth' });
}

function initializeApp() {
    if (!window.pixelForge) window.pixelForge = new PixelForge();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
