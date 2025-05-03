// tracker.js

// Ensure the constructor is defined and does NOT have the event listener
var FlashTracker = function(settings) {
  // Ensure tracking.js is loaded before this runs
  if (typeof tracking === 'undefined' || typeof tracking.Tracker === 'undefined') {
      console.error("tracking.js or tracking.Tracker not loaded before FlashTracker instantiation");
      // Handle error appropriately, maybe throw an error or return
      return;
  }
  tracking.Tracker.call(this); // Call parent constructor

  // Instance properties
  this.prevBrightness = null;
  this.flashCount = 0;
  this.wasFlashingLastFrame = false; // Optional: for refined logging

  // Use settings if provided, otherwise use defaults
  // Make sure the 'settings' object passed in has the 'current' property
  this.settings = settings && settings.current ? settings : {
    current: {
      flashThreshold: 90,    // Default threshold
      flashTriggerCount: 2   // Default trigger count
    }
  };

  // !! CRITICAL: Ensure NO document.addEventListener here !!
};

// Ensure tracking.inherits is called AFTER the constructor definition
// AND assumes tracking.js is loaded
if (typeof tracking !== 'undefined' && typeof tracking.inherits === 'function') {
    tracking.inherits(FlashTracker, tracking.Tracker);
} else {
    console.error("tracking.js or tracking.inherits not available for FlashTracker");
}


// Updated FlashTracker.prototype.track method with detailed logging:
FlashTracker.prototype.track = function(pixels, width, height) {
  if (!pixels || pixels.length === 0) {
    console.warn("Empty pixels data in FlashTracker");
    return;
  }

  let gray = tracking.Image.grayscale(pixels, width, height, true);
  let totalBrightness = 0;
  let pixelCount = 0;

  // Calculate total brightness efficiently
  for (let i = 0; i < gray.length; i += 4) { // Process only one channel (e.g., R) since it's grayscale
    totalBrightness += gray[i];
    pixelCount++;
  }

  if (pixelCount === 0) {
    console.warn("No pixels processed in FlashTracker");
    return;
  }

  let avgBrightness = totalBrightness / pixelCount;
  let delta = 0;

  if (this.prevBrightness !== null) {
    delta = Math.abs(avgBrightness - this.prevBrightness);
  }

  // Store current brightness for the next frame's comparison
  this.prevBrightness = avgBrightness;

  // --- Start of Added/Modified Debug Section ---
  // Read the current settings values being used for detection
  // Add safety check in case this.settings or this.settings.current is somehow null/undefined
  const currentThreshold = this.settings && this.settings.current ? this.settings.current.flashThreshold : 90; // Default fallback
  const currentTriggerCount = this.settings && this.settings.current ? this.settings.current.flashTriggerCount : 2; // Default fallback


  // Debug log: Shows brightness, change (delta), the thresholds being used, and the current flash count
  console.log(
    `Brightness: ${avgBrightness.toFixed(1)}, Delta: ${delta.toFixed(1)}, Using Threshold: ${currentThreshold}, Using Count: ${currentTriggerCount}, Current FlashCount: ${this.flashCount.toFixed(1)}`
  );
  // --- End of Added/Modified Debug Section ---

  // Check if the brightness change (delta) exceeds the threshold
  if (delta > currentThreshold) { // Use the variable read from settings
    this.flashCount++; // Increment flash counter
  } else if (this.flashCount > 0) {
    // If delta is below threshold, gradually decrease the flash count (cooldown)
    this.flashCount -= 0.25; // Correctly uses -= assignment
    // Ensure flashCount doesn't go below zero
    if (this.flashCount < 0) {
        this.flashCount = 0;
    }
  }

  // Determine if flashing is currently active based on the count reaching the trigger threshold
  const isFlashing = this.flashCount >= currentTriggerCount; // Use the variable read from settings

  // Log when a flash sequence is definitively detected
  if (isFlashing) {
    // Check if this is the *first* frame it's considered flashing to avoid spamming the log
    if (!this.wasFlashingLastFrame) { // Requires adding 'this.wasFlashingLastFrame' state if you want this refinement
        console.log(`🔥 Flash detected! (Delta: ${delta.toFixed(1)}, Count reached: ${this.flashCount.toFixed(1)})`);
        this.wasFlashingLastFrame = true; // Set state for refinement
    }
  } else {
     if (this.wasFlashingLastFrame) { // Only reset if it *was* flashing
         this.wasFlashingLastFrame = false; // Reset state for refinement
     }
  }


  // Emit the tracking data, including whether flashing is detected
  this.emit('track', {
    flashing: isFlashing,
    brightness: avgBrightness,
    delta: delta
    // You could add flashCount here too if needed elsewhere:
    // flashCount: this.flashCount
  });
};