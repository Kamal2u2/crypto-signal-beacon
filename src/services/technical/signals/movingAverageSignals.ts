
import { SignalType, TradingSignal, IndicatorSignal } from '../types';

export const generateMovingAverageSignals = (
  ema9: number[],
  ema21: number[],
  sma50: number[]
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
  // Moving Average Crossover Signal - Enhanced detection
  const isMACrossover = ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                       ema9[ema9.length - 2] <= ema21[ema21.length - 2];
  const isMACrossunder = ema9[ema9.length - 1] < ema21[ema9.length - 1] && 
                        ema9[ema9.length - 2] >= ema21[ema21.length - 2];
  
  // Recent trend direction
  const recentTrend = ema9.slice(-5).reduce((sum, val, i, arr) => {
    if (i === 0) return 0;
    return sum + (val - arr[i-1]);
  }, 0);
  
  if (isMACrossover) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'BUY',
      message: 'Short-term EMA crossed above long-term EMA, indicating potential uptrend.',
      strength: 4 // Increased from 3
    });
    indicators['EMA Cross'] = { signal: 'BUY', weight: 4, confidence: 75 }; // Increased weight and confidence
  } else if (isMACrossunder) {
    signals.push({
      indicator: 'EMA Cross',
      type: 'SELL',
      message: 'Short-term EMA crossed below long-term EMA, indicating potential downtrend.',
      strength: 4 // Increased from 3
    });
    indicators['EMA Cross'] = { signal: 'SELL', weight: 4, confidence: 75 }; // Increased weight and confidence
  } else {
    // Trend continuation - enhanced
    const lastEMA9 = ema9[ema9.length - 1];
    const lastEMA21 = ema21[ema21.length - 1];
    
    if (lastEMA9 > lastEMA21 * 1.01) { // Reduced from 1.02 to 1.01 for more sensitivity
      signals.push({
        indicator: 'EMA Cross',
        type: recentTrend > 0 ? 'BUY' : 'HOLD', // Use BUY if trend is up
        message: 'In an uptrend, short-term EMA above long-term EMA.',
        strength: 3
      });
      indicators['EMA Cross'] = { 
        signal: recentTrend > 0 ? 'BUY' : 'HOLD', 
        weight: 3, 
        confidence: 70 
      };
    } else if (lastEMA9 < lastEMA21 * 0.99) { // Increased from 0.98 to 0.99 for more sensitivity
      signals.push({
        indicator: 'EMA Cross',
        type: recentTrend < 0 ? 'SELL' : 'HOLD', // Use SELL if trend is down
        message: 'In a downtrend, short-term EMA below long-term EMA.',
        strength: 3
      });
      indicators['EMA Cross'] = { 
        signal: recentTrend < 0 ? 'SELL' : 'HOLD', 
        weight: 3, 
        confidence: 70 
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
  
  // Trend Consistency - Enhanced with more aggressive signals
  const emaConsistent = (ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] > sma50[sma50.length - 1]) || 
                       (ema9[ema9.length - 1] < ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] < sma50[sma50.length - 1]);
  
  const strongUptrend = ema9[ema9.length - 1] > ema21[ema21.length - 1] && 
                      ema21[ema21.length - 1] > sma50[sma50.length - 1] && 
                      recentTrend > 0;
                      
  const strongDowntrend = ema9[ema9.length - 1] < ema21[ema21.length - 1] && 
                        ema21[ema21.length - 1] < sma50[sma50.length - 1] && 
                        recentTrend < 0;
  
  if (strongUptrend) {
    signals.push({
      indicator: 'Trend Consistency',
      type: 'BUY', // Always BUY in strong uptrend
      message: 'All moving averages aligned in bullish direction with positive momentum.',
      strength: 3 // Increased from 2
    });
    indicators['Trend Consistency'] = { signal: 'BUY', weight: 3, confidence: 75 }; // Increased weight and confidence
  } else if (strongDowntrend) {
    signals.push({
      indicator: 'Trend Consistency',
      type: 'SELL', // Always SELL in strong downtrend
      message: 'All moving averages aligned in bearish direction with negative momentum.',
      strength: 3 // Increased from 2
    });
    indicators['Trend Consistency'] = { signal: 'SELL', weight: 3, confidence: 75 }; // Increased weight and confidence
  } else if (emaConsistent) {
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
      strength: 1 // Reduced from 2 to give less weight to NEUTRAL signals
    });
    indicators['Trend Consistency'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  return { signals, indicators };
};
