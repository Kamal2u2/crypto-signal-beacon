
import { SignalType, TradingSignal, IndicatorSignal } from '../types';

export const generateMovingAverageSignals = (
  ema9: number[],
  ema21: number[],
  sma50: number[]
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
  // Enhanced Moving Average Crossover Signal with confirmation
  const isMACrossover = ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                       ema9[ema9.length - 2] <= ema21[ema21.length - 2];
  const isMACrossunder = ema9[ema9.length - 1] < ema21[ema9.length - 1] && 
                        ema9[ema9.length - 2] >= ema21[ema21.length - 2];
  
  // Calculate deeper trend analysis - use 10 periods instead of 5
  const recentTrend = ema9.slice(-10).reduce((sum, val, i, arr) => {
    if (i === 0) return 0;
    return sum + (val - arr[i-1]);
  }, 0);
  
  // Calculate longer trend
  const longerTrend = sma50.slice(-20).reduce((sum, val, i, arr) => {
    if (i === 0) return 0;
    return sum + (val - arr[i-1]);
  }, 0);
  
  // Check for trend alignment
  const isAlignedBullish = recentTrend > 0 && longerTrend > 0;
  const isAlignedBearish = recentTrend < 0 && longerTrend < 0;
  
  // Enhanced crossover detection with trend confirmation
  if (isMACrossover && isAlignedBullish) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'BUY',
      message: 'Short-term EMA crossed above long-term EMA with aligned bullish trend.',
      strength: 5 // Increased strength for confirmed signal
    });
    indicators['EMA Cross'] = { signal: 'BUY', weight: 5, confidence: 80 }; // Increased weight and confidence
  } else if (isMACrossover && !isAlignedBullish) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'BUY',
      message: 'Short-term EMA crossed above long-term EMA, but trend alignment is weak.',
      strength: 2 // Reduced for non-aligned trends
    });
    indicators['EMA Cross'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else if (isMACrossunder && isAlignedBearish) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'SELL',
      message: 'Short-term EMA crossed below long-term EMA with aligned bearish trend.',
      strength: 5 // Increased strength for confirmed signal
    });
    indicators['EMA Cross'] = { signal: 'SELL', weight: 5, confidence: 80 }; // Increased weight and confidence
  } else if (isMACrossunder && !isAlignedBearish) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'SELL',
      message: 'Short-term EMA crossed below long-term EMA, but trend alignment is weak.',
      strength: 2 // Reduced for non-aligned trends
    });
    indicators['EMA Cross'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else {
    // Trend continuation - enhanced with stronger trend confirmation
    const lastEMA9 = ema9[ema9.length - 1];
    const lastEMA21 = ema21[ema21.length - 1];
    const prevEMA9 = ema9[ema9.length - 2];
    const prevEMA21 = ema21[ema21.length - 2];
    
    // Check for strengthening trend
    const isStrengtheningBull = lastEMA9 - lastEMA21 > prevEMA9 - prevEMA21 && lastEMA9 > lastEMA21;
    const isStrengtheningBear = lastEMA21 - lastEMA9 > prevEMA21 - prevEMA9 && lastEMA9 < lastEMA21;
    
    if (lastEMA9 > lastEMA21 * 1.015 && isStrengtheningBull) { // Increased threshold for stronger signal
      signals.push({
        indicator: 'EMA Cross',
        type: isAlignedBullish ? 'BUY' : 'HOLD', // Only BUY if trend alignment is bullish
        message: isAlignedBullish 
          ? 'Strong uptrend with strengthening EMA separation and trend alignment.'
          : 'Uptrend but without long-term trend confirmation.',
        strength: isAlignedBullish ? 4 : 2
      });
      indicators['EMA Cross'] = { 
        signal: isAlignedBullish ? 'BUY' : 'HOLD', 
        weight: isAlignedBullish ? 4 : 2, 
        confidence: isAlignedBullish ? 75 : 60
      };
    } else if (lastEMA9 < lastEMA21 * 0.985 && isStrengtheningBear) { // Increased threshold for stronger signal
      signals.push({
        indicator: 'EMA Cross',
        type: isAlignedBearish ? 'SELL' : 'HOLD', // Only SELL if trend alignment is bearish
        message: isAlignedBearish 
          ? 'Strong downtrend with strengthening EMA separation and trend alignment.' 
          : 'Downtrend but without long-term trend confirmation.',
        strength: isAlignedBearish ? 4 : 2
      });
      indicators['EMA Cross'] = { 
        signal: isAlignedBearish ? 'SELL' : 'HOLD', 
        weight: isAlignedBearish ? 4 : 2, 
        confidence: isAlignedBearish ? 75 : 60
      };
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
  
  // Trend Consistency - Enhanced with more strict requirements
  const emaConsistent = (ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] > sma50[sma50.length - 1]) || 
                       (ema9[ema9.length - 1] < ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] < sma50[sma50.length - 1]);
  
  // Check for stronger trend conditions
  const strongUptrend = ema9[ema9.length - 1] > ema21[ema21.length - 1] * 1.01 && 
                      ema21[ema21.length - 1] > sma50[sma50.length - 1] * 1.01 && 
                      isAlignedBullish;
                      
  const strongDowntrend = ema9[ema9.length - 1] < ema21[ema21.length - 1] * 0.99 && 
                        ema21[ema21.length - 1] < sma50[sma50.length - 1] * 0.99 && 
                        isAlignedBearish;
  
  // Calculate price change during trend
  const priceChange = (ema9[ema9.length - 1] - ema9[ema9.length - 10]) / ema9[ema9.length - 10] * 100;
  
  if (strongUptrend) {
    const strength = Math.abs(priceChange) > 2 ? 4 : 3; // Stronger signal if price change is significant
    signals.push({
      indicator: 'Trend Consistency',
      type: 'BUY',
      message: `Strong bullish trend with ${priceChange.toFixed(1)}% price change over 10 periods.`,
      strength
    });
    indicators['Trend Consistency'] = { signal: 'BUY', weight: strength, confidence: 75 + Math.min(10, Math.abs(priceChange)) };
  } else if (strongDowntrend) {
    const strength = Math.abs(priceChange) > 2 ? 4 : 3; // Stronger signal if price change is significant
    signals.push({
      indicator: 'Trend Consistency',
      type: 'SELL',
      message: `Strong bearish trend with ${priceChange.toFixed(1)}% price change over 10 periods.`,
      strength
    });
    indicators['Trend Consistency'] = { signal: 'SELL', weight: strength, confidence: 75 + Math.min(10, Math.abs(priceChange)) };
  } else if (emaConsistent) {
    const trendDirection = ema9[ema9.length - 1] > sma50[sma50.length - 1] ? 'BUY' : 'SELL';
    const isAligned = trendDirection === 'BUY' ? isAlignedBullish : isAlignedBearish;
    
    signals.push({
      indicator: 'Trend Consistency',
      type: trendDirection,
      message: `Moving averages aligned in ${trendDirection === 'BUY' ? 'bullish' : 'bearish'} direction with ${isAligned ? 'good' : 'weak'} trend confirmation.`,
      strength: isAligned ? 3 : 2
    });
    indicators['Trend Consistency'] = { 
      signal: trendDirection, 
      weight: isAligned ? 3 : 2, 
      confidence: isAligned ? 70 : 60 
    };
  } else {
    signals.push({
      indicator: 'Trend Consistency',
      type: 'NEUTRAL',
      message: 'Moving averages not aligned, mixed trend signals.',
      strength: 1
    });
    indicators['Trend Consistency'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  return { signals, indicators };
};
