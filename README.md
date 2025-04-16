# 🛑 Redout — Flashing Content Blocker

Redout is a lightweight Chrome extension that detects and blocks potentially harmful flashing video content in real time. It’s designed to help protect users from photosensitive epilepsy triggers by monitoring average frame brightness and overlaying a warning when flashing is detected.

## ⚙️ How It Works

- Scans all `<video>` elements on web pages.
- Tracks brightness changes frame-by-frame using grayscale analysis.
- Detects repeated large brightness deltas (potential flashes).
- Displays a red fullscreen overlay with a warning when flashing is detected.
- Automatically fades the overlay after a brief cooldown period with no flashing.

## 🧰 Built With

- **[tracking.js](https://github.com/eduardolundgren/tracking.js)** — Used for real-time pixel and image analysis.
- **JavaScript + DOM APIs** — For video monitoring, mutation observing, and overlay handling.

## 📦 Installation

1. Clone or download this repository.
2. Go to `chrome://extensions` in your browser.
3. Enable **Developer Mode**.
4. Click **Load unpacked** and select the project folder.
5. Navigate to a webpage with video content — Redout runs automatically.

## 📁 Project Structure

redout/ ├── manifest.json ├── content.js ├── tracker.js ├── tracking-min.js ├── redout.png └── README.md

## 📄 License

MIT — free to use, modify, and distribute.  
Please credit **tracking.js** if redistributing or building on this work.

---

Stay safe online ✨
