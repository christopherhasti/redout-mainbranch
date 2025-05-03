chrome.runtime.onInstalled.addListener((details) => {
  console.log(`Flashing Image Blocker ${details.reason}`);
  // Potential place for onboarding or welcome page logic
  // if (details.reason === "install") {
  //   chrome.tabs.create({ url: "welcome.html" });
  // }
});

console.log("Flashing Image Blocker background script running."); // Optional: Can be removed