
import { KlineData } from '../../binanceService';
import { SignalSummary, TradingSignal, IndicatorSignal } from '../types';
import { calculateSMA, calculateEMA } from '../movingAverages';
import { calculateRSI, calculateStochastic, calculateROC } from '../oscillators';
import { calculateMACD } from '../macd';
import { calculateBollingerBands } from '../bollingerBands';
import { calculateVWAP, calculateCMF } from '../volumeIndicators';
import { calculateADX, calculateMomentum, calculatePSAR } from '../trendIndicators';
import { findSupportResistanceLevels } from '../supportResistance';
import { calculateATR } from '../atr';
import { getOpens, computeSignalWeights, determineOverallSignal, calculatePriceTargets } from './signalUtils';
import { generateMovingAverageSignals } from './movingAverageSignals';
import { generateOscillatorSignals } from './oscillatorSignals';
import { generateVolatilitySignals } from './volatilitySignals';
import { generateVolumeSignals } from './volumeSignals';
import { generateSupportResistanceSignals } from './supportResistanceSignals';
import { getAIPrediction } from '../aiPrediction';
import { detectMarketRegime } from '../marketRegime';
import { analyzeMultipleTimeframes } from '../multitimeframe';

export const generateSignals = (klineData: KlineData[]): SignalSummary => {
  // Debug start time for performance tracking
  const startTime = performance.now();
  
  if (!klineData || klineData.length < 50) {
    console.log('Insufficient data for signal generation');
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
  
  console.log(`Analyzing price data. Current price: ${lastPrice}`);
  
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
  
  // Debug key indicator values
  console.log(`[INDICATORS] RSI: ${rsi14[rsi14.length-1].toFixed(2)}, MACD: ${macdResult.macd[macdResult.macd.length-1].toFixed(2)}`);
  console.log(`[INDICATORS] EMA9: ${ema9[ema9.length-1].toFixed(2)}, EMA21: ${ema21[ema21.length-1].toFixed(2)}, SMA50: ${sma50[sma50.length-1].toFixed(2)}`);
  
  // Generate individual signals
  let signals: TradingSignal[] = [];
  let indicators: { [key: string]: IndicatorSignal } = {};
  
  // Generate moving average signals
  const maSignals = generateMovingAverageSignals(ema9, ema21, sma50);
  signals = [...signals, ...maSignals.signals];
  indicators = { ...indicators, ...maSignals.indicators };
  
  // Generate oscillator signals
  const oscillatorSignals = generateOscillatorSignals(rsi14, stochastic, macdResult, momentum, roc);
  signals = [...signals, ...oscillatorSignals.signals];
  indicators = { ...indicators, ...oscillatorSignals.indicators };
  
  // Generate volatility signals
  const volatilitySignals = generateVolatilitySignals(bbands, closes, psar);
  signals = [...signals, ...volatilitySignals.signals];
  indicators = { ...indicators, ...volatilitySignals.indicators };
  
  // Generate volume-based signals
  const volumeSignals = generateVolumeSignals(vwap, cmf, volumes, lastPrice, opens, closes);
  signals = [...signals, ...volumeSignals.signals];
  indicators = { ...indicators, ...volumeSignals.indicators };
  
  // Generate support/resistance signals
  const srSignals = generateSupportResistanceSignals(supportResistance, lastPrice);
  signals = [...signals, ...srSignals.signals];
  indicators = { ...indicators, ...srSignals.indicators };
  
  // NEW: Add early detection signals for price movement anticipation
  const earlySignals = generateEarlyDetectionSignals(klineData, closes, volumes, rsi14, macdResult);
  signals = [...signals, ...earlySignals.signals];
  indicators = { ...indicators, ...earlySignals.indicators };
  
  // Get market regime for context
  const marketRegime = detectMarketRegime(klineData);
  signals.push({
    indicator: 'Market Regime',
    type: marketRegime.direction === 'UP' ? 'BUY' : marketRegime.direction === 'DOWN' ? 'SELL' : 'NEUTRAL',
    message: `Market is in ${marketRegime.regime.toLowerCase()} mode with ${marketRegime.strength}% strength.`,
    strength: 3
  });
  
  // Count signal types for debugging
  const signalCounts = {
    BUY: signals.filter(s => s.type === 'BUY').length,
    SELL: signals.filter(s => s.type === 'SELL').length,
    HOLD: signals.filter(s => s.type === 'HOLD').length,
    NEUTRAL: signals.filter(s => s.type === 'NEUTRAL').length
  };
  console.log(`Signal counts by type:`, signalCounts);
  
  // Get AI prediction and add it to signals with improved explanation
  const aiPrediction = getAIPrediction(klineData);
  
  // Create a more detailed explanation of the AI prediction
  let aiMessage = '';
  if (aiPrediction.explanation) {
    aiMessage = aiPrediction.explanation;
  } else if (Math.abs(aiPrediction.predictedChangePercent) < 0.2) {
    aiMessage = `AI predicts price will ${aiPrediction.shortTermPrediction === 'UP' ? 'increase slightly' : aiPrediction.shortTermPrediction === 'DOWN' ? 'decrease slightly' : 'remain stable'} short-term (${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}%) and ${aiPrediction.mediumTermPrediction === 'UP' ? 'increase' : aiPrediction.mediumTermPrediction === 'DOWN' ? 'decrease' : 'remain stable'} medium-term.`;
  } else {
    aiMessage = `AI predicts price will ${aiPrediction.shortTermPrediction === 'UP' ? 'increase' : aiPrediction.shortTermPrediction === 'DOWN' ? 'decrease' : 'remain stable'} short-term by ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% and ${aiPrediction.mediumTermPrediction === 'UP' ? 'continue rising' : aiPrediction.mediumTermPrediction === 'DOWN' ? 'continue falling' : 'stabilize'} medium-term.`;
  }
  
  // Add the AI model signal with higher strength to prioritize it more
  signals.push({
    indicator: 'AI Model',
    type: aiPrediction.prediction,
    message: aiMessage,
    strength: aiPrediction.confidence > 70 ? 6 : aiPrediction.confidence > 50 ? 5 : 4
  });
  
  // Add AI prediction to indicators with additional context
  indicators['aiModel'] = {
    signal: aiPrediction.prediction,
    weight: aiPrediction.confidence / 35, // Scale confidence to give AI more weight
    confidence: aiPrediction.confidence
  };
  
  // Get multi-timeframe alignment score
  if (klineData.length >= 200) {
    const mtfAnalysis = analyzeMultipleTimeframes(klineData);
    signals.push({
      indicator: 'Multi-Timeframe',
      type: mtfAnalysis.dominantSignal === 'UP' ? 'BUY' : mtfAnalysis.dominantSignal === 'DOWN' ? 'SELL' : 'NEUTRAL',
      message: `${mtfAnalysis.alignmentScore}% alignment across timeframes with dominant ${mtfAnalysis.dominantSignal.toLowerCase()} trend.`,
      strength: mtfAnalysis.alignmentScore > 70 ? 5 : 3
    });
    
    indicators['multiTimeframe'] = {
      signal: mtfAnalysis.dominantSignal === 'UP' ? 'BUY' : mtfAnalysis.dominantSignal === 'DOWN' ? 'SELL' : 'NEUTRAL',
      weight: mtfAnalysis.alignmentScore / 25, // Higher weight for strong alignment
      confidence: mtfAnalysis.weightedConfidence
    };
  }
  
  // Calculate signal weights - pass klineData for AI integration
  const weights = computeSignalWeights(indicators, klineData);
  
  // Determine overall signal
  const { overallSignal, confidence } = determineOverallSignal(weights);
  
  // Log signal weights for debugging
  console.log('Signal weights:', weights);

  // Log indicator details for debugging
  console.log('Indicator details:', indicators);

  // Combined Strategy Signal
  signals.unshift({
    indicator: 'Combined Strategy',
    type: overallSignal,
    message: `Overall signal based on technical indicators and AI prediction with ${confidence.toFixed(0)}% confidence.`,
    strength: 5
  });
  
  // Price targets
  const priceTargets = calculatePriceTargets(klineData, overallSignal);
  
  // Log the overall signal
  console.log(`Overall signal: ${overallSignal} with confidence: ${confidence.toFixed(2)}% (exec time: ${(performance.now() - startTime).toFixed(1)}ms)`);
  
  return {
    overallSignal,
    confidence,
    indicators,
    signals,
    priceTargets
  };
};

// NEW: Generate early detection signals for price movement anticipation
function generateEarlyDetectionSignals(
  klineData: KlineData[],
  closes: number[],
  volumes: number[],
  rsi: number[],
  macdResult: { macd: number[]; signal: number[]; histogram: number[] }
): { signals: TradingSignal[]; indicators: { [key: string]: IndicatorSignal } } {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
  // Check for bullish/bearish divergence
  const lastRSI = rsi[rsi.length - 1];
  const prevRSI = rsi[rsi.length - 2];
  const lastPrice = closes[closes.length - 1];
  const prevPrice = closes[closes.length - 2];
  
  // Check volume acceleration trend (3 periods)
  const volumeTrend = [];
  for (let i = volumes.length - 4; i < volumes.length - 1; i++) {
    volumeTrend.push(volumes[i+1] - volumes[i]);
  }
  
  const volumeAccelerating = volumeTrend.every((change, i, arr) => 
    i === 0 || Math.abs(change) > Math.abs(arr[i-1])
  );
  
  const volumeDirectionUp = volumes[volumes.length - 1] > volumes[volumes.length - 2];
  
  // Check for bullish divergence: price making lower lows but RSI making higher lows
  const priceDownRsiUp = lastPrice < prevPrice && lastRSI > prevRSI;
  if (priceDownRsiUp && lastRSI < 35) {
    signals.push({
      indicator: 'Early Detection',
      type: 'BUY',
      message: 'Potential bullish divergence detected - price falling while RSI rising.',
      strength: 4
    });
    
    indicators['earlyBullish'] = {
      signal: 'BUY',
      weight: 1.5,
      confidence: 65
    };
  }
  
  // Check for bearish divergence: price making higher highs but RSI making lower highs
  const priceUpRsiDown = lastPrice > prevPrice && lastRSI < prevRSI;
  if (priceUpRsiDown && lastRSI > 65) {
    signals.push({
      indicator: 'Early Detection',
      type: 'SELL',
      message: 'Potential bearish divergence detected - price rising while RSI falling.',
      strength: 4
    });
    
    indicators['earlyBearish'] = {
      signal: 'SELL',
      weight: 1.5,
      confidence: 65
    };
  }
  
  // Check for MACD crossover imminent (getting very close)
  const lastMACD = macdResult.macd[macdResult.macd.length - 1];
  const lastSignal = macdResult.signal[macdResult.signal.length - 1];
  const lastHist = macdResult.histogram[macdResult.histogram.length - 1];
  const prevHist = macdResult.histogram[macdResult.histogram.length - 2];
  
  // MACD about to cross signal line (buy signal imminent)
  if (lastMACD < lastSignal && lastHist > prevHist && Math.abs(lastMACD - lastSignal) < Math.abs(prevHist) * 0.5) {
    signals.push({
      indicator: 'Early MACD',
      type: 'BUY',
      message: 'MACD approaching signal from below - potential buy signal imminent.',
      strength: 4
    });
    
    indicators['earlyMACDBuy'] = {
      signal: 'BUY',
      weight: 1.2,
      confidence: 60
    };
  }
  
  // MACD about to cross signal line (sell signal imminent)
  if (lastMACD > lastSignal && lastHist < prevHist && Math.abs(lastMACD - lastSignal) < Math.abs(prevHist) * 0.5) {
    signals.push({
      indicator: 'Early MACD',
      type: 'SELL',
      message: 'MACD approaching signal from above - potential sell signal imminent.',
      strength: 4
    });
    
    indicators['earlyMACDSell'] = {
      signal: 'SELL', 
      weight: 1.2,
      confidence: 60
    };
  }
  
  // Check for volume-price relationship (accumulation/distribution)
  if (volumeAccelerating && volumeDirectionUp && priceDownRsiUp) {
    // Rising volume on price dip with improving RSI = accumulation
    signals.push({
      indicator: 'Volume Analysis',
      type: 'BUY',
      message: 'Rising volume on price dip suggests accumulation phase.',
      strength: 4
    });
    
    indicators['volumeAccumulation'] = {
      signal: 'BUY',
      weight: 1.4,
      confidence: 70
    };
  } else if (volumeAccelerating && volumeDirectionUp && priceUpRsiDown) {
    // Rising volume on price rise with weakening RSI = distribution
    signals.push({
      indicator: 'Volume Analysis',
      type: 'SELL',
      message: 'Rising volume on price rise with weakening momentum suggests distribution phase.',
      strength: 4
    });
    
    indicators['volumeDistribution'] = {
      signal: 'SELL',
      weight: 1.4,
      confidence: 70
    };
  }
  
  // Check for price velocity and acceleration
  if (klineData.length >= 5) {
    const recentPrices = closes.slice(-5);
    const deltas = [];
    for (let i = 1; i < recentPrices.length; i++) {
      deltas.push(recentPrices[i] - recentPrices[i-1]);
    }
    
    // Calculate second derivative (acceleration)
    const accelerations = [];
    for (let i = 1; i < deltas.length; i++) {
      accelerations.push(deltas[i] - deltas[i-1]);
    }
    
    // Check if price acceleration is increasing (positive and growing)
    const isAccelerationIncreasing = 
      accelerations.length >= 2 && 
      accelerations[accelerations.length - 1] > 0 && 
      accelerations[accelerations.length - 1] > accelerations[accelerations.length - 2];
    
    // Check if price acceleration is decreasing (negative and growing more negative)
    const isAccelerationDecreasing = 
      accelerations.length >= 2 && 
      accelerations[accelerations.length - 1] < 0 && 
      accelerations[accelerations.length - 1] < accelerations[accelerations.length - 2];
    
    if (isAccelerationIncreasing) {
      signals.push({
        indicator: 'Price Acceleration',
        type: 'BUY',
        message: 'Price momentum is accelerating positively - early trend indication.',
        strength: 4
      });
      
      indicators['priceAcceleration'] = {
        signal: 'BUY',
        weight: 1.3,
        confidence: 65
      };
    } else if (isAccelerationDecreasing) {
      signals.push({
        indicator: 'Price Acceleration',
        type: 'SELL',
        message: 'Price momentum is accelerating negatively - early trend indication.',
        strength: 4
      });
      
      indicators['priceAcceleration'] = {
        signal: 'SELL',
        weight: 1.3,
        confidence: 65
      };
    }
  }
  
  return { signals, indicators };
}
