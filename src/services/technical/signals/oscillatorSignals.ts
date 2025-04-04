
import { SignalType, TradingSignal, IndicatorSignal } from '../types';

export const generateOscillatorSignals = (
  rsi14: number[],
  stochastic: { k: number[], d: number[] },
  macdResult: { macd: number[], signal: number[], histogram: number[] },
  momentum: number[],
  roc: number[]
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
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
  
  return { signals, indicators };
};
