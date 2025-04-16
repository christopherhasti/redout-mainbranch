(function () {
    function trackVideo(video) {
        if (video.dataset.blackoutTracked) return;

        video.dataset.blackoutTracked = "true";

        const overlay = document.createElement('div');
        overlay.id = 'flash-overlay';
        overlay.style.position = 'fixed';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = 0;
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.75)';
        overlay.style.zIndex = 99999;
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.color = 'white';
        overlay.style.fontSize = '3rem';
        overlay.style.fontWeight = 'bold';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = 'sans-serif';
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'flex'; // center content
        overlay.innerText = '⚠️ Flashing Blocked';
        document.body.appendChild(overlay);

        const flashTracker = new FlashTracker();
        let lastFlashTime = 0;
        let flashActive = false;
        const cooldown = 2000; // 2 seconds after last flash
        let intervalId = null;

        const trackerTask = tracking.track(video, flashTracker);
        console.log("🎥 Tracking video:", video);

        flashTracker.on('track', function (event) {
            if (event.flashing) {
                lastFlashTime = Date.now();
                if (!flashActive) {
                    overlay.style.opacity = 1;
                    flashActive = true;
                    console.log("🔥 Flash detected — overlay shown");
                }
            }
        });

        function startInterval() {
            if (intervalId !== null) return; // avoid duplicates
            intervalId = setInterval(() => {
                if (flashActive && Date.now() - lastFlashTime > cooldown) {
                    overlay.style.opacity = 0;
                    flashActive = false;
                    console.log("🕑 Flash timeout — overlay hidden");
                }
            }, 250);
        }

        function stopInterval() {
            clearInterval(intervalId);
            intervalId = null;
        }

        video.addEventListener('pause', () => {
            flashActive = false;
            overlay.style.opacity = 0; // hide overlay on pause
            trackerTask.stop();
            stopInterval();
            console.log("⏸️ Video paused — tracker stopped");
        });

        video.addEventListener('play', () => {
            trackerTask.run();
            startInterval();
            console.log("▶️ Video playing — tracker started");
        });
    }

    // Initial scan
    document.querySelectorAll('video').forEach(trackVideo);

    // Watch for new videos being added to the DOM
    const observer = new MutationObserver(() => {
        document.querySelectorAll('video').forEach(trackVideo);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
