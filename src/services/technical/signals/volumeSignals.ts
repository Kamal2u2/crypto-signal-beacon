
import { TradingSignal, IndicatorSignal } from '../types';

export const generateVolumeSignals = (
  vwap: number[],
  cmf: number[],
  volumes: number[],
  lastPrice: number,
  opens: number[],
  closes: number[]
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
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
  
  // Volume Surge Signal
  const lastVolume = volumes[volumes.length - 1];
  const sum = volumes.slice(-10).reduce((a, b) => a + b, 0);
  const avgVolume = sum / 10;
  
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
  
  return { signals, indicators };
};
