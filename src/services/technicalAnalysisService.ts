
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

// Support and Resistance
export const findSupportResistanceLevels = (highs: number[], lows: number[], closes: number[]): { support: number[], resistance: number[] } => {
  // Use the last 30 data points for shorter-term levels
  const recentHighs = highs.slice(-30);
  const recentLows = lows.slice(-30);
  
  // Simple algorithm to find local minima and maxima
  const resistance: number[] = [];
  const support: number[] = [];
  
  // Find local maxima for resistance
  for (let i = 5; i < recentHighs.length - 5; i++) {
    const window = recentHighs.slice(i - 5, i + 6);
    const max = Math.max(...window);
    if (max === recentHighs[i] && !resistance.includes(max)) {
      resistance.push(max);
    }
  }
  
  // Find local minima for support
  for (let i = 5; i < recentLows.length - 5; i++) {
    const window = recentLows.slice(i - 5, i + 6);
    const min = Math.min(...window);
    if (min === recentLows[i] && !support.includes(min)) {
      support.push(min);
    }
  }
  
  // If we didn't find any, use some defaults based on percentiles
  if (resistance.length === 0) {
    resistance.push(Math.max(...recentHighs));
  }
  
  if (support.length === 0) {
    support.push(Math.min(...recentLows));
  }
  
  // Sort and limit to top 3 levels
  resistance.sort((a, b) => a - b);
  support.sort((a, b) => a - b);
  
  return {
    support: support.slice(0, 3),
    resistance: resistance.slice(-3)
  };
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
  
  // Convert signals to TradingSignal array
  const tradingSignals: TradingSignal[] = Object.entries(signals).map(([indicator, data]) => ({
    indicator,
    type: data.signal,
    message: generateSignalMessage(indicator, data.signal, currentPrice),
    strength: data.confidence / 20 // Convert confidence (0-100) to strength (0-5)
  }));
  
  // Generate chart patterns based on price action
  const patterns = detectPatterns(klineData);
  
  // Log detailed confidence values for debugging
  console.log("Signal weights:", { buyWeight, sellWeight, holdWeight, neutralWeight });
  console.log("Indicator details:", signals);
  
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
    case 'MA Crossover':
      return signal === 'BUY' 
        ? `Moving average crossover detected. The shorter-term MA has crossed above the longer-term MA, suggesting upward momentum.` 
        : signal === 'SELL'
          ? `Moving average crossover detected. The shorter-term MA has crossed below the longer-term MA, suggesting downward momentum.`
          : `Moving averages indicate a continued ${signal === 'HOLD' ? 'current' : 'neutral'} trend.`;
    
    case 'RSI':
      return signal === 'BUY'
        ? `RSI indicates oversold conditions. The market may be due for a bounce.`
        : signal === 'SELL'
          ? `RSI indicates overbought conditions. The market may be due for a pullback.`
          : `RSI is in neutral territory, showing balanced buying and selling pressure.`;
    
    case 'MACD':
      return signal === 'BUY'
        ? `MACD line has crossed above the signal line, suggesting increasing bullish momentum.`
        : signal === 'SELL'
          ? `MACD line has crossed below the signal line, suggesting increasing bearish momentum.`
          : `MACD indicates ${signal === 'HOLD' ? 'continued' : 'neutral'} momentum.`;
    
    case 'MACD Momentum':
      return signal === 'BUY'
        ? `MACD histogram is positive and increasing, indicating strengthening bullish momentum.`
        : signal === 'SELL'
          ? `MACD histogram is negative and decreasing, indicating strengthening bearish momentum.`
          : `MACD histogram shows ${signal === 'HOLD' ? 'steady' : 'indecisive'} momentum.`;
    
    case 'Bollinger Bands':
      return signal === 'BUY'
        ? `Price is near the lower Bollinger Band, suggesting a potentially oversold condition.`
        : signal === 'SELL'
          ? `Price is near the upper Bollinger Band, suggesting a potentially overbought condition.`
          : `Price is within the middle range of the Bollinger Bands, suggesting no extreme conditions.`;
    
    case 'Price/EMA':
      return signal === 'BUY'
        ? `Price is rising and above the EMA, confirming upward momentum.`
        : signal === 'SELL'
          ? `Price is falling and below the EMA, confirming downward momentum.`
          : `Price is close to the EMA, indicating a balanced market.`;
    
    case 'Volatility':
      return signal === 'BUY'
        ? `Market volatility is elevated with bullish bias. Potential for upside breakout.`
        : signal === 'SELL'
          ? `Market volatility is elevated with bearish bias. Potential for downside breakout.`
          : `Market volatility is ${isNaN(price) ? 'normal' : 'elevated but without clear direction'}.`;
    
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

