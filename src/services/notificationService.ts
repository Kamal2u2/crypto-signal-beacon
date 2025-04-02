
// Map of signal types to audio files
const signalSounds = {
  BUY: new Audio('/buy-signal.mp3'),
  SELL: new Audio('/sell-signal.mp3')
};

// Initialize audio context for better mobile support
export const initializeAudio = () => {
  try {
    // Create a short silent audio buffer and play it
    // This helps initialize audio on mobile browsers
    const silentAudio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    silentAudio.play().then(() => {
      silentAudio.pause();
      console.log('Audio initialized successfully');
    }).catch(e => {
      console.error('Audio initialization failed:', e);
    });
  } catch (e) {
    console.error('Error initializing audio:', e);
  }
};

// Play a sound based on signal type with volume control
export const playSignalSound = (
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL', 
  volume: number = 1.0
) => {
  // Only play sounds for BUY and SELL signals
  if (signalType === 'BUY' || signalType === 'SELL') {
    try {
      // Set the volume (between 0.0 and 1.0)
      signalSounds[signalType].volume = Math.max(0, Math.min(1, volume));
      // Reset the audio to the beginning
      signalSounds[signalType].currentTime = 0;
      // Play the signal sound
      signalSounds[signalType].play().catch(error => {
        console.error(`Error playing ${signalType} signal sound:`, error);
      });
    } catch (error) {
      console.error(`Error with signal sound for ${signalType}:`, error);
    }
  }
};

// Test audio alerts for the settings panel
export const testAudioAlert = (
  signalType: 'BUY' | 'SELL',
  volume: number = 1.0
) => {
  playSignalSound(signalType, volume);
};

// Request notification permission and return current permission status
export const requestNotificationPermission = (): boolean => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications");
    return false;
  }
  
  // Request permission if not already granted
  if (Notification.permission !== "granted") {
    Notification.requestPermission().then(permission => {
      console.log(`Notification permission ${permission}`);
    });
  }
  
  // Return true if permission is granted
  return Notification.permission === "granted";
};

// Send a notification for a signal
export const sendSignalNotification = (
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL',
  symbol: string,
  confidence: number
) => {
  // Format the notification message
  const title = `${signalType} Signal: ${symbol}`;
  const body = `Confidence: ${confidence.toFixed(0)}%`;
  
  // Show notification
  showNotification(title, body, signalType);
};

// Create and show a native notification
export const showNotification = (
  title: string, 
  body: string, 
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL'
) => {
  // Only show notifications for BUY, SELL, and important HOLD signals
  if (['BUY', 'SELL', 'HOLD'].includes(signalType)) {
    // Request notification permission if not granted
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notifications");
      return;
    }
    
    // Check if permission is not denied (either granted or default)
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        // If the user grants permission, create a notification
        if (permission === "granted") {
          createNotification(title, body, signalType);
        }
      });
    } else if (Notification.permission === "granted") {
      // If permission is already granted, create a notification
      createNotification(title, body, signalType);
    }
  }
};

// Helper function to create the notification with proper icons
const createNotification = (
  title: string, 
  body: string, 
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL'
) => {
  try {
    // Set icon based on signal type
    let icon = '';
    switch (signalType) {
      case 'BUY':
        icon = '/buy-icon.png';
        break;
      case 'SELL':
        icon = '/sell-icon.png';
        break;
      case 'HOLD':
        icon = '/hold-icon.png';
        break;
      default:
        icon = '/favicon.ico';
    }
    
    // Create and show the notification
    const notification = new Notification(title, {
      body,
      icon: icon
    });
    
    // Auto close the notification after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Single function to both play sound and show notification
export const signalAlert = (
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL',
  symbol: string,
  price: number,
  confidence: number
) => {
  // Play sound for the signal
  playSignalSound(signalType);
  
  // Format the notification message
  const title = `${signalType} Signal: ${symbol}`;
  const body = `Price: $${price.toFixed(2)} | Confidence: ${confidence.toFixed(0)}%`;
  
  // Show notification
  showNotification(title, body, signalType);
};
