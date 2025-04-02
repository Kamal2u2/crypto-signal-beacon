
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

// Interface for aggregated signals
export interface SignalSummary {
  overallSignal: SignalType;
  confidence: number;
  signals: TradingSignal[];
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

// Generate signals based on technical indicators
export function generateSignals(klineData: KlineData[]): SignalSummary {
  // Extract closing prices
  const prices = klineData.map(candle => candle.close);
  
  if (prices.length < 30) {
    return {
      overallSignal: 'NEUTRAL',
      confidence: 0,
      signals: [{
        type: 'NEUTRAL',
        indicator: 'Insufficient Data',
        strength: 0,
        message: 'Not enough data to generate reliable signals'
      }]
    };
  }
  
  const signals: TradingSignal[] = [];
  
  // 1. Moving Average Cross Signal
  const shortSMA = calculateSMA(prices, 10);
  const longSMA = calculateSMA(prices, 20);
  
  const currentShortSMA = shortSMA[shortSMA.length - 1];
  const prevShortSMA = shortSMA[shortSMA.length - 2];
  const currentLongSMA = longSMA[longSMA.length - 1];
  const prevLongSMA = longSMA[longSMA.length - 2];
  
  // Check for MA crossovers
  if (!isNaN(currentShortSMA) && !isNaN(prevShortSMA) && 
      !isNaN(currentLongSMA) && !isNaN(prevLongSMA)) {
        
    if (prevShortSMA <= prevLongSMA && currentShortSMA > currentLongSMA) {
      signals.push({
        type: 'BUY',
        indicator: 'MA Cross',
        strength: 75,
        message: 'Short-term MA crossed above long-term MA'
      });
    } else if (prevShortSMA >= prevLongSMA && currentShortSMA < currentLongSMA) {
      signals.push({
        type: 'SELL',
        indicator: 'MA Cross',
        strength: 75,
        message: 'Short-term MA crossed below long-term MA'
      });
    } else if (currentShortSMA > currentLongSMA) {
      signals.push({
        type: 'BUY',
        indicator: 'MA Position',
        strength: 60,
        message: 'Short-term MA above long-term MA'
      });
    } else {
      signals.push({
        type: 'SELL',
        indicator: 'MA Position',
        strength: 60,
        message: 'Short-term MA below long-term MA'
      });
    }
  }
  
  // 2. RSI Signal
  const rsi = calculateRSI(prices);
  const currentRSI = rsi[rsi.length - 1];
  
  if (!isNaN(currentRSI)) {
    if (currentRSI < 30) {
      signals.push({
        type: 'BUY',
        indicator: 'RSI',
        strength: 80,
        message: `RSI is oversold (${currentRSI.toFixed(2)})`
      });
    } else if (currentRSI > 70) {
      signals.push({
        type: 'SELL',
        indicator: 'RSI',
        strength: 80,
        message: `RSI is overbought (${currentRSI.toFixed(2)})`
      });
    } else {
      signals.push({
        type: 'HOLD',
        indicator: 'RSI',
        strength: 50,
        message: `RSI is neutral (${currentRSI.toFixed(2)})`
      });
    }
  }
  
  // 3. MACD Signal
  const { macd, signal, histogram } = calculateMACD(prices);
  const currentMACD = macd[macd.length - 1];
  const currentSignal = signal[signal.length - 1];
  const currentHistogram = histogram[histogram.length - 1];
  const prevHistogram = histogram[histogram.length - 2];
  
  if (!isNaN(currentMACD) && !isNaN(currentSignal)) {
    if (currentMACD > currentSignal) {
      signals.push({
        type: 'BUY',
        indicator: 'MACD',
        strength: 70,
        message: 'MACD line above signal line'
      });
    } else if (currentMACD < currentSignal) {
      signals.push({
        type: 'SELL',
        indicator: 'MACD',
        strength: 70,
        message: 'MACD line below signal line'
      });
    }
    
    // Check for MACD histogram reversal
    if (!isNaN(currentHistogram) && !isNaN(prevHistogram)) {
      if (prevHistogram < 0 && currentHistogram > 0) {
        signals.push({
          type: 'BUY',
          indicator: 'MACD Histogram',
          strength: 85,
          message: 'MACD histogram turned positive'
        });
      } else if (prevHistogram > 0 && currentHistogram < 0) {
        signals.push({
          type: 'SELL',
          indicator: 'MACD Histogram',
          strength: 85,
          message: 'MACD histogram turned negative'
        });
      }
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
    
    if (buyRatio > 0.6) {
      overallSignal = 'BUY';
      confidence = buyRatio * 100;
    } else if (sellRatio > 0.6) {
      overallSignal = 'SELL';
      confidence = sellRatio * 100;
    } else if (holdRatio > 0.6) {
      overallSignal = 'HOLD';
      confidence = holdRatio * 100;
    } else if (buyRatio > sellRatio && buyRatio > holdRatio) {
      overallSignal = 'BUY';
      confidence = buyRatio * 100;
    } else if (sellRatio > buyRatio && sellRatio > holdRatio) {
      overallSignal = 'SELL';
      confidence = sellRatio * 100;
    } else if (holdRatio > buyRatio && holdRatio > sellRatio) {
      overallSignal = 'HOLD';
      confidence = holdRatio * 100;
    } else {
      overallSignal = 'NEUTRAL';
      confidence = 50;
    }
  }
  
  return {
    overallSignal,
    confidence,
    signals
  };
}
