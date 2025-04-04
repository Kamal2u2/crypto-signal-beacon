
import { calculateSMA } from './movingAverages';

// Relative Strength Index
export const calculateRSI = (data: number[], period: number = 14): number[] => {
  const result: number[] = [];
  const changes: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  // Calculate average gains and losses
  for (let i = 0; i < changes.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    const periodChanges = changes.slice(i - period, i);
    const gains = periodChanges.filter(change => change > 0);
    const losses = periodChanges.filter(change => change < 0);
    
    const avgGain = gains.length ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / period : 0;
    
    // Calculate RS and RSI
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);
    }
  }
  
  // Pad the beginning with NaN to match input array length
  return [NaN, ...result];
};

// Stochastic Oscillator calculation
export const calculateStochastic = (highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3): {k: number[], d: number[]} => {
  const k: number[] = [];
  
  // Calculate %K
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN);
      continue;
    }
    
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    const currentClose = closes[i];
    
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    
    // %K = 100 * (close - lowest low) / (highest high - lowest low)
    const rangeSize = highestHigh - lowestLow;
    if (rangeSize === 0) {
      k.push(50); // Default to middle if no range
    } else {
      const kValue = 100 * ((currentClose - lowestLow) / rangeSize);
      k.push(kValue);
    }
  }
  
  // Calculate %D (SMA of %K)
  const d = calculateSMA(k.filter(val => !isNaN(val)), dPeriod);
  
  // Pad the %D array to match the length of %K
  const padSize = k.length - d.length;
  const paddedD = Array(padSize).fill(NaN).concat(d);
  
  return { k, d: paddedD };
};

// Rate of Change (ROC)
export const calculateROC = (prices: number[], period: number = 9): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    // ROC = [(Current Price - Price n periods ago) / Price n periods ago] * 100
    result.push((prices[i] - prices[i - period]) / prices[i - period] * 100);
  }
  
  return result;
};
