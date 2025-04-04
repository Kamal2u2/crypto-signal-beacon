
import { calculateSMA } from './movingAverages';

// Bollinger Bands
export const calculateBollingerBands = (data: number[], period: number = 20, stdDev: number = 2): {upper: number[], middle: number[], lower: number[]} => {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    
    // Calculate standard deviation
    const squaredDiffs = slice.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    upper.push(mean + stdDev * standardDeviation);
    lower.push(mean - stdDev * standardDeviation);
  }
  
  return { upper, middle: sma, lower };
};
