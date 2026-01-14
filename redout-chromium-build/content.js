(function () {
    const settings = new Settings();
    let cooldown; // Will be initialized after settings load

    // --- Overlay Manager (Singleton) ---
    const OverlayManager = {
        element: null,
        activeSources: new Set(),

        init() {
            if (this.element) return;

            this.element = document.createElement('div');
            this.element.className = 'flash-overlay';
            // Apply styles programmatically to ensure isolation and performance
            Object.assign(this.element.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                zIndex: '2147483647', // Maximum reliable z-index
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: 'white',
                fontSize: '3rem',
                fontWeight: '600',
                letterSpacing: '-0.02em',
                textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                transition: 'opacity 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                opacity: '0', // Start hidden
                backgroundColor: settings.getOverlayBackground(),
                backdropFilter: 'blur(12px)',
                webkitBackdropFilter: 'blur(12px)'
            });

            this.element.innerText = settings.current.showWarningText ? settings.current.warningText : '';

            // Handle appending to body safely
            if (document.body) {
                document.body.appendChild(this.element);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    if (document.body && !this.element.parentNode) {
                        document.body.appendChild(this.element);
                    }
                });
            }
        },

        updateAppearance() {
            if (!this.element) return;
            this.element.style.backgroundColor = settings.getOverlayBackground();
            this.element.innerText = settings.current.showWarningText ? settings.current.warningText : '';
        },

        trigger(source) {
            this.activeSources.add(source);
            this.updateVisibility();
        },

        release(source) {
            this.activeSources.delete(source);
            this.updateVisibility();
        },

        updateVisibility() {
            if (!this.element) return;
            if (this.activeSources.size > 0) {
                this.element.style.opacity = '1';
                // Optional: Force a repaint or ensure it's top if needed, but z-index should handle it
            } else {
                this.element.style.opacity = '0';
            }
        }
    };


    // Wait for settings to load before initializing
    settings.onLoad = function () {
        cooldown = settings.current.cooldownTime; // Initialize cooldown
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
                if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Ping received, sending pong");
                return Promise.resolve({ status: "pong" });
            }

            // Handle settings update
            if (request && request.action === "updateSettings") {
                if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Settings update received via message", request.settings);
                Object.assign(settings.current, request.settings); // Update existing settings object
                cooldown = settings.current.cooldownTime; // Update cooldown variable

                if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Cooldown updated via message to:", cooldown);

                OverlayManager.updateAppearance(); // Update the global overlay

                return Promise.resolve({ status: "Settings updated" });
            }
        });
    }

    function initializeOverlaySystem() {
        // Initialize the global overlay
        OverlayManager.init();

        // Initial scan for videos
        document.querySelectorAll('video').forEach(trackVideo);

        // Watch for new videos being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is a video or contains videos
                    if (node.nodeName === 'VIDEO') {
                        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: New video detected by MutationObserver", node);
                        trackVideo(node);
                    } else if (node.querySelectorAll) { // Check if it's an element that can contain others
                        node.querySelectorAll('video').forEach(videoNode => {
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

                    // Ensure overlay is in DOM
                    OverlayManager.init();
                } else {
                    console.error("Flashing Blocker: Document body still not found after DOMContentLoaded.");
                }
            });
        }

        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Initialized and watching for videos.");
    }

    function trackVideo(video) {
        if (video.dataset.flashBlockerTracked === "true") {
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video already tracked, skipping.", video);
            return; // Already.
        }

        // Check if video dimensions are valid
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Video has no dimensions yet, waiting for metadata.", video);
            video.addEventListener('loadedmetadata', () => trackVideo(video), { once: true });
            return;
        }

        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Attempting to track video:", video);
        video.dataset.flashBlockerTracked = "true"; // Mark as tracked

        // NOTE: We no longer create a per-video overlay here.
        // usage is via OverlayManager.trigger(video)

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
            delete video.dataset.flashBlockerTracked;
            return;
        }


        flashTracker.on('track', function (event) {
            if (settings.current.enableDebugLogging) {
                const brightness = event.brightness !== undefined ? event.brightness.toFixed(1) : 'N/A';
                const delta = event.delta !== undefined ? event.delta.toFixed(1) : 'N/A';
                const freq = event.frequency !== undefined ? event.frequency : 'N/A';
                const isFlashing = event.flashing ? 'YES' : 'NO';
                // Limit debug spam
                if (Math.random() < 0.1) {
                    console.log(`[Debug Frame] B:${brightness} D:${delta} Freq:${freq}Hz Flashing:${isFlashing} (Thresholds: D=${settings.current.flashThreshold}, F=${settings.current.flashHzThreshold}Hz)`);
                }
            }

            if (event.flashing) {
                lastFlashTime = Date.now();
                if (!flashActive) {
                    // Start blocking
                    OverlayManager.trigger(video);
                    flashActive = true;
                    if (settings.current.enableDebugLogging) {
                        console.warn(`🔥 Flashing Block Warning Triggered! Freq: ${event.frequency}Hz >= ${settings.current.flashHzThreshold}Hz. Overlay shown.`);
                    }
                }
            }
        });

        // Loop to check for cooldown expiration
        function startInterval() {
            if (intervalId !== null) return;
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: Starting interval timer, Cooldown:", cooldown);

            intervalId = setInterval(() => {
                // If we are currently in "flash active" state, check if we should release it
                if (flashActive) {
                    if (Date.now() - lastFlashTime > cooldown) {
                        // Cooldown passed
                        OverlayManager.release(video);
                        flashActive = false;
                        if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 🕑 Flash timeout — overlay released for this video");
                    }
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

        // Cleanup and State Management Listeners

        video.addEventListener('pause', () => {
            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: ⏸️ Video paused — tracker stopped", video);

            // If we were blocking, release it immediately (or should we wait for cooldown? Usually pause means safe)
            if (flashActive) {
                OverlayManager.release(video);
                flashActive = false;
            }

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

            if (flashActive) {
                OverlayManager.release(video);
                flashActive = false;
            }

            if (trackerTask) trackerTask.stop();
            stopInterval();
        });

        const domObserver = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.removedNodes) {
                    mutation.removedNodes.forEach(removedNode => {
                        if (removedNode === video) {
                            if (settings.current.enableDebugLogging) console.log("Flashing Blocker: 📹 Video element removed from DOM - stopping tracker and cleaning up", video);

                            if (flashActive) {
                                OverlayManager.release(video);
                                flashActive = false;
                            }

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