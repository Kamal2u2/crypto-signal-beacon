import { KlineData } from './binanceService';

export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';

export interface PatternDetection {
  name: string;
  description: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export interface TradingSignal {
  indicator: string;
  type: SignalType;
  message: string;
  strength: number;
}

interface IndicatorSignal {
  signal: SignalType;
  weight: number;
  confidence: number;
}

export interface SignalSummary {
  overallSignal: SignalType;
  confidence: number;
  indicators: {
    [key: string]: IndicatorSignal;
  };
  signals: TradingSignal[];
  patterns?: PatternDetection[];
  priceTargets?: {
    entryPrice: number;
    stopLoss: number;
    target1: number;
    target2: number;
    target3: number;
    riskRewardRatio: number;
  };
}

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

// Helper function for Wilder's smoothing
const wilderSmooth = (data: number[], period: number): number[] => {
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
