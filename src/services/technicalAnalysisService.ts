import { KlineData } from "./binanceService";

// Types of signals that can be generated
export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';

// Interface for a trading signal
export interface TradingSignal {
  type: SignalType;
  indicator: string;
  strength: number; // 0-100, indicates confidence
  message: string;
}

// Interface for price targets and stoploss
export interface PriceTargets {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
}

// Interface for aggregated signals
export interface SignalSummary {
  overallSignal: SignalType;
  confidence: number;
  signals: TradingSignal[];
  priceTargets: PriceTargets | null;
  patterns: PatternDetection[] | null;
}

// Interface for pattern detection
export interface PatternDetection {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
}

// Calculate Simple Moving Average (SMA)
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  
  // We need at least 'period' data points to calculate the first SMA
  if (prices.length < period) {
    return new Array(prices.length).fill(NaN);
  }
  
  // Calculate SMA for each valid position
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Not enough data yet
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

// Calculate Exponential Moving Average (EMA)
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Initialize EMA with SMA for the first value
  let initialSMA = 0;
  for (let i = 0; i < period; i++) {
    initialSMA += prices[i];
  }
  initialSMA /= period;
  
  // Fill with NaN for the first (period-1) positions
  for (let i = 0; i < period - 1; i++) {
    ema.push(NaN);
  }
  
  // Add the initial SMA value
  ema.push(initialSMA);
  
  // Calculate EMA for the rest of the data
  for (let i = period; i < prices.length; i++) {
    const newEMA = prices[i] * multiplier + ema[ema.length - 1] * (1 - multiplier);
    ema.push(newEMA);
  }
  
  return ema;
}

// Calculate Relative Strength Index (RSI)
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Fill with NaN for the first period positions
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calculate RSI for each subsequent position
  for (let i = period; i < prices.length; i++) {
    // Update average gain and loss using smoothing
    avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;
    
    // Calculate RS and RSI
    const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    const rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);
  }
  
  return rsi;
}

// Calculate MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): {macd: number[], signal: number[], histogram: number[]} {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // Calculate signal line (EMA of MACD line)
  const validMacdValues = macdLine.filter(val => !isNaN(val));
  let signalLine: number[] = new Array(prices.length).fill(NaN);
  
  if (validMacdValues.length >= signalPeriod) {
    // Find the position where we have enough valid MACD values to start calculating the signal line
    const startIndex = macdLine.findIndex((val, idx) => !isNaN(val) && 
      macdLine.slice(idx, idx + signalPeriod).every(v => !isNaN(v)));
    
    if (startIndex !== -1) {
      const macdSignal = calculateEMA(macdLine.slice(startIndex), signalPeriod);
      
      // Insert the calculated values at the correct positions
      for (let i = 0; i < macdSignal.length; i++) {
        const targetIdx = startIndex + i + signalPeriod - 1;
        if (targetIdx < signalLine.length) {
          signalLine[targetIdx] = macdSignal[i];
        }
      }
    }
  }
  
  // Calculate histogram (MACD line - signal line)
  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }
  
  return { macd: macdLine, signal: signalLine, histogram };
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number[], middle: number[], lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  // Calculate standard deviation for each point
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }

    // Get the subset of prices for this period
    const startIndex = Math.max(0, i - period + 1);
    const subset = prices.slice(startIndex, i + 1);
    
    // Calculate standard deviation
    const mean = middle[i];
    const squaredDiffs = subset.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / subset.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate bands
    upper.push(middle[i] + (multiplier * stdDev));
    lower.push(middle[i] - (multiplier * stdDev));
  }

  return { upper, middle, lower };
}

// Calculate Average True Range (ATR)
export function calculateATR(
  closes: number[],
  highs: number[],
  lows: number[],
  period: number = 14
): number[] {
  const trueRanges: number[] = [];
  const atr: number[] = [];
  
  // Calculate True Range for each candle
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      // For first candle, TR is simply High - Low
      trueRanges.push(highs[i] - lows[i]);
    } else {
      // TR is max of: current high-low, |current high-previous close|, |current low-previous close|
      const hl = highs[i] - lows[i];
      const hpc = Math.abs(highs[i] - closes[i-1]);
      const lpc = Math.abs(lows[i] - closes[i-1]);
      trueRanges.push(Math.max(hl, hpc, lpc));
    }
  }
  
  // Calculate ATR using EMA of True Range
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      // Not enough data for calculation
      atr.push(NaN);
      continue;
    }
    
    if (i === period) {
      // First ATR is simple average of first 'period' true ranges
      const firstATR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
      atr.push(firstATR);
    } else {
      // Subsequent ATRs use the smoothing formula
      atr.push(((atr[atr.length - 1] * (period - 1)) + trueRanges[i]) / period);
    }
  }
  
  return atr;
}

// Calculate Stochastic Oscillator
export function calculateStochasticOscillator(
  closes: number[],
  highs: number[],
  lows: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number[], d: number[] } | null {
  if (closes.length < kPeriod) {
    return null;
  }
  
  const k: number[] = [];
  const d: number[] = [];
  
  // Fill with NaN for the first (kPeriod-1) positions
  for (let i = 0; i < kPeriod - 1; i++) {
    k.push(NaN);
  }
  
  // Calculate %K values
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const lookbackHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lookbackLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    
    // %K formula: 100 * (C - L14) / (H14 - L14)
    // where C is current close, L14 is lowest low of last 14 periods, H14 is highest high of last 14 periods
    if (lookbackHigh === lookbackLow) {
      k.push(100); // Avoid division by zero
    } else {
      const kValue = 100 * ((closes[i] - lookbackLow) / (lookbackHigh - lookbackLow));
      k.push(kValue);
    }
  }
  
  // Calculate %D values (SMA of %K)
  const dSMA = calculateSMA(k, dPeriod);
  
  return { k, d: dSMA };
}

// Calculate stoploss and target prices based on signal type and technical analysis
export function calculatePriceTargets(
  klineData: KlineData[],
  signalType: SignalType
): PriceTargets | null {
  if (signalType === 'NEUTRAL' || signalType === 'HOLD' || klineData.length < 20) {
    return null;
  }
  
  const currentPrice = klineData[klineData.length - 1].close;
  
  let stopLoss: number;
  let target1: number;
  let target2: number;
  let target3: number;
  let riskRewardRatio: number;
  
  const stopLossPercent = 0.02; // 2% as requested
  
  if (signalType === 'BUY') {
    // For buy signals: stopLoss is 2% below entry
    stopLoss = currentPrice * (1 - stopLossPercent);
    
    // Calculate targets based on risk multiple (using requested 1:1.5 risk-reward ratio)
    const riskAmount = currentPrice - stopLoss;
    target1 = currentPrice + (riskAmount * 1.5); // 1.5:1 risk:reward as requested
    target2 = currentPrice + (riskAmount * 2.0); // Extended target
    target3 = currentPrice + (riskAmount * 3.0); // Extended target
    
    riskRewardRatio = 1.5; // As per requirements
  } else {
    // For sell signals: stopLoss is 2% above entry
    stopLoss = currentPrice * (1 + stopLossPercent);
    
    // Calculate targets (downward for sell signals)
    const riskAmount = stopLoss - currentPrice;
    target1 = currentPrice - (riskAmount * 1.5); // 1.5:1 risk:reward as requested
    target2 = currentPrice - (riskAmount * 2.0); // Extended target
    target3 = currentPrice - (riskAmount * 3.0); // Extended target
    
    riskRewardRatio = 1.5; // As per requirements
  }
  
  return {
    entryPrice: currentPrice,
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    target1: parseFloat(target1.toFixed(2)),
    target2: parseFloat(target2.toFixed(2)),
    target3: parseFloat(target3.toFixed(2)),
    riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2))
  };
}

// Pattern recognition functions
function detectDoubleBottom(prices: number[]): PatternDetection | null {
  if (prices.length < 50) return null;
  
  // Get last 50 prices
  const recentPrices = prices.slice(-50);
  const lowestPoints: number[] = [];
  
  // Find local minimums
  for (let i = 2; i < recentPrices.length - 2; i++) {
    if (recentPrices[i] < recentPrices[i-1] && 
        recentPrices[i] < recentPrices[i-2] &&
        recentPrices[i] < recentPrices[i+1] && 
        recentPrices[i] < recentPrices[i+2]) {
      lowestPoints.push(i);
    }
  }
  
  // Need at least 2 bottoms with a peak in between
  if (lowestPoints.length < 2) return null;
  
  // Check for double bottom pattern (two similar lows with a peak in between)
  for (let i = 0; i < lowestPoints.length - 1; i++) {
    const firstBottom = lowestPoints[i];
    const secondBottom = lowestPoints[i+1];
    
    // The bottoms should be at least 10 bars apart
    if (secondBottom - firstBottom < 10) continue;
    
    // Check if bottoms are at similar price levels (within 2%)
    const firstPrice = recentPrices[firstBottom];
    const secondPrice = recentPrices[secondBottom];
    const priceDifference = Math.abs(firstPrice - secondPrice) / firstPrice;
    
    if (priceDifference <= 0.02) {
      // Find peak between the bottoms
      let peakPrice = -Infinity;
      for (let j = firstBottom + 1; j < secondBottom; j++) {
        if (recentPrices[j] > peakPrice) {
          peakPrice = recentPrices[j];
        }
      }
      
      // Peak should be significantly higher than bottoms
      if (peakPrice > firstPrice * 1.03 && peakPrice > secondPrice * 1.03) {
        // Check if price has moved up after the second bottom
        const currentPrice = recentPrices[recentPrices.length - 1];
        if (currentPrice > secondPrice) {
          return {
            name: 'Double Bottom',
            type: 'bullish',
            confidence: 70 + (30 * (1 - priceDifference * 50)), // Higher confidence for closer bottoms
            description: 'Double bottom pattern detected - potential reversal from downtrend to uptrend'
          };
        }
      }
    }
  }
  
  return null;
}

function detectDoubleTop(prices: number[]): PatternDetection | null {
  if (prices.length < 50) return null;
  
  // Get last 50 prices
  const recentPrices = prices.slice(-50);
  const highestPoints: number[] = [];
  
  // Find local maximums
  for (let i = 2; i < recentPrices.length - 2; i++) {
    if (recentPrices[i] > recentPrices[i-1] && 
        recentPrices[i] > recentPrices[i-2] &&
        recentPrices[i] > recentPrices[i+1] && 
        recentPrices[i] > recentPrices[i+2]) {
      highestPoints.push(i);
    }
  }
  
  // Need at least 2 tops with a trough in between
  if (highestPoints.length < 2) return null;
  
  // Check for double top pattern (two similar highs with a trough in between)
  for (let i = 0; i < highestPoints.length - 1; i++) {
    const firstTop = highestPoints[i];
    const secondTop = highestPoints[i+1];
    
    // The tops should be at least 10 bars apart
    if (secondTop - firstTop < 10) continue;
    
    // Check if tops are at similar price levels (within 2%)
    const firstPrice = recentPrices[firstTop];
    const secondPrice = recentPrices[secondTop];
    const priceDifference = Math.abs(firstPrice - secondPrice) / firstPrice;
    
    if (priceDifference <= 0.02) {
      // Find trough between the tops
      let troughPrice = Infinity;
      for (let j = firstTop + 1; j < secondTop; j++) {
        if (recentPrices[j] < troughPrice) {
          troughPrice = recentPrices[j];
        }
      }
      
      // Trough should be significantly lower than tops
      if (troughPrice < firstPrice * 0.97 && troughPrice < secondPrice * 0.97) {
        // Check if price has moved down after the second top
        const currentPrice = recentPrices[recentPrices.length - 1];
        if (currentPrice < secondPrice) {
          return {
            name: 'Double Top',
            type: 'bearish',
            confidence: 70 + (30 * (1 - priceDifference * 50)), // Higher confidence for closer tops
            description: 'Double top pattern detected - potential reversal from uptrend to downtrend'
          };
        }
      }
    }
  }
  
  return null;
}

function detectHeadAndShoulders(prices: number[]): PatternDetection | null {
  if (prices.length < 60) return null;
  
  // Get last 60 prices
  const recentPrices = prices.slice(-60);
  const highPoints: number[] = [];
  
  // Find local maximums
  for (let i = 2; i < recentPrices.length - 2; i++) {
    if (recentPrices[i] > recentPrices[i-1] && 
        recentPrices[i] > recentPrices[i-2] &&
        recentPrices[i] > recentPrices[i+1] && 
        recentPrices[i] > recentPrices[i+2]) {
      highPoints.push(i);
    }
  }
  
  // Need at least 3 peaks for head and shoulders
  if (highPoints.length < 3) return null;
  
  // Check for head and shoulders pattern
  for (let i = 0; i < highPoints.length - 2; i++) {
    const leftShoulder = highPoints[i];
    const head = highPoints[i+1];
    const rightShoulder = highPoints[i+2];
    
    // The head should be higher than both shoulders
    if (recentPrices[head] <= recentPrices[leftShoulder] || 
        recentPrices[head] <= recentPrices[rightShoulder]) {
      continue;
    }
    
    // The shoulders should be at similar heights (within 5%)
    const leftShoulderPrice = recentPrices[leftShoulder];
    const rightShoulderPrice = recentPrices[rightShoulder];
    const shoulderDifference = Math.abs(leftShoulderPrice - rightShoulderPrice) / leftShoulderPrice;
    
    if (shoulderDifference <= 0.05) {
      // Find the neckline (connect troughs between shoulders and head)
      let leftTrough = Infinity;
      for (let j = leftShoulder + 1; j < head; j++) {
        if (recentPrices[j] < leftTrough) {
          leftTrough = recentPrices[j];
        }
      }
      
      let rightTrough = Infinity;
      for (let j = head + 1; j < rightShoulder; j++) {
        if (recentPrices[j] < rightTrough) {
          rightTrough = recentPrices[j];
        }
      }
      
      // The troughs should be at similar levels to form a neckline
      const troughDifference = Math.abs(leftTrough - rightTrough) / leftTrough;
      
      if (troughDifference <= 0.03) {
        // Check if price has broken below the neckline after the right shoulder
        const necklineLevel = (leftTrough + rightTrough) / 2;
        const currentPrice = recentPrices[recentPrices.length - 1];
        
        if (currentPrice < necklineLevel) {
          return {
            name: 'Head and Shoulders',
            type: 'bearish',
            confidence: 80 - (shoulderDifference * 100) - (troughDifference * 100),
            description: 'Head and shoulders pattern detected - potential reversal from uptrend to downtrend'
          };
        }
      }
    }
  }
  
  return null;
}

function detectInvertedHeadAndShoulders(prices: number[]): PatternDetection | null {
  if (prices.length < 60) return null;
  
  // Get last 60 prices
  const recentPrices = prices.slice(-60);
  const lowPoints: number[] = [];
  
  // Find local minimums
  for (let i = 2; i < recentPrices.length - 2; i++) {
    if (recentPrices[i] < recentPrices[i-1] && 
        recentPrices[i] < recentPrices[i-2] &&
        recentPrices[i] < recentPrices[i+1] && 
        recentPrices[i] < recentPrices[i+2]) {
      lowPoints.push(i);
    }
  }
  
  // Need at least 3 lows for inverted head and shoulders
  if (lowPoints.length < 3) return null;
  
  // Check for inverted head and shoulders pattern
  for (let i = 0; i < lowPoints.length - 2; i++) {
    const leftShoulder = lowPoints[i];
    const head = lowPoints[i+1];
    const rightShoulder = lowPoints[i+2];
    
    // The head should be lower than both shoulders
    if (recentPrices[head] >= recentPrices[leftShoulder] || 
        recentPrices[head] >= recentPrices[rightShoulder]) {
      continue;
    }
    
    // The shoulders should be at similar heights (within 5%)
    const leftShoulderPrice = recentPrices[leftShoulder];
    const rightShoulderPrice = recentPrices[rightShoulder];
    const shoulderDifference = Math.abs(leftShoulderPrice - rightShoulderPrice) / leftShoulderPrice;
    
    if (shoulderDifference <= 0.05) {
      // Find the neckline (connect peaks between shoulders and head)
      let leftPeak = -Infinity;
      for (let j = leftShoulder + 1; j < head; j++) {
        if (recentPrices[j] > leftPeak) {
          leftPeak = recentPrices[j];
        }
      }
      
      let rightPeak = -Infinity;
      for (let j = head + 1; j < rightShoulder; j++) {
        if (recentPrices[j] > rightPeak) {
          rightPeak = recentPrices[j];
        }
      }
      
      // The peaks should be at similar levels to form a neckline
      const peakDifference = Math.abs(leftPeak - rightPeak) / leftPeak;
      
      if (peakDifference <= 0.03) {
        // Check if price has broken above the neckline after the right shoulder
        const necklineLevel = (leftPeak + rightPeak) / 2;
        const currentPrice = recentPrices[recentPrices.length - 1];
        
        if (currentPrice > necklineLevel) {
          return {
            name: 'Inverted Head and Shoulders',
            type: 'bullish',
            confidence: 80 - (shoulderDifference * 100) - (peakDifference * 100),
            description: 'Inverted head and shoulders pattern detected - potential reversal from downtrend to uptrend'
          };
        }
      }
    }
  }
  
  return null;
}

// Detect support and resistance levels
export function findSupportResistanceLevels(
  highs: number[], 
  lows: number[], 
  prices: number[]
) {
  // We'll use a simple algorithm based on local minima and maxima
  const supportLevels: number[] = [];
  const resistanceLevels: number[] = [];
  
  const lookbackPeriod = 5; // Number of candles to look back and forward
  const significance = 0.5; // % price difference to consider significant
  const currentPrice = prices[prices.length - 1];
  
  // Find local minima (support) and maxima (resistance)
  for (let i = lookbackPeriod; i < lows.length - lookbackPeriod; i++) {
    // Check for local minimum (support)
    let isLocalMin = true;
    for (let j = i - lookbackPeriod; j < i; j++) {
      if (lows[i] > lows[j]) {
        isLocalMin = false;
        break;
      }
    }
    for (let j = i + 1; j <= i + lookbackPeriod; j++) {
      if (lows[i] > lows[j]) {
        isLocalMin = false;
        break;
      }
    }
    
    if (isLocalMin) {
      supportLevels.push(lows[i]);
    }
    
    // Check for local maximum (resistance)
    let isLocalMax = true;
    for (let j = i - lookbackPeriod; j < i; j++) {
      if (highs[i] < highs[j]) {
        isLocalMax = false;
        break;
      }
    }
    for (let j = i + 1; j <= i + lookbackPeriod; j++) {
      if (highs[i] < highs[j]) {
        isLocalMax = false;
        break;
      }
    }
    
    if (isLocalMax) {
      resistanceLevels.push(highs[i]);
    }
  }
  
  // Group similar levels together (within significance %)
  const groupedSupport = groupSimilarLevels(supportLevels, significance);
  const groupedResistance = groupSimilarLevels(resistanceLevels, significance);
  
  // Sort levels by strength (frequency of touches)
  const sortedSupport = sortLevelsByStrength(groupedSupport);
  const sortedResistance = sortLevelsByStrength(groupedResistance);
  
  // Keep only the strongest few levels that are relevant to current price
  const relevantSupport = sortedSupport
    .filter(level => level < currentPrice) // Support must be below current price
    .slice(0, 3); // Keep top 3
  
  const relevantResistance = sortedResistance
    .filter(level => level > currentPrice) // Resistance must be above current price
    .slice(0, 3); // Keep top 3
  
  return {
    support: relevantSupport,
    resistance: relevantResistance
  };
}

// Helper function to group similar price levels
function groupSimilarLevels(levels: number[], significance: number): number[] {
  if (levels.length === 0) return [];
  
  // Sort levels
  const sortedLevels = [...levels].sort((a, b) => a - b);
  
  // Group similar levels
  const groups: number[][] = [];
  let currentGroup: number[] = [sortedLevels[0]];
  
  for (let i = 1; i < sortedLevels.length; i++) {
    const prevLevel = sortedLevels[i - 1];
    const currentLevel = sortedLevels[i];
    
    // If the levels are similar, add to the current group
    if ((Math.abs(currentLevel - prevLevel) / prevLevel) * 100 < significance) {
      currentGroup.push(currentLevel);
    } else {
      // Start a new group
      groups.push(currentGroup);
      currentGroup = [currentLevel];
    }
  }
  
  // Add the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  // Calculate average level for each group
  return groups.map(group => 
    group.reduce((sum, level) => sum + level, 0) / group.length
  );
}

// Helper function to sort levels by strength (frequency of occurrence)
function sortLevelsByStrength(levels: number[]): number[] {
  return levels.sort((a, b) => a - b);
}

// Generate signals based on technical indicators
export function generateSignals(klineData: KlineData[]): SignalSummary {
  // Extract prices
  const prices = klineData.map(candle => candle.close);
  const highs = klineData.map(candle => candle.high);
  const lows = klineData.map(candle => candle.low);
  const volumes = klineData.map(candle => candle.volume);
  
  if (prices.length < 30) {
    return {
      overallSignal: 'NEUTRAL',
      confidence: 0,
      signals: [{
        type: 'NEUTRAL',
        indicator: 'Insufficient Data',
        strength: 0,
        message: 'Not enough data to generate reliable signals'
      }],
      priceTargets: null,
      patterns: null
    };
  }
  
  const signals: TradingSignal[] = [];
  
  // 1. Calculate RSI
  const rsi = calculateRSI(prices);
  const currentRSI = rsi[rsi.length - 1];
  
  // 2. Calculate MACD
  const { macd, signal, histogram } = calculateMACD(prices);
  const currentMACD = macd[macd.length - 1];
  const currentSignal = signal[signal.length - 1];
  const currentHistogram = histogram[histogram.length - 1];
  const prevHistogram = histogram[histogram.length - 2];
  
  // 3. Calculate Bollinger Bands
  const bollingerBands = calculateBollingerBands(prices);
  const currentPrice = prices[prices.length - 1];
  const currentUpperBand = bollingerBands.upper[bollingerBands.upper.length - 1];
  const currentLowerBand = bollingerBands.lower[bollingerBands.lower.length - 1];
  const prevUpperBand = bollingerBands.upper[bollingerBands.upper.length - 2];
  const prevLowerBand = bollingerBands.lower[bollingerBands.lower.length - 2];
  
  // 4. Calculate Moving Averages
  const ema50 = calculateEMA(prices, 50);
  const sma200 = calculateSMA(prices, 200);
  const currentEMA50 = ema50[ema50.length - 1];
  const currentSMA200 = sma200[sma200.length - 1];
  
  // 5. Volume Analysis
  const avgVolume = volumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
  const currentVolume = volumes[volumes.length - 1];
  const isHighVolume = currentVolume > (avgVolume * 1.5);
  
  // 6. Check Bollinger Band contraction (low volatility)
  const currentBandWidth = currentUpperBand - currentLowerBand;
  const prevBandWidth = prevUpperBand - prevLowerBand;
  const isBBContracting = currentBandWidth < prevBandWidth;
  
  // Add volatility signal
  if (isBBContracting) {
    signals.push({
      type: 'HOLD',
      indicator: 'Volatility',
      strength: 80,
      message: 'Bollinger Bands contracting - low volatility period, avoid trading'
    });
  } else {
    signals.push({
      type: 'NEUTRAL',
      indicator: 'Volatility',
      strength: 40,
      message: 'Normal volatility conditions'
    });
  }
  
  // Add volume analysis signal
  if (isHighVolume) {
    signals.push({
      type: 'NEUTRAL',
      indicator: 'Volume',
      strength: 70,
      message: `High volume detected (${(currentVolume / avgVolume).toFixed(2)}x average)`
    });
  } else {
    signals.push({
      type: 'HOLD',
      indicator: 'Volume',
      strength: 60,
      message: 'Low volume - potential weak movement'
    });
  }
  
  // 7. Detect chart patterns
  const patterns: PatternDetection[] = [];
  
  const doubleBottom = detectDoubleBottom(prices);
  if (doubleBottom) patterns.push(doubleBottom);
  
  const doubleTop = detectDoubleTop(prices);
  if (doubleTop) patterns.push(doubleTop);
  
  const headAndShoulders = detectHeadAndShoulders(prices);
  if (headAndShoulders) patterns.push(headAndShoulders);
  
  const invertedHeadAndShoulders = detectInvertedHeadAndShoulders(prices);
  if (invertedHeadAndShoulders) patterns.push(invertedHeadAndShoulders);
  
  // Add pattern-based signals
  patterns.forEach(pattern => {
    if (pattern.type === 'bullish') {
      signals.push({
        type: 'BUY',
        indicator: 'Chart Pattern',
        strength: pattern.confidence,
        message: `${pattern.name}: ${pattern.description}`
      });
    } else if (pattern.type === 'bearish') {
      signals.push({
        type: 'SELL',
        indicator: 'Chart Pattern',
        strength: pattern.confidence,
        message: `${pattern.name}: ${pattern.description}`
      });
    }
  });
  
  // Check for BUY conditions per your strict rules
  if (currentRSI > 50 && currentMACD > currentSignal && !isBBContracting && isHighVolume) {
    signals.push({
      type: 'BUY',
      indicator: 'Combined Strategy',
      strength: 90,
      message: 'Strong buy signal: RSI > 50, MACD bullish, good volatility, high volume'
    });
  } 
  // Check for SELL conditions per your strict rules
  else if (currentRSI < 50 && currentMACD < currentSignal && !isBBContracting && isHighVolume) {
    signals.push({
      type: 'SELL',
      indicator: 'Combined Strategy',
      strength: 90,
      message: 'Strong sell signal: RSI < 50, MACD bearish, good volatility, high volume'
    });
  }
  
  // Add individual indicator signals for reference
  // RSI Signal
  if (!isNaN(currentRSI)) {
    if (currentRSI < 30) {
      signals.push({
        type: 'BUY',
        indicator: 'RSI',
        strength: 70,
        message: `RSI is oversold (${currentRSI.toFixed(2)})`
      });
    } else if (currentRSI > 70) {
      signals.push({
        type: 'SELL',
        indicator: 'RSI',
        strength: 70,
        message: `RSI is overbought (${currentRSI.toFixed(2)})`
      });
    } else if (currentRSI > 50) {
      signals.push({
        type: 'BUY',
        indicator: 'RSI',
        strength: 60,
        message: `RSI is bullish (${currentRSI.toFixed(2)})`
      });
    } else {
      signals.push({
        type: 'SELL',
        indicator: 'RSI',
        strength: 60,
        message: `RSI is bearish (${currentRSI.toFixed(2)})`
      });
    }
  }
  
  // MACD Signal
  if (!isNaN(currentMACD) && !isNaN(currentSignal)) {
    if (currentMACD > currentSignal) {
      signals.push({
        type: 'BUY',
        indicator: 'MACD',
        strength: 70,
        message: 'MACD line above signal line - bullish'
      });
    } else if (currentMACD < currentSignal) {
      signals.push({
        type: 'SELL',
        indicator: 'MACD',
        strength: 70,
        message: 'MACD line below signal line - bearish'
      });
    }
    
    // Check for MACD histogram reversal
    if (!isNaN(currentHistogram) && !isNaN(prevHistogram)) {
      if (prevHistogram < 0 && currentHistogram > 0) {
        signals.push({
          type: 'BUY',
          indicator: 'MACD Histogram',
          strength: 80,
          message: 'MACD histogram turned positive - momentum change'
        });
      } else if (prevHistogram > 0 && currentHistogram < 0) {
        signals.push({
          type: 'SELL',
          indicator: 'MACD Histogram',
          strength: 80,
          message: 'MACD histogram turned negative - momentum change'
        });
      }
    }
  }
  
  // Bollinger Bands Signal
  if (!isNaN(currentUpperBand) && !isNaN(currentLowerBand)) {
    if (currentPrice > currentUpperBand) {
      signals.push({
        type: 'SELL',
        indicator: 'Bollinger Bands',
        strength: 65,
        message: 'Price is above upper Bollinger Band - potentially overbought'
      });
    } else if (currentPrice < currentLowerBand) {
      signals.push({
        type: 'BUY',
        indicator: 'Bollinger Bands',
        strength: 65,
        message: 'Price is below lower Bollinger Band - potentially oversold'
      });
    }
  }
  
  // Moving Average Trend signals
  if (!isNaN(currentEMA50) && !isNaN(currentSMA200)) {
    if (currentPrice > currentEMA50 && currentEMA50 > currentSMA200) {
      signals.push({
        type: 'BUY',
        indicator: 'Trend Analysis',
        strength: 75,
        message: 'Strong uptrend: Price > EMA50 > SMA200'
      });
    } else if (currentPrice < currentEMA50 && currentEMA50 < currentSMA200) {
      signals.push({
        type: 'SELL',
        indicator: 'Trend Analysis',
        strength: 75,
        message: 'Strong downtrend: Price < EMA50 < SMA200'
      });
    }
  }
  
  // Aggregate signals to determine overall recommendation
  let buySignalStrength = 0;
  let sellSignalStrength = 0;
  let holdSignalStrength = 0;
  let totalStrength = 0;
  
  signals.forEach(signal => {
    if (signal.type === 'BUY') buySignalStrength += signal.strength;
    else if (signal.type === 'SELL') sellSignalStrength += signal.strength;
    else if (signal.type === 'HOLD') holdSignalStrength += signal.strength;
    totalStrength += signal.strength;
  });
  
  // Determine overall signal
  let overallSignal: SignalType = 'NEUTRAL';
  let confidence = 0;
  
  if (totalStrength > 0) {
    const buyRatio = buySignalStrength / totalStrength;
    const sellRatio = sellSignalStrength / totalStrength;
    const holdRatio = holdSignalStrength / totalStrength;
    
    // Emphasize combined strategy signals over individual indicators
    const combinedStrategySignal = signals.find(signal => signal.indicator === 'Combined Strategy');
    
    if (combinedStrategySignal) {
      overallSignal = combinedStrategySignal.type;
      confidence = combinedStrategySignal.strength;
    } 
    else if (holdRatio > 0.4) {
      // If we have significant hold signals (like low volatility), prioritize them
      overallSignal = 'HOLD';
      confidence = holdRatio * 100;
    }
    else if (buyRatio > 0.6) {
      overallSignal = 'BUY';
      confidence = buyRatio * 100;
    } else if (sellRatio > 0.6) {
      overallSignal = 'SELL';
      confidence = sellRatio * 100;
    } else {
      overallSignal = 'NEUTRAL';
      confidence = 50;
    }
  }
  
  // Calculate price targets based on the overall signal
  const priceTargets = calculatePriceTargets(klineData, overallSignal);
  
  return {
    overallSignal,
    confidence,
    signals,
    priceTargets,
    patterns: patterns.length > 0 ? patterns : null
  };
}
