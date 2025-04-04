
import { TradingSignal, IndicatorSignal } from '../types';
import { calculateSMA } from '../movingAverages';

export const generateVolatilitySignals = (
  bbands: {upper: number[], middle: number[], lower: number[]},
  closes: number[],
  psar: {psar: number[], trend: ('up' | 'down')[]}
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
  // Bollinger Bands Squeeze
  const lastPrice = closes[closes.length - 1];
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
  
  return { signals, indicators };
};
