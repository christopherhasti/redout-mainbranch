(function () {
    // Initialize settings
    const settings = new Settings();

    // Wait for settings to load before initializing
    settings.onLoad = function () {
        console.log("Settings loaded:", settings.current);
        initializeOverlaySystem();
    };

    /* --- Listener Removed/Commented Out ---
       This listener also updated settings.current when the 'flashBlockerSettingsChanged'
       event fired on the document. It's likely redundant because the primary update path
       is now through chrome.runtime.onMessage using Object.assign, which modifies the
       same settings.current object. Keeping both could lead to confusion or unexpected behavior.
       If you find settings aren't updating correctly without this, you might need it,
       but ensure it uses Object.assign as well for consistency.
    */
    /*
    document.addEventListener('flashBlockerSettingsChanged', function (event) {
        console.log("Settings changed (via direct event):", event.detail);
        // Update our local settings - Original method (potentially redundant)
        // settings.current = event.detail;
        // Alternative using Object.assign if this listener is needed:
        // Object.assign(settings.current, event.detail);
        updateAllOverlays();
    });
    */


    // Listen for messages from popup or background script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            console.log("Message received in content script:", request);

            // Handle ping request (used to check if content script is loaded)
            if (request && request.action === "ping") {
                console.log("Ping received, sending pong");
                sendResponse({ status: "pong" });
                return true; // Keep channel open for async response
            }

            // Handle settings update
            if (request && request.action === "updateSettings") {
                console.log("Settings update received (via message):", request.settings);
                // Modify the existing 'current' object instead of replacing it
                Object.assign(settings.current, request.settings);
                console.log("Settings updated internally:", settings.current);
                updateAllOverlays();
                // Update the cooldown variable used by the interval as well
                cooldown = settings.current.cooldownTime;
                console.log("Cooldown updated to:", cooldown);
                sendResponse({ status: "Settings updated" });
                return true; // Keep channel open for async response
            }

            // If no action matched, indicate it (optional)
            // sendResponse({ status: "Unknown action" });
            return false; // No async response needed / close channel if no match
        });
    }

    // Local variable for cooldown, updated when settings change
    let cooldown; // Initialize later in onLoad or trackVideo

    function initializeOverlaySystem() {
        // Set initial cooldown from loaded settings
        cooldown = settings.current.cooldownTime;
        console.log("Initial cooldown set to:", cooldown);

        // Initial scan for videos
        document.querySelectorAll('video').forEach(trackVideo);

        // Watch for new videos being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is a video or contains videos
                    if (node.nodeName === 'VIDEO') {
                        trackVideo(node);
                    } else if (node.querySelectorAll) { // Check if it's an element that can contain others
                        node.querySelectorAll('video').forEach(trackVideo);
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
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                // Perform initial scan again in case videos were missed
                 document.querySelectorAll('video').forEach(trackVideo);
            });
        }


        console.log("Flashing Image Blocker initialized and watching for videos");
    }

    // Update all overlay elements with current settings
    function updateAllOverlays() {
        const overlays = document.querySelectorAll(".flash-overlay");
        overlays.forEach(overlay => {
            overlay.style.backgroundColor = settings.getOverlayBackground();

            if (settings.current.showWarningText) {
                overlay.innerText = settings.current.warningText;
            } else {
                overlay.innerText = '';
            }
        });
    }

    function trackVideo(video) {
        if (video.dataset.blackoutTracked === "true") {
             console.log("Video already tracked:", video);
             return; // Already tracked
        }

        // Check if video dimensions are valid - sometimes videos are added with 0x0 initially
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            // Listen for the 'loadedmetadata' event to get dimensions
            video.addEventListener('loadedmetadata', () => {
                 console.log("Metadata loaded, tracking video:", video);
                 trackVideo(video); // Retry tracking now that dimensions should be available
            }, { once: true }); // Use 'once' to avoid adding multiple listeners
            console.log("Video has no dimensions yet, waiting for metadata:", video);
            return; // Don't track yet
        }


        console.log("Attempting to track video:", video);
        video.dataset.blackoutTracked = "true"; // Mark as tracked

        const overlay = document.createElement('div');
        overlay.className = 'flash-overlay'; // Use class instead of id for multiple videos
        // Apply styles directly - consider moving complex styles to overlay.css
        overlay.style.position = 'fixed';
        overlay.style.transition = 'opacity 0.2s ease';
        overlay.style.opacity = '0'; // Start hidden
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = settings.getOverlayBackground();
        overlay.style.zIndex = '999999'; // Ensure high z-index
        overlay.style.display = 'flex'; // Use flex for centering
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.color = 'white';
        overlay.style.fontSize = '3rem';
        overlay.style.fontWeight = 'bold';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = 'sans-serif';
        overlay.style.pointerEvents = 'none'; // Allow interaction with elements underneath when hidden


        // Add warning text if enabled
        if (settings.current.showWarningText) {
            overlay.innerText = settings.current.warningText;
        }

        // Append overlay - ensure body exists
        if (document.body) {
             document.body.appendChild(overlay);
        } else {
             console.error("Document body not found when trying to append overlay.");
             // Clean up dataset marker if we failed?
             // delete video.dataset.blackoutTracked;
             return; // Cannot proceed
        }


        // Create a new FlashTracker instance with our settings
        const flashTracker = new FlashTracker(settings);
        let lastFlashTime = 0;
        let flashActive = false;
        // Cooldown is now managed globally in content.js scope, ensure it's defined
        if (typeof cooldown === 'undefined') cooldown = settings.current.cooldownTime;
        let intervalId = null;

        // Create tracking task
        let trackerTask;
        try {
             trackerTask = tracking.track(video, flashTracker);
             console.log("🎥 Tracking task created for video:", video);
        } catch (e) {
             console.error("Error creating tracking task:", e, "for video:", video);
             // Clean up overlay and marker if tracking fails
             overlay.remove();
             delete video.dataset.blackoutTracked;
             return;
        }


        // Listen for flash events
        flashTracker.on('track', function (event) {
            if (event.flashing) {
                lastFlashTime = Date.now();
                if (!flashActive) {
                    overlay.style.opacity = '1'; // Show overlay
                    flashActive = true;
                    console.log("🔥 Flash detected — overlay shown");
                }
            }
        });

        function startInterval() {
            if (intervalId !== null) return; // avoid duplicates
            console.log("Starting interval timer, Cooldown:", cooldown);
            intervalId = setInterval(() => {
                if (flashActive && (Date.now() - lastFlashTime > cooldown)) {
                    overlay.style.opacity = '0'; // Hide overlay
                    flashActive = false;
                    console.log("🕑 Flash timeout — overlay hidden");
                }
            }, 100); // Check frequently
        }

        function stopInterval() {
             if (intervalId !== null) {
                 console.log("Stopping interval timer");
                 clearInterval(intervalId);
                 intervalId = null;
             }
        }

        video.addEventListener('pause', () => {
            flashActive = false;
            overlay.style.opacity = '0'; // hide overlay on pause
            if (trackerTask) trackerTask.stop();
            stopInterval();
            console.log("⏸️ Video paused — tracker stopped");
        });

        video.addEventListener('play', () => {
            if (trackerTask) trackerTask.run();
            startInterval();
            console.log("▶️ Video playing — tracker started");
        });

        video.addEventListener('ended', () => {
             flashActive = false;
             overlay.style.opacity = '0';
             if (trackerTask) trackerTask.stop();
             stopInterval();
             console.log("⏹️ Video ended - tracker stopped");
             // Optional: remove overlay completely? Or leave it for potential replay?
             // overlay.remove();
             // delete video.dataset.blackoutTracked;
         });

         // Handle cases where the video element is removed from the DOM
         const domObserver = new MutationObserver((mutationsList, observer) => {
             for(const mutation of mutationsList) {
                 if (mutation.removedNodes) {
                     mutation.removedNodes.forEach(removedNode => {
                         if (removedNode === video) {
                             console.log("📹 Video element removed from DOM - stopping tracker and cleaning up");
                             flashActive = false;
                             overlay.remove(); // Remove overlay
                             if (trackerTask) trackerTask.stop();
                             stopInterval();
                             observer.disconnect(); // Stop observing this specific video
                             // No need to delete blackoutTracked as the element is gone
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
             console.log("Video already playing, starting tracker task");
             if (trackerTask) trackerTask.run();
             startInterval();
        }

        // This listener seems redundant now as cooldown is updated via the message handler
        /*
        document.addEventListener('flashBlockerSettingsChanged', (e) => {
            console.log("Updating cooldown via direct event listener:", e.detail.cooldownTime);
            cooldown = e.detail.cooldownTime;
        });
        */
    }

    // Signal that content script is loaded
    console.log("Flashing Image Blocker content script loaded");
})();