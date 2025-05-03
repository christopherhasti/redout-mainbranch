// Initialize settings
const settings = new Settings();

// Current active tab information
let activeTabId = null;

// Function to initialize the popup UI
function initializePopup() {
  console.log("Initializing popup UI");
  
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and content
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Set callback for when settings are loaded
  settings.onLoad = function() {
    // Load settings into UI
    loadSettingsIntoUI();
    
    // Set up event listeners for settings changes
    setupEventListeners();
    
    // Check if the extension is active on the current tab
    checkExtensionStatus();
  };
  
  // Force load settings
  settings.loadSettings();
}

// Function to load settings into UI
function loadSettingsIntoUI() {
  console.log("Loading settings into UI:", settings.current);
  
  // Appearance settings
  document.getElementById('overlayColor').value = settings.current.overlayColor;
  document.getElementById('overlayOpacity').value = settings.current.overlayOpacity;
  document.getElementById('opacityValue').textContent = settings.current.overlayOpacity;
  document.getElementById('showWarningText').checked = settings.current.showWarningText;
  document.getElementById('warningText').value = settings.current.warningText;
  
  // Detection settings
  document.getElementById('flashThreshold').value = settings.current.flashThreshold;
  document.getElementById('thresholdValue').textContent = settings.current.flashThreshold;
  document.getElementById('flashTriggerCount').value = settings.current.flashTriggerCount;
  
  // Advanced settings
  document.getElementById('cooldownTime').value = settings.current.cooldownTime;
}

// Function to set up event listeners for settings changes
function setupEventListeners() {
  console.log("Setting up event listeners");
  
  // Appearance settings
  document.getElementById('overlayColor').addEventListener('change', updateSetting);
  document.getElementById('overlayOpacity').addEventListener('input', updateRangeSetting);
  document.getElementById('showWarningText').addEventListener('change', updateSetting);
  document.getElementById('warningText').addEventListener('change', updateSetting);
  
  // Detection settings
  document.getElementById('flashThreshold').addEventListener('input', updateRangeSetting);
  document.getElementById('flashTriggerCount').addEventListener('change', updateSetting);
  
  // Advanced settings
  document.getElementById('cooldownTime').addEventListener('change', updateSetting);
  
  // Reset button
  document.getElementById('resetButton').addEventListener('click', resetSettings);
}

// Function to update settings when a control changes
function updateSetting(event) {
  const id = event.target.id;
  let value;
  
  if (event.target.type === 'checkbox') {
    value = event.target.checked;
  } else if (event.target.type === 'number') {
    value = parseInt(event.target.value, 10);
  } else {
    value = event.target.value;
  }
  
  console.log(`Updating setting ${id} to:`, value);
  settings.current[id] = value;
  settings.saveSettings();
  
  // Notify content scripts of the change
  sendSettingsToContentScripts();
}

// Function to update range settings and display values
function updateRangeSetting(event) {
  const id = event.target.id;
  const value = parseFloat(event.target.value);
  
  // Update the display value
  switch(id) {
    case 'overlayOpacity':
      document.getElementById('opacityValue').textContent = value;
      break;
    case 'flashThreshold':
      document.getElementById('thresholdValue').textContent = value;
      break;
  }
  
  console.log(`Updating range setting ${id} to:`, value);
  settings.current[id] = value;
  settings.saveSettings();
  
  // Notify content scripts of the change
  sendSettingsToContentScripts();
}

// Function to reset settings to defaults
function resetSettings() {
  console.log("Resetting settings to defaults");
  settings.resetToDefaults();
  loadSettingsIntoUI();
  sendSettingsToContentScripts();
}

// Function to send updated settings to all content scripts
function sendSettingsToContentScripts() {
  console.log("Sending settings to content scripts:", settings.current);
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          action: "updateSettings",
          settings: settings.current
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(`Content script not active on tab ${tab.id}`);
          } else {
            console.log(`Settings sent to tab ${tab.id}, response:`, response);
          }
        });
      } catch (e) {
        console.error(`Error sending settings to tab ${tab.id}:`, e);
      }
    });
  });
}

// Function to check if the extension is active on the current tab
function checkExtensionStatus() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length === 0) return;
    
    activeTabId = tabs[0].id;
    
    // Try to ping the content script
    try {
      chrome.tabs.sendMessage(activeTabId, {action: "ping"}, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded or not responding
          updateStatusDisplay(false);
        } else {
          // Content script is active
          updateStatusDisplay(true);
        }
      });
    } catch (e) {
      updateStatusDisplay(false);
    }
  });
}

// Function to update the status display
function updateStatusDisplay(isActive) {
  const statusElement = document.querySelector('.status');
  
  if (isActive) {
    statusElement.classList.add('enabled');
    statusElement.innerHTML = 'Status: <strong>Active</strong> - Protecting you from flashing content';
  } else {
    statusElement.classList.remove('enabled');
    statusElement.innerHTML = 'Status: <strong>Not Active</strong> - Refresh the page to activate';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);