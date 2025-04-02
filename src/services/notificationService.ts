// Map of signal types to audio files
const signalSounds = {
  BUY: new Audio('/buy-signal.mp3'),
  SELL: new Audio('/sell-signal.mp3'),
};

// Initialize audio (must be triggered by user interaction)
export function initializeAudio() {
  // Set very low volume and play briefly to initialize audio context
  Object.values(signalSounds).forEach(audio => {
    audio.volume = 0.01;
    
    // Force load the audio files
    audio.load();
    
    // Try to play briefly to initialize audio context
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Playback started successfully
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.7; // Reset to normal volume
        }, 100);
      }).catch(error => {
        console.log("Audio play prevented by browser, waiting for user interaction", error);
        // This is expected before user interaction
      });
    }
  });
  
  console.log("Audio initialization attempted. User interaction is still required.");
}

// Request permission for browser notifications
export function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      return permission === "granted";
    });
  }
  
  return Notification.permission === "granted";
}

// Send browser notification
export function sendNotification(title: string, options: NotificationOptions = {}) {
  if (!("Notification" in window)) {
    return;
  }
  
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      ...options
    });
    
    notification.onclick = function() {
      window.focus();
      this.close();
    };
    
    return notification;
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        sendNotification(title, options);
      }
    });
  }
}

// Play the appropriate sound based on signal type
export function playSignalSound(signalType: 'BUY' | 'SELL' | null, volume: number = 0.7) {
  if (!signalType || !(signalType in signalSounds)) return;
  
  const sound = signalSounds[signalType as keyof typeof signalSounds];
  if (sound) {
    console.log(`Attempting to play ${signalType} sound at volume ${volume}`);
    sound.volume = Math.min(Math.max(volume, 0), 1); // Ensure volume is between 0 and 1
    sound.currentTime = 0;
    
    // Force reload the audio
    sound.load();
    
    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing notification sound:', error);
      });
    }
  }
}

// Send notification for trading signal
export function sendSignalNotification(signalType: 'BUY' | 'SELL', symbol: string, confidence: number) {
  const title = `${signalType} Signal Alert`;
  const body = `${symbol}: ${signalType} signal detected with ${confidence.toFixed(0)}% confidence`;
  
  const notificationOptions: NotificationOptions = {
    body,
    badge: '/favicon.ico',
    tag: `signal-${signalType.toLowerCase()}-${Date.now()}`
  };
  
  sendNotification(title, notificationOptions);
  
  playSignalSound(signalType);
}

// Test audio to let user confirm it's working
export function testAudioAlert(signalType: 'BUY' | 'SELL', volume: number = 0.7) {
  console.log(`Testing ${signalType} alert sound at volume ${volume}`);
  playSignalSound(signalType, volume);
}
