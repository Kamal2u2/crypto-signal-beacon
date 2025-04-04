
// Volume Weighted Average Price (VWAP)
export const calculateVWAP = (highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): number[] => {
  const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
  const vwap: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      vwap.push(NaN);
      continue;
    }
    
    let sumPV = 0;
    let sumV = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      sumPV += typicalPrices[j] * volumes[j];
      sumV += volumes[j];
    }
    
    vwap.push(sumV === 0 ? closes[i] : sumPV / sumV);
  }
  
  return vwap;
};

// Chaikin Money Flow (CMF)
export const calculateCMF = (
  highs: number[], 
  lows: number[], 
  closes: number[], 
  volumes: number[], 
  period: number = 20
): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let mfVolume = 0;
    let volume = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const highLowRange = highs[j] - lows[j];
      
      if (highLowRange === 0) {
        continue; // Avoid division by zero
      }
      
      // Money Flow Multiplier: [(Close - Low) - (High - Close)] / (High - Low)
      const mfm = ((closes[j] - lows[j]) - (highs[j] - closes[j])) / highLowRange;
      
      // Money Flow Volume: Money Flow Multiplier * Volume for the Period
      mfVolume += mfm * volumes[j];
      volume += volumes[j];
    }
    
    if (volume === 0) {
      result.push(0);
    } else {
      // Chaikin Money Flow: Sum(Money Flow Volume) / Sum(Volume) for the Period
      result.push(mfVolume / volume);
    }
  }
  
  return result;
};
