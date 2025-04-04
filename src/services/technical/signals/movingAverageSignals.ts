
import { SignalType, TradingSignal, IndicatorSignal } from '../types';

export const generateMovingAverageSignals = (
  ema9: number[],
  ema21: number[],
  sma50: number[]
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
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
  
  return { signals, indicators };
};
