var FlashTracker = function(settings) {
  // Ensure tracking.js is loaded before this runs
  if (typeof tracking === 'undefined' || typeof tracking.Tracker === 'undefined') {
      console.error("tracking.js or tracking.Tracker not loaded before FlashTracker instantiation");
      return; // Handle error appropriately
  }
  try {
      tracking.Tracker.call(this); // Call parent constructor
  } catch (e) {
      console.error("Error calling tracking.Tracker constructor:", e);
      return; // Cannot proceed if parent constructor fails
  }


  // Instance properties
  this.prevBrightness = null;
  // Store timestamps of detected flash events within the time window
  this.flashTimestamps = [];

  // Store reference to settings object (critical for accessing enableDebugLogging)
  // Ensure 'current' exists and provide fallback defaults
  this.settings = settings && settings.current ? settings : {
    current: { // Fallback defaults if settings object is malformed/missing
      flashThreshold: 90,
      flashHzThreshold: 3,
      enableDebugLogging: false // Include fallback here too
    }
  };
};

// Ensure tracking.inherits is called AFTER the constructor definition
// AND assumes tracking.js is loaded
if (typeof tracking !== 'undefined' && typeof tracking.inherits === 'function' && typeof FlashTracker !== 'undefined') {
    try {
        tracking.inherits(FlashTracker, tracking.Tracker);
    } catch (e) {
        console.error("Error inheriting FlashTracker from tracking.Tracker:", e);
    }
} else {
    console.error("tracking.js or tracking.inherits or FlashTracker not available for inheritance");
}


// --- Hz-Based Detection Logic ---
FlashTracker.prototype.track = function(pixels, width, height) {
  // Basic check for dependencies and state
  if (!pixels || pixels.length === 0 || !this.settings || !this.settings.current || !this.flashTimestamps) {
    // Conditional Log: Log missing prerequisites only if debug enabled
    // if (this.settings?.current?.enableDebugLogging) {
    //    console.warn("[Tracker] Missing prerequisites:", { pixels: !!pixels, settings: !!this.settings, timestamps: !!this.flashTimestamps });
    // }
    return;
  }

  // --- Brightness Calculation ---
  let avgBrightness, delta;
  try {
      // Ensure grayscale function exists
      if (typeof tracking.Image === 'undefined' || typeof tracking.Image.grayscale !== 'function') {
          console.error("[Tracker] tracking.Image.grayscale is not available.");
          return;
      }
      // Use tracking.js's fast grayscale (true flag) if available
      let gray = tracking.Image.grayscale(pixels, width, height, false);
      let totalBrightness = 0;

      // Check if grayscale conversion returned valid data
      if (!gray || gray.length === 0) {
          // Conditional Log
          // if (this.settings.current.enableDebugLogging) console.warn("[Tracker] Grayscale conversion returned empty data.");
          return;
      }

      // Standard grayscale array is single channel (brightness per pixel)
      for (let i = 0; i < gray.length; i++) {
          totalBrightness += gray[i];
      }
      let pixelCount = gray.length; // Each element is a pixel's brightness

      if (pixelCount === 0) {
          // Conditional Log
          // if (this.settings.current.enableDebugLogging) console.warn("[Tracker] No pixels processed");
          return;
      }
      avgBrightness = totalBrightness / pixelCount;
      delta = 0;
      if (this.prevBrightness !== null && !isNaN(this.prevBrightness)) { // Check prevBrightness is valid
          delta = Math.abs(avgBrightness - this.prevBrightness);
      }

      // Store brightness only if it's a valid number
       if (!isNaN(avgBrightness)) {
            this.prevBrightness = avgBrightness;
       } else {
            this.prevBrightness = null; // Reset if calculation failed
            // Conditional Log
            if (this.settings.current.enableDebugLogging) console.warn("[Tracker] avgBrightness calculation resulted in NaN");
            return;
       }

        // --- Optional Tracker-Level Debug Log ---
        // Log brightness/delta calculations infrequently if debug enabled
        // if (this.settings.current.enableDebugLogging && Math.random() < 0.05) { // Log ~5% of frames
        //     const brightStr = avgBrightness !== undefined ? avgBrightness.toFixed(1) : 'N/A';
        //     const deltaStr = delta !== undefined ? delta.toFixed(1) : 'N/A';
        //     console.log(`[Tracker Calc] B:${brightStr} D:${deltaStr}`);
        // }
        // --- End Optional Log ---

  } catch (e) {
      console.error("[Tracker] Error during brightness calculation:", e);
      this.prevBrightness = null; // Reset brightness on error
      return; // Stop processing this frame
  }
  // --- End Brightness Calculation ---


  // --- NEW Hz Detection Logic ---
  const now = Date.now();
  const timeWindow = 1000; // milliseconds (1 second)

  // 1. Prune timestamps older than the time window
  try {
      let W = this.flashTimestamps.length;
      let validStartIndex = -1;
      for (let i = 0; i < W; i++) {
          if (now - this.flashTimestamps[i] < timeWindow) {
              validStartIndex = i;
              break; // Found the first valid timestamp
          }
      }
      if (validStartIndex > 0) {
          this.flashTimestamps.splice(0, validStartIndex); // Remove older timestamps efficiently
      } else if (validStartIndex === -1 && W > 0) {
          this.flashTimestamps = []; // All are old
      }
  } catch (e) {
       console.error("[Tracker] Error pruning timestamps:", e);
       this.flashTimestamps = []; // Clear timestamps on error
  }


  // Read current thresholds from settings safely
  const currentThreshold = this.settings.current.flashThreshold || 90;
  const currentHzThreshold = this.settings.current.flashHzThreshold || 3;

  // 2. Check if current frame's delta exceeds brightness threshold
  if (!isNaN(delta) && delta > currentThreshold) {
    // 3. Add timestamp of this "flash event"
    this.flashTimestamps.push(now);
  }

  // 4. Check if the number of events in the window meets/exceeds the Hz threshold
  const flashFrequency = this.flashTimestamps.length; // Events in the last second
  const isFlashing = flashFrequency >= currentHzThreshold;

  // --- Optional Tracker-Level Hz Debug Log ---
  // Log frequency check details infrequently if debug enabled
  // if (this.settings.current.enableDebugLogging && Math.random() < 0.05) { // Log ~5% of frames
  //     console.log(`[Tracker Hz Check] Freq (1s): ${flashFrequency}Hz, Threshold: ${currentHzThreshold}Hz, Flashing: ${isFlashing}`);
  // }
  // --- End Optional Log ---

   // --- End Hz Detection Logic ---

  // Emit the tracking data, including whether flashing is detected based on Hz
  try {
      // Ensure emit function exists
      if (typeof this.emit === 'function') {
          this.emit('track', {
            flashing: isFlashing,
            brightness: avgBrightness,
            delta: delta,
            frequency: flashFrequency // Include current frequency in emitted data
          });
      } else {
           console.error("[Tracker] this.emit is not a function");
      }
  } catch (e) {
       console.error("[Tracker] Error emitting track event:", e);
  }
};