// Background script for Flashing Image Blocker extension

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Flashing Image Blocker installed or updated:", details.reason);
    
    // If it's a first install, we could potentially show a welcome page
    if (details.reason === "install") {
      // You could open a welcome page here if desired
      // chrome.tabs.create({ url: "welcome.html" });
    }
  });
  
  // Log when background script starts
  console.log("Flashing Image Blocker background script running");