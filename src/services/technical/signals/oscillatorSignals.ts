
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
  
  // RSI Signal - Enhanced sensitivity
  const lastRSI = rsi14[rsi14.length - 1];
  const prevRSI = rsi14[rsi14.length - 2];
  
  // Log RSI value for debugging
  console.log(`RSI current: ${lastRSI.toFixed(2)}, previous: ${prevRSI.toFixed(2)}`);
  
  // More sensitive RSI thresholds
  if (lastRSI < 35 && prevRSI <= lastRSI) { // Increased from 30 to 35
    signals.push({
      indicator: 'RSI Short-term',
      type: 'BUY',
      message: 'RSI below 35 and turning up, indicating potential oversold condition.',
      strength: 3 // Increased from 2
    });
    indicators['RSI Short-term'] = { signal: 'BUY', weight: 3, confidence: 70 }; // Increased weight and confidence
  } else if (lastRSI > 65 && prevRSI >= lastRSI) { // Decreased from 70 to 65
    signals.push({
      indicator: 'RSI Short-term',
      type: 'SELL',
      message: 'RSI above 65 and turning down, indicating potential overbought condition.',
      strength: 3 // Increased from 2
    });
    indicators['RSI Short-term'] = { signal: 'SELL', weight: 3, confidence: 70 }; // Increased weight and confidence
  } else if (lastRSI > 55) { // Added condition for moderate overbought
    signals.push({
      indicator: 'RSI Short-term',
      type: 'SELL',
      message: 'RSI above 55, approaching overbought territory.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else if (lastRSI < 45) { // Added condition for moderate oversold
    signals.push({
      indicator: 'RSI Short-term',
      type: 'BUY',
      message: 'RSI below 45, approaching oversold territory.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'NEUTRAL',
      message: 'RSI in neutral zone, no strong overbought or oversold signal.',
      strength: 1 // Reduced from 2 to give less weight to NEUTRAL signals
    });
    indicators['RSI Short-term'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // MACD Signal - Enhanced detection
  const lastMACD = macdResult.macd[macdResult.macd.length - 1];
  const lastSignal = macdResult.signal[macdResult.signal.length - 1];
  const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1];
  const prevHistogram = macdResult.histogram[macdResult.histogram.length - 2];
  const histogramDirection = lastHistogram - prevHistogram;
  
  // Log MACD values for debugging
  console.log(`MACD: ${lastMACD.toFixed(4)}, Signal: ${lastSignal.toFixed(4)}, Histogram: ${lastHistogram.toFixed(4)}, Direction: ${histogramDirection > 0 ? 'up' : 'down'}`);
  
  const isMACDCrossover = lastMACD > lastSignal && macdResult.macd[macdResult.macd.length - 2] <= macdResult.signal[macdResult.signal.length - 2];
  const isMACDCrossunder = lastMACD < lastSignal && macdResult.macd[macdResult.macd.length - 2] >= macdResult.signal[macdResult.signal.length - 2];
  
  if (isMACDCrossover) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD line crossed above signal line, indicating bullish momentum.',
      strength: 4 // Increased from 3
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 4, confidence: 75 }; // Increased weight and confidence
  } else if (isMACDCrossunder) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD line crossed below signal line, indicating bearish momentum.',
      strength: 4 // Increased from 3
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 4, confidence: 75 }; // Increased weight and confidence
  } else if (lastMACD > lastSignal && histogramDirection > 0) {
    // MACD above signal and histogram increasing (stronger bullish)
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD above signal line with increasing histogram, bullish momentum strengthening.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (lastMACD < lastSignal && histogramDirection < 0) {
    // MACD below signal and histogram decreasing (stronger bearish)
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD below signal line with decreasing histogram, bearish momentum strengthening.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastHistogram > 0 && lastHistogram > prevHistogram) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY', // Changed from HOLD to BUY for more responsiveness
      message: 'MACD histogram increasing in positive territory, bullish momentum continuing.',
      strength: 2
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 2, confidence: 65 };
  } else if (lastHistogram < 0 && lastHistogram < prevHistogram) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL', // Changed from HOLD to SELL for more responsiveness
      message: 'MACD histogram decreasing in negative territory, bearish momentum continuing.',
      strength: 2
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 2, confidence: 65 };
  } else {
    signals.push({
      indicator: 'MACD Fast',
      type: 'NEUTRAL',
      message: 'No clear MACD signal at this time.',
      strength: 1
    });
    indicators['MACD Fast'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // Stochastic Signal - Enhanced thresholds
  const lastK = stochastic.k[stochastic.k.length - 1];
  const lastD = stochastic.d[stochastic.d.length - 1];
  const prevK = stochastic.k[stochastic.k.length - 2];
  const prevD = stochastic.d[stochastic.d.length - 2];
  
  // Log Stochastic values for debugging
  console.log(`Stochastic %K: ${lastK.toFixed(2)}, %D: ${lastD.toFixed(2)}`);
  
  if (lastK < 25 && lastK > lastD && prevK <= prevD) { // Changed from 20 to 25
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'BUY',
      message: 'Stochastic %K crossed above %D in oversold territory.',
      strength: 3 // Increased from 2
    });
    indicators['Stochastic Fast'] = { signal: 'BUY', weight: 3, confidence: 70 }; // Increased weight and confidence
  } else if (lastK > 75 && lastK < lastD && prevK >= prevD) { // Changed from 80 to 75
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'SELL',
      message: 'Stochastic %K crossed below %D in overbought territory.',
      strength: 3 // Increased from 2
    });
    indicators['Stochastic Fast'] = { signal: 'SELL', weight: 3, confidence: 70 }; // Increased weight and confidence
  } else if (lastK < 30 && lastK > prevK) { // Added condition for oversold turning up
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'BUY',
      message: 'Stochastic in oversold territory and turning upward.',
      strength: 2
    });
    indicators['Stochastic Fast'] = { signal: 'BUY', weight: 2, confidence: 65 };
  } else if (lastK > 70 && lastK < prevK) { // Added condition for overbought turning down
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'SELL',
      message: 'Stochastic in overbought territory and turning downward.',
      strength: 2
    });
    indicators['Stochastic Fast'] = { signal: 'SELL', weight: 2, confidence: 65 };
  } else {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'NEUTRAL',
      message: 'No clear stochastic signal at this time.',
      strength: 1 // Reduced from 2
    });
    indicators['Stochastic Fast'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // Momentum Signal - Enhanced thresholds
  const lastMomentum = momentum[momentum.length - 1];
  
  // Log momentum value for debugging
  console.log(`Momentum: ${lastMomentum.toFixed(2)}`);
  
  if (lastMomentum > 3) { // Reduced from 5 to 3 for more sensitivity
    signals.push({
      indicator: 'Momentum',
      type: 'BUY',
      message: 'Strong positive momentum detected.',
      strength: 3 // Increased from 2
    });
    indicators['Momentum'] = { signal: 'BUY', weight: 3, confidence: 65 }; // Increased weight and confidence
  } else if (lastMomentum < -3) { // Changed from -5 to -3 for more sensitivity
    signals.push({
      indicator: 'Momentum',
      type: 'SELL',
      message: 'Strong negative momentum detected.',
      strength: 3 // Increased from 2
    });
    indicators['Momentum'] = { signal: 'SELL', weight: 3, confidence: 65 }; // Increased weight and confidence
  } else if (lastMomentum > 1) { // Added condition for moderate positive momentum
    signals.push({
      indicator: 'Momentum',
      type: 'BUY',
      message: 'Moderate positive momentum detected.',
      strength: 2
    });
    indicators['Momentum'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else if (lastMomentum < -1) { // Added condition for moderate negative momentum
    signals.push({
      indicator: 'Momentum',
      type: 'SELL',
      message: 'Moderate negative momentum detected.',
      strength: 2
    });
    indicators['Momentum'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'Momentum',
      type: 'NEUTRAL',
      message: 'Momentum is relatively flat.',
      strength: 1
    });
    indicators['Momentum'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // Rate of Change Signal - Enhanced thresholds
  const lastROC = roc[roc.length - 1];
  
  // Log ROC value for debugging
  console.log(`Rate of Change: ${lastROC.toFixed(2)}`);
  
  if (lastROC > 2) { // Reduced from 3 to 2 for more sensitivity
    signals.push({
      indicator: 'ROC',
      type: 'BUY',
      message: 'Rate of Change shows strong positive momentum.',
      strength: 2 // Increased from 1
    });
    indicators['ROC'] = { signal: 'BUY', weight: 2, confidence: 65 }; // Increased weight and confidence
  } else if (lastROC < -2) { // Changed from -3 to -2 for more sensitivity
    signals.push({
      indicator: 'ROC',
      type: 'SELL',
      message: 'Rate of Change shows strong negative momentum.',
      strength: 2 // Increased from 1
    });
    indicators['ROC'] = { signal: 'SELL', weight: 2, confidence: 65 }; // Increased weight and confidence
  } else if (lastROC > 0.5) { // Added condition for slight positive momentum
    signals.push({
      indicator: 'ROC',
      type: 'BUY',
      message: 'Rate of Change shows slight positive momentum.',
      strength: 1
    });
    indicators['ROC'] = { signal: 'BUY', weight: 1, confidence: 55 };
  } else if (lastROC < -0.5) { // Added condition for slight negative momentum
    signals.push({
      indicator: 'ROC',
      type: 'SELL',
      message: 'Rate of Change shows slight negative momentum.',
      strength: 1
    });
    indicators['ROC'] = { signal: 'SELL', weight: 1, confidence: 55 };
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
