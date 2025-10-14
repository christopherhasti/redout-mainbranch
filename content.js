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
    
    // Explicitly load settings AFTER setting the onLoad callback
    settings.loadSettings();


    // Listen for messages from popup or background
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage) {
        browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {

            // Handle ping request
            if (request && request.action === "ping") {
                 // Conditional Log: Log ping reception only if debug is enabled
                 if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Ping received, sending pong");
                // In a Promise-based system, returning a Promise is the new "sendResponse"
                return Promise.resolve({ status: "pong" });
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
                // Return a promise to confirm
                return Promise.resolve({ status: "Settings updated" });
            }
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
             return; // Already.
        }

        // Check if video dimensions are valid
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            // Conditional Log
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video has no dimensions yet, waiting for metadata.", video);
            video.addEventListener('loadedmetadata', () => trackVideo(video), { once: true });
            return;
        }

        // Conditional Log
        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Attempting to track video:", video);
        video.dataset.flashBlockerTracked = "true"; // Mark as tracked

        const overlay = document.createElement('div');
        overlay.className = 'flash-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = 'sans-serif';
        overlay.style.color = 'white';
        overlay.style.fontSize = '3rem';
        overlay.style.fontWeight = 'bold';
        overlay.style.pointerEvents = 'none';
        overlay.style.transition = 'opacity 0.2s ease';
        overlay.style.opacity = '0'; // Start hidden
        overlay.style.backgroundColor = settings.getOverlayBackground();

        overlay.innerText = settings.current.showWarningText ? settings.current.warningText : '';

        if (document.body) {
             document.body.appendChild(overlay);
        } else {
             console.error("Flashing Blocker: Document body not found when appending overlay.");
             delete video.dataset.flashBlockerTracked;
             return;
        }


        const flashTracker = new FlashTracker(settings);
        let lastFlashTime = 0;
        let flashActive = false;
        let intervalId = null;
        let trackerTask;

        try {
             trackerTask = tracking.track(video, flashTracker);
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 🎥 Tracking task created for video:", video);
        } catch (e) {
             console.error("Flashing Blocker: Error creating tracking task:", e, "for video:", video);
             overlay.remove();
             delete video.dataset.flashBlockerTracked;
             return;
        }


        flashTracker.on('track', function (event) {
            if (settings.current.enableDebugLogging) {
                 const brightness = event.brightness !== undefined ? event.brightness.toFixed(1) : 'N/A';
                 const delta = event.delta !== undefined ? event.delta.toFixed(1) : 'N/A';
                 const freq = event.frequency !== undefined ? event.frequency : 'N/A';
                 const isFlashing = event.flashing ? 'YES' : 'NO';
                 if (Math.random() < 0.1) {
                    console.log(`[Debug Frame] B:${brightness} D:${delta} Freq:${freq}Hz Flashing:${isFlashing} (Thresholds: D=${settings.current.flashThreshold}, F=${settings.current.flashHzThreshold}Hz)`);
                 }
            }

            if (event.flashing) {
                lastFlashTime = Date.now();
                if (!flashActive) {
                    overlay.style.opacity = '1';
                    flashActive = true;
                    if (settings.current.enableDebugLogging) {
                        console.warn(`🔥 Flashing Block Warning Triggered! Freq: ${event.frequency}Hz >= ${settings.current.flashHzThreshold}Hz. Overlay shown.`);
                    }
                }
            }
        });

        function startInterval() {
            if (intervalId !== null) return;
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Starting interval timer, Cooldown:", cooldown);
            intervalId = setInterval(() => {
                if (flashActive && (Date.now() - lastFlashTime > cooldown)) {
                    overlay.style.opacity = '0';
                    flashActive = false;
                    if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 🕑 Flash timeout — overlay hidden");
                }
            }, 100);
        }

        function stopInterval() {
             if (intervalId !== null) {
                 if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Stopping interval timer");
                 clearInterval(intervalId);
                 intervalId = null;
             }
        }

        video.addEventListener('pause', () => {
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ⏸️ Video paused — tracker stopped", video);
            flashActive = false;
            overlay.style.opacity = '0';
            if (trackerTask) trackerTask.stop();
            stopInterval();
        });

        video.addEventListener('play', () => {
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ▶️ Video playing — tracker starting", video);
            if (trackerTask) trackerTask.run();
            startInterval();
        });

        video.addEventListener('ended', () => {
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ⏹️ Video ended - tracker stopped", video);
             flashActive = false;
             overlay.style.opacity = '0';
             if (trackerTask) trackerTask.stop();
             stopInterval();
         });

         const domObserver = new MutationObserver((mutationsList, observer) => {
             for(const mutation of mutationsList) {
                 if (mutation.removedNodes) {
                     mutation.removedNodes.forEach(removedNode => {
                         if (removedNode === video) {
                             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 📹 Video element removed from DOM - stopping tracker and cleaning up", video);
                             flashActive = false;
                             overlay.remove();
                             if (trackerTask) trackerTask.stop();
                             stopInterval();
                             observer.disconnect();
                             return;
                         }
                     });
                 }
             }
         });

         if (video.parentNode) {
             domObserver.observe(video.parentNode, { childList: true });
         }


        if (!video.paused) {
             if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video already playing, starting tracker task", video);
             if (trackerTask) trackerTask.run();
             startInterval();
        }
    }
})();