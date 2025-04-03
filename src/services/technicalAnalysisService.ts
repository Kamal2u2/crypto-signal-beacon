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

// Generate signals based on technical indicators
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
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const bollingerBands = calculateBollingerBands(closePrices);
  
  // Calculate new indicators
  const stochastic = calculateStochastic(highPrices, lowPrices, closePrices);
  const vwap = calculateVWAP(highPrices, lowPrices, closePrices, volumes);
  const adx = calculateADX(highPrices, lowPrices, closePrices);
  
  // Initialize signals object
  const signals: {[key: string]: IndicatorSignal} = {};
  
  // Most recent values (existing indicators)
  const lastSMA20 = sma20[sma20.length - 1];
  const lastSMA50 = sma50[sma50.length - 1];
  const lastEMA20 = ema20[ema20.length - 1];
  const lastEMA50 = ema50[ema50.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const lastMACD = macd.macd[macd.macd.length - 1];
  const lastSignal = macd.signal[macd.signal.length - 1];
  const lastHistogram = macd.histogram[macd.histogram.length - 1];
  const lastUpperBB = bollingerBands.upper[bollingerBands.upper.length - 1];
  const lastLowerBB = bollingerBands.lower[bollingerBands.lower.length - 1];
  const lastMiddleBB = bollingerBands.middle[bollingerBands.middle.length - 1];
  
  // Most recent values (new indicators)
  const lastK = stochastic.k[stochastic.k.length - 1];
  const lastD = stochastic.d[stochastic.d.length - 1];
  const lastVWAP = vwap[vwap.length - 1];
  const lastADX = adx.adx[adx.adx.length - 1];
  const lastPDI = adx.pdi[adx.pdi.length - 1];
  const lastNDI = adx.ndi[adx.ndi.length - 1];
  
  // Previous values for trend detection (existing)
  const prevSMA20 = sma20[sma20.length - 2];
  const prevSMA50 = sma50[sma50.length - 2];
  const prevEMA20 = ema20[ema20.length - 2];
  const prevEMA50 = ema50[ema50.length - 2];
  const prevRSI = rsi[rsi.length - 2];
  const prevMACD = macd.macd[macd.macd.length - 2];
  const prevSignal = macd.signal[macd.signal.length - 2];
  const prevHistogram = macd.histogram[macd.histogram.length - 2];
  
  // Previous values for trend detection (new)
  const prevK = stochastic.k[stochastic.k.length - 2];
  const prevD = stochastic.d[stochastic.d.length - 2];
  const prevVWAP = vwap[vwap.length - 2];
  const prevADX = adx.adx[adx.adx.length - 2];
  const prevPDI = adx.pdi[adx.pdi.length - 2];
  const prevNDI = adx.ndi[adx.ndi.length - 2];
  
  // Price movement strength (volatility indicator)
  const recentHighs = highPrices.slice(-10);
  const recentLows = lowPrices.slice(-10);
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const volatility = (highestHigh - lowestLow) / lowestLow * 100;
  const isVolatile = volatility > 2.5;
  
  // Volume analysis (new)
  const recentVolumes = volumes.slice(-10);
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const lastVolume = volumes[volumes.length - 1];
  const volumeRatio = lastVolume / avgVolume;
  const isHighVolume = volumeRatio > 1.5;
  const isLowVolume = volumeRatio < 0.5;
  
  // Trend strength detection (new)
  const trendStrength = lastADX > 25 ? 'strong' : lastADX > 15 ? 'moderate' : 'weak';
  const isUptrend = lastPDI > lastNDI && lastADX > 20;
  const isDowntrend = lastNDI > lastPDI && lastADX > 20;
  
  // === IMPROVED SIGNAL GENERATION LOGIC ===
  
  // 1. Moving Average Trend Analysis (improved)
  if (lastSMA20 > lastSMA50 && lastEMA20 > lastEMA50) {
    // Strong uptrend confirmed by both SMA and EMA
    const maDistance = (lastSMA20 - lastSMA50) / lastSMA50 * 100;
    const confidence = Math.min(90, 60 + maDistance * 10);
    signals['MA Trend'] = { signal: 'BUY', weight: 3, confidence };
  } else if (lastSMA20 < lastSMA50 && lastEMA20 < lastEMA50) {
    // Strong downtrend confirmed by both SMA and EMA
    const maDistance = (lastSMA50 - lastSMA20) / lastSMA50 * 100;
    const confidence = Math.min(90, 60 + maDistance * 10);
    signals['MA Trend'] = { signal: 'SELL', weight: 3, confidence };
  } else if (lastSMA20 > lastSMA50 || lastEMA20 > lastEMA50) {
    // Mixed signals but with upward bias
    signals['MA Trend'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    // Mixed signals but with downward bias
    signals['MA Trend'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  }
  
  // 2. RSI with trend confirmation (improved)
  if (lastRSI < 35 && (isUptrend || lastRSI > prevRSI)) {
    // Oversold condition with trend confirmation or RSI reversing up
    const confidence = Math.min(95, 100 - lastRSI * 1.5);
    signals['RSI'] = { signal: 'BUY', weight: 3, confidence };
  } else if (lastRSI > 65 && (isDowntrend || lastRSI < prevRSI)) {
    // Overbought condition with trend confirmation or RSI reversing down
    const confidence = Math.min(95, (lastRSI - 50) * 1.5);
    signals['RSI'] = { signal: 'SELL', weight: 3, confidence };
  } else if (lastRSI < 45 && lastRSI > prevRSI) {
    // RSI in lower neutral zone and rising
    signals['RSI'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else if (lastRSI > 55 && lastRSI < prevRSI) {
    // RSI in upper neutral zone and falling
    signals['RSI'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else {
    signals['RSI'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 3. MACD Signal with volume confirmation (improved)
  if (lastMACD > lastSignal && prevMACD <= prevSignal) {
    // MACD crossed above signal line (bullish)
    const strength = Math.abs(lastMACD - lastSignal) / Math.abs(lastSignal) * 100;
    let confidence = Math.min(90, 60 + strength);
    
    // Increase confidence if also high volume
    if (isHighVolume) confidence = Math.min(95, confidence + 10);
    
    signals['MACD'] = { signal: 'BUY', weight: 4, confidence };
  } else if (lastMACD < lastSignal && prevMACD >= prevSignal) {
    // MACD crossed below signal line (bearish)
    const strength = Math.abs(lastMACD - lastSignal) / Math.abs(lastSignal) * 100;
    let confidence = Math.min(90, 60 + strength);
    
    // Increase confidence if also high volume
    if (isHighVolume) confidence = Math.min(95, confidence + 10);
    
    signals['MACD'] = { signal: 'SELL', weight: 4, confidence };
  } else if (lastMACD > lastSignal && lastHistogram > prevHistogram) {
    // MACD above signal line and histogram increasing (momentum increasing)
    signals['MACD'] = { signal: 'HOLD', weight: 2, confidence: 70 };
  } else if (lastMACD < lastSignal && lastHistogram < prevHistogram) {
    // MACD below signal line and histogram decreasing (momentum decreasing)
    signals['MACD'] = { signal: 'HOLD', weight: 2, confidence: 70 };
  } else {
    signals['MACD'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 4. Bollinger Bands with volatility context (improved)
  const bbPosition = (currentPrice - lastLowerBB) / (lastUpperBB - lastLowerBB);
  if (bbPosition < 0.1 && !isDowntrend) {
    // Price near lower band and not in strong downtrend
    let confidence = 80;
    if (isHighVolume && lastRSI < 40) confidence = 90; // Volume confirmation
    signals['Bollinger Bands'] = { signal: 'BUY', weight: 3, confidence };
  } else if (bbPosition > 0.9 && !isUptrend) {
    // Price near upper band and not in strong uptrend
    let confidence = 80;
    if (isHighVolume && lastRSI > 60) confidence = 90; // Volume confirmation
    signals['Bollinger Bands'] = { signal: 'SELL', weight: 3, confidence };
  } else if (bbPosition < 0.2 && lastRSI < 40) {
    // Price in lower region with oversold RSI
    signals['Bollinger Bands'] = { signal: 'HOLD', weight: 2, confidence: 70 };
  } else if (bbPosition > 0.8 && lastRSI > 60) {
    // Price in upper region with overbought RSI
    signals['Bollinger Bands'] = { signal: 'HOLD', weight: 2, confidence: 70 };
  } else {
    signals['Bollinger Bands'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 5. Stochastic Oscillator (new signal)
  if (lastK < 20 && lastK > lastD && prevK <= prevD) {
    // Oversold and %K crossed above %D (bullish)
    signals['Stochastic'] = { signal: 'BUY', weight: 3, confidence: 85 };
  } else if (lastK > 80 && lastK < lastD && prevK >= prevD) {
    // Overbought and %K crossed below %D (bearish)
    signals['Stochastic'] = { signal: 'SELL', weight: 3, confidence: 85 };
  } else if (lastK < 20 && lastK > prevK) {
    // Oversold and rising
    signals['Stochastic'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else if (lastK > 80 && lastK < prevK) {
    // Overbought and falling
    signals['Stochastic'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else {
    signals['Stochastic'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 6. VWAP relative to price (new signal)
  if (currentPrice < lastVWAP * 0.98 && lastRSI < 40) {
    // Price significantly below VWAP and oversold
    signals['VWAP'] = { signal: 'BUY', weight: 3, confidence: 80 };
  } else if (currentPrice > lastVWAP * 1.02 && lastRSI > 60) {
    // Price significantly above VWAP and overbought
    signals['VWAP'] = { signal: 'SELL', weight: 3, confidence: 80 };
  } else if (currentPrice < lastVWAP && currentPrice > prevVWAP) {
    // Price below VWAP but rising toward it
    signals['VWAP'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else if (currentPrice > lastVWAP && currentPrice < prevVWAP) {
    // Price above VWAP but falling toward it
    signals['VWAP'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    signals['VWAP'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 7. ADX Trend Strength (new signal)
  if (isUptrend && trendStrength === 'strong' && lastPDI > prevPDI) {
    // Strong uptrend getting stronger
    signals['ADX Trend'] = { signal: 'BUY', weight: 4, confidence: 85 };
  } else if (isDowntrend && trendStrength === 'strong' && lastNDI > prevNDI) {
    // Strong downtrend getting stronger
    signals['ADX Trend'] = { signal: 'SELL', weight: 4, confidence: 85 };
  } else if (isUptrend && trendStrength !== 'weak') {
    // Moderate to strong uptrend
    signals['ADX Trend'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else if (isDowntrend && trendStrength !== 'weak') {
    // Moderate to strong downtrend
    signals['ADX Trend'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else {
    // Weak trend or no clear direction
    signals['ADX Trend'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 8. Volume Profile (new signal)
  if (isHighVolume && currentPrice > prevSMA20 && lastRSI > prevRSI) {
    // High volume with price above SMA and rising RSI (bullish)
    signals['Volume Analysis'] = { signal: 'BUY', weight: 3, confidence: 80 };
  } else if (isHighVolume && currentPrice < prevSMA20 && lastRSI < prevRSI) {
    // High volume with price below SMA and falling RSI (bearish)
    signals['Volume Analysis'] = { signal: 'SELL', weight: 3, confidence: 80 };
  } else if (isHighVolume && currentPrice > prevSMA20) {
    // High volume with price above SMA
    signals['Volume Analysis'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else if (isHighVolume && currentPrice < prevSMA20) {
    // High volume with price below SMA
    signals['Volume Analysis'] = { signal: 'HOLD', weight: 2, confidence: 65 };
  } else {
    // Average or low volume
    signals['Volume Analysis'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 9. Trend Confirmation (new compound signal)
  if ((isUptrend || lastSMA20 > lastSMA50) && lastK > prevK && lastRSI > prevRSI) {
    // Multiple indicators confirming uptrend
    signals['Trend Confirmation'] = { signal: 'BUY', weight: 5, confidence: 85 };
  } else if ((isDowntrend || lastSMA20 < lastSMA50) && lastK < prevK && lastRSI < prevRSI) {
    // Multiple indicators confirming downtrend
    signals['Trend Confirmation'] = { signal: 'SELL', weight: 5, confidence: 85 };
  } else if (lastSMA20 > lastSMA50 && lastRSI > 50) {
    // Some confirmation of upward bias
    signals['Trend Confirmation'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else if (lastSMA20 < lastSMA50 && lastRSI < 50) {
    // Some confirmation of downward bias
    signals['Trend Confirmation'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else {
    // Mixed signals
    signals['Trend Confirmation'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // 10. Volatility Breakout (new signal)
  if (isVolatile && bollingerBands.upper[bollingerBands.upper.length - 1] > bollingerBands.upper[bollingerBands.upper.length - 5] * 1.01) {
    // Expanding volatility (widening Bollinger Bands)
    if (currentPrice > lastSMA20 && isHighVolume) {
      // Price above SMA with high volume
      signals['Volatility Breakout'] = { signal: 'BUY', weight: 4, confidence: 80 };
    } else if (currentPrice < lastSMA20 && isHighVolume) {
      // Price below SMA with high volume
      signals['Volatility Breakout'] = { signal: 'SELL', weight: 4, confidence: 80 };
    } else {
      // No clear direction despite volatility
      signals['Volatility Breakout'] = { signal: 'NEUTRAL', weight: 2, confidence: 60 };
    }
  } else {
    // Normal volatility
    signals['Volatility Breakout'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
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
  
  // Filter signals with higher thresholds for improved accuracy
  let overallSignal: SignalType = 'NEUTRAL';
  
  // Require stronger consensus for signals
  if (buyWeight > totalWeight * 0.35 && buyWeight > sellWeight) {
    overallSignal = 'BUY';
  } else if (sellWeight > totalWeight * 0.35 && sellWeight > buyWeight) {
    overallSignal = 'SELL';
  } else if (holdWeight > buyWeight && holdWeight > sellWeight && holdWeight > neutralWeight) {
    overallSignal = 'HOLD';
  }
  
  // Apply trend filter to reduce false signals
  if (overallSignal === 'BUY' && isDowntrend && trendStrength === 'strong') {
    // Don't buy against strong downtrend
    overallSignal = 'NEUTRAL';
  } else if (overallSignal === 'SELL' && isUptrend && trendStrength === 'strong') {
    // Don't sell against strong uptrend
    overallSignal = 'NEUTRAL';
  }
  
  // Calculate overall confidence
  const overallConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 50;
  
  // Calculate price targets if we have a BUY or SELL signal
  let priceTargets;
  if (overallSignal === 'BUY' || overallSignal === 'SELL') {
    // Calculate average true range for stop loss determination
    const atr = calculateATR(klineData, 14);
    const lastATR = atr[atr.length - 1];
    
    if (overallSignal === 'BUY') {
      const entryPrice = currentPrice;
      
      // Dynamic stop loss based on volatility and support levels
      let stopLossDistance = lastATR * 2;
      
      // Find closest support level below current price if available
      const nearestSupport = supportResistanceLevels.support.find(level => level < currentPrice);
      if (nearestSupport && (currentPrice - nearestSupport) < stopLossDistance * 1.5) {
        stopLossDistance = currentPrice - nearestSupport + (lastATR * 0.5);
      }
      
      const stopLoss = entryPrice - stopLossDistance;
      const risk = entryPrice - stopLoss;
      
      // Set targets with increasing risk-reward ratios
      const target1 = entryPrice + (risk * 1.5); // 1.5:1 risk-reward
      const target2 = entryPrice + (risk * 2.5); // 2.5:1 risk-reward  
      const target3 = entryPrice + (risk * 4);   // 4:1 risk-reward
      
      priceTargets = {
        entryPrice,
        stopLoss,
        target1,
        target2, 
        target3,
        riskRewardRatio: 4
      };
    } else {
      const entryPrice = currentPrice;
      
      // Dynamic stop loss based on volatility and resistance levels
      let stopLossDistance = lastATR * 2;
      
      // Find closest resistance level above current price if available
      const nearestResistance = supportResistanceLevels.resistance.find(level => level > currentPrice);
      if (nearestResistance && (nearestResistance - currentPrice) < stopLossDistance * 1.5) {
        stopLossDistance = nearestResistance - currentPrice + (lastATR * 0.5);
      }
      
      const stopLoss = entryPrice + stopLossDistance;
      const risk = stopLoss - entryPrice;
      
      // Set targets with increasing risk-reward ratios
      const target1 = entryPrice - (risk * 1.5); // 1.5:1 risk-reward
      const target2 = entryPrice - (risk * 2.5); // 2.5:1 risk-reward
      const target3 = entryPrice - (risk * 4);   // 4:1 risk-reward
      
      priceTargets = {
        entryPrice,
        stopLoss,
        target1,
        target2,
        target3,
        riskRewardRatio: 4
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
  
  // Detect potential double bottom
  const minIndex1 = lows.slice(-20, -10).indexOf(Math.min(...lows.slice(-20, -10))) + (closes.length - 20);
  const minIndex2 = lows.slice(-10).indexOf(Math.min(...lows.slice(-10))) + (closes.length - 10);
  
  if (
    Math.abs(lows[minIndex1] - lows[minIndex2]) / lows[minIndex1] < 0.03 && // Similar lows (within 3%)
    minIndex2 - minIndex1 >= 5 && // Some distance between bottoms
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
  const maxIndex1 = highs.slice(-20, -10).indexOf(Math.max(...highs.slice(-20, -10))) + (closes.length - 20);
  const maxIndex2 = highs.slice(-10).indexOf(Math.max(...highs.slice(-10))) + (closes.length - 10);
  
  if (
    Math.abs(highs[maxIndex1] - highs[maxIndex2]) / highs[maxIndex1] < 0.03 && // Similar highs (within 3%)
    maxIndex2 - maxIndex1 >= 5 && // Some distance between tops
    closes[closes.length - 1] < (recentLows.reduce((a, b) => a + b, 0) / recentLows.length) // Current price below recent average lows
  ) {
    patterns.push({
      name: 'Double Top',
      description: 'A bearish reversal pattern that forms after an uptrend when price forms two distinct highs at roughly the same level.',
      type: 'bearish',
      confidence: 75
    });
  }
  
  // Simple trend identification based on moving averages
  const sma10 = calculateSMA(closes, 10);
  const sma20 = calculateSMA(closes, 20);
  
  const last10 = sma10[sma10.length - 1];
  const prev10 = sma10[sma10.length - 2];
  const last20 = sma20[sma20.length - 1];
  const prev20 = sma20[sma20.length - 2];
  
  if (last10 > last20 && prev10 <= prev20) {
    patterns.push({
      name: 'Golden Cross (Short-term)',
      description: 'A bullish signal where a shorter-term moving average crosses above a longer-term moving average.',
      type: 'bullish',
      confidence: 65
    });
  } else if (last10 < last20 && prev10 >= prev20) {
    patterns.push({
      name: 'Death Cross (Short-term)',
      description: 'A bearish signal where a shorter-term moving average crosses below a longer-term moving average.',
      type: 'bearish',
      confidence: 65
    });
  }
  
  return patterns;
};

// Generate human-readable signal messages
const generateSignalMessage = (indicator: string, signal: SignalType, price: number): string => {
  switch (indicator) {
    case 'MA Trend':
      return signal === 'BUY' 
        ? `Multiple moving averages confirm uptrend, suggesting strong bullish momentum.` 
        : signal === 'SELL'
          ? `Multiple moving averages confirm downtrend, suggesting strong bearish momentum.`
          : `Moving averages indicate a continued ${signal === 'HOLD' ? 'current' : 'neutral'} trend.`;
    
    case 'RSI':
      return signal === 'BUY'
        ? `RSI indicates oversold conditions with signs of reversal. Good entry opportunity.`
        : signal === 'SELL'
          ? `RSI indicates overbought conditions with signs of reversal. Consider taking profits.`
          : `RSI is in neutral territory, showing balanced buying and selling pressure.`;
    
    case 'MACD':
      return signal === 'BUY'
        ? `MACD has crossed above signal line with increasing volume, strong bullish signal.`
        : signal === 'SELL'
          ? `MACD has crossed below signal line with increasing volume, strong bearish signal.`
          : `MACD indicates ${signal === 'HOLD' ? 'continued' : 'neutral'} momentum.`;
    
    case 'Bollinger Bands':
      return signal === 'BUY'
        ? `Price is testing the lower Bollinger Band with oversold conditions. Potential bounce.`
        : signal === 'SELL'
          ? `Price is testing the upper Bollinger Band with overbought conditions. Potential reversal.`
          : `Price is within the middle range of the Bollinger Bands, suggesting no extreme conditions.`;
    
    case 'Stochastic':
      return signal === 'BUY'
        ? `Stochastic has crossed up from oversold zone, indicating potential bullish reversal.`
        : signal === 'SELL'
          ? `Stochastic has crossed down from overbought zone, indicating potential bearish reversal.`
          : `Stochastic is showing ${signal === 'HOLD' ? 'gradual momentum shift' : 'no clear direction'}.`;
    
    case 'VWAP':
      return signal === 'BUY'
        ? `Price below VWAP with oversold conditions. Institutional traders may see value here.`
        : signal === 'SELL'
          ? `Price above VWAP with overbought conditions. Institutional traders may be taking profits.`
          : `Price is near VWAP level, indicating equilibrium between buyers and sellers.`;
    
    case 'ADX Trend':
      return signal === 'BUY'
        ? `ADX shows strong uptrend momentum that is gaining strength. Trend followers should pay attention.`
        : signal === 'SELL'
          ? `ADX shows strong downtrend momentum that is gaining strength. Trend followers should pay attention.`
          : `ADX indicates ${signal === 'HOLD' ? 'continued trend' : 'weak or no trend'}.`;
    
    case 'Volume Analysis':
      return signal === 'BUY'
        ? `Increasing volume with rising price suggests strong buying pressure and participation.`
        : signal === 'SELL'
          ? `Increasing volume with falling price suggests strong selling pressure and distribution.`
          : `Volume patterns are ${signal === 'HOLD' ? 'supporting the current price action' : 'inconclusive'}.`;
    
    case 'Trend Confirmation':
      return signal === 'BUY'
        ? `Multiple indicators confirm uptrend. High-probability buying opportunity.`
        : signal === 'SELL'
          ? `Multiple indicators confirm downtrend. High-probability selling opportunity.`
          : `Trend indicators are ${signal === 'HOLD' ? 'aligned with the current direction' : 'giving mixed signals'}.`;
    
    case 'Volatility Breakout':
      return signal === 'BUY'
        ? `Increasing volatility with upward price action suggests potential for explosive move higher.`
        : signal === 'SELL'
          ? `Increasing volatility with downward price action suggests potential for accelerated move lower.`
          : `Market volatility is ${signal === 'HOLD' ? 'elevated but contained' : 'normal without clear direction'}.`;
    
    default:
      return `${indicator} indicator suggests a ${signal.toLowerCase()} signal at the current price level.`;
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
