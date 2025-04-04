
// Simple Moving Average
export const calculateSMA = (data: number[], period: number): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  
  return result;
};

// Exponential Moving Average
export const calculateEMA = (data: number[], period: number): number[] => {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  const sma = calculateSMA(data.slice(0, period), period)[period - 1];
  result.push(sma);
  
  for (let i = 1; i < data.length - period + 1; i++) {
    const currentValue = data[i + period - 1];
    const previousEMA = result[i - 1];
    const currentEMA = (currentValue - previousEMA) * multiplier + previousEMA;
    result.push(currentEMA);
  }
  
  // Pad the beginning with NaN to match input array length
  const padding = Array(period - 1).fill(NaN);
  return [...padding, ...result];
};
