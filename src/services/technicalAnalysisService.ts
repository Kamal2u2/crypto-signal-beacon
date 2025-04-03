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

// Stochastic Oscillator calculation (new)
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

// Volume Weighted Average Price (VWAP) calculation (new)
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

// Average Directional Index (ADX) calculation (new)
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

// NEW for short-term: Calculate price momentum
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

// NEW for short-term: Parabolic SAR
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

// NEW for short-term: Calculate Chaikin Money Flow (CMF)
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

// NEW for short-term: Calculate Rate of Change (ROC)
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

// Generate signals based on technical indicators with short-term focus
export const generateSignals = (klineData: KlineData[]): SignalSummary => {
  // Extract price data
  const closePrices = klineData.map(kline => kline.close);
  const highPrices = klineData.map(kline => kline.high);
  const lowPrices = klineData.map(kline => kline.low);
  const volumes = klineData.map(kline => kline.volume);
  const currentPrice = closePrices[closePrices.length - 1];
  
  // Calculate indicators (existing)
  const sma20 = calculateSMA(closePrices, 20);
  const sma50 = calculateSMA(closePrices, 50);
  const ema20 = calculateEMA(closePrices, 20);
  const ema50 = calculateEMA(closePrices, 50);
  
  // Short-term specific indicators
  const ema9 = calculateEMA(closePrices, 9);
  const sma10 = calculateSMA(closePrices, 10);
  
  // Short-term RSI settings
  const rsi = calculateRSI(closePrices, 7); // Shorter period for faster signals
  
  // MACD with faster settings for short-term
  const macd = calculateMACD(closePrices, 8, 17, 9); // Faster periods: 8, 17, 9
  
  // Other indicators
  const bollingerBands = calculateBollingerBands(closePrices, 15, 2); // Shorter period for BB
  const stochastic = calculateStochastic(highPrices, lowPrices, closePrices, 7, 3); // Faster stochastic for short-term
  const vwap = calculateVWAP(highPrices, lowPrices, closePrices, volumes, 10);
  
  // Short-term specific new indicators
  const momentum = calculateMomentum(closePrices, 5);
  const psar = calculatePSAR(highPrices, lowPrices, 0.025, 0.2);
  const cmf = calculateCMF(highPrices, lowPrices, closePrices, volumes, 10);
  const roc = calculateROC(closePrices, 5);
  
  // ADX for trend strength, but with shorter period for short-term
  const adx = calculateADX(highPrices, lowPrices, closePrices, 10);
  
  // Calculate support/resistance levels
  const levels = findSupportResistanceLevels(highPrices, lowPrices, closePrices);
  
  // Initialize signals object
  const signals: {[key: string]: IndicatorSignal} = {};
  
  // Get most recent values for all indicators
  const lastSMA10 = sma10[sma10.length - 1];
  const lastSMA20 = sma20[sma20.length - 1];
  const lastEMA9 = ema9[ema9.length - 1];
  const lastEMA20 = ema20[ema20.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const prevRSI = rsi[rsi.length - 2];
  const lastMACD = macd.macd[macd.macd.length - 1];
  const lastSignal = macd.signal[macd.signal.length - 1];
  const prevMACD = macd.macd[macd.macd.length - 2];
  const prevSignal = macd.signal[macd.signal.length - 2];
  const lastHistogram = macd.histogram[macd.histogram.length - 1];
  const prevHistogram = macd.histogram[macd.histogram.length - 2];
  
  // Bollinger Bands values
  const lastUpperBB = bollingerBands.upper[bollingerBands.upper.length - 1];
  const lastLowerBB = bollingerBands.lower[bollingerBands.lower.length - 1];
  const lastMiddleBB = bollingerBands.middle[bollingerBands.middle.length - 1];
  
  // Stochastic values
  const lastK = stochastic.k[stochastic.k.length - 1];
  const lastD = stochastic.d[stochastic.d.length - 1];
  const prevK = stochastic.k[stochastic.k.length - 2];
  const prevD = stochastic.d[stochastic.d.length - 2];
  
  // VWAP values
  const lastVWAP = vwap[vwap.length - 1];
  const prevVWAP = vwap[vwap.length - 2];
  
  // ADX values
  const lastADX = adx.adx[adx.adx.length - 1];
  const lastPDI = adx.pdi[adx.pdi.length - 1];
  const lastNDI = adx.ndi[adx.ndi.length - 1];
  
  // New short-term indicator values
  const lastMomentum = momentum[momentum.length - 1];
  const prevMomentum = momentum[momentum.length - 2];
  const lastPSAR = psar.psar[psar.psar.length - 1];
  const lastPSARTrend = psar.trend[psar.trend.length - 1];
  const prevPSARTrend = psar.trend[psar.trend.length - 2];
  const lastCMF = cmf[cmf.length - 1];
  const prevCMF = cmf[cmf.length - 2];
  const lastROC = roc[roc.length - 1];
  const prevROC = roc[roc.length - 2];
  
  // Price movement strength (volatility indicator)
  const recentHighs = highPrices.slice(-10);
  const recentLows = lowPrices.slice(-10);
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const volatility = (highestHigh - lowestLow) / lowestLow * 100;
  const isVolatile = volatility > 1.2; // Lower threshold for short-term
  
  // Volume analysis
  const recentVolumes = volumes.slice(-5); // Shorter lookback for volume
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const lastVolume = volumes[volumes.length - 1];
  const volumeRatio = lastVolume / avgVolume;
  const isHighVolume = volumeRatio > 1.3;
  const isLowVolume = volumeRatio < 0.7;
  
  // Trend strength detection
  const trendStrength = lastADX > 20 ? 'strong' : lastADX > 12 ? 'moderate' : 'weak';
  const isUptrend = lastPDI > lastNDI && lastADX > 15;
  const isDowntrend = lastNDI > lastPDI && lastADX > 15;
  
  // Short-term candlestick pattern detection
  const last5Candles = klineData.slice(-5);
  
  // === IMPROVED SHORT-TERM SIGNAL GENERATION LOGIC ===
  
  // 1. Short-term EMA Crossovers (9 & 20)
  if (lastEMA9 > lastEMA20 && ema9[ema9.length - 2] <= ema20[ema20.length - 2]) {
    // Fresh EMA crossover up (bullish)
    signals['EMA Cross'] = { signal: 'BUY', weight: 4, confidence: 85 };
  } else if (lastEMA9 < lastEMA20 && ema9[ema9.length - 2] >= ema20[ema20.length - 2]) {
    // Fresh EMA crossover down (bearish)
    signals['EMA Cross'] = { signal: 'SELL', weight: 4, confidence: 85 };
  } else if (lastEMA9 > lastEMA20 && (lastEMA9 - lastEMA20) / lastEMA20 * 100 > 0.1) {
    // EMA9 above EMA20 with good separation (continued bullish)
    signals['EMA Cross'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else if (lastEMA9 < lastEMA20 && (lastEMA20 - lastEMA9) / lastEMA20 * 100 > 0.1) {
    // EMA9 below EMA20 with good separation (continued bearish)
    signals['EMA Cross'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else {
    signals['EMA Cross'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 2. RSI (shorter period) with volatility context
  if (lastRSI < 30 && (lastRSI > prevRSI || isVolatile)) {
    // Oversold and starting to recover or in volatile market
    signals['RSI Short-term'] = { signal: 'BUY', weight: 4, confidence: 80 };
  } else if (lastRSI > 70 && (lastRSI < prevRSI || isVolatile)) {
    // Overbought and starting to decline or in volatile market
    signals['RSI Short-term'] = { signal: 'SELL', weight: 4, confidence: 80 };
  } else if (lastRSI < 40 && lastRSI > prevRSI) {
    // Moving up from oversold region
    signals['RSI Short-term'] = { signal: 'BUY', weight: 3, confidence: 65 };
  } else if (lastRSI > 60 && lastRSI < prevRSI) {
    // Moving down from overbought region
    signals['RSI Short-term'] = { signal: 'SELL', weight: 3, confidence: 65 };
  } else {
    signals['RSI Short-term'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 3. MACD Signal with faster settings and volume confirmation
  if (lastMACD > lastSignal && prevMACD <= prevSignal) {
    // MACD bullish crossover
    let confidence = 80;
    if (isHighVolume) confidence = 90; // Strong confirmation with high volume
    signals['MACD Fast'] = { signal: 'BUY', weight: 5, confidence };
  } else if (lastMACD < lastSignal && prevMACD >= prevSignal) {
    // MACD bearish crossover
    let confidence = 80;
    if (isHighVolume) confidence = 90; // Strong confirmation with high volume
    signals['MACD Fast'] = { signal: 'SELL', weight: 5, confidence };
  } else if (lastMACD > lastSignal && lastHistogram > prevHistogram) {
    // MACD above signal and histogram increasing (bullish momentum)
    signals['MACD Fast'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else if (lastMACD < lastSignal && lastHistogram < prevHistogram) {
    // MACD below signal and histogram decreasing (bearish momentum)
    signals['MACD Fast'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else {
    signals['MACD Fast'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 4. Bollinger Bands Squeeze and Breakout (optimized for short-term)
  const bbWidth = (lastUpperBB - lastLowerBB) / lastMiddleBB;
  const prevBBWidth = (bollingerBands.upper[bollingerBands.upper.length - 2] - 
                     bollingerBands.lower[bollingerBands.lower.length - 2]) / 
                     bollingerBands.middle[bollingerBands.middle.length - 2];
  
  if (bbWidth < 0.02 && prevBBWidth > bbWidth) {
    // Extreme BB squeeze - high probability of breakout
    signals['BB Squeeze'] = { signal: 'NEUTRAL', weight: 4, confidence: 75 };
  } else if (bbWidth < prevBBWidth * 0.8) {
    // BB width narrowing - volatility contracting
    signals['BB Squeeze'] = { signal: 'NEUTRAL', weight: 3, confidence: 60 };
  } else if (bbWidth > prevBBWidth * 1.5 && currentPrice > lastUpperBB * 0.99 && isHighVolume) {
    // BB expansion with price near upper band and high volume - bullish breakout
    signals['BB Squeeze'] = { signal: 'BUY', weight: 5, confidence: 85 };
  } else if (bbWidth > prevBBWidth * 1.5 && currentPrice < lastLowerBB * 1.01 && isHighVolume) {
    // BB expansion with price near lower band and high volume - bearish breakout
    signals['BB Squeeze'] = { signal: 'SELL', weight: 5, confidence: 85 };
  } else {
    signals['BB Squeeze'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 5. Stochastic Fast Crossover (optimized for short-term)
  if (lastK < 20 && lastK > lastD && prevK <= prevD) {
    // Stochastic bullish crossover in oversold zone
    signals['Stochastic Fast'] = { signal: 'BUY', weight: 4, confidence: 80 };
  } else if (lastK > 80 && lastK < lastD && prevK >= prevD) {
    // Stochastic bearish crossover in overbought zone
    signals['Stochastic Fast'] = { signal: 'SELL', weight: 4, confidence: 80 };
  } else if (lastK < 30 && lastK > prevK) {
    // Stochastic rising from oversold
    signals['Stochastic Fast'] = { signal: 'BUY', weight: 3, confidence: 65 };
  } else if (lastK > 70 && lastK < prevK) {
    // Stochastic falling from overbought
    signals['Stochastic Fast'] = { signal: 'SELL', weight: 3, confidence: 65 };
  } else {
    signals['Stochastic Fast'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 6. Parabolic SAR (excellent for short-term trend following)
  if (lastPSARTrend === 'up' && prevPSARTrend === 'down') {
    // Fresh bullish trend change
    signals['PSAR'] = { signal: 'BUY', weight: 5, confidence: 85 };
  } else if (lastPSARTrend === 'down' && prevPSARTrend === 'up') {
    // Fresh bearish trend change
    signals['PSAR'] = { signal: 'SELL', weight: 5, confidence: 85 };
  } else if (lastPSARTrend === 'up' && currentPrice > lastPSAR * 1.005) {
    // Price well above PSAR in uptrend
    signals['PSAR'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else if (lastPSARTrend === 'down' && currentPrice < lastPSAR * 0.995) {
    // Price well below PSAR in downtrend
    signals['PSAR'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else {
    signals['PSAR'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 7. Momentum Indicator
  if (lastMomentum > 1 && prevMomentum < 0) {
    // Momentum turning positive from negative
    signals['Momentum'] = { signal: 'BUY', weight: 4, confidence: 75 };
  } else if (lastMomentum < -1 && prevMomentum > 0) {
    // Momentum turning negative from positive
    signals['Momentum'] = { signal: 'SELL', weight: 4, confidence: 75 };
  } else if (lastMomentum > 2) {
    // Strong positive momentum
    signals['Momentum'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else if (lastMomentum < -2) {
    // Strong negative momentum
    signals['Momentum'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else {
    signals['Momentum'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 8. Chaikin Money Flow (volume-based indicator)
  if (lastCMF > 0.1 && prevCMF < 0.1) {
    // CMF turning strongly positive
    signals['CMF'] = { signal: 'BUY', weight: 3, confidence: 75 };
  } else if (lastCMF < -0.1 && prevCMF > -0.1) {
    // CMF turning strongly negative
    signals['CMF'] = { signal: 'SELL', weight: 3, confidence: 75 };
  } else if (lastCMF > 0.05) {
    // Positive money flow
    signals['CMF'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else if (lastCMF < -0.05) {
    // Negative money flow
    signals['CMF'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    signals['CMF'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 9. Price relative to VWAP (important for intraday trading)
  if (currentPrice < lastVWAP * 0.995 && (lastRSI < 40 || lastK < 30)) {
    // Price below VWAP with oversold conditions - potential buy
    signals['VWAP'] = { signal: 'BUY', weight: 4, confidence: 80 };
  } else if (currentPrice > lastVWAP * 1.005 && (lastRSI > 60 || lastK > 70)) {
    // Price above VWAP with overbought conditions - potential sell
    signals['VWAP'] = { signal: 'SELL', weight: 4, confidence: 80 };
  } else if (currentPrice < lastVWAP && currentPrice > prevVWAP) {
    // Price approaching VWAP from below
    signals['VWAP'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else if (currentPrice > lastVWAP && currentPrice < prevVWAP) {
    // Price approaching VWAP from above
    signals['VWAP'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    signals['VWAP'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 10. Rate of Change (momentum measurement)
  if (lastROC > 1.5 && prevROC < 0) {
    // ROC turning strongly positive
    signals['ROC'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (lastROC < -1.5 && prevROC > 0) {
    // ROC turning strongly negative
    signals['ROC'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastROC > 0.5 && lastROC > prevROC) {
    // Increasing positive momentum
    signals['ROC'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else if (lastROC < -0.5 && lastROC < prevROC) {
    // Increasing negative momentum
    signals['ROC'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    signals['ROC'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 11. Support/Resistance Proximity with Stochastic confirmation
  const nearestSupport = levels.support.find(level => level < currentPrice);
  const nearestResistance = levels.resistance.find(level => level > currentPrice);
  
  if (nearestSupport && 
      (currentPrice - nearestSupport) / currentPrice < 0.01 && 
      lastK < 30 && lastK > prevK) {
    // Price very close to support with Stochastic turning up
    signals['Support/Resistance'] = { signal: 'BUY', weight: 4, confidence: 85 };
  } else if (nearestResistance && 
            (nearestResistance - currentPrice) / currentPrice < 0.01 && 
            lastK > 70 && lastK < prevK) {
    // Price very close to resistance with Stochastic turning down
    signals['Support/Resistance'] = { signal: 'SELL', weight: 4, confidence: 85 };
  } else if (nearestSupport && 
            (currentPrice - nearestSupport) / currentPrice < 0.02) {
    // Price near support
    signals['Support/Resistance'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else if (nearestResistance && 
            (nearestResistance - currentPrice) / currentPrice < 0.02) {
    // Price near resistance
    signals['Support/Resistance'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else {
    signals['Support/Resistance'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 12. Volume Surge Detection (critical for short-term trading)
  if (isHighVolume && lastVolume > volumes[volumes.length - 2] * 1.5) {
    // Significant volume surge
    if (currentPrice > closePrices[closePrices.length - 2] * 1.01) {
      // Price increased with volume surge
      signals['Volume Surge'] = { signal: 'BUY', weight: 5, confidence: 85 };
    } else if (currentPrice < closePrices[closePrices.length - 2] * 0.99) {
      // Price decreased with volume surge
      signals['Volume Surge'] = { signal: 'SELL', weight: 5, confidence: 85 };
    } else {
      signals['Volume Surge'] = { signal: 'NEUTRAL', weight: 3, confidence: 60 };
    }
  } else if (isLowVolume && lastROC > 1) {
    // Low volume with price increase (potential fake move)
    signals['Volume Surge'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else if (isLowVolume && lastROC < -1) {
    // Low volume with price decrease (potential fake move)
    signals['Volume Surge'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else {
    signals['Volume Surge'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 13. Short-term trend consistency check (multiple indicators agreement)
  const bullishIndicators = Object.entries(signals)
    .filter(([_, data]) => data.signal === 'BUY')
    .length;
  
  const bearishIndicators = Object.entries(signals)
    .filter(([_, data]) => data.signal === 'SELL')
    .length;
  
  if (bullishIndicators >= 4 && lastPSARTrend === 'up') {
    // Multiple bullish signals with PSAR confirmation
    signals['Trend Consistency'] = { signal: 'BUY', weight: 5, confidence: 90 };
  } else if (bearishIndicators >= 4 && lastPSARTrend === 'down') {
    // Multiple bearish signals with PSAR confirmation
    signals['Trend Consistency'] = { signal: 'SELL', weight: 5, confidence: 90 };
  } else if (bullishIndicators > bearishIndicators && bullishIndicators >= 3) {
    // More bullish than bearish signals
    signals['Trend Consistency'] = { signal: 'BUY', weight: 4, confidence: 75 };
  } else if (bearishIndicators > bullishIndicators && bearishIndicators >= 3) {
    // More bearish than bullish signals
    signals['Trend Consistency'] = { signal: 'SELL', weight: 4, confidence: 75 };
  } else {
    signals['Trend Consistency'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // Calculate weighted average signal
  let buyWeight = 0;
  let sellWeight = 0;
  let holdWeight = 0;
  let neutralWeight = 0;
  let totalWeight = 0;
  let weightedConfidence = 0;
  
  for (const indicator in signals) {
    const { signal, weight, confidence } = signals[indicator];
    totalWeight += weight;
    weightedConfidence += weight * confidence;
    
    if (signal === 'BUY') buyWeight += weight;
    else if (signal === 'SELL') sellWeight += weight;
    else if (signal === 'HOLD') holdWeight += weight;
    else neutralWeight += weight;
  }
  
  // Determine overall signal with higher thresholds for short-term
  let overallSignal: SignalType = 'NEUTRAL';
  
  // Require stronger consensus for signals (higher thresholds for short-term)
  if (buyWeight > totalWeight * 0.4 && buyWeight > sellWeight * 1.3) {
    overallSignal = 'BUY';
  } else if (sellWeight > totalWeight * 0.4 && sellWeight > buyWeight * 1.3) {
    overallSignal = 'SELL';
  } else if (holdWeight > buyWeight && holdWeight > sellWeight && holdWeight > neutralWeight) {
    overallSignal = 'HOLD';
  }
  
  // Apply trend filter
  if (overallSignal === 'BUY' && lastPSARTrend === 'down' && lastADX > 25) {
    // Don't buy against strong downtrend
    overallSignal = 'NEUTRAL';
  } else if (overallSignal === 'SELL' && lastPSARTrend === 'up' && lastADX > 25) {
    // Don't sell against strong uptrend
    overallSignal = 'NEUTRAL';
  }
  
  // Calculate overall confidence
  const overallConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 50;
  
  // Calculate price targets
  let priceTargets;
  if (overallSignal === 'BUY' || overallSignal === 'SELL') {
    // Calculate average true range for stop loss determination
    const atr = calculateATR(klineData, 7); // Shorter period for short-term
    const lastATR = atr[atr.length - 1];
    
    if (overallSignal === 'BUY') {
      const entryPrice = currentPrice;
      
      // Dynamic stop loss with tighter settings for short-term
      let stopLossDistance = lastATR * 1.5; // Tighter stop for short-term
      
      // Find closest support level below current price if available
      const nearestSupport = levels.support.find(level => level < currentPrice);
      if (nearestSupport && (currentPrice - nearestSupport) < stopLossDistance * 1.5) {
        stopLossDistance = currentPrice - nearestSupport + (lastATR * 0.3);
      }
      
      const stopLoss = entryPrice - stopLossDistance;
      const risk = entryPrice - stopLoss;
      
      // Set targets with short-term appropriate risk-reward ratios
      const target1 = entryPrice + (risk * 1.2); // 1.2:1 risk-reward
      const target2 = entryPrice + (risk * 2);   // 2:1 risk-reward  
      const target3 = entryPrice + (risk * 3);   // 3:1 risk-reward
      
      priceTargets = {
        entryPrice,
        stopLoss,
        target1,
        target2, 
        target3,
        riskRewardRatio: 3
      };
    } else {
      const entryPrice = currentPrice;
      
      // Dynamic stop loss with tighter settings for short-term
      let stopLossDistance = lastATR * 1.5; // Tighter stop for short-term
      
      // Find closest resistance level above current price if available
      const nearestResistance = levels.resistance.find(level => level > currentPrice);
      if (nearestResistance && (nearestResistance - currentPrice) < stopLossDistance * 1.5) {
        stopLossDistance = nearestResistance - currentPrice + (lastATR * 0.3);
      }
      
      const stopLoss = entryPrice + stopLossDistance;
      const risk = stopLoss - entryPrice;
      
      // Set targets with short-term appropriate risk-reward ratios
      const target1 = entryPrice - (risk * 1.2); // 1.2:1 risk-reward
      const target2 = entryPrice - (risk * 2);   // 2:1 risk-reward
      const target3 = entryPrice - (risk * 3);   // 3:1 risk-reward
      
      priceTargets = {
        entryPrice,
        stopLoss,
        target1,
        target2,
        target3,
        riskRewardRatio: 3
      };
    }
  }
  
  // Convert signals to TradingSignal array for display
  const tradingSignals: TradingSignal[] = Object.entries(signals).map(([indicator, data]) => ({
    indicator,
    type: data.signal,
    message: generateSignalMessage(indicator, data.signal, currentPrice),
    strength: data.confidence / 20 // Convert confidence (0-100) to strength (0-5)
  }));
  
  // Generate chart patterns based on price action
  const patterns = detectPatterns(klineData);
  
  // Log detailed confidence values for debugging
  console.log("Signal weights:", { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  console.log("Indicator details:", signals);
  console.log("Overall signal:", overallSignal, "with confidence:", overallConfidence.toFixed(2));
  
  return {
    overallSignal,
    confidence: overallConfidence,
    indicators: signals,
    signals: tradingSignals,
    patterns,
    priceTargets
  };
};

// Function to detect chart patterns
const detectPatterns = (klineData: KlineData[]): PatternDetection[] => {
  const patterns: PatternDetection[] = [];
  const closes = klineData.map(k => k.close);
  const highs = klineData.map(k => k.high);
  const lows = klineData.map(k => k.low);
  
  // Only analyze if we have enough data
  if (klineData.length < 20) return patterns;
  
  // Get recent price action
  const recentCloses = closes.slice(-10);
  const recentHighs = highs.slice(-10);
  const recentLows = lows.slice(-10);
  
  // Short-term patterns - look for specific short-term patterns
  
  // Detect potential doji (indecision)
  const last = klineData[klineData.length - 1];
  const bodySize = Math.abs(last.open - last.close);
  const totalRange = last.high - last.low;
  
  if (bodySize / totalRange < 0.1 && totalRange > 0) {
    patterns.push({
      name: 'Doji',
      description: 'A candlestick with a small body indicates market indecision. Watch for the next candle to confirm direction.',
      type: 'neutral',
      confidence: 65
    });
  }
  
  // Detect potential Engulfing pattern (short-term reversal)
  const lastCandle = klineData[klineData.length - 1];
  const prevCandle = klineData[klineData.length - 2];
  
  if (prevCandle && lastCandle) {
    const prevBody = Math.abs(prevCandle.open - prevCandle.close);
    const lastBody = Math.abs(lastCandle.open - lastCandle.close);
    
    if (prevCandle.close < prevCandle.open && // Previous bearish
        lastCandle.close > lastCandle.open && // Current bullish
        lastCandle.open < prevCandle.close && // Current opens below prev close
        lastCandle.close > prevCandle.open) { // Current closes above prev open
      patterns.push({
        name: 'Bullish Engulfing',
        description: 'A larger bullish candle completely engulfs the previous bearish candle, suggesting a potential reversal to the upside.',
        type: 'bullish',
        confidence: 75
      });
    } else if (prevCandle.close > prevCandle.open && // Previous bullish
              lastCandle.close < lastCandle.open && // Current bearish
              lastCandle.open > prevCandle.close && // Current opens above prev close
              lastCandle.close < prevCandle.open) { // Current closes below prev open
      patterns.push({
        name: 'Bearish Engulfing',
        description: 'A larger bearish candle completely engulfs the previous bullish candle, suggesting a potential reversal to the downside.',
        type: 'bearish',
        confidence: 75
      });
    }
  }
  
  // Detect potential double bottom
  const minIndex1 = lows.slice(-15, -8).indexOf(Math.min(...lows.slice(-15, -8))) + (closes.length - 15);
  const minIndex2 = lows.slice(-7).indexOf(Math.min(...lows.slice(-7))) + (closes.length - 7);
  
  if (
    Math.abs(lows[minIndex1] - lows[minIndex2]) / lows[minIndex1] < 0.02 && // Similar lows (within 2%)
    minIndex2 - minIndex1 >= 4 && // Some distance between bottoms
    closes[closes.length - 1] > (recentHighs.reduce((a, b) => a + b, 0) / recentHighs.length) // Current price above recent average highs
  ) {
    patterns.push({
      name: 'Double Bottom',
      description: 'A bullish reversal pattern that forms after a downtrend when price forms two distinct lows at roughly the same level.',
      type: 'bullish',
      confidence: 75
    });
  }
  
  // Detect potential double top
  const maxIndex1 = highs.slice(-15, -8).indexOf(Math.max(...highs.slice(-15, -8))) + (closes.length - 15);
  const maxIndex2 = highs.slice(-7).indexOf(Math.max(...highs.slice(-7))) + (closes.length - 7);
  
  if (
    Math.abs(highs[maxIndex1] - highs[maxIndex2]) / highs[maxIndex1] < 0.02 && // Similar highs (within 2%)
    maxIndex2 - maxIndex1 >= 4 && // Some distance between tops
    closes[closes.length - 1] < (recentLows.reduce((a, b) => a + b, 0) / recentLows.length) // Current price below recent average lows
  ) {
    patterns.push({
      name: 'Double Top',
      description: 'A bearish reversal pattern that forms after an uptrend when price forms two distinct highs at roughly the same level.',
      type: 'bearish',
      confidence: 75
    });
  }
  
  // Simple trend identification based on short moving averages
  const sma5 = calculateSMA(closes, 5);
  const sma10 = calculateSMA(closes, 10);
  
  const last5 = sma5[sma5.length - 1];
  const prev5 = sma5[sma5.length - 2];
  const last10 = sma10[sma10.length - 1];
  const prev10 = sma10[sma10.length - 2];
  
  if (last5 > last10 && prev5 <= prev10) {
    patterns.push({
      name: 'Golden Cross (Short-term)',
      description: 'A bullish signal where the 5-period moving average crosses above the 10-period moving average.',
      type: 'bullish',
      confidence: 70
    });
  } else if (last5 < last10 && prev5 >= prev10) {
    patterns.push({
      name: 'Death Cross (Short-term)',
      description: 'A bearish signal where the 5-period moving average crosses below the 10-period moving average.',
      type: 'bearish',
      confidence: 70
    });
  }
  
  return patterns;
};

// Generate human-readable signal messages - updated for short-term focus
const generateSignalMessage = (indicator: string, signal: SignalType, price: number): string => {
  switch (indicator) {
    case 'EMA Cross':
      return signal === 'BUY' 
        ? `Fast EMA crossed above slow EMA with strong momentum. Bullish.` 
        : signal === 'SELL'
          ? `Fast EMA crossed below slow EMA with strong momentum. Bearish.`
          : `EMAs show ${signal === 'HOLD' ? 'continued' : 'unclear'} short-term trend.`;
    
    case 'RSI Short-term':
      return signal === 'BUY'
        ? `Short-term RSI indicates oversold conditions with signs of reversal. Bullish.`
        : signal === 'SELL'
          ? `Short-term RSI indicates overbought conditions with signs of reversal. Bearish.`
          : `RSI is in neutral territory, showing balanced short-term momentum.`;
    
    case 'MACD Fast':
      return signal === 'BUY'
        ? `Fast MACD crossed above signal line with strengthening momentum. Strong buy signal.`
        : signal === 'SELL'
          ? `Fast MACD crossed below signal line with strengthening momentum. Strong sell signal.`
          : `MACD indicates ${signal === 'HOLD' ? 'continued' : 'neutral'} momentum.`;
    
    case 'BB Squeeze':
      return signal === 'BUY'
        ? `Bollinger band breakout with expanding volatility. Strong bullish momentum forming.`
        : signal === 'SELL'
          ? `Bollinger band breakdown with expanding volatility. Strong bearish momentum forming.`
          : `Bollinger bands indicate volatility ${signal === 'HOLD' ? 'contraction' : 'without direction'}.`;
    
    case 'Stochastic Fast':
      return signal === 'BUY'
        ? `Fast Stochastic crossed up from oversold zone. Strong reversal potential.`
        : signal === 'SELL'
          ? `Fast Stochastic crossed down from overbought zone. Strong reversal potential.`
          : `Stochastic is showing ${signal === 'HOLD' ? 'continued momentum' : 'no clear signal'}.`;
    
    case 'PSAR':
      return signal === 'BUY'
        ? `Parabolic SAR flipped bullish. Strong uptrend beginning.`
        : signal === 'SELL'
          ? `Parabolic SAR flipped bearish. Strong downtrend beginning.`
          : `PSAR indicates ${signal === 'HOLD' ? 'continued trend strength' : 'no trend change'}.`;
    
    case 'Momentum':
      return signal === 'BUY'
        ? `Price momentum turned positive with strong buying pressure.`
        : signal === 'SELL'
          ? `Price momentum turned negative with strong selling pressure.`
          : `Momentum indicator shows ${signal === 'HOLD' ? 'sustained direction' : 'neutral movement'}.`;
    
    case 'CMF':
      return signal === 'BUY'
        ? `Chaikin Money Flow turned positive, indicating strong buying pressure.`
        : signal === 'SELL'
          ? `Chaikin Money Flow turned negative, indicating strong selling pressure.`
          : `Money flow is ${signal === 'HOLD' ? 'sustaining its direction' : 'neutral'}.`;
    
    case 'VWAP':
      return signal === 'BUY'
        ? `Price below VWAP with oversold indicators. Institutional value zone.`
        : signal === 'SELL'
          ? `Price above VWAP with overbought indicators. Institutional resistance zone.`
          : `Price is ${signal === 'HOLD' ? 'moving towards' : 'near'} VWAP level.`;
    
    case 'ROC':
      return signal === 'BUY'
        ? `Rate of Change has turned positive with accelerating momentum.`
        : signal === 'SELL'
          ? `Rate of Change has turned negative with accelerating momentum.`
          : `Price rate of change is ${signal === 'HOLD' ? 'maintaining its direction' : 'showing no clear trend'}.`;
    
    case 'Support/Resistance':
      return signal === 'BUY'
        ? `Price is bouncing off major support with confirmation from oscillators.`
        : signal === 'SELL'
          ? `Price is rejecting major resistance with confirmation from oscillators.`
          : `Price is approaching a key ${signal === 'HOLD' ? 'support/resistance level' : 'price level'}.`;
    
    case 'Volume Surge':
      return signal === 'BUY'
        ? `Significant volume surge with rising price. Strong buying pressure.`
        : signal === 'SELL'
          ? `Significant volume surge with falling price. Strong selling pressure.`
          : `Volume pattern is ${signal === 'HOLD' ? 'worth monitoring' : 'showing no clear signal'}.`;
    
    case 'Trend Consistency':
      return signal === 'BUY'
        ? `Multiple short-term indicators aligned bullish. High probability setup.`
        : signal === 'SELL'
          ? `Multiple short-term indicators aligned bearish. High probability setup.`
          : `Short-term indicators are ${signal === 'HOLD' ? 'mostly in agreement' : 'giving mixed signals'}.`;
    
    default:
      return `${indicator} suggests a ${signal.toLowerCase()} signal at the current price level.`;
  }
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
