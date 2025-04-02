
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
    audio.play().catch(() => {
      // Silently fail - will be initialized on actual user interaction
    });
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.7; // Reset to normal volume
    }, 100);
  });
}

// Play the appropriate sound based on signal type
export function playSignalSound(signalType: 'BUY' | 'SELL' | null, volume: number = 0.7) {
  if (!signalType || !(signalType in signalSounds)) return;
  
  const sound = signalSounds[signalType as keyof typeof signalSounds];
  if (sound) {
    sound.volume = Math.min(Math.max(volume, 0), 1); // Ensure volume is between 0 and 1
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  }
}

// Test audio to let user confirm it's working
export function testAudioAlert(signalType: 'BUY' | 'SELL', volume: number = 0.7) {
  playSignalSound(signalType, volume);
}
