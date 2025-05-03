(function () {
    const settings = new Settings();
    let cooldown; // Will be initialized after settings load

    // Wait for settings to load before initializing
    settings.onLoad = function () {
        cooldown = settings.current.cooldownTime; // Initialize cooldown
        // Conditional Log: Log initial settings load only if debug is enabled
        if (settings.current.enableDebugLogging) {
             console.log("Flashing Blocker: Settings loaded, initializing.", settings.current);
        }
        initializeOverlaySystem();
    };

    /* --- Direct Event Listener (Commented Out) ---
       This listener updates settings based on a DOM event. It's likely redundant
       as the primary update mechanism is chrome.runtime.onMessage, which modifies
       the same settings.current object via Object.assign. Keeping both might cause issues.
       If this listener proves necessary, ensure it also uses Object.assign for consistency.
    */
    /*
    document.addEventListener('flashBlockerSettingsChanged', function (event) {
        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Settings changed (via direct event):", event.detail);
        Object.assign(settings.current, event.detail); // Use Object.assign if re-enabled
        updateAllOverlays();
        cooldown = settings.current.cooldownTime; // Also update cooldown if re-enabled
        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Cooldown updated (via direct event) to:", cooldown);
    });
    */

    // Listen for messages from popup or background
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

            // Handle ping request
            if (request && request.action === "ping") {
                 // Conditional Log: Log ping reception only if debug is enabled
                 if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Ping received, sending pong");
                sendResponse({ status: "pong" });
                return true; // Keep channel open for async response
            }

            // Handle settings update
            if (request && request.action === "updateSettings") {
                // Conditional Log: Log settings update reception only if debug is enabled
                if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Settings update received via message", request.settings);
                Object.assign(settings.current, request.settings); // Update existing settings object
                cooldown = settings.current.cooldownTime; // Update cooldown variable
                 // Conditional Log: Log cooldown update only if debug is enabled
                 if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Cooldown updated via message to:", cooldown);
                updateAllOverlays();
                sendResponse({ status: "Settings updated" });
                return true; // Keep channel open
            }

            // If no action matched, indicate it (optional)
            // sendResponse({ status: "Unknown action" });
            return false; // No async response needed / close channel if no match
        });
    }

    function initializeOverlaySystem() {
        // Initial scan for videos
        document.querySelectorAll('video').forEach(trackVideo);

        // Watch for new videos being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is a video or contains videos
                    if (node.nodeName === 'VIDEO') {
                        // Conditional Log
                        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: New video detected by MutationObserver", node);
                        trackVideo(node);
                    } else if (node.querySelectorAll) { // Check if it's an element that can contain others
                        node.querySelectorAll('video').forEach(videoNode => {
                             // Conditional Log
                             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: New video detected in subtree by MutationObserver", videoNode);
                             trackVideo(videoNode);
                        });
                    }
                });
            });
        });


        // Observe the body for added child nodes and subtree modifications
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // If body isn't ready yet (possible with run_at: document_start), wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) { // Ensure body exists now
                     observer.observe(document.body, {
                         childList: true,
                         subtree: true
                     });
                     // Perform initial scan again in case videos were missed
                     document.querySelectorAll('video').forEach(trackVideo);
                } else {
                    console.error("Flashing Blocker: Document body still not found after DOMContentLoaded.");
                }
            });
        }

        // Conditional Log
        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Initialized and watching for videos.");
    }

    // Update all overlay elements with current settings
    function updateAllOverlays() {
        const overlays = document.querySelectorAll(".flash-overlay");
        overlays.forEach(overlay => {
            overlay.style.backgroundColor = settings.getOverlayBackground();
            overlay.innerText = settings.current.showWarningText ? settings.current.warningText : '';
        });
        // Conditional Log
        if (settings.current.enableDebugLogging && overlays.length > 0) console.log("Flashing Blocker: Updated", overlays.length, "overlays.");
    }

    function trackVideo(video) {
        if (video.dataset.flashBlockerTracked === "true") {
             // Conditional Log
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video already tracked, skipping.", video);
             return; // Already tracked
        }

        // Check if video dimensions are valid - sometimes videos are added with 0x0 initially
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            // Conditional Log
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video has no dimensions yet, waiting for metadata.", video);
            // Listen for the 'loadedmetadata' event to get dimensions
            video.addEventListener('loadedmetadata', () => trackVideo(video), { once: true }); // Use 'once' to avoid adding multiple listeners
            return; // Don't track yet
        }

        // Conditional Log
        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Attempting to track video:", video);
        video.dataset.flashBlockerTracked = "true"; // Mark as tracked

        const overlay = document.createElement('div');
        overlay.className = 'flash-overlay'; // Use class instead of id for multiple videos
        // Apply styles directly - consider moving complex styles to overlay.css
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '999999'; // Ensure high z-index
        overlay.style.display = 'flex'; // Use flex for centering
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = 'sans-serif';
        overlay.style.color = 'white'; // Style text appearance
        overlay.style.fontSize = '3rem';
        overlay.style.fontWeight = 'bold';
        overlay.style.pointerEvents = 'none'; // Allow interaction with elements underneath when hidden
        overlay.style.transition = 'opacity 0.2s ease';
        overlay.style.opacity = '0'; // Start hidden
        overlay.style.backgroundColor = settings.getOverlayBackground();

        // Add warning text if enabled
        overlay.innerText = settings.current.showWarningText ? settings.current.warningText : '';

        // Append overlay - ensure body exists
        if (document.body) {
             document.body.appendChild(overlay);
        } else {
             console.error("Flashing Blocker: Document body not found when appending overlay.");
             delete video.dataset.flashBlockerTracked; // Clean up marker
             return; // Cannot proceed
        }


        // Create a new FlashTracker instance with our settings object
        const flashTracker = new FlashTracker(settings); // Pass settings here
        let lastFlashTime = 0;
        let flashActive = false;
        // Cooldown is now managed globally in content.js scope, initialized in onLoad
        let intervalId = null;
        let trackerTask;

        try {
             trackerTask = tracking.track(video, flashTracker);
             // Conditional Log
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 🎥 Tracking task created for video:", video);
        } catch (e) {
             console.error("Flashing Blocker: Error creating tracking task:", e, "for video:", video);
             // Clean up overlay and marker if tracking fails
             overlay.remove();
             delete video.dataset.flashBlockerTracked;
             return;
        }


        // Listen for flash events
        flashTracker.on('track', function (event) {
            // --- DEBUG LOGGING ---
            if (settings.current.enableDebugLogging) {
                 // Log frame details regardless of flashing state if debugging is on
                 const brightness = event.brightness !== undefined ? event.brightness.toFixed(1) : 'N/A';
                 const delta = event.delta !== undefined ? event.delta.toFixed(1) : 'N/A';
                 const freq = event.frequency !== undefined ? event.frequency : 'N/A';
                 const isFlashing = event.flashing ? 'YES' : 'NO';
                 // Throttle log frequency slightly to avoid flooding console
                 if (Math.random() < 0.1) { // Log roughly 10% of frames
                    console.log(`[Debug Frame] B:${brightness} D:${delta} Freq:${freq}Hz Flashing:${isFlashing} (Thresholds: D=${settings.current.flashThreshold}, F=${settings.current.flashHzThreshold}Hz)`);
                 }
            }
            // --- END DEBUG LOGGING ---

            if (event.flashing) {
                lastFlashTime = Date.now();
                if (!flashActive) {
                    overlay.style.opacity = '1'; // Show overlay
                    flashActive = true;
                    // Conditional Log: Log specific flash detection event if debugging
                    if (settings.current.enableDebugLogging) {
                        console.warn(`🔥 Flashing Block Warning Triggered! Freq: ${event.frequency}Hz >= ${settings.current.flashHzThreshold}Hz. Overlay shown.`);
                    }
                }
            }
            // No else block needed here, cooldown handles hiding
        });

        function startInterval() {
            if (intervalId !== null) return; // avoid duplicates
            // Conditional Log
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Starting interval timer, Cooldown:", cooldown);
            intervalId = setInterval(() => {
                if (flashActive && (Date.now() - lastFlashTime > cooldown)) {
                    overlay.style.opacity = '0'; // Hide overlay
                    flashActive = false;
                    // Conditional Log
                    if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 🕑 Flash timeout — overlay hidden");
                }
            }, 100); // Check frequently for cooldown expiry
        }

        function stopInterval() {
             if (intervalId !== null) {
                 // Conditional Log
                 if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Stopping interval timer");
                 clearInterval(intervalId);
                 intervalId = null;
             }
        }

        // --- Video Event Listeners ---
        video.addEventListener('pause', () => {
            // Conditional Log
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ⏸️ Video paused — tracker stopped", video);
            flashActive = false;
            overlay.style.opacity = '0'; // hide overlay on pause
            if (trackerTask) trackerTask.stop();
            stopInterval();
        });

        video.addEventListener('play', () => {
            // Conditional Log
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ▶️ Video playing — tracker starting", video);
            if (trackerTask) trackerTask.run();
            startInterval();
        });

        video.addEventListener('ended', () => {
            // Conditional Log
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ⏹️ Video ended - tracker stopped", video);
             flashActive = false;
             overlay.style.opacity = '0';
             if (trackerTask) trackerTask.stop();
             stopInterval();
             // Optional: remove overlay completely? Or leave it for potential replay?
             // overlay.remove();
             // delete video.dataset.flashBlockerTracked;
         });

         // --- DOM Element Removal Observer ---
         const domObserver = new MutationObserver((mutationsList, observer) => {
             for(const mutation of mutationsList) {
                 if (mutation.removedNodes) {
                     mutation.removedNodes.forEach(removedNode => {
                         if (removedNode === video) {
                            // Conditional Log
                             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 📹 Video element removed from DOM - stopping tracker and cleaning up", video);
                             flashActive = false;
                             overlay.remove(); // Remove overlay
                             if (trackerTask) trackerTask.stop();
                             stopInterval();
                             observer.disconnect(); // Stop observing this specific video
                             return; // Exit loop once found
                         }
                     });
                 }
             }
         });
         // Start observing the video's parent node for removal
         if (video.parentNode) {
             domObserver.observe(video.parentNode, { childList: true });
         }


        // Check if video is already playing when tracking starts
        if (!video.paused) {
            // Conditional Log
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video already playing, starting tracker task", video);
             if (trackerTask) trackerTask.run();
             startInterval();
        }
    }

    // Optional: Signal script loaded only if debugging
    // if (settings.current.enableDebugLogging) console.log("Flashing Blocker content script loaded");

})();