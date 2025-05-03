const settings = new Settings();
let activeTabId = null;

function initializePopup() {
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      const activeContent = document.getElementById(tabId);
      if (activeContent) {
          activeContent.classList.add('active');
      }
    });
  });

  // Set callback for when settings are loaded
  settings.onLoad = function() {
    loadSettingsIntoUI();
    setupEventListeners();
    checkExtensionStatus();
  };

  // Force load settings
  settings.loadSettings();
}

function loadSettingsIntoUI() {
  if (!settings.current) {
      console.error("Settings could not be loaded for popup UI.");
      return;
  }

  // Appearance settings
  document.getElementById('overlayColor').value = settings.current.overlayColor;
  document.getElementById('overlayOpacity').value = settings.current.overlayOpacity;
  document.getElementById('opacityValue').textContent = settings.current.overlayOpacity;
  document.getElementById('showWarningText').checked = settings.current.showWarningText;
  document.getElementById('warningText').value = settings.current.warningText;

  // Detection settings
  document.getElementById('flashThreshold').value = settings.current.flashThreshold;
  document.getElementById('thresholdValue').textContent = settings.current.flashThreshold;
  document.getElementById('flashHzThreshold').value = settings.current.flashHzThreshold;

  // Advanced settings
  document.getElementById('cooldownTime').value = settings.current.cooldownTime;
  document.getElementById('enableDebugLogging').checked = settings.current.enableDebugLogging; // <-- UPDATED
}

function setupEventListeners() {
  // Appearance settings
  document.getElementById('overlayColor').addEventListener('change', updateSetting);
  document.getElementById('overlayOpacity').addEventListener('input', updateRangeSetting);
  document.getElementById('showWarningText').addEventListener('change', updateSetting);
  document.getElementById('warningText').addEventListener('change', updateSetting); // Use 'change' or 'input'

  // Detection settings
  document.getElementById('flashThreshold').addEventListener('input', updateRangeSetting);
  document.getElementById('flashHzThreshold').addEventListener('change', updateSetting);

  // Advanced settings
  document.getElementById('cooldownTime').addEventListener('change', updateSetting);
  document.getElementById('enableDebugLogging').addEventListener('change', updateSetting); // <-- ADDED

  // Reset button
  document.getElementById('resetButton').addEventListener('click', resetSettings);
}

// Function to update settings when a control changes
function updateSetting(event) {
  const target = event.target;
  const id = target.id;
  let value;

  switch (target.type) {
      case 'checkbox':
          value = target.checked;
          break;
      case 'number':
          const min = target.min ? parseFloat(target.min) : -Infinity;
          const max = target.max ? parseFloat(target.max) : Infinity;
          value = Math.min(max, Math.max(min, parseInt(target.value, 10)));
           // Fallback if parsing fails
          if (isNaN(value)) {
              value = settings.defaults[id] !== undefined ? settings.defaults[id] : (min !== -Infinity ? min : 0);
              console.warn(`Invalid number input for ${id}, resetting to default: ${value}`);
          }
          target.value = value; // Update input value in case it was clamped or reset
          break;
      case 'color':
      case 'text':
      default:
          value = target.value;
          break;
  }

  // Only update and save if the value is valid and changed
  if (value !== undefined && settings.current[id] !== value) {
      settings.current[id] = value;
      settings.saveSettings(); // Save the updated settings object
      sendSettingsToContentScripts(); // Notify content scripts
  }
}

// Function to update range settings and display values
function updateRangeSetting(event) {
  const target = event.target;
  const id = target.id;
  const value = parseFloat(target.value);
  let displayElementId = '';

  // Update the display value span dynamically
  switch (id) {
    case 'overlayOpacity':
      displayElementId = 'opacityValue';
      break;
    case 'flashThreshold':
      displayElementId = 'thresholdValue';
      break;
    // Add cases for other range inputs if needed
  }

  if (displayElementId) {
    const displayElement = document.getElementById(displayElementId);
    if (displayElement) {
        // Adjust formatting based on range step if needed
        const step = target.step ? parseFloat(target.step) : 1;
        const decimals = step < 1 ? (step.toString().split('.')[1] || '').length : 0;
        displayElement.textContent = value.toFixed(decimals);
    }
  }

  // Only update and save if the value is valid and changed
  if (!isNaN(value) && settings.current[id] !== value) {
      settings.current[id] = value;
      settings.saveSettings(); // Save the updated settings object
      sendSettingsToContentScripts(); // Notify content scripts
  }
}


// Function to reset settings to defaults
function resetSettings() {
  settings.resetToDefaults(); // This also saves internally
  loadSettingsIntoUI(); // Update the popup UI
  sendSettingsToContentScripts(); // Notify content scripts
}

// Function to send updated settings to all content scripts
function sendSettingsToContentScripts() {
  // Optional debug log
  // if (settings.current.enableDebugLogging) console.log("Popup: Sending settings to content scripts:", settings.current);

  if (!chrome.tabs) {
      // console.warn("Popup: Cannot send settings: chrome.tabs API not available."); // Optional debug
      return;
  }
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
        console.error("Popup: Error querying tabs:", chrome.runtime.lastError.message);
        return;
    }
    tabs.forEach(tab => {
      // Avoid sending messages to internal/invalid tabs
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
          try {
              chrome.tabs.sendMessage(tab.id, {
                  action: "updateSettings",
                  settings: settings.current // Send the current settings object
              }, (response) => {
                  // Optional: Handle response or errors (like content script not injected)
                  if (chrome.runtime.lastError) {
                      // This is expected if the content script isn't on the page
                      // if (settings.current.enableDebugLogging) console.log(`Popup: Tab ${tab.id} likely inactive: ${chrome.runtime.lastError.message}`);
                  } else {
                       // if (settings.current.enableDebugLogging) console.log(`Popup: Settings sent to tab ${tab.id}, response:`, response);
                  }
              });
          } catch (e) {
              console.error(`Popup: Sync error sending settings to tab ${tab.id}:`, e.message);
          }
      }
    });
  });
}


// Function to check if the extension is active on the current tab
function checkExtensionStatus() {
    if (!chrome.tabs) {
        // console.error("Popup: chrome.tabs API not available."); // Optional debug
        updateStatusDisplay(false);
        return;
    }
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (chrome.runtime.lastError) {
        console.error("Popup: Error querying active tab:", chrome.runtime.lastError.message);
        updateStatusDisplay(false);
        return;
    }
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
        // console.warn("Popup: Could not get active tab ID."); // Optional debug
         updateStatusDisplay(false); // Can't check status without an ID
         return;
    }

    activeTabId = tabs[0].id;
    const activeTabUrl = tabs[0].url;

     // Don't ping internal pages
     if (!activeTabUrl || activeTabUrl.startsWith('chrome://') || activeTabUrl.startsWith('about:')) {
         updateStatusDisplay(false); // Treat internal pages as inactive for protection
         return;
     }

    // Try to ping the content script
    try {
      chrome.tabs.sendMessage(activeTabId, {action: "ping"}, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded or responding
          updateStatusDisplay(false);
        } else if (response && response.status === "pong") {
          // Content script is active
          updateStatusDisplay(true);
        } else {
             // console.warn(`Popup: Unexpected ping response from tab ${activeTabId}:`, response); // Optional debug
             updateStatusDisplay(false);
        }
      });
    } catch (e) {
      console.error(`Popup: Error sending ping to tab ${activeTabId}:`, e.message);
      updateStatusDisplay(false);
    }
  });
}

// Function to update the status display
function updateStatusDisplay(isActive) {
  const statusElement = document.querySelector('.status');
  if (statusElement) {
      if (isActive) {
          statusElement.classList.add('enabled');
          statusElement.innerHTML = 'Status: <strong>Active</strong> - Protecting this page';
      } else {
          statusElement.classList.remove('enabled');
          statusElement.innerHTML = 'Status: <strong>Inactive</strong> - Not active on this page';
      }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);