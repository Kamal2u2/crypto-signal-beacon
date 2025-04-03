
// Create audio contexts for sounds
let audioContext: AudioContext | null = null;

// Sound assets for different signal types with fallback implementation
const signalSounds = {
  BUY: new Audio('/buy-signal.mp3'),
  SELL: new Audio('/sell-signal.mp3')
};

// Fallback sounds using Web Audio API
const generateTone = (
  type: 'BUY' | 'SELL', 
  volume: number = 1.0
): void => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Failed to create audio context:', e);
      return;
    }
  }

  try {
    // Create an oscillator for the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // BUY is a higher pitched sound, SELL is lower
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      type === 'BUY' ? 800 : 400, 
      audioContext.currentTime
    );
    
    // Set volume
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play tone for a short duration
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Add a quick pattern for differentiation
    if (type === 'BUY') {
      // For BUY signal: two short high beeps
      const oscillator2 = audioContext.createOscillator();
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime + 0.35);
      oscillator2.connect(gainNode);
      oscillator2.start(audioContext.currentTime + 0.35);
      oscillator2.stop(audioContext.currentTime + 0.5);
    } else {
      // For SELL signal: one longer low beep
      const oscillator2 = audioContext.createOscillator();
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(300, audioContext.currentTime + 0.35);
      oscillator2.connect(gainNode);
      oscillator2.start(audioContext.currentTime + 0.35);
      oscillator2.stop(audioContext.currentTime + 0.65);
    }
    
    console.log(`Generated ${type} tone fallback sound`);
  } catch (e) {
    console.error('Error generating tone:', e);
  }
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
      
      // Also initialize audio context
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Pre-load the signal sounds
      signalSounds.BUY.load();
      signalSounds.SELL.load();
      
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
      
      // Play the signal sound with error handling
      const playPromise = signalSounds[signalType].play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Could not play audio file, using fallback:`, error);
          // Use the Web Audio API fallback if the audio file fails to play
          generateTone(signalType, volume);
        });
      }
    } catch (error) {
      console.error(`Error with signal sound for ${signalType}:`, error);
      // Use the fallback tone generator
      generateTone(signalType, volume);
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
const showNotification = (title: string, body: string, type: string = 'info') => {
  // Check if notification API is supported and permission is granted
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications");
    return;
  }
  
  if (Notification.permission === "granted") {
    try {
      // Create and show the notification
      const notification = new Notification(title, {
        body: body,
        icon: type === 'BUY' ? '/buy-icon.png' : (type === 'SELL' ? '/sell-icon.png' : null),
      });
      
      // Close the notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
};

// Debug the signal system - logs detailed analysis info
export const debugSignalSystem = (signalData: any, rawData: any) => {
  console.group("Signal System Debug");
  console.log("Signal Summary:", signalData);
  if (rawData && rawData.length > 0) {
    console.log("Latest Price Data:", rawData.slice(-5));
    console.log("Data Point Count:", rawData.length);
    
    // Calculate some basic indicators to verify data
    if (rawData.length >= 20) {
      const closePrices = rawData.map((d: any) => d.close);
      const lastClose = closePrices[closePrices.length - 1];
      const prevClose = closePrices[closePrices.length - 2];
      
      console.log("Last close price:", lastClose);
      console.log("Previous close price:", prevClose);
      console.log("Price change:", ((lastClose - prevClose) / prevClose * 100).toFixed(2) + "%");
    }
  }
  console.groupEnd();
  
  return true; // Return true for chaining
};
