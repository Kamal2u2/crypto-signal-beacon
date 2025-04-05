
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
  
  // Count signal types for debugging
  const signalCounts = {
    BUY: signals.filter(s => s.type === 'BUY').length,
    SELL: signals.filter(s => s.type === 'SELL').length,
    HOLD: signals.filter(s => s.type === 'HOLD').length,
    NEUTRAL: signals.filter(s => s.type === 'NEUTRAL').length
  };
  console.log(`Signal counts by type:`, signalCounts);
  
  // Get AI prediction and add it to signals
  const aiPrediction = getAIPrediction(klineData);
  signals.push({
    indicator: 'AI Model',
    type: aiPrediction.prediction,
    message: `AI predicts price will ${aiPrediction.shortTermPrediction === 'UP' ? 'increase' : aiPrediction.shortTermPrediction === 'DOWN' ? 'decrease' : 'remain stable'} short-term (${aiPrediction.predictedChangePercent}%) and ${aiPrediction.mediumTermPrediction === 'UP' ? 'increase' : aiPrediction.mediumTermPrediction === 'DOWN' ? 'decrease' : 'remain stable'} medium-term.`,
    strength: aiPrediction.confidence > 70 ? 5 : aiPrediction.confidence > 50 ? 4 : 3
  });
  
  // Add AI prediction to indicators
  indicators['aiModel'] = {
    signal: aiPrediction.prediction,
    weight: aiPrediction.confidence / 40, // Scale confidence to reasonable weight
    confidence: aiPrediction.confidence
  };
  
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
