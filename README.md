# Redout

Redout is a browser extension that detects and blocks flashing video content in real-time. It analyzes video frames locally to protect users from potential photosensitive triggers.

## Overview

Redout monitors HTML5 video elements using the `tracking.js` computer vision library. It calculates the brightness difference between frames (delta) and the frequency of these changes. If video content exceeds both the user-defined brightness and frequency thresholds, a protective overlay is immediately applied.

This repository contains separate builds for Chromium-based browsers (Chrome, Brave, Edge) and Firefox.

## Features

*   **Local Analysis**: All video processing happens locally within the browser. No data is sent to external servers.
*   **Dual-Threshold Detection**: Prevents false positives by checking both brightness delta and flash frequency (Hz).
*   **Global Overlay**: A single, optimized overlay handles all video elements on a page to minimize performance impact.
*   **Customizable Protection**: Users can adjust detection sensitivity, max frequency, and overlay appearance (color, opacity).
*   **Dark Mode UI**: A clean, modern interface designed for readability.
*   **Browser Specifics**:
    *   **Chromium**: Uses a standard color input for live preview.
    *   **Firefox**: Features a custom hex-input and preset palette to work around browser limitations.

## Installation

### Chrome / Brave / Edge (Chromium)

1.  Download or clone this repository.
2.  Open your browser and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (usually a toggle in the top-right corner).
4.  Click **Load unpacked**.
5.  Select the `redout-chromium-build` folder.

### Firefox

1.  Download or clone this repository.
2.  Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3.  Click **Load Temporary Add-on...**
4.  Navigate to the `redout-firefox-build` folder and select the `manifest.json` file.

## Configuration

Click the Redout shield icon in your toolbar to open the settings panel.

*   **Appearance**: Customize the overlay color and opacity.
*   **Detection**:
    *   **Flash Sensitivity**: Lower values make the detector more sensitive to smaller brightness changes.
    *   **Max Flash Frequency**: The number of flashes per second required to trigger the block (Default: 3 Hz).
*   **Advanced**:
    *   **Hide Delay**: How long the overlay remains after flashing stops.
    *   **Debug Logging**: Outputs detection metrics to the browser console for troubleshooting.

## License

MIT License.
Includes `tracking.js` by Eduardo Lundgren.