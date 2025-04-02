
// Map of signal types to audio files
const signalSounds = {
  BUY: new Audio('/buy-signal.mp3'),
  SELL: new Audio('/sell-signal.mp3')
};

// Play a sound based on signal type
export const playSignalSound = (signalType: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL') => {
  // Only play sounds for BUY and SELL signals
  if (signalType === 'BUY' || signalType === 'SELL') {
    try {
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
