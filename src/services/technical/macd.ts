
import { calculateEMA } from './movingAverages';

// Moving Average Convergence Divergence
export const calculateMACD = (data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {macd: number[], signal: number[], histogram: number[]} => {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  const macd: number[] = [];
  
  // Calculate MACD line
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macd.push(NaN);
    } else {
      macd.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // Calculate Signal line
  const validMacd = macd.filter(val => !isNaN(val));
  const signal = calculateEMA(validMacd, signalPeriod);
  
  // Pad the signal line to match MACD length
  const paddedSignal: number[] = Array(macd.length - signal.length).fill(NaN).concat(signal);
  
  // Calculate Histogram
  const histogram: number[] = [];
  for (let i = 0; i < macd.length; i++) {
    if (isNaN(macd[i]) || isNaN(paddedSignal[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macd[i] - paddedSignal[i]);
    }
  }
  
  return { macd, signal: paddedSignal, histogram };
};
