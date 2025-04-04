
// Support and Resistance
export const findSupportResistanceLevels = (highs: number[], lows: number[], closes: number[]): { support: number[], resistance: number[] } => {
  // Use the last 50 data points for more accurate levels
  const recentHighs = highs.slice(-50);
  const recentLows = lows.slice(-50);
  const recentCloses = closes.slice(-50);
  
  const support: number[] = [];
  const resistance: number[] = [];
  
  // Find local minima for support
  for (let i = 5; i < recentLows.length - 5; i++) {
    const window = recentLows.slice(i - 5, i + 6);
    const min = Math.min(...window);
    if (min === recentLows[i]) {
      // Check if this is a significant level (multiple touches or strong bounce)
      let significance = 0;
      for (let j = 0; j < recentLows.length; j++) {
        if (Math.abs(recentLows[j] - min) / min < 0.005) {
          significance++;
        }
      }
      
      // Only add significant levels
      if (significance >= 2 && !support.some(level => Math.abs(level - min) / min < 0.01)) {
        support.push(min);
      }
    }
  }
  
  // Find local maxima for resistance
  for (let i = 5; i < recentHighs.length - 5; i++) {
    const window = recentHighs.slice(i - 5, i + 6);
    const max = Math.max(...window);
    if (max === recentHighs[i]) {
      // Check if this is a significant level (multiple touches or strong rejection)
      let significance = 0;
      for (let j = 0; j < recentHighs.length; j++) {
        if (Math.abs(recentHighs[j] - max) / max < 0.005) {
          significance++;
        }
      }
      
      // Only add significant levels
      if (significance >= 2 && !resistance.some(level => Math.abs(level - max) / max < 0.01)) {
        resistance.push(max);
      }
    }
  }
  
  // If we didn't find enough levels, use percentile approach
  if (support.length < 2) {
    const sortedLows = [...recentLows].sort((a, b) => a - b);
    support.push(sortedLows[Math.floor(sortedLows.length * 0.1)]); // 10th percentile
    support.push(sortedLows[Math.floor(sortedLows.length * 0.25)]); // 25th percentile
  }
  
  if (resistance.length < 2) {
    const sortedHighs = [...recentHighs].sort((a, b) => a - b);
    resistance.push(sortedHighs[Math.floor(sortedHighs.length * 0.75)]); // 75th percentile
    resistance.push(sortedHighs[Math.floor(sortedHighs.length * 0.9)]); // 90th percentile
  }
  
  // Sort the levels
  support.sort((a, b) => a - b);
  resistance.sort((a, b) => a - b);
  
  return {
    support: support.slice(0, 3),
    resistance: resistance.slice(-3)
  };
};
