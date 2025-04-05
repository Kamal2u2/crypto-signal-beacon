
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
  
  // RSI Signal - Enhanced with divergence detection
  const lastRSI = rsi14[rsi14.length - 1];
  const prevRSI = rsi14[rsi14.length - 2];
  const rsiTrend = lastRSI - prevRSI;
  
  // Look for RSI divergence with price
  const rsiDivergence = detectRSIDivergence(rsi14);
  
  // Log RSI value for debugging
  console.log(`RSI current: ${lastRSI.toFixed(2)}, previous: ${prevRSI.toFixed(2)}, trend: ${rsiTrend > 0 ? 'up' : 'down'}`);
  
  if (rsiDivergence === 'bullish') {
    // Bullish divergence is a strong buy signal
    signals.push({
      indicator: 'RSI Divergence',
      type: 'BUY',
      message: 'Bullish RSI divergence detected, indicating potential trend reversal up.',
      strength: 5
    });
    indicators['RSI Divergence'] = { signal: 'BUY', weight: 5, confidence: 85 };
  } else if (rsiDivergence === 'bearish') {
    // Bearish divergence is a strong sell signal
    signals.push({
      indicator: 'RSI Divergence',
      type: 'SELL',
      message: 'Bearish RSI divergence detected, indicating potential trend reversal down.',
      strength: 5
    });
    indicators['RSI Divergence'] = { signal: 'SELL', weight: 5, confidence: 85 };
  }
  
  // More conservative RSI thresholds
  if (lastRSI < 30 && prevRSI <= lastRSI) {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'BUY',
      message: 'RSI below 30 and turning up, indicating potential oversold condition.',
      strength: 3
    });
    indicators['RSI Short-term'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (lastRSI > 70 && prevRSI >= lastRSI) {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'SELL',
      message: 'RSI above 70 and turning down, indicating potential overbought condition.',
      strength: 3
    });
    indicators['RSI Short-term'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastRSI > 60 && rsiTrend > 0) {
    // RSI approaching overbought and still rising
    signals.push({
      indicator: 'RSI Short-term',
      type: 'SELL',
      message: 'RSI above 60 and still rising, approaching overbought territory.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else if (lastRSI < 40 && rsiTrend < 0) {
    // RSI approaching oversold and still falling
    signals.push({
      indicator: 'RSI Short-term',
      type: 'BUY',
      message: 'RSI below 40 and still falling, approaching oversold territory.',
      strength: 2
    });
    indicators['RSI Short-term'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'RSI Short-term',
      type: 'NEUTRAL',
      message: 'RSI in neutral zone, no strong overbought or oversold signal.',
      strength: 1
    });
    indicators['RSI Short-term'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // MACD Signal - Enhanced with histogram analysis
  const lastMACD = macdResult.macd[macdResult.macd.length - 1];
  const lastSignal = macdResult.signal[macdResult.signal.length - 1];
  const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1];
  const prevHistogram = macdResult.histogram[macdResult.histogram.length - 2];
  const histogramDirection = lastHistogram - prevHistogram;
  
  // Analyze multiple histogram bars for trend strength
  const histogramTrend = analyzeHistogramTrend(macdResult.histogram);
  
  // Log MACD values for debugging
  console.log(`MACD: ${lastMACD.toFixed(4)}, Signal: ${lastSignal.toFixed(4)}, Histogram: ${lastHistogram.toFixed(4)}, Direction: ${histogramDirection > 0 ? 'up' : 'down'}, Trend: ${histogramTrend}`);
  
  const isMACDCrossover = lastMACD > lastSignal && macdResult.macd[macdResult.macd.length - 2] <= macdResult.signal[macdResult.signal.length - 2];
  const isMACDCrossunder = lastMACD < lastSignal && macdResult.macd[macdResult.macd.length - 2] >= macdResult.signal[macdResult.signal.length - 2];
  
  if (isMACDCrossover && histogramTrend === 'strong_positive') {
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD line crossed above signal line with strong histogram confirmation.',
      strength: 5 // Increased strength for confirmed signal
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 5, confidence: 80 };
  } else if (isMACDCrossover) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD line crossed above signal line, indicating potential bullish momentum.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (isMACDCrossunder && histogramTrend === 'strong_negative') {
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD line crossed below signal line with strong histogram confirmation.',
      strength: 5 // Increased strength for confirmed signal
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 5, confidence: 80 };
  } else if (isMACDCrossunder) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD line crossed below signal line, indicating potential bearish momentum.',
      strength: 3
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastMACD > lastSignal && histogramDirection > 0 && histogramTrend.includes('positive')) {
    // MACD above signal, histogram increasing and positive trend
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD above signal line with increasing histogram strength, bullish momentum strengthening.',
      strength: histogramTrend === 'strong_positive' ? 4 : 3
    });
    indicators['MACD Fast'] = { 
      signal: 'BUY', 
      weight: histogramTrend === 'strong_positive' ? 4 : 3, 
      confidence: histogramTrend === 'strong_positive' ? 75 : 65 
    };
  } else if (lastMACD < lastSignal && histogramDirection < 0 && histogramTrend.includes('negative')) {
    // MACD below signal, histogram decreasing and negative trend
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD below signal line with decreasing histogram strength, bearish momentum strengthening.',
      strength: histogramTrend === 'strong_negative' ? 4 : 3
    });
    indicators['MACD Fast'] = { 
      signal: 'SELL', 
      weight: histogramTrend === 'strong_negative' ? 4 : 3, 
      confidence: histogramTrend === 'strong_negative' ? 75 : 65 
    };
  } else if (lastHistogram > 0 && lastHistogram > prevHistogram) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'BUY',
      message: 'MACD histogram increasing in positive territory, bullish momentum continuing.',
      strength: 2
    });
    indicators['MACD Fast'] = { signal: 'BUY', weight: 2, confidence: 60 };
  } else if (lastHistogram < 0 && lastHistogram < prevHistogram) {
    signals.push({
      indicator: 'MACD Fast',
      type: 'SELL',
      message: 'MACD histogram decreasing in negative territory, bearish momentum continuing.',
      strength: 2
    });
    indicators['MACD Fast'] = { signal: 'SELL', weight: 2, confidence: 60 };
  } else {
    signals.push({
      indicator: 'MACD Fast',
      type: 'NEUTRAL',
      message: 'No clear MACD signal at this time.',
      strength: 1
    });
    indicators['MACD Fast'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  // Stochastic Signal - Enhanced with confirmation
  const lastK = stochastic.k[stochastic.k.length - 1];
  const lastD = stochastic.d[stochastic.d.length - 1];
  const prevK = stochastic.k[stochastic.k.length - 2];
  const prevD = stochastic.d[stochastic.d.length - 2];
  
  // Log Stochastic values for debugging
  console.log(`Stochastic %K: ${lastK.toFixed(2)}, %D: ${lastD.toFixed(2)}`);
  
  // Check if K-D relationship is confirming other signals
  const kDConfirmsBuy = lastK < 20 && lastK > lastD && prevK <= prevD;
  const kDConfirmsSell = lastK > 80 && lastK < lastD && prevK >= prevD;
  
  // Combine with RSI and MACD for more reliable signals
  const hasOtherBuySignals = indicators['RSI Short-term']?.signal === 'BUY' || 
                             indicators['MACD Fast']?.signal === 'BUY';
  const hasOtherSellSignals = indicators['RSI Short-term']?.signal === 'SELL' || 
                             indicators['MACD Fast']?.signal === 'SELL';
  
  if (kDConfirmsBuy && hasOtherBuySignals) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'BUY',
      message: 'Stochastic %K crossed above %D in oversold territory with confirmation from other indicators.',
      strength: 4 // Increased for multi-indicator confirmation
    });
    indicators['Stochastic Fast'] = { signal: 'BUY', weight: 4, confidence: 80 };
  } else if (kDConfirmsBuy) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'BUY',
      message: 'Stochastic %K crossed above %D in oversold territory.',
      strength: 3
    });
    indicators['Stochastic Fast'] = { signal: 'BUY', weight: 3, confidence: 70 };
  } else if (kDConfirmsSell && hasOtherSellSignals) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'SELL',
      message: 'Stochastic %K crossed below %D in overbought territory with confirmation from other indicators.',
      strength: 4 // Increased for multi-indicator confirmation
    });
    indicators['Stochastic Fast'] = { signal: 'SELL', weight: 4, confidence: 80 };
  } else if (kDConfirmsSell) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'SELL',
      message: 'Stochastic %K crossed below %D in overbought territory.',
      strength: 3
    });
    indicators['Stochastic Fast'] = { signal: 'SELL', weight: 3, confidence: 70 };
  } else if (lastK < 25 && lastK > prevK) {
    signals.push({
      indicator: 'Stochastic Fast',
      type: 'BUY',
      message: 'Stochastic in oversold territory and turning upward.',
      strength: 2
    });
    indicators['Stochastic Fast'] = { signal: 'BUY', weight: 2, confidence: 65 };
  } else if (lastK > 75 && lastK < prevK) {
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
      strength: 1
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

// Helper function to detect RSI divergence
function detectRSIDivergence(rsi: number[]): 'bullish' | 'bearish' | null {
  // Need at least 10 periods to detect divergence
  if (rsi.length < 10) return null;
  
  // Get last 10 periods
  const recentRSI = rsi.slice(-10);
  
  // Find local minimums and maximums
  const mins: number[] = [];
  const maxs: number[] = [];
  
  for (let i = 1; i < recentRSI.length - 1; i++) {
    if (recentRSI[i] < recentRSI[i-1] && recentRSI[i] < recentRSI[i+1]) {
      mins.push(i);
    }
    if (recentRSI[i] > recentRSI[i-1] && recentRSI[i] > recentRSI[i+1]) {
      maxs.push(i);
    }
  }
  
  // Check for bullish divergence (price makes lower lows but RSI makes higher lows)
  if (mins.length >= 2) {
    const lastMin = mins[mins.length - 1];
    const prevMin = mins[mins.length - 2];
    
    if (recentRSI[lastMin] > recentRSI[prevMin]) {
      return 'bullish';
    }
  }
  
  // Check for bearish divergence (price makes higher highs but RSI makes lower highs)
  if (maxs.length >= 2) {
    const lastMax = maxs[maxs.length - 1];
    const prevMax = maxs[maxs.length - 2];
    
    if (recentRSI[lastMax] < recentRSI[prevMax]) {
      return 'bearish';
    }
  }
  
  return null;
}

// Helper function to analyze histogram trend
function analyzeHistogramTrend(histogram: number[]): 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative' {
  // Need at least 6 periods
  if (histogram.length < 6) return 'neutral';
  
  const recent = histogram.slice(-6);
  let positiveCount = 0;
  let negativeCount = 0;
  let increasingCount = 0;
  let decreasingCount = 0;
  
  // Check values and directions
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] > 0) positiveCount++;
    if (recent[i] < 0) negativeCount++;
    if (recent[i] > recent[i-1]) increasingCount++;
    if (recent[i] < recent[i-1]) decreasingCount++;
  }
  
  // Determine trend
  if (positiveCount >= 4 && increasingCount >= 3) {
    return 'strong_positive';
  } else if (positiveCount >= 3) {
    return 'positive';
  } else if (negativeCount >= 4 && decreasingCount >= 3) {
    return 'strong_negative';
  } else if (negativeCount >= 3) {
    return 'negative';
  } else {
    return 'neutral';
  }
}
