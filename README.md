# 🛑 Redout — Flashing Content Blocker

Redout is a lightweight Chrome extension that detects and blocks potentially harmful flashing video content in real-time. It’s designed to help protect users from photosensitive epilepsy triggers by monitoring video frames for rapid brightness changes and high frequencies, overlaying a customizable warning when flashing is detected.

## ✨ Features

* **Real-time Detection:** Monitors HTML5 video elements on web pages.
* **Dual-Threshold System:** Detects flashing based on both significant brightness changes (**delta**) between frames and the frequency of these changes (**Hz**).
* **Customizable Overlay:** Blocks detected flashing content with a configurable full-screen overlay (color, opacity, warning text).
* **Adjustable Sensitivity:** Fine-tune detection parameters (brightness delta sensitivity, max frequency) via the popup menu.
* **Configurable Cooldown:** Set how long the overlay stays hidden after flashing stops.
* **Debug Mode:** Optional console logging for detailed tracking information.

## ⚙️ How It Works

* Injects a content script into web pages to find and monitor `<video>` elements.
* Uses the `tracking.js` library to analyze video frames in real-time.
* Calculates the average grayscale brightness difference (delta) between consecutive frames.
* Tracks the timestamps of frames exceeding the brightness delta threshold.
* Calculates the frequency (Hz) of these high-delta frames within a 1-second window.
* If the calculated frequency meets or exceeds the user-defined **Max Flash Frequency (Hz)** threshold, it triggers the overlay.
* Displays the user-configured overlay (color, opacity, optional text) to block the flashing content.
* Automatically fades the overlay after a user-defined **Hide Delay (Cooldown)** period once flashing is no longer detected.

## 🔧 Configuration

Redout's settings can be easily adjusted via the extension popup

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
    * **Enable Debug Logging:** Check this to output detailed tracking information (brightness, delta, frequency, status) to the browser's developer console.

Settings are saved automatically and applied to currently active tabs.

## 🧠 Why It Works (The Science)

Redout is grounded in research around photosensitive epilepsy and the neurological impact of high-contrast visual stimuli—especially rapid **flashes of light** and certain **color wavelengths**.

By detecting both the **magnitude of brightness changes** (delta) and the **rate of flashing** (frequency), Redout aims to identify patterns commonly associated with seizure triggers. The customizable overlay, particularly when set to a cool color like the default navy blue, helps to:

* **Reduce overall screen brightness** during a flashing sequence.
* Potentially **negate specific problematic wavelengths** (like intense reds) by applying a contrasting color filter.
* Provide a **visually stable field** during potentially harmful sequences.

This approach helps mitigate the risks associated with flashing content, creating a safer visual experience for sensitive users.

## 🧰 Built With

* **[tracking.js](https://github.com/eduardolundgren/tracking.js)** — For real-time computer vision and frame analysis in the browser.
* **JavaScript (ES6+)** — For core extension logic, settings management, and DOM manipulation.
* **Chrome Extension APIs (Manifest V3)** — For background processes, content scripts, storage, and popup interactions.
* **HTML & CSS** — For the popup UI and overlay styling.

## 📦 Installation

1.  **Download:** Clone this repository or download it as a ZIP file and extract it.
2.  **Get `tracking-min.js`:** Ensure the `tracking-min.js` file from the [tracking.js library](https://github.com/eduardolundgren/tracking.js) is present in the project's root directory (or update `manifest.json` if you place it elsewhere). The library is required for the detection core.
3.  **Open Chrome Extensions:** Navigate to `chrome://extensions` in your Chrome browser.
4.  **Enable Developer Mode:** Toggle the "Developer mode" switch, usually found in the top-right corner.
5.  **Load Unpacked:** Click the "Load unpacked" button and select the directory where you saved/extracted the Redout project files.
6.  **Ready:** The extension icon should appear in your toolbar. It will automatically run on pages with video content.

## 📁 Project Structure



redout/
├── manifest.json # Extension configuration (V3)
├── background.js # Service worker (minimal)
├── popup.html # Popup UI structure
├── popup.js # Popup UI logic and event handling
├── settings.js # Class for managing settings & storage
├── content.js # Content script: finds videos, applies overlay
├── tracker.js # Flash detection logic using tracking.js
├── tracking-min.js # REQUIRED: tracking.js library file
├── styles.css # CSS for popup (potentially mergeable/removable)
├── overlay.css # CSS specifically for the flash overlay
├── redout.png # Extension icon (used in manifest)
└── README.md # This file



*(Note: Ensure icon paths in `manifest.json` match the actual location of `redout.png`)*

## 📄 License

MIT — free to use, modify, and distribute.
Please credit **tracking.js** ([eduardolundgren/tracking.js](https://github.com/eduardolundgren/tracking.js)) if redistributing or building upon this work, as it is a core dependency.

---

Stay safe online ✨