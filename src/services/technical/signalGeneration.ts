
import { KlineData } from '../binanceService';
import { SignalSummary, SignalType, TradingSignal, IndicatorSignal } from './types';
import { calculateSMA, calculateEMA } from './movingAverages';
import { calculateRSI, calculateStochastic, calculateROC } from './oscillators';
import { calculateMACD } from './macd';
import { calculateBollingerBands } from './bollingerBands';
import { calculateVWAP, calculateCMF } from './volumeIndicators';
import { calculateADX, calculateMomentum, calculatePSAR } from './trendIndicators';
import { findSupportResistanceLevels } from './supportResistance';
import { calculateATR } from './atr';

// Helper function to get opens from KlineData
const getOpens = (klineData: KlineData[]): number[] => {
  return klineData.map(item => item.open);
};

export const generateSignals = (klineData: KlineData[]): SignalSummary => {
  if (!klineData || klineData.length < 50) {
    return {
      overallSignal: 'NEUTRAL',
      confidence: 0,
      indicators: {},
      signals: []
    };
  }

  // Extract data arrays
  const closes = klineData.map(item => item.close);
  const highs = klineData.map(item => item.high);
  const lows = klineData.map(item => item.low);
  const volumes = klineData.map(item => item.volume);
  const opens = getOpens(klineData);
  const lastPrice = closes[closes.length - 1];
  
  // Calculate indicators
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const rsi14 = calculateRSI(closes, 14);
  const macdResult = calculateMACD(closes);
  const bbands = calculateBollingerBands(closes);
  const stochastic = calculateStochastic(highs, lows, closes);
  const vwap = calculateVWAP(highs, lows, closes, volumes);
  const adx = calculateADX(highs, lows, closes);
  const momentum = calculateMomentum(closes);
  const cmf = calculateCMF(highs, lows, closes, volumes);
  const psar = calculatePSAR(highs, lows);
  const roc = calculateROC(closes);
  
  const supportResistance = findSupportResistanceLevels(highs, lows, closes);
  
  // Generate individual signals
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
  // Moving Average Crossover Signal
  const isMACrossover = ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                       ema9[ema9.length - 2] <= ema21[ema21.length - 2];
  const isMACrossunder = ema9[ema9.length - 1] < ema21[ema9.length - 1] && 
                        ema9[ema9.length - 2] >= ema21[ema21.length - 2];
  
  if (isMACrossover) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'BUY',
      message: 'Short-term EMA crossed above long-term EMA, indicating potential uptrend.',
      strength: 3
    });
    indicators['EMA Cross'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (isMACrossunder) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'SELL',
      message: 'Short-term EMA crossed below long-term EMA, indicating potential downtrend.',
      strength: 3
    });
    indicators['EMA Cross'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else {
    // Trend continuation
    const lastEMA9 = ema9[ema9.length - 1];
    const lastEMA21 = ema21[ema21.length - 1];
    
    if (lastEMA9 > lastEMA21 * 1.02) { // Strong uptrend if short EMA 2% above long EMA
      signals.push({
        indicator: 'EMA Cross',
        type: 'HOLD',
        message: 'In a strong uptrend, short-term EMA well above long-term EMA.',
        strength: 3
      });
      indicators['EMA Cross'] = { signal: 'HOLD', weight: 3, confidence: 70 };
    } else if (lastEMA9 < lastEMA21 * 0.98) { // Strong downtrend if short EMA 2% below long EMA
      signals.push({
        indicator: 'EMA Cross',
        type: 'HOLD',
        message: 'In a strong downtrend, short-term EMA well below long-term EMA.',
        strength: 3
      });
      indicators['EMA Cross'] = { signal: 'HOLD', weight: 3, confidence: 70 };
    } else {
      signals.push({
        indicator: 'EMA Cross',
        type: 'NEUTRAL',
        message: 'No significant trend detected between short and long-term EMAs.',
        strength: 1
      });
      indicators['EMA Cross'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
    }
  }

  // RSI Signal
  const lastRSI = rsi14[rsi14.length - 1];
  const prevRSI = rsi14[rsi14.length - 2];
  
  if (lastRSI < 30 && prevRSI <= lastRSI) {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'BUY',
      message: 'RSI below 30 and turning up, indicating potential oversold condition.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'BUY', weight: 2, confidence: 65 };
  } else if (lastRSI > 70 && prevRSI >= lastRSI) {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'SELL',
      message: 'RSI above 70 and turning down, indicating potential overbought condition.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'SELL', weight: 2, confidence: 65 };
  } else {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'NEUTRAL',
      message: 'RSI in neutral zone, no strong overbought or oversold signal.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }
  
  // MACD Signal
  const lastMACD = macdResult.macd[macdResult.macd.length - 1];
  const lastSignal = macdResult.signal[macdResult.signal.length - 1];
  const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1];
  const prevHistogram = macdResult.histogram[macdResult.histogram.length - 2];
  
  const isMACDCrossover = lastMACD > lastSignal && macdResult.macd[macdResult.macd.length - 2] <= macdResult.signal[macdResult.signal.length - 2];
  const isMACDCrossunder = lastMACD < lastSignal && macdResult.macd[macdResult.macd.length - 2] >= macdResult.signal[macdResult.signal.length - 2];
  
  if (isMACDCrossover) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD line crossed above signal line, indicating bullish momentum.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 3, confidence: 65 };
  } else if (isMACDCrossunder) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD line crossed below signal line, indicating bearish momentum.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 3, confidence: 65 };
  } else if (lastHistogram > 0 && lastHistogram > prevHistogram) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'HOLD',
      message: 'MACD histogram increasing in positive territory, bullish momentum continuing.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else if (lastHistogram < 0 && lastHistogram < prevHistogram) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'HOLD',
      message: 'MACD histogram decreasing in negative territory, bearish momentum continuing.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'HOLD', weight: 3, confidence: 65 };
  } else {
    signals.push({
      indicator: 'MACD Fast',
      type: 'NEUTRAL',
      message: 'No clear MACD signal at this time.',
      strength: 1
    });
    indicators['MACD Fast'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }

  // Bollinger Bands Squeeze
  const lastUpper = bbands.upper[bbands.upper.length - 1];
  const lastLower = bbands.lower[bbands.lower.length - 1];
  const lastMid = bbands.middle[bbands.middle.length - 1];
  const bandWidth = (lastUpper - lastLower) / lastMid;
  const prevBandWidth = (bbands.upper[bbands.upper.length - 2] - bbands.lower[bbands.lower.length - 2]) / bbands.middle[bbands.middle.length - 2];
  
  const isSqueezing = bandWidth < prevBandWidth && bandWidth < 0.03; // 3% band width
  const isExpanding = bandWidth > prevBandWidth && bandWidth > 0.04; // 4% band width
  
  if (isSqueezing) {
    signals.push({
      indicator: 'BB Squeeze',
      type: 'NEUTRAL',
      message: 'Bollinger Bands squeezing, potential volatility ahead.',
      strength: 1
    });
    indicators['BB Squeeze'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  } else if (isExpanding && lastPrice > lastUpper) {
    signals.push({
      indicator: 'BB Squeeze',
      type: 'BUY',
      message: 'Price breaking above upper Bollinger Band with expanding volatility.',
      strength: 2
    });
    indicators['BB Squeeze'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else if (isExpanding && lastPrice < lastLower) {
    signals.push({
      indicator: 'BB Squeeze',
      type: 'SELL',
      message: 'Price breaking below lower Bollinger Band with expanding volatility.',
      strength: 2
    });
    indicators['BB Squeeze'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'BB Squeeze',
      type: 'NEUTRAL',
      message: 'Price within Bollinger Bands, no strong volatility signal.',
      strength: 1
    });
    indicators['BB Squeeze'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // Stochastic Signal
  const lastK = stochastic.k[stochastic.k.length - 1];
  const lastD = stochastic.d[stochastic.d.length - 1];
  const prevK = stochastic.k[stochastic.k.length - 2];
  const prevD = stochastic.d[stochastic.d.length - 2];
  
  if (lastK < 20 && lastK > lastD && prevK <= prevD) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'BUY',
      message: 'Stochastic %K crossed above %D in oversold territory.',
      strength: 2
    });
    indicators['Stochastic Fast'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else if (lastK > 80 && lastK < lastD && prevK >= prevD) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'SELL',
      message: 'Stochastic %K crossed below %D in overbought territory.',
      strength: 2
    });
    indicators['Stochastic Fast'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'NEUTRAL',
      message: 'No clear stochastic signal at this time.',
      strength: 2
    });
    indicators['Stochastic Fast'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }

  // Parabolic SAR Signal
  const lastPSAR = psar.psar[psar.psar.length - 1];
  const lastTrend = psar.trend[psar.trend.length - 1];
  const prevTrend = psar.trend[psar.trend.length - 2];
  
  if (lastTrend === 'up' && prevTrend === 'down') {
    signals.push({
      indicator: 'PSAR',
      type: 'BUY',
      message: 'Parabolic SAR flipped to bullish trend.',
      strength: 3
    });
    indicators['PSAR'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (lastTrend === 'down' && prevTrend === 'up') {
    signals.push({
      indicator: 'PSAR',
      type: 'SELL',
      message: 'Parabolic SAR flipped to bearish trend.',
      strength: 3
    });
    indicators['PSAR'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastTrend === 'up') {
    signals.push({
      indicator: 'PSAR',
      type: 'HOLD',
      message: 'Parabolic SAR confirms ongoing uptrend.',
      strength: 3
    });
    indicators['PSAR'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  } else if (lastTrend === 'down') {
    signals.push({
      indicator: 'PSAR',
      type: 'HOLD',
      message: 'Parabolic SAR confirms ongoing downtrend.',
      strength: 3
    });
    indicators['PSAR'] = { signal: 'HOLD', weight: 3, confidence: 70 };
  }

  // Momentum Signal
  const lastMomentum = momentum[momentum.length - 1];
  
  if (lastMomentum > 5) {
    signals.push({
      indicator: 'Momentum',
      type: 'BUY',
      message: 'Strong positive momentum detected.',
      strength: 2
    });
    indicators['Momentum'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else if (lastMomentum < -5) {
    signals.push({
      indicator: 'Momentum',
      type: 'SELL',
      message: 'Strong negative momentum detected.',
      strength: 2
    });
    indicators['Momentum'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'Momentum',
      type: 'NEUTRAL',
      message: 'Momentum is relatively flat.',
      strength: 2
    });
    indicators['Momentum'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }

  // Chaikin Money Flow Signal
  const lastCMF = cmf[cmf.length - 1];
  
  if (lastCMF > 0.1) {
    signals.push({
      indicator: 'CMF',
      type: 'BUY',
      message: 'Chaikin Money Flow shows strong buying pressure.',
      strength: 1
    });
    indicators['CMF'] = { signal: 'BUY', weight: 1, confidence: 60 };
  } else if (lastCMF < -0.1) {
    signals.push({
      indicator: 'CMF',
      type: 'SELL',
      message: 'Chaikin Money Flow shows strong selling pressure.',
      strength: 1
    });
    indicators['CMF'] = { signal: 'SELL', weight: 1, confidence: 60 };
  } else {
    signals.push({
      indicator: 'CMF',
      type: 'NEUTRAL',
      message: 'Chaikin Money Flow near neutral, no strong volume pressure.',
      strength: 1
    });
    indicators['CMF'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }

  // VWAP Signal
  const lastVWAP = vwap[vwap.length - 1];
  
  if (lastPrice > lastVWAP * 1.01) {
    signals.push({
      indicator: 'VWAP',
      type: 'BUY',
      message: 'Price trading significantly above VWAP, showing bullish strength.',
      strength: 4
    });
    indicators['VWAP'] = { signal: 'BUY', weight: 4, confidence: 80 };
  } else if (lastPrice < lastVWAP * 0.99) {
    signals.push({
      indicator: 'VWAP',
      type: 'SELL',
      message: 'Price trading significantly below VWAP, showing bearish pressure.',
      strength: 4
    });
    indicators['VWAP'] = { signal: 'SELL', weight: 4, confidence: 80 };
  } else {
    signals.push({
      indicator: 'VWAP',
      type: 'NEUTRAL',
      message: 'Price trading near VWAP, no strong directional bias.',
      strength: 1
    });
    indicators['VWAP'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }

  // Rate of Change Signal
  const lastROC = roc[roc.length - 1];
  
  if (lastROC > 3) {
    signals.push({
      indicator: 'ROC',
      type: 'BUY',
      message: 'Rate of Change shows strong positive momentum.',
      strength: 1
    });
    indicators['ROC'] = { signal: 'BUY', weight: 1, confidence: 60 };
  } else if (lastROC < -3) {
    signals.push({
      indicator: 'ROC',
      type: 'SELL',
      message: 'Rate of Change shows strong negative momentum.',
      strength: 1
    });
    indicators['ROC'] = { signal: 'SELL', weight: 1, confidence: 60 };
  } else {
    signals.push({
      indicator: 'ROC',
      type: 'NEUTRAL',
      message: 'Rate of Change indicates relatively stable price action.',
      strength: 1
    });
    indicators['ROC'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }

  // Support/Resistance Signal
  const { support, resistance } = supportResistance;
  
  if (support.length > 0 && resistance.length > 0) {
    const closestSupport = support.reduce((prev, curr) => 
      Math.abs(curr - lastPrice) < Math.abs(prev - lastPrice) ? curr : prev
    );
    
    const closestResistance = resistance.reduce((prev, curr) => 
      Math.abs(curr - lastPrice) < Math.abs(prev - lastPrice) ? curr : prev
    );
    
    const distanceToSupport = Math.abs(lastPrice - closestSupport) / lastPrice;
    const distanceToResistance = Math.abs(closestResistance - lastPrice) / lastPrice;
    
    if (distanceToSupport < 0.01 && lastPrice > closestSupport) { // Within 1% of support and above it
      signals.push({
        indicator: 'Support/Resistance',
        type: 'BUY',
        message: `Price bouncing off support at ${closestSupport.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'BUY', weight: 2, confidence: 65 };
    } else if (distanceToResistance < 0.01 && lastPrice < closestResistance) { // Within 1% of resistance and below it
      signals.push({
        indicator: 'Support/Resistance',
        type: 'SELL',
        message: `Price rejected at resistance of ${closestResistance.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'SELL', weight: 2, confidence: 65 };
    } else if (distanceToResistance < distanceToSupport) {
      signals.push({
        indicator: 'Support/Resistance',
        type: 'HOLD',
        message: `Price closer to resistance at ${closestResistance.toFixed(2)} than support at ${closestSupport.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'HOLD', weight: 2, confidence: 65 };
    } else {
      signals.push({
        indicator: 'Support/Resistance',
        type: 'HOLD',
        message: `Price closer to support at ${closestSupport.toFixed(2)} than resistance at ${closestResistance.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'HOLD', weight: 2, confidence: 65 };
    }
  } else {
    signals.push({
      indicator: 'Support/Resistance',
      type: 'NEUTRAL',
      message: 'No clear support/resistance levels detected.',
      strength: 1
    });
    indicators['Support/Resistance'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }

  // Volume Surge Signal
  const lastVolume = volumes[volumes.length - 1];
  const avgVolume = calculateSMA(volumes.slice(-10), 10)[0];
  
  if (lastVolume > avgVolume * 1.5 && closes[closes.length - 1] > opens[opens.length - 1]) {
    signals.push({
      indicator: 'Volume Surge',
      type: 'BUY',
      message: 'High volume bullish candle detected.',
      strength: 1
    });
    indicators['Volume Surge'] = { signal: 'BUY', weight: 1, confidence: 60 };
  } else if (lastVolume > avgVolume * 1.5 && closes[closes.length - 1] < opens[opens.length - 1]) {
    signals.push({
      indicator: 'Volume Surge',
      type: 'SELL',
      message: 'High volume bearish candle detected.',
      strength: 1
    });
    indicators['Volume Surge'] = { signal: 'SELL', weight: 1, confidence: 60 };
  } else {
    signals.push({
      indicator: 'Volume Surge',
      type: 'NEUTRAL',
      message: 'No significant volume surge detected.',
      strength: 1
    });
    indicators['Volume Surge'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }

  // Trend Consistency
  const emaConsistent = (ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] > sma50[sma50.length - 1]) || 
                       (ema9[ema9.length - 1] < ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] < sma50[sma50.length - 1]);
  
  if (emaConsistent) {
    const trendDirection = ema9[ema9.length - 1] > sma50[sma50.length - 1] ? 'BUY' : 'SELL';
    signals.push({
      indicator: 'Trend Consistency',
      type: trendDirection,
      message: `All moving averages aligned in ${trendDirection === 'BUY' ? 'bullish' : 'bearish'} direction.`,
      strength: 2
    });
    indicators['Trend Consistency'] = { signal: trendDirection, weight: 2, confidence: 70 };
  } else {
    signals.push({
      indicator: 'Trend Consistency',
      type: 'NEUTRAL',
      message: 'Moving averages not aligned, mixed trend signals.',
      strength: 2
    });
    indicators['Trend Consistency'] = { signal: 'NEUTRAL', weight: 2, confidence: 50 };
  }

  // Determine overall signal
  const buyWeight = sumSignalWeights(indicators, 'BUY');
  const sellWeight = sumSignalWeights(indicators, 'SELL');
  const holdWeight = sumSignalWeights(indicators, 'HOLD');
  const neutralWeight = sumSignalWeights(indicators, 'NEUTRAL');
  const totalWeight = buyWeight + sellWeight + holdWeight + neutralWeight;
  
  let overallSignal: SignalType;
  let confidence: number;
  
  if (buyWeight > sellWeight && buyWeight > holdWeight && buyWeight > 0.25 * totalWeight) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
  } else if (sellWeight > buyWeight && sellWeight > holdWeight && sellWeight > 0.25 * totalWeight) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
  } else if (holdWeight > 0.25 * totalWeight) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight, totalWeight);
  } else {
    overallSignal = 'NEUTRAL';
    confidence = calculateConfidence(neutralWeight, totalWeight);
  }
  
  // Log signal weights for debugging
  console.log('Signal weights:', {
    buyWeight,
    sellWeight,
    holdWeight,
    neutralWeight,
    totalWeight
  });

  // Log indicator details for debugging
  console.log('Indicator details:', indicators);

  // Combined Strategy Signal
  signals.unshift({
    indicator: 'Combined Strategy',
    type: overallSignal,
    message: `Overall signal based on multiple indicators with ${confidence.toFixed(0)}% confidence.`,
    strength: 5
  });
  
  // Price targets
  const priceTargets = calculatePriceTargets(klineData, overallSignal);
  
  // Log the overall signal
  console.log(`Overall signal: ${overallSignal} with confidence: ${confidence.toFixed(2)}`);
  
  return {
    overallSignal,
    confidence,
    indicators,
    signals,
    priceTargets
  };
};

// Helper function to sum weights for a given signal type
const sumSignalWeights = (indicators: { [key: string]: IndicatorSignal }, signalType: SignalType): number => {
  return Object.values(indicators)
    .filter(indicator => indicator.signal === signalType)
    .reduce((sum, indicator) => sum + indicator.weight, 0);
};

// Helper function to calculate confidence
const calculateConfidence = (signalWeight: number, totalWeight: number): number => {
  return Math.min(100, Math.round((signalWeight / totalWeight) * 100) + 30); // Base 30% + weighted contribution
};

// Calculate price targets based on ATR
const calculatePriceTargets = (klineData: KlineData[], signal: SignalType): {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
} | undefined => {
  if (signal !== 'BUY' && signal !== 'SELL') {
    return undefined;
  }
  
  const atr = calculateATR(klineData);
  const lastATR = atr[atr.length - 1];
  const lastPrice = klineData[klineData.length - 1].close;
  
  if (!lastATR || isNaN(lastATR)) {
    return undefined;
  }
  
  const isBuy = signal === 'BUY';
  const entryPrice = lastPrice;
  const stopLoss = isBuy ? entryPrice - (lastATR * 2) : entryPrice + (lastATR * 2);
  const riskAmount = Math.abs(entryPrice - stopLoss);
  
  const target1 = isBuy ? entryPrice + (riskAmount * 1.5) : entryPrice - (riskAmount * 1.5);
  const target2 = isBuy ? entryPrice + (riskAmount * 3) : entryPrice - (riskAmount * 3);
  const target3 = isBuy ? entryPrice + (riskAmount * 5) : entryPrice - (riskAmount * 5);
  
  const riskRewardRatio = 3.0; // Average of the three targets
  
  return {
    entryPrice,
    stopLoss,
    target1,
    target2,
    target3,
    riskRewardRatio
  };
};
