# 🛑 Redout — Flashing Content Blocker

Redout is a lightweight, cross-browser extension that detects and blocks potentially harmful flashing video content in real time. It’s designed to help protect users from photosensitive epilepsy triggers by monitoring video frames for rapid brightness changes and high frequencies.

This repository contains pre-built, loadable folders for both Chrome/Brave and Firefox.

  * `redout-chromium-build/` - The version for Chrome, Brave, and other Chromium browsers.
  * `redout-firefox-build/` - The version for Firefox.

## ✨ Features

  * **Real-time Detection:** Monitors HTML5 video elements on web pages.
  * **Dual-Threshold System:** Detects flashing based on both significant brightness changes (**delta**) and the frequency of these changes (**Hz**).
  * **Cross-Browser Support:** Separate, optimized builds for Chromium (Manifest V3) and Firefox (WebExtensions).
  * **Customizable Overlay:** Blocks detected flashing content with a configurable full-screen overlay (color, opacity, warning text).
  * **Instant Updates (Chrome-Only):** The overlay color updates live as you use the color picker.
  * **Configurable Cooldown:** Set how long the overlay stays hidden after flashing stops.
  * **Debug Mode:** Optional console logging for detailed tracking information.

## ⚙️ How It Works

  * Injects a content script into web pages to find and monitor `<video>` elements using a `MutationObserver`.
  * Uses the **[tracking.js](https://github.com/eduardolundgren/tracking.js)** library to analyze video frames in real time.
  * Calculates the average grayscale brightness difference (**delta**) between consecutive frames.
  * Tracks the timestamps of frames that exceed the brightness delta threshold.
  * Calculates the frequency (**Hz**) of these high-delta frames within a 1-second window.
  * If the calculated frequency meets or exceeds the user-defined **Max Flash Frequency (Hz)** threshold, it triggers the overlay.
  * Displays the user-configured overlay and automatically fades it after a user-defined **Hide Delay (Cooldown)** period once flashing is no longer detected.

## 🔧 Configuration

Redout's settings can be easily adjusted via the extension popup.

The popup has three tabs:

1.  **Appearance:**
      * **Overlay Color:** Choose the color of the blocking overlay.
      * **Overlay Opacity:** Set the transparency level (0.5 to 1.0).
      * **Show Warning Text:** Toggle the display of text on the overlay.
      * **Warning Message:** Customize the text shown on the overlay.
2.  **Detection:**
      * **Flash Sensitivity:** Adjust the brightness change (delta) needed to register a potential flash frame (lower = more sensitive).
      * **Max Flash Frequency (Hz):** Set the maximum allowed flashes per second before blocking (e.g., 3 Hz means content flashing 3 times or more per second is blocked). Common triggers are 3-30 Hz.
3.  **Advanced:**
      * **Hide Delay (ms):** Time in milliseconds the overlay waits after flashing stops before hiding.
      * **Enable Debug Logging:** Check this to output detailed tracking information to the browser's developer console.

Settings are saved automatically using `browser.storage` and applied to all active tabs.

## 📦 Installation

This extension can be loaded directly from this repository for development or testing.

### For Chrome & Brave

1.  **Download:** Clone or download this repository as a ZIP file and extract it.
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions` in your browser.
3.  **Enable Developer Mode:** Toggle the "Developer mode" switch, usually in the top right.
4.  **Load Unpacked:** Click the "Load unpacked" button.
5.  **Select Folder:** Select the **`redout-chromium-build`** folder from the files you extracted.
6.  **Ready:** The extension icon should appear in your toolbar.

### For Firefox

1.  **Download:** Clone or download this repository as a ZIP file and extract it.
2.  **Open Firefox Debugging:** Navigate to `about:debugging#/runtime/this-firefox` in your browser.
3.  **Load Add-on:** Click the "Load Temporary Add-on..." button.
4.  **Select Manifest:** Navigate into the **`redout-firefox-build`** folder and select the `manifest.json` file *inside it*.
5.  **Ready:** The extension icon should appear in your toolbar.

## 🧰 Built With

  * **[tracking.js](https://github.com/eduardolundgren/tracking.js)** — For real-time computer vision and frame analysis.
  * **[webextension-polyfill.js](https://github.com/mozilla/webextension-polyfill)** — For cross-browser compatibility using the `browser.*` namespace.
  * **JavaScript (ES6+)** — For core extension logic.
  * **HTML & CSS** — For the popup UI and overlay styling.

## 📁 Project Structure

This repository contains two pre-built folders. All development is done and then placed into the correct build folder, with minor changes for browser compatibility.

```
redout-mainbranch/
├── redout-chromium-build/   # Load this folder for Chrome/Brave
│   ├── manifest.json        # (Chrome-specific manifest)
│   ├── popup.js             # (Uses 'input' for live color update)
│   └── ... (all other shared files)
│
├── redout-firefox-build/    # Load this folder for Firefox
│   ├── manifest.json        # (Firefox-specific manifest)
│   ├── popup.js             # (Uses 'change' for color update)
│   └── ... (all other shared files)
│
└── README.md                # This file (you are here)
```

## 📄 License

MIT — free to use, modify, and distribute.
Please credit **tracking.js** ([eduardolundgren/tracking.js](https://github.com/eduardolundgren/tracking.js)) if redistributing or building upon this work, as it is a core dependency.

Stay safe online ✨