# 🛑 Redout — Flashing Content Blocker

Redout is a lightweight Chrome extension that detects and partially blocks potentially harmful flashing video content in real time. It’s designed to help protect users from photosensitive epilepsy triggers by monitoring average frame brightness and overlaying a warning when flashing is detected.

## ⚙️ How It Works

- Scans all `<video>` elements on web pages.
- Tracks brightness changes frame-by-frame using grayscale analysis.
- Detects repeated large brightness deltas (potential flashes).
- Displays a red fullscreen overlay with a warning when flashing is detected.
- Automatically fades the overlay after a brief cooldown period with no flashing.

## 🧠 Why It Works (Science Behind the Filter)

Redout is grounded in research around photosensitive epilepsy and the neurological impact of high-contrast visual stimuli — especially rapid **flashes of light** and **warm wavelengths** like red and orange (580–640 nm on the spectrum). These are some of the most seizure-inducing visual triggers.

To counter this, Redout applies a two-part defense:

- **Frame-by-Frame Detection:**  
  The extension uses grayscale brightness tracking to detect dangerous changes in luminance across video frames. If repeated sharp spikes are found, it identifies this as potential flashing.

- **Color & Brightness Suppression:**  
  When flashing is detected, Redout displays a **deep navy-blue overlay** (`rgba(0, 50, 100, 0.95)`), a carefully chosen color that:
  - **Negates red–orange light** by applying a cool-spectrum contrast.
  - **Reduces screen brightness** to dampen the strobe’s overall intensity.
  
This approach helps neutralize both the **color frequency** and **brightness delta** that commonly trigger seizures.

The result is a safer, more stable visual experience for users with light sensitivity — or anyone who just wants to avoid jarring, high-flash media.

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
