// Enhanced PresetPro JavaScript with Advanced Features
class PresetPro {
    constructor() {
        this.currentImage = null;
        this.canvas = null;
        this.ctx = null;
        this.presets = [];
        this.filteredPresets = [];
        this.currentPreset = null;
        this.loadedPresetsCount = 0;
        this.presetsPerLoad = 12;

        this.init();
        this.generatePresets();
        this.bindEvents();
        this.renderPresets();
    }

    init() {
        // Create canvas for image processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize upload area
        this.setupDragAndDrop();

        // Set initial preset filter
        this.filteredPresets = this.presets;
    }

    // Generate 1000+ professional presets
    generatePresets() {
        const categories = [
            'portrait', 'landscape', 'vintage', 'cinematic', 'black-white',
            'street', 'nature', 'urban', 'moody', 'bright', 'warm', 'cool'
        ];

        const presetNames = [
            'Golden Hour', 'Vintage Film', 'Deep Shadows', 'Bright Whites', 'Warm Sunset',
            'Cool Blues', 'Forest Green', 'Urban Gray', 'Sepia Dreams', 'High Contrast',
            'Soft Focus', 'Sharp Details', 'Matte Finish', 'Glossy Pop', 'Faded Memory',
            'Bold Colors', 'Pastel Tones', 'Dark Mood', 'Light Airy', 'Rich Saturation',
            'Desaturated', 'Monochrome', 'Duo Tone', 'Split Tone', 'Color Grade',
            'Film Emulation', 'Digital Art', 'HDR Effect', 'Cross Process', 'Bleach Bypass',
            'Orange Teal', 'Teal Orange', 'Pink Purple', 'Blue Yellow', 'Green Magenta',
            'Retro Vibes', 'Modern Clean', 'Grunge Style', 'Minimal Look', 'Maximum Impact',
            'Soft Glow', 'Hard Light', 'Dramatic Sky', 'Peaceful Calm', 'Energy Boost',
            'Natural Look', 'Artistic Flair', 'Professional', 'Creative Edit', 'Instagram Ready'
        ];

        // Generate 300 presets (removed pro limitation)
        for (let i = 0; i < 300; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const baseName = presetNames[Math.floor(Math.random() * presetNames.length)];
            const variation = Math.floor(Math.random() * 20) + 1;

            this.presets.push({
                id: i + 1,
                name: `${baseName} ${variation > 1 ? variation : ''}`.trim(),
                category: category,
                thumbnail: this.generateThumbnail(category),
                settings: this.generatePresetSettings(),
                previewCanvas: null // Will store generated preview
            });
        }

        this.filteredPresets = [...this.presets];
    }

    generateThumbnail(category) {
        // Generate gradient backgrounds for thumbnails
        const gradients = {
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

        return gradients[category] || gradients.portrait;
    }

    generatePresetSettings() {
        return {
            brightness: (Math.random() - 0.5) * 50,
            contrast: (Math.random() - 0.5) * 80,
            saturation: (Math.random() - 0.5) * 60,
            hue: (Math.random() - 0.5) * 40,
            shadows: (Math.random() - 0.5) * 30,
            highlights: (Math.random() - 0.5) * 30,
            vibrance: (Math.random() - 0.5) * 40,
            warmth: (Math.random() - 0.5) * 50,
            tint: (Math.random() - 0.5) * 30,
            vignette: Math.random() * 20,
            grain: Math.random() * 15,
            sharpen: Math.random() * 10
        };
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        const imageInput = document.getElementById('imageInput');

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

            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.handleImageUpload(files[0]);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });
    }

    handleImageUpload(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showErrorMessage('Please upload a valid image file (JPEG, PNG, GIF, WebP).');
            return;
        }

        // Check file size (limit to 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showErrorMessage('Image file is too large. Please choose a file smaller than 10MB.');
            return;
        }

        const reader = new FileReader();

        this.showLoading('Processing your image...');

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Check image dimensions
                if (img.width > 4000 || img.height > 4000) {
                    this.showErrorMessage('Image dimensions are too large. Maximum supported size is 4000x4000 pixels.');
                    this.hideLoading();
                    return;
                }

                this.currentImage = img;
                this.setupImageWorkspace(img);
                this.hideLoading();
            };
            img.onerror = () => {
                this.showErrorMessage('Failed to load image. Please try a different file.');
                this.hideLoading();
            };
            img.src = e.target.result;
            img.crossOrigin = 'anonymous'; // Add this to prevent CORS issues
        };

        reader.onerror = () => {
            this.showErrorMessage('Failed to read file. Please try again.');
            this.hideLoading();
        };

        reader.readAsDataURL(file);
    }

    setupImageWorkspace(img) {
        const uploadArea = document.getElementById('uploadArea');
        const imageWorkspace = document.getElementById('imageWorkspace');
        const originalImage = document.getElementById('originalImage');
        const editedImage = document.getElementById('editedImage');

        // Hide upload area and show workspace
        uploadArea.style.display = 'none';
        imageWorkspace.style.display = 'block';

        // Set up canvas
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        // Display original image
        originalImage.src = img.src;
        editedImage.src = img.src;

        // Generate preset previews
        this.generatePresetPreviews(img);

        // Re-render presets with new previews
        this.loadedPresetsCount = 0;
        this.renderPresets();

        // Scroll to presets section
        setTimeout(() => {
            document.getElementById('presets').scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }

    bindEvents() {
        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active filter
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Filter presets
                const category = e.target.dataset.category;
                this.filterPresets(category);
            });
        });

        // Load more presets
        const loadMoreBtn = document.getElementById('loadMorePresets');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMorePresets();
            });
        }

        // Image controls
        this.bindImageControls();

        // Navigation
        this.bindNavigation();
    }

    bindImageControls() {
        const toggleBtn = document.getElementById('toggleView');
        const resetBtn = document.getElementById('resetImage');
        const downloadBtn = document.getElementById('downloadImage');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleImageComparison();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetImage();
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadImage();
            });
        }
    }

    bindNavigation() {
        // Smooth scroll for navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });

                    // Update active nav link
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.querySelector('.mobile-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (mobileToggle && navMenu) {
            mobileToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                mobileToggle.classList.toggle('active');
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    mobileToggle.classList.remove('active');
                }
            });

            // Add touch support for mobile
            document.addEventListener('touchstart', (e) => {
                if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    mobileToggle.classList.remove('active');
                }
            });
        }
    }

    generatePresetPreviews(img) {
        this.showLoading('Generating preset previews...');

        // Create a smaller canvas for previews (for performance)
        const previewCanvas = document.createElement('canvas');
        const previewCtx = previewCanvas.getContext('2d');
        const previewSize = 200; // Fixed size for previews

        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let previewWidth, previewHeight;

        if (aspectRatio > 1) {
            previewWidth = previewSize;
            previewHeight = previewSize / aspectRatio;
        } else {
            previewWidth = previewSize * aspectRatio;
            previewHeight = previewSize;
        }

        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;

        // Generate previews for first 50 presets (for performance)
        const presetsToPreview = this.presets.slice(0, 50);

        presetsToPreview.forEach((preset, index) => {
            setTimeout(() => {
                // Clear and draw original image
                previewCtx.clearRect(0, 0, previewWidth, previewHeight);
                previewCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

                // Apply preset effect
                const imageData = previewCtx.getImageData(0, 0, previewWidth, previewHeight);
                const data = imageData.data;

                // Apply simplified effects for preview
                this.applyPreviewEffect(data, preset.settings);
                previewCtx.putImageData(imageData, 0, 0);

                // Store preview
                preset.previewCanvas = previewCanvas.cloneNode();
                preset.previewCanvas.getContext('2d').putImageData(imageData, 0, 0);

                // Update the preset card if it's already rendered
                const presetCard = document.querySelector(`[data-preset-id="${preset.id}"]`);
                if (presetCard) {
                    const previewDiv = presetCard.querySelector('.preset-preview');
                    const existingImg = previewDiv.querySelector('img');
                    if (existingImg) {
                        existingImg.src = preset.previewCanvas.toDataURL();
                    } else {
                        const img = document.createElement('img');
                        img.src = preset.previewCanvas.toDataURL();
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                        previewDiv.appendChild(img);
                    }
                }

                // Hide loading when done with first batch
                if (index === presetsToPreview.length - 1) {
                    this.hideLoading();
                }
            }, index * 50); // Stagger generation to prevent blocking
        });
    }

    applyPreviewEffect(data, settings) {
        // Simplified version of effects for preview generation
        const brightness = settings.brightness || 0;
        const contrast = settings.contrast || 0;
        const saturation = settings.saturation || 0;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Apply brightness
            r += brightness;
            g += brightness;
            b += brightness;

            // Apply contrast
            const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            // Apply saturation
            if (saturation !== 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                const sat = saturation / 100;
                r = gray + sat * (r - gray);
                g = gray + sat * (g - gray);
                b = gray + sat * (b - gray);
            }

            // Clamp values
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
    }

    filterPresets(category) {
        if (category === 'all') {
            this.filteredPresets = [...this.presets];
        } else {
            this.filteredPresets = this.presets.filter(preset => preset.category === category);
        }

        this.loadedPresetsCount = 0;
        this.renderPresets();
    }

    renderPresets() {
        const presetsGrid = document.getElementById('presetsGrid');
        const loadMoreBtn = document.getElementById('loadMorePresets');

        if (!presetsGrid) return;

        // Clear grid if starting fresh
        if (this.loadedPresetsCount === 0) {
            presetsGrid.innerHTML = '';
        }

        // Calculate presets to show
        const endIndex = Math.min(
            this.loadedPresetsCount + this.presetsPerLoad,
            this.filteredPresets.length
        );

        // Render new presets
        for (let i = this.loadedPresetsCount; i < endIndex; i++) {
            const preset = this.filteredPresets[i];
            const presetCard = this.createPresetCard(preset);
            presetsGrid.appendChild(presetCard);
        }

        this.loadedPresetsCount = endIndex;

        // Show/hide load more button
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 
                this.loadedPresetsCount < this.filteredPresets.length ? 'block' : 'none';
        }
    }

    createPresetCard(preset) {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.dataset.presetId = preset.id;

        // Create preview content
        let previewContent = '';
        if (preset.previewCanvas) {
            previewContent = `<img src="${preset.previewCanvas.toDataURL()}" style="width: 100%; height: 100%; object-fit: cover;" alt="${preset.name} preview">`;
        } else if (this.currentImage) {
            previewContent = `<img src="${this.currentImage.src}" style="width: 100%; height: 100%; object-fit: cover; filter: ${this.getPreviewFilter(preset.settings)};" alt="${preset.name} preview">`;
        } else {
            previewContent = `<div style="background: ${preset.thumbnail}; width: 100%; height: 100%;"></div>`;
        }

        card.innerHTML = `
            <div class="preset-preview">
                ${previewContent}
                <div class="preset-overlay">
                    <button class="preset-apply">
                        Apply Preset
                    </button>
                </div>
            </div>
            <div class="preset-info">
                <h3 class="preset-name">${preset.name}</h3>
                <p class="preset-category">${preset.category}</p>
            </div>
        `;

        // Add click event listener to the apply button
        const applyButton = card.querySelector('.preset-apply');
        applyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.applyPreset(preset.id);
        });

        // Also add click event to the entire card
        card.addEventListener('click', () => {
            this.applyPreset(preset.id);
        });

        return card;
    }

    getPreviewFilter(settings) {
        // Generate CSS filter as fallback for quick preview
        const brightness = 100 + (settings.brightness || 0);
        const contrast = 100 + (settings.contrast || 0);
        const saturate = 100 + (settings.saturation || 0);
        const hueRotate = settings.hue || 0;

        return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg)`;
    }

    loadMorePresets() {
        this.renderPresets();

        // Add loading animation
        this.showLoading('Loading more presets...');
        setTimeout(() => {
            this.hideLoading();
        }, 800);
    }

    applyPreset(presetId) {
        if (!this.currentImage) {
            alert('Please upload an image first!');
            return;
        }

        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;

        this.showLoading('Applying preset...');

        // Simulate processing time for better UX
        setTimeout(() => {
            this.processImageWithPreset(preset);
            this.currentPreset = preset;
            this.hideLoading();
        }, 1200);
    }

    processImageWithPreset(preset) {
        try {
            const { settings } = preset;

            // Ensure canvas dimensions match image
            this.canvas.width = this.currentImage.width;
            this.canvas.height = this.currentImage.height;

            // Clear canvas and redraw original image
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.currentImage, 0, 0);

            // Get image data for pixel manipulation
            let imageData;
            try {
                imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            } catch (error) {
                console.error('Error getting image data:', error);
                this.showErrorMessage('Unable to process image. Please try a different image.');
                return;
            }

            const data = imageData.data;

            // Apply filters with error handling
            this.applyBrightnessContrast(data, settings.brightness || 0, settings.contrast || 0);
            this.applySaturation(data, settings.saturation || 0);
            this.applyHueShift(data, settings.hue || 0);
            this.applyWarmth(data, settings.warmth || 0);

            // Put processed data back to canvas
            this.ctx.putImageData(imageData, 0, 0);

            // Apply additional effects
            this.applyVignette(settings.vignette || 0);
            this.applyGrain(settings.grain || 0);

            // Update edited image
            const editedImage = document.getElementById('editedImage');
            editedImage.src = this.canvas.toDataURL('image/jpeg', 0.9);
            editedImage.style.display = 'block';

            // Show comparison
            this.showImageComparison();
            
            // Show success message
            this.showSuccessMessage(`Applied preset: ${preset.name}`);
        } catch (error) {
            console.error('Error processing image:', error);
            this.showErrorMessage('Failed to apply preset. Please try again.');
        }
    }

    applyBrightnessContrast(data, brightness, contrast) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] = Math.max(0, Math.min(255, data[i] + brightness));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));

            // Apply contrast
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
    }

    applySaturation(data, saturation) {
        const sat = saturation / 100;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            data[i] = Math.max(0, Math.min(255, gray + sat * (r - gray)));
            data[i + 1] = Math.max(0, Math.min(255, gray + sat * (g - gray)));
            data[i + 2] = Math.max(0, Math.min(255, gray + sat * (b - gray)));
        }
    }

    applyHueShift(data, hueShift) {
        const hue = hueShift * Math.PI / 180;
        const cosHue = Math.cos(hue);
        const sinHue = Math.sin(hue);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;

            const newR = r * (0.299 + 0.701 * cosHue + 0.168 * sinHue) +
                        g * (0.587 - 0.587 * cosHue + 0.330 * sinHue) +
                        b * (0.114 - 0.114 * cosHue - 0.497 * sinHue);

            const newG = r * (0.299 - 0.299 * cosHue - 0.328 * sinHue) +
                        g * (0.587 + 0.413 * cosHue + 0.035 * sinHue) +
                        b * (0.114 - 0.114 * cosHue + 0.292 * sinHue);

            const newB = r * (0.299 - 0.300 * cosHue + 1.25 * sinHue) +
                        g * (0.587 - 0.588 * cosHue - 1.05 * sinHue) +
                        b * (0.114 + 0.886 * cosHue - 0.203 * sinHue);

            data[i] = Math.max(0, Math.min(255, newR * 255));
            data[i + 1] = Math.max(0, Math.min(255, newG * 255));
            data[i + 2] = Math.max(0, Math.min(255, newB * 255));
        }
    }

    applyWarmth(data, warmth) {
        const warmthFactor = warmth / 100;

        for (let i = 0; i < data.length; i += 4) {
            if (warmthFactor > 0) {
                data[i] = Math.min(255, data[i] + warmthFactor * 20); // More red
                data[i + 1] = Math.min(255, data[i + 1] + warmthFactor * 10); // Slight green
                data[i + 2] = Math.max(0, data[i + 2] - warmthFactor * 15); // Less blue
            } else {
                data[i] = Math.max(0, data[i] + warmthFactor * 15); // Less red
                data[i + 1] = Math.max(0, data[i + 1] + warmthFactor * 5); // Less green
                data[i + 2] = Math.min(255, data[i + 2] - warmthFactor * 20); // More blue
            }
        }
    }

    applyVignette(strength) {
        if (strength <= 0) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxDistance
        );

        gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${strength / 100})`);

        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'source-over';
    }

    applyGrain(strength) {
        if (strength <= 0) return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * strength * 2;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    showImageComparison() {
        const originalImage = document.getElementById('originalImage');
        const editedImage = document.getElementById('editedImage');

        originalImage.style.display = 'block';
        editedImage.style.display = 'block';
        editedImage.style.opacity = '1';
    }

    toggleImageComparison() {
        const originalImage = document.getElementById('originalImage');
        const editedImage = document.getElementById('editedImage');
        const toggleBtn = document.getElementById('toggleView');

        if (editedImage.style.opacity === '0') {
            editedImage.style.opacity = '1';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Edit';
        } else {
            editedImage.style.opacity = '0';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Edit';
        }
    }

    resetImage() {
        if (!this.currentImage) return;

        const originalImage = document.getElementById('originalImage');
        const editedImage = document.getElementById('editedImage');

        editedImage.src = originalImage.src;
        editedImage.style.opacity = '0';

        this.currentPreset = null;

        // Reset canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0);
    }

    downloadImage() {
        if (!this.currentImage) {
            alert('No image to download!');
            return;
        }

        const link = document.createElement('a');
        const filename = this.currentPreset ? 
            `edited-${this.currentPreset.name.toLowerCase().replace(/\s+/g, '-')}.png` : 
            'edited-image.png';

        link.download = filename;
        link.href = this.canvas.toDataURL();
        link.click();

        // Show success message
        this.showSuccessMessage('Image downloaded successfully!');
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('p');

        text.textContent = message;
        overlay.classList.add('active');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'success') {
        // Create notification
        const notification = document.createElement('div');
        const isSuccess = type === 'success';
        const bgColor = isSuccess ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)';
        const icon = isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            font-weight: 500;
            max-width: 300px;
        `;

        notification.innerHTML = `
            <i class="fas ${icon}" style="margin-right: 8px;"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions
function scrollToEditor() {
    document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
}

// Initialize the application
const presetPro = new PresetPro();
window.presetPro = presetPro;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .image-preview img {
        transition: opacity 0.3s ease-in-out;
    }

    .preset-card {
        cursor: pointer;
    }

    .preset-card:active {
        transform: translateY(-4px) scale(0.98);
    }

    @media (max-width: 768px) {
        .nav-menu.active {
            display: flex;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(15, 15, 35, 0.98);
            backdrop-filter: blur(20px);
            flex-direction: column;
            padding: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
    }
`;

document.head.appendChild(style);

// Performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    // Lazy load images
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '50px'
    };

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    }, observerOptions);

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
});

// Service Worker for offline capability (optional enhancement)
// Disabled for now as sw.js doesn't exist
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/sw.js')
//             .then(registration => {
//                 console.log('SW registered: ', registration);
//             })
//             .catch(registrationError => {
//                 console.log('SW registration failed: ', registrationError);
//             });
//     });
// }
