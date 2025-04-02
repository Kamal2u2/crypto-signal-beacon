
import { KlineData } from './binanceService';

export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';

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
const calculateSMA = (data: number[], period: number): number[] => {
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
const calculateEMA = (data: number[], period: number): number[] => {
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
const calculateRSI = (data: number[], period: number = 14): number[] => {
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
const calculateMACD = (data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {macd: number[], signal: number[], histogram: number[]} => {
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
const calculateBollingerBands = (data: number[], period: number = 20, stdDev: number = 2): {upper: number[], middle: number[], lower: number[]} => {
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

// Generate signals based on technical indicators
export const generateSignals = (klineData: KlineData[]): SignalSummary => {
  // Extract close prices
  const closePrices = klineData.map(kline => kline.close);
  const highPrices = klineData.map(kline => kline.high);
  const lowPrices = klineData.map(kline => kline.low);
  const currentPrice = closePrices[closePrices.length - 1];
  
  // Calculate indicators
  const sma20 = calculateSMA(closePrices, 20);
  const sma50 = calculateSMA(closePrices, 50);
  const ema20 = calculateEMA(closePrices, 20);
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const bollingerBands = calculateBollingerBands(closePrices);
  
  // Initialize signals object
  const signals: {[key: string]: IndicatorSignal} = {};
  
  // Most recent values
  const lastSMA20 = sma20[sma20.length - 1];
  const lastSMA50 = sma50[sma50.length - 1];
  const lastEMA20 = ema20[ema20.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const lastMACD = macd.macd[macd.macd.length - 1];
  const lastSignal = macd.signal[macd.signal.length - 1];
  const lastHistogram = macd.histogram[macd.histogram.length - 1];
  const lastUpperBB = bollingerBands.upper[bollingerBands.upper.length - 1];
  const lastLowerBB = bollingerBands.lower[bollingerBands.lower.length - 1];
  const lastMiddleBB = bollingerBands.middle[bollingerBands.middle.length - 1];
  
  // Previous values for trend detection
  const prevSMA20 = sma20[sma20.length - 2];
  const prevSMA50 = sma50[sma50.length - 2];
  const prevEMA20 = ema20[ema20.length - 2];
  const prevRSI = rsi[rsi.length - 2];
  const prevMACD = macd.macd[macd.macd.length - 2];
  const prevSignal = macd.signal[macd.signal.length - 2];
  const prevHistogram = macd.histogram[macd.histogram.length - 2];
  
  // Price movement strength (volatility indicator)
  const recentHighs = highPrices.slice(-10);
  const recentLows = lowPrices.slice(-10);
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const volatility = (highestHigh - lowestLow) / lowestLow * 100;
  const isVolatile = volatility > 2.5; // Consider market volatile if more than 2.5% range
  
  // 1. Moving Average Crossover Signal
  if (lastSMA20 > lastSMA50 && prevSMA20 <= prevSMA50) {
    signals['MA Crossover'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (lastSMA20 < lastSMA50 && prevSMA20 >= prevSMA50) {
    signals['MA Crossover'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastSMA20 > lastSMA50) {
    signals['MA Crossover'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    signals['MA Crossover'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  }
  
  // 2. RSI Signal
  if (lastRSI < 30) {
    const confidence = Math.min(100, 100 - lastRSI * 2);
    signals['RSI'] = { signal: 'BUY', weight: 2, confidence };
  } else if (lastRSI > 70) {
    const confidence = Math.min(100, (lastRSI - 50) * 2);
    signals['RSI'] = { signal: 'SELL', weight: 2, confidence };
  } else if (lastRSI < 45) {
    signals['RSI'] = { signal: 'HOLD', weight: 1, confidence: 55 };
  } else if (lastRSI > 55) {
    signals['RSI'] = { signal: 'HOLD', weight: 1, confidence: 55 };
  } else {
    signals['RSI'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 3. MACD Signal
  if (lastMACD > lastSignal && prevMACD <= prevSignal) {
    const strength = Math.abs(lastMACD - lastSignal) / Math.abs(lastSignal) * 100;
    const confidence = Math.min(90, 50 + strength);
    signals['MACD'] = { signal: 'BUY', weight: 3, confidence };
  } else if (lastMACD < lastSignal && prevMACD >= prevSignal) {
    const strength = Math.abs(lastMACD - lastSignal) / Math.abs(lastSignal) * 100;
    const confidence = Math.min(90, 50 + strength);
    signals['MACD'] = { signal: 'SELL', weight: 3, confidence };
  } else if (lastMACD > lastSignal) {
    signals['MACD'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  } else {
    signals['MACD'] = { signal: 'HOLD', weight: 2, confidence: 60 };
  }
  
  // 4. MACD Histogram Momentum
  if (lastHistogram > 0 && lastHistogram > prevHistogram) {
    signals['MACD Momentum'] = { signal: 'BUY', weight: 2, confidence: 65 };
  } else if (lastHistogram < 0 && lastHistogram < prevHistogram) {
    signals['MACD Momentum'] = { signal: 'SELL', weight: 2, confidence: 65 };
  } else if (lastHistogram > 0) {
    signals['MACD Momentum'] = { signal: 'HOLD', weight: 1, confidence: 55 };
  } else {
    signals['MACD Momentum'] = { signal: 'HOLD', weight: 1, confidence: 55 };
  }
  
  // 5. Bollinger Bands Signal
  const bbPosition = (currentPrice - lastLowerBB) / (lastUpperBB - lastLowerBB);
  if (bbPosition < 0.1) {
    signals['Bollinger Bands'] = { signal: 'BUY', weight: 2, confidence: 80 };
  } else if (bbPosition > 0.9) {
    signals['Bollinger Bands'] = { signal: 'SELL', weight: 2, confidence: 80 };
  } else if (bbPosition < 0.3) {
    signals['Bollinger Bands'] = { signal: 'HOLD', weight: 1, confidence: 60 };
  } else if (bbPosition > 0.7) {
    signals['Bollinger Bands'] = { signal: 'HOLD', weight: 1, confidence: 60 };
  } else {
    signals['Bollinger Bands'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // 6. Price vs EMA Signal
  const emaDiff = (currentPrice - lastEMA20) / lastEMA20 * 100;
  if (emaDiff > 1 && currentPrice > prevEMA20) {
    signals['Price/EMA'] = { signal: 'BUY', weight: 2, confidence: 65 };
  } else if (emaDiff < -1 && currentPrice < prevEMA20) {
    signals['Price/EMA'] = { signal: 'SELL', weight: 2, confidence: 65 };
  } else if (emaDiff > 0) {
    signals['Price/EMA'] = { signal: 'HOLD', weight: 1, confidence: 55 };
  } else {
    signals['Price/EMA'] = { signal: 'HOLD', weight: 1, confidence: 55 };
  }
  
  // 7. Volatility-based signal (new)
  if (isVolatile) {
    if (currentPrice > lastMiddleBB && lastRSI < 65) {
      signals['Volatility'] = { signal: 'BUY', weight: 2, confidence: 70 };
    } else if (currentPrice < lastMiddleBB && lastRSI > 35) {
      signals['Volatility'] = { signal: 'SELL', weight: 2, confidence: 70 };
    } else {
      signals['Volatility'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
    }
  } else {
    signals['Volatility'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
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
  
  // Determine overall signal
  let overallSignal: SignalType = 'NEUTRAL';
  if (buyWeight > sellWeight && buyWeight > holdWeight && buyWeight > neutralWeight) {
    overallSignal = 'BUY';
  } else if (sellWeight > buyWeight && sellWeight > holdWeight && sellWeight > neutralWeight) {
    overallSignal = 'SELL';
  } else if (holdWeight > buyWeight && holdWeight > sellWeight && holdWeight > neutralWeight) {
    overallSignal = 'HOLD';
  }
  
  // Calculate overall confidence
  const overallConfidence = weightedConfidence / totalWeight;
  
  // Calculate price targets if we have a BUY or SELL signal
  let priceTargets;
  if (overallSignal === 'BUY' || overallSignal === 'SELL') {
    // Calculate average true range for stop loss determination
    const atr = calculateATR(klineData, 14);
    const lastATR = atr[atr.length - 1];
    
    if (overallSignal === 'BUY') {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice - (lastATR * 2);
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
      const stopLoss = entryPrice + (lastATR * 2);
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
  
  // Log detailed confidence values for debugging
  console.log("Signal weights:", { buyWeight, sellWeight, holdWeight, neutralWeight });
  console.log("Indicator details:", signals);
  
  return {
    overallSignal,
    confidence: overallConfidence,
    indicators: signals,
    priceTargets
  };
};

// Average True Range calculation for stop loss and target determination
const calculateATR = (klineData: KlineData[], period: number = 14): number[] => {
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
