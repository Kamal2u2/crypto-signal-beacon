
// Helper function for Wilder's smoothing
export const wilderSmooth = (data: number[], period: number): number[] => {
  const result: number[] = [];
  let sum = 0;
  
  // Initialize with simple average
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result.push(sum / period);
  
  // Continue with Wilder's smoothing
  for (let i = period; i < data.length; i++) {
    const smoothedValue = (result[result.length - 1] * (period - 1) + data[i]) / period;
    result.push(smoothedValue);
  }
  
  return result;
};

// Average Directional Index (ADX)
export const calculateADX = (highs: number[], lows: number[], closes: number[], period: number = 14): {adx: number[], pdi: number[], ndi: number[]} => {
  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  // Calculate True Range, +DM, and -DM
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      trueRanges.push(highs[i] - lows[i]);
      plusDM.push(0);
      minusDM.push(0);
      continue;
    }
    
    // True Range calculation
    const highLow = highs[i] - lows[i];
    const highPrevClose = Math.abs(highs[i] - closes[i - 1]);
    const lowPrevClose = Math.abs(lows[i] - closes[i - 1]);
    const tr = Math.max(highLow, highPrevClose, lowPrevClose);
    trueRanges.push(tr);
    
    // Directional Movement calculation
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }
    
    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }
  
  // Calculate smoothed TR, +DM, and -DM using Wilder's smoothing
  const smoothedTR = wilderSmooth(trueRanges, period);
  const smoothedPlusDM = wilderSmooth(plusDM, period);
  const smoothedMinusDM = wilderSmooth(minusDM, period);
  
  // Calculate +DI and -DI
  const pdi: number[] = [];
  const ndi: number[] = [];
  
  for (let i = 0; i < smoothedTR.length; i++) {
    if (smoothedTR[i] === 0) {
      pdi.push(0);
      ndi.push(0);
    } else {
      pdi.push(100 * smoothedPlusDM[i] / smoothedTR[i]);
      ndi.push(100 * smoothedMinusDM[i] / smoothedTR[i]);
    }
  }
  
  // Calculate DX (Directional Index)
  const dx: number[] = [];
  
  for (let i = 0; i < pdi.length; i++) {
    if (pdi[i] + ndi[i] === 0) {
      dx.push(0);
    } else {
      dx.push(100 * Math.abs(pdi[i] - ndi[i]) / (pdi[i] + ndi[i]));
    }
  }
  
  // Calculate ADX (smoothed DX)
  const adx = wilderSmooth(dx, period);
  
  // Pad arrays to match original length
  const padSize = closes.length - adx.length;
  const paddedADX = Array(padSize).fill(NaN).concat(adx);
  const paddedPDI = Array(padSize).fill(NaN).concat(pdi);
  const paddedNDI = Array(padSize).fill(NaN).concat(ndi);
  
  return {
    adx: paddedADX,
    pdi: paddedPDI,
    ndi: paddedNDI
  };
};

// Calculate price momentum
export const calculateMomentum = (prices: number[], period: number = 10): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    result.push(prices[i] / prices[i - period] * 100 - 100);
  }
  
  return result;
};

// Parabolic SAR
export const calculatePSAR = (
  highs: number[], 
  lows: number[], 
  acceleration: number = 0.02, 
  maximum: number = 0.2
): { psar: number[], trend: ('up' | 'down')[] } => {
  const psar: number[] = [];
  const trend: ('up' | 'down')[] = [];
  
  if (highs.length < 2) {
    return { psar: [], trend: [] };
  }
  
  // Initialize with a reasonable trend direction
  let uptrend = highs[1] > highs[0];
  let EP = uptrend ? highs[0] : lows[0]; // Extreme point
  let AF = acceleration; // Acceleration factor
  
  // Starting PSAR value
  psar.push(uptrend ? lows[0] : highs[0]);
  trend.push(uptrend ? 'up' : 'down');
  
  for (let i = 1; i < highs.length; i++) {
    // Calculate PSAR for current period
    psar.push(psar[i - 1] + AF * (EP - psar[i - 1]));
    
    // Check if PSAR crosses price, indicating trend reversal
    let reverse = false;
    
    if (uptrend) {
      if (psar[i] > lows[i]) {
        uptrend = false;
        reverse = true;
        psar[i] = Math.max(...highs.slice(Math.max(0, i - 2), i + 1));
        EP = lows[i];
        AF = acceleration;
      }
    } else {
      if (psar[i] < highs[i]) {
        uptrend = true;
        reverse = true;
        psar[i] = Math.min(...lows.slice(Math.max(0, i - 2), i + 1));
        EP = highs[i];
        AF = acceleration;
      }
    }
    
    // If no reversal, continue and update EP if new extreme is found
    if (!reverse) {
      if (uptrend) {
        if (highs[i] > EP) {
          EP = highs[i];
          AF = Math.min(AF + acceleration, maximum);
        }
      } else {
        if (lows[i] < EP) {
          EP = lows[i];
          AF = Math.min(AF + acceleration, maximum);
        }
      }
    }
    
    trend.push(uptrend ? 'up' : 'down');
  }
  
  return { psar, trend };
};
