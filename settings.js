// Settings manager for Flashing Image Blocker
class Settings {
    constructor() {
        // Default settings
        this.defaults = {
            overlayColor: '#003264', // Dark blue
            overlayOpacity: 0.95,
            cooldownTime: 500, // milliseconds before hiding overlay after flash ends
            flashThreshold: 90, // brightness delta that triggers flash detection
            flashTriggerCount: 2, // number of flashes needed to trigger overlay
            showWarningText: true, // show warning text on overlay
            warningText: 'Flashing Blocked' // text to display when blocking
        };
        
        // Initialize with defaults
        this.current = {...this.defaults};
        
        // Callback to execute when settings are loaded
        this.onLoad = null;
        
        // Load settings from storage
        this.loadSettings();
    }
  
    // Load settings from storage
    loadSettings() {
        try {
            // Try to load from Chrome storage if available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('flashBlockerSettings', (result) => {
                    if (result && result.flashBlockerSettings) {
                        this.current = {...this.defaults, ...result.flashBlockerSettings};
                    } else {
                        this.current = {...this.defaults};
                    }
                    
                    console.log("Settings loaded from storage:", this.current);
                    
                    // Call onLoad callback if defined
                    if (typeof this.onLoad === 'function') {
                        this.onLoad();
                    }
                });
            } else {
                // Fall back to localStorage for development or testing
                const savedSettings = localStorage.getItem('flashBlockerSettings');
                if (savedSettings) {
                    try {
                        const parsedSettings = JSON.parse(savedSettings);
                        this.current = {...this.defaults, ...parsedSettings};
                    } catch (parseError) {
                        console.error("Error parsing saved settings:", parseError);
                        this.current = {...this.defaults};
                    }
                }
                
                console.log("Settings loaded from localStorage:", this.current);
                
                // Call onLoad callback if defined
                if (typeof this.onLoad === 'function') {
                    this.onLoad();
                }
            }
        } catch (e) {
            console.error("Error loading settings:", e);
            this.current = {...this.defaults};
            
            // Call onLoad callback even on error
            if (typeof this.onLoad === 'function') {
                this.onLoad();
            }
        }
    }
  
    // Save settings to storage
    saveSettings() {
        try {
            // Try to save to Chrome storage if available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({flashBlockerSettings: this.current}, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error saving to Chrome storage:", chrome.runtime.lastError);
                    } else {
                        console.log("Settings saved to Chrome storage:", this.current);
                        // Dispatch event for content script to update
                        this.dispatchSettingsChangedEvent();
                    }
                });
            } else {
                // Fall back to localStorage for development or testing
                localStorage.setItem('flashBlockerSettings', JSON.stringify(this.current));
                console.log("Settings saved to localStorage:", this.current);
                // Dispatch event for content script to update
                this.dispatchSettingsChangedEvent();
            }
        } catch (e) {
            console.error("Error saving settings:", e);
        }
    }
  
    // Reset to default settings
    resetToDefaults() {
        this.current = {...this.defaults};
        this.saveSettings();
        console.log("Settings reset to defaults:", this.current);
    }
  
    // Get the complete CSS background value with opacity
    getOverlayBackground() {
        // Convert hex to RGB for transparency support
        const hex = this.current.overlayColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${this.current.overlayOpacity})`;
    }
    
    // Dispatch event when settings change
    dispatchSettingsChangedEvent() {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent('flashBlockerSettingsChanged', {
                detail: this.current
            });
            console.log("Dispatching settings changed event:", this.current);
            document.dispatchEvent(event);
        }
    }
  }