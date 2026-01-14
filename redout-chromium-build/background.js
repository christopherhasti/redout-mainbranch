try {
  importScripts('browser-polyfill.js');
} catch (e) {
  console.error(e);
}

browser.runtime.onInstalled.addListener((details) => {
  console.log(`Flashing Image Blocker ${details.reason}`);
  // Potential place for onboarding or welcome page logic
  // if (details.reason === "install") {
  //   browser.tabs.create({ url: "welcome.html" });
  // }
});

console.log("Flashing Image Blocker background script running."); // Optional: Can be removed