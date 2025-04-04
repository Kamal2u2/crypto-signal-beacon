
import { KlineData } from '../binanceService';

// Average True Range calculation for stop loss and target determination
export const calculateATR = (klineData: KlineData[], period: number = 14): number[] => {
  const trueRanges: number[] = [];
  const atrs: number[] = [];
  
  // Calculate true ranges
  for (let i = 0; i < klineData.length; i++) {
    if (i === 0) {
      trueRanges.push(klineData[i].high - klineData[i].low);
      continue;
    }
    
    const highLow = klineData[i].high - klineData[i].low;
    const highPrevClose = Math.abs(klineData[i].high - klineData[i-1].close);
    const lowPrevClose = Math.abs(klineData[i].low - klineData[i-1].close);
    
    trueRanges.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }
  
  // Calculate ATR as simple moving average of true ranges
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atrs.push(NaN);
      continue;
    }
    
    const sum = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    atrs.push(sum / period);
  }
  
  return atrs;
};
