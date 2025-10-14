// Settings manager for Flashing Image Blocker
class Settings {
    constructor() {
        // Default settings
        this.defaults = {
            overlayColor: '#003264',
            overlayOpacity: 0.95,
            cooldownTime: 500,      // ms
            flashThreshold: 90,       // Brightness delta sensitivity
            flashHzThreshold: 3,        // Max flash frequency (Hz)
            showWarningText: true,
            warningText: 'Flashing Blocked',
            enableDebugLogging: false
        };

        // Initialize with defaults
        this.current = {...this.defaults};

        // Callback to execute when settings are loaded
        this.onLoad = null;

        // DO NOT call loadSettings() here anymore
    }

    // Load settings from storage - NOW ASYNC
    async loadSettings() {
        try {
            // Try to load from browser storage if available
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
                const result = await browser.storage.local.get('flashBlockerSettings');
                const loadedSettings = (result && result.flashBlockerSettings) ? result.flashBlockerSettings : {};
                // Merge defaults with loaded settings to ensure all keys exist
                this.current = {...this.defaults, ...loadedSettings};

                // Optional cleanup: Remove deprecated keys if they exist
                if (this.current.flashTriggerCount !== undefined) {
                    delete this.current.flashTriggerCount;
                }
            } else {
                // Fall back to localStorage for development or testing
                const savedSettings = localStorage.getItem('flashBlockerSettings');
                let loadedSettings = {};
                if (savedSettings) {
                    try {
                        loadedSettings = JSON.parse(savedSettings);
                    } catch (parseError) {
                        console.error("Error parsing saved settings from localStorage:", parseError);
                    }
                }
                 // Ensure defaults are applied for any missing settings
                this.current = {...this.defaults, ...loadedSettings};
                 // If old setting exists, remove it (optional cleanup)
                 if (this.current.flashTriggerCount !== undefined) {
                    delete this.current.flashTriggerCount;
                }
            }
        } catch (e) {
            console.error("Error loading settings:", e);
            this.current = {...this.defaults}; // Fallback to defaults on error
        } finally {
            // Call onLoad callback if defined, regardless of error
            if (typeof this.onLoad === 'function') {
                this.onLoad();
            }
        }
    }

    // Save settings to storage - NOW ASYNC
    async saveSettings() {
        try {
             // Clean up old setting before saving (optional but good practice)
            if (this.current.flashTriggerCount !== undefined) {
                delete this.current.flashTriggerCount;
            }

            // Try to save to browser storage if available
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
                await browser.storage.local.set({flashBlockerSettings: this.current});
                // Optional: Log save success only if debug is enabled
                // if (this.current.enableDebugLogging) console.log("Settings saved to browser storage:", this.current);
            } else {
                // Fall back to localStorage for development or testing
                localStorage.setItem('flashBlockerSettings', JSON.stringify(this.current));
                 // if (this.current.enableDebugLogging) console.log("Settings saved to localStorage:", this.current);
            }
        } catch (e) {
            console.error("Error saving settings:", e);
        }
    }

    // Reset to default settings
    resetToDefaults() {
        this.current = {...this.defaults}; // Reset to current defaults
        this.saveSettings(); // Save the clean defaults
        // if (this.current.enableDebugLogging) console.log("Settings reset to defaults:", this.current); // Optional debug log
    }

    // Get the complete CSS background value with opacity
    getOverlayBackground() {
        // Convert hex to RGB for transparency support
        try {
            const hex = this.current.overlayColor.replace('#', '');
            // Ensure hex is valid before parsing
            if (/^[0-9A-F]{6}$/i.test(hex)) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const opacity = Math.min(1, Math.max(0, this.current.overlayOpacity)); // Clamp opacity
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            } else {
                console.warn("Invalid overlayColor format, using default.");
                return `rgba(0, 50, 100, ${this.defaults.overlayOpacity})`; // Default color on error
            }
        } catch (e) {
             console.error("Error creating overlay background color:", e);
             return `rgba(0, 50, 100, ${this.defaults.overlayOpacity})`; // Default color on error
        }
    }
}