var FlashTracker = function() {
    FlashTracker.prototype.prevBrightness = null;
    FlashTracker.prototype.flashCount = 0;
  
    this.track = function(pixels, width, height) {
      let gray = tracking.Image.grayscale(pixels, width, height, true);
      let totalBrightness = 0;
  
      for (let i = 0; i < gray.length; i += 4) {
        totalBrightness += gray[i];
      }
  
      let avgBrightness = totalBrightness / (gray.length / 4);
      let delta = 0;
  
      if (this.prevBrightness !== null) {
        delta = Math.abs(avgBrightness - this.prevBrightness);
      }
  
      this.prevBrightness = avgBrightness;
  
      console.log("avg brightness:", avgBrightness, "delta:", delta);
  
      if (delta > 100) { // was 15 or 40
        this.flashCount++;
      } else {
        this.flashCount = 0;
      }    
  
      this.emit('track', {
        flashing: this.flashCount >= 0
      });
    };
  };
  
tracking.inherits(FlashTracker, tracking.Tracker);  