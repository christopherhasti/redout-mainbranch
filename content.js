(function () {
    function trackVideo(video) {
        if (video.dataset.blackoutTracked) return;

        video.dataset.blackoutTracked = "true";

        const overlay = document.createElement('div');
        overlay.id = 'flash-overlay';
        overlay.style.position = 'fixed';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = 0;
        overlay.style.display = 'block';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.75)';
        overlay.style.zIndex = 99999;
        overlay.style.display = 'none';
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
        let flashTimeout;

        flashTracker.on('track', function (event) {
            if (event.flashing) {
                overlay.style.opacity = 1;
                clearTimeout(flashTimeout);
                flashTimeout = setTimeout(() => {
                    overlay.style.opacity = 0;
                }, 100);
            }
        });

        const trackerTask = tracking.track(video, flashTracker);
        console.log("🎥 Tracking video:", video);

        video.addEventListener('pause', () => {
            trackerTask.stop();
            console.log("⏸️ Video paused — tracker stopped");
        });

        video.addEventListener('play', () => {
            trackerTask.run();
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
