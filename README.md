
# PixelForge

A browser-based photo editor with 300 deterministic presets across 12 categories. Everything runs locally in your browser.

## Overview

PixelForge is a cutting-edge web application that allows users to transform ordinary photos into extraordinary works of art using advanced preset filters. Built with modern web technologies, it delivers a seamless editing experience across all devices.

## Features

### Core Functionality
- **300+ Premium Presets**: Extensive collection of professional-grade editing presets
- **Instant Processing**: Real-time image transformation with optimized algorithms
- **Drag & Drop Upload**: Intuitive file upload with support for multiple image formats
- **Live Previews**: Every preset card shows a thumbnail of *your* photo with that preset applied
- **Compare**: Toggle between the original and the edited image
- **One-Click Download**: Export the edited image as a full-resolution PNG
- **Sample Image**: Try the editor without uploading anything
- **Keyboard Accessible**: Upload area and preset cards work with Enter/Space

### Technical Highlights
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **Canvas-Based Processing**: Advanced image manipulation using HTML5 Canvas API
- **Client-Side Processing**: Images processed locally for maximum privacy
- **Modern UI/UX**: Sleek interface with smooth animations and transitions
- **Performance Optimized**: Efficient rendering and memory management

### Preset Categories
Portrait, Landscape, Vintage, Cinematic, Black & White, Street, Nature, Urban, Moody, Bright & Airy, Warm and Cool (25 presets each).
Presets are generated from per-category profiles with a seeded random generator, so they are identical on every load
and behave like their name (B&W presets are greyscale, Warm presets warm the image, and so on).

Each preset combines brightness, contrast, shadows/highlights, warmth/tint, hue, saturation/vibrance,
optional black & white, sharpening, vignette and film grain (see `filters.js`).

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Image Processing**: Canvas API with custom algorithms
- **Styling**: Modern CSS with CSS Grid and Flexbox
- **Typography**: Inter font family for optimal readability
- **Icons**: Font Awesome for consistent iconography

## Getting Started

### Prerequisites
- Modern web browser with HTML5 Canvas support
- Internet connection for initial asset loading

### Installation

1. Clone or download the project files
2. Open `index.html` in a web browser
3. Start editing photos immediately

### Usage

1. **Upload Image**: Click the upload area, or drag and drop an image (or press "Try a Sample Image")
2. **Browse Presets**: Explore 300+ available presets organized by category
3. **Apply Effects**: Click any preset to apply it to your image
4. **Compare Results**: Use the Compare / Show Edit button to flip between original and edited
5. **Download**: Save your edited image as a PNG
6. **New Image**: Load another photo at any time

## File Structure

```
PixelForge/
├── index.html          # Main application file
├── style.css           # Styling and responsive design
├── filters.js          # Pure image-processing engine + preset generation (also used by tests)
├── script.js           # UI logic
├── package.json        # `npm test`
├── test/
│   ├── filters.test.js # Unit tests for the engine, presets and index.html wiring
│   └── ui.test.js      # Optional end-to-end browser test (Chromium)
└── README.md           # Project documentation

```
## Testing

```bash
npm test
```

Uses Node's built-in test runner (Node 18+), no dependencies required. The unit tests cover the filter maths,
preset generation and the HTML wiring. `test/ui.test.js` additionally drives the real page in Chromium
(upload, filtering, applying, compare, reset, download, mobile menu) and is **skipped automatically** unless
`playwright-core` and a Chromium binary are available:

```bash
npm install --no-save playwright-core
CHROMIUM_PATH=/path/to/chromium npm test   # CHROMIUM_PATH is optional; /usr/bin/chromium is tried by default
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Performance Considerations

- Optimized for images up to 4000x4000 pixels
- Maximum file size: 10MB
- Recommended formats: JPEG, PNG, WebP, GIF
- Canvas-based processing for optimal performance

## Privacy & Security

- All image processing occurs client-side
- No images are uploaded to external servers
- No user data collection or tracking
- Complete privacy protection

## Contributing

This project welcomes contributions and suggestions. Areas for enhancement include:

- Additional preset categories
- Advanced editing tools
- Batch processing capabilities
- Export format options
- Mobile app development

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or feature requests, please contact the development team.

## Acknowledgments

- Font Awesome for iconography
- Google Fonts for typography
- Modern CSS techniques for responsive design
- HTML5 Canvas API for image processing

---

**Developed by 0x0806 – All Rights Reserved.**

*Transform your photos with professional-grade presets. Experience the future of web-based photo editing.*
