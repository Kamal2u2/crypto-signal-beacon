
import { KlineData } from '../binanceService';
import { calculateATR } from './atr';
import { calculateSMA, calculateEMA } from './movingAverages';
import { calculateADX } from './trendIndicators';
import { calculateBollingerBands } from './bollingerBands';
import { calculateRSI } from './oscillators';

export type MarketRegimeType = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'ACCUMULATION' | 'DISTRIBUTION' | 'UNDEFINED';

export interface MarketRegimeAnalysis {
  regime: MarketRegimeType;
  strength: number; // 0-100, how strong the regime is
  direction: 'UP' | 'DOWN' | 'NEUTRAL'; // For trending markets
  volatility: number; // Normalized volatility level (0-100)
  phase?: 'EARLY' | 'MIDDLE' | 'LATE'; // Market cycle phase
}

/**
 * Enhanced market regime detection with cycle phase recognition
 * @param klineData Recent price data
 * @returns Detailed market regime analysis
 */
export const detectMarketRegime = (klineData: KlineData[]): MarketRegimeAnalysis => {
  if (klineData.length < 50) {
    return {
      regime: 'UNDEFINED',
      strength: 0,
      direction: 'NEUTRAL',
      volatility: 0
    };
  }
  
  // Extract price data
  const closes = klineData.map(k => k.close);
  const highs = klineData.map(k => k.high);
  const lows = klineData.map(k => k.low);
  const volumes = klineData.map(k => k.volume);
  
  // Calculate indicators for regime detection
  const adxResult = calculateADX(highs, lows, closes);
  const atr = calculateATR(klineData);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema10 = calculateEMA(closes, 10);
  const ema21 = calculateEMA(closes, 21);
  const bbands = calculateBollingerBands(closes);
  const rsi = calculateRSI(closes, 14);
  
  // Get latest values
  const lastADX = adxResult.adx[adxResult.adx.length - 1];
  const lastATR = atr[atr.length - 1];
  const lastSMA20 = sma20[sma20.length - 1];
  const lastSMA50 = sma50[sma50.length - 1];
  const lastSMA200 = sma200[sma200.length - 1];
  const lastEMA10 = ema10[ema10.length - 1];
  const lastEMA21 = ema21[ema21.length - 1];
  const lastClose = closes[closes.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const lastBBWidth = (bbands.upper[bbands.upper.length - 1] - bbands.lower[bbands.lower.length - 1]) / bbands.middle[bbands.middle.length - 1];
  
  // Historical ATR for volatility normalization
  const atrAvg = atr.slice(-20).reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0) / 
                atr.slice(-20).filter(val => !isNaN(val)).length;
  const normalizedATR = lastATR / atrAvg;
  
  // Calculate price volatility relative to its average
  const volatilityLevel = Math.min(100, normalizedATR * 50);
  
  // Enhanced BB squeeze detection
  const bbWidthHistory = [];
  for (let i = bbands.upper.length - 20; i < bbands.upper.length; i++) {
    if (!isNaN(bbands.upper[i]) && !isNaN(bbands.lower[i]) && !isNaN(bbands.middle[i]) && bbands.middle[i] !== 0) {
      bbWidthHistory.push((bbands.upper[i] - bbands.lower[i]) / bbands.middle[i]);
    }
  }
  const avgBBWidth = bbWidthHistory.reduce((sum, val) => sum + val, 0) / bbWidthHistory.length;
  const isBBSqueeze = lastBBWidth < avgBBWidth * 0.85;
  
  // Volume analysis for accumulation/distribution
  const volumeSMA20 = calculateSMA(volumes, 20);
  const lastVolumeSMA = volumeSMA20[volumeSMA20.length - 1];
  const lastVolume = volumes[volumes.length - 1];
  const volumeIncreasing = lastVolume > lastVolumeSMA * 1.3;
  const volumeDecreasing = lastVolume < lastVolumeSMA * 0.7;
  
  // Price trend relative to major moving averages
  const priceAboveMA200 = lastClose > lastSMA200;
  const priceAboveMA50 = lastClose > lastSMA50;
  const priceAboveMA20 = lastClose > lastSMA20;
  const ma20AboveMA50 = lastSMA20 > lastSMA50;
  const ma50AboveMA200 = lastSMA50 > lastSMA200;
  
  // RSI conditions for trend strength and potential reversals
  const isOverbought = lastRSI > 70;
  const isOversold = lastRSI < 30;
  
  // Trend determination with more conditions
  const trendStrength = Math.min(100, lastADX * 2);
  const isTrending = lastADX > 25;
  
  // Direction determination with more sophistication
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  
  if (priceAboveMA50 && ma20AboveMA50 && lastClose > lastEMA10) {
    direction = 'UP';
  } else if (!priceAboveMA50 && !ma20AboveMA50 && lastClose < lastEMA10) {
    direction = 'DOWN';
  } else if (priceAboveMA20 && lastEMA10 > lastEMA21) {
    direction = 'UP';
  } else if (!priceAboveMA20 && lastEMA10 < lastEMA21) {
    direction = 'DOWN';
  }
  
  // Enhanced phase detection
  let phase: 'EARLY' | 'MIDDLE' | 'LATE' | undefined = undefined;
  
  if (direction === 'UP') {
    if (!ma50AboveMA200 && priceAboveMA50) {
      phase = 'EARLY'; // Early uptrend - price above MA50 but MA50 not yet above MA200
    } else if (ma50AboveMA200 && !isOverbought) {
      phase = 'MIDDLE'; // Middle of uptrend - established trend with MAs aligned
    } else if (ma50AboveMA200 && isOverbought) {
      phase = 'LATE'; // Late uptrend - potential exhaustion with overbought RSI
    }
  } else if (direction === 'DOWN') {
    if (ma50AboveMA200 && !priceAboveMA50) {
      phase = 'EARLY'; // Early downtrend - price below MA50 but MA50 still above MA200
    } else if (!ma50AboveMA200 && !isOversold) {
      phase = 'MIDDLE'; // Middle of downtrend - established trend with MAs aligned
    } else if (!ma50AboveMA200 && isOversold) {
      phase = 'LATE'; // Late downtrend - potential exhaustion with oversold RSI
    }
  }
  
  // Enhanced volatility, accumulation and distribution detection
  const isVolatile = volatilityLevel > 70;
  const isRanging = lastADX < 20 && !isBBSqueeze && !isVolatile;
  const isAccumulation = isRanging && volumeIncreasing && (isOversold || direction === 'UP' && phase === 'EARLY');
  const isDistribution = isRanging && volumeIncreasing && (isOverbought || direction === 'DOWN' && phase === 'EARLY');
  
  // Advanced regime determination
  let regime: MarketRegimeType = 'UNDEFINED';
  let strength = 0;
  
  if (isVolatile) {
    regime = 'VOLATILE';
    strength = volatilityLevel;
  } else if (isAccumulation) {
    regime = 'ACCUMULATION';
    strength = Math.min(100, 60 + (lastVolume/lastVolumeSMA - 1) * 50);
  } else if (isDistribution) {
    regime = 'DISTRIBUTION';
    strength = Math.min(100, 60 + (lastVolume/lastVolumeSMA - 1) * 50);
  } else if (isTrending) {
    regime = 'TRENDING';
    strength = trendStrength;
  } else if (isRanging) {
    regime = 'RANGING';
    strength = Math.min(100, 100 - trendStrength);
  } else {
    // Default case - more nuanced decision
    if (isBBSqueeze) {
      regime = 'RANGING'; // Pre-breakout squeeze
      strength = 70;
    } else {
      regime = lastADX > 15 ? 'TRENDING' : 'RANGING';
      strength = 50;
    }
  }
  
  return {
    regime,
    strength,
    direction,
    volatility: volatilityLevel,
    phase
  };
};

/**
 * More sophisticated prediction adjustment based on market regime and cycle phase
 * @param prediction Original prediction
 * @param confidence Original confidence
 * @param regime Current market regime analysis
 * @returns Adjusted prediction confidence
 */
export const adjustPredictionForRegime = (
  prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL',
  confidence: number,
  regime: MarketRegimeAnalysis
): { prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL', confidence: number } => {
  let adjustedConfidence = confidence;
  let adjustedPrediction = prediction;
  
  // Phase-aware adjustments
  const phaseMultiplier = getPhaseMultiplier(prediction, regime);
  
  switch (regime.regime) {
    case 'TRENDING':
      // In strong trends, boost trend-following signals
      if ((prediction === 'BUY' && regime.direction === 'UP') || 
          (prediction === 'SELL' && regime.direction === 'DOWN')) {
        // Boost confidence for signals aligned with trend
        adjustedConfidence = Math.min(100, confidence * (1 + regime.strength / 200) * phaseMultiplier);
      } else if ((prediction === 'BUY' && regime.direction === 'DOWN') || 
                (prediction === 'SELL' && regime.direction === 'UP')) {
        // Reduce confidence for signals against the trend
        adjustedConfidence = Math.max(0, confidence * (1 - regime.strength / 150) / phaseMultiplier);
        
        // In early phase of a trend, counter-trend signals are very risky
        if (regime.phase === 'EARLY') {
          adjustedConfidence = Math.max(0, adjustedConfidence * 0.7);
        }
      }
      break;
    
    case 'RANGING':
      // In ranging markets, moderately reduce extreme signals
      if (prediction === 'BUY' || prediction === 'SELL') {
        // Reduce confidence in strong buy/sell signals
        adjustedConfidence = Math.max(0, confidence * (1 - regime.strength / 180));
        
        // Convert to HOLD only if confidence drops very low
        if (adjustedConfidence < 40 && regime.strength > 75) {
          adjustedPrediction = 'HOLD';
          adjustedConfidence = Math.min(100, 52 + regime.strength / 5);
        }
      } else if (prediction === 'HOLD') {
        // Increase hold signals in ranging markets
        adjustedConfidence = Math.min(100, confidence * (1 + regime.strength / 220));
      }
      break;
      
    case 'ACCUMULATION':
      // In accumulation, favor BUY signals and boost their confidence
      if (prediction === 'BUY') {
        adjustedConfidence = Math.min(100, confidence * (1 + regime.strength / 150));
      } else if (prediction === 'SELL') {
        adjustedConfidence = Math.max(0, confidence * (1 - regime.strength / 140));
        
        // If strong accumulation and sell signal is weak, suggest holding instead
        if (regime.strength > 70 && adjustedConfidence < 60) {
          adjustedPrediction = 'HOLD';
          adjustedConfidence = 60;
        }
      }
      break;
      
    case 'DISTRIBUTION':
      // In distribution, favor SELL signals and boost their confidence
      if (prediction === 'SELL') {
        adjustedConfidence = Math.min(100, confidence * (1 + regime.strength / 150));
      } else if (prediction === 'BUY') {
        adjustedConfidence = Math.max(0, confidence * (1 - regime.strength / 140));
        
        // If strong distribution and buy signal is weak, suggest holding instead
        if (regime.strength > 70 && adjustedConfidence < 60) {
          adjustedPrediction = 'HOLD';
          adjustedConfidence = 60;
        }
      }
      break;
      
    case 'VOLATILE':
      // In volatile markets, reduce confidence more substantially
      adjustedConfidence = Math.max(0, confidence * (1 - regime.volatility / 130));
      
      // If extremely volatile, suggest holding regardless
      if (regime.volatility > 85 && 
         (prediction === 'BUY' || prediction === 'SELL')) {
        adjustedPrediction = 'HOLD';
        adjustedConfidence = Math.min(100, 50 + regime.volatility / 6);
      }
      break;
  }
  
  return {
    prediction: adjustedPrediction,
    confidence: Math.round(adjustedConfidence)
  };
};

/**
 * Helper function to determine phase-based adjustment multiplier
 */
function getPhaseMultiplier(
  prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL',
  regime: MarketRegimeAnalysis
): number {
  if (!regime.phase) return 1.0;
  
  switch (regime.phase) {
    case 'EARLY':
      // In early phase, boost aligned signals
      if ((prediction === 'BUY' && regime.direction === 'UP') ||
          (prediction === 'SELL' && regime.direction === 'DOWN')) {
        return 1.15; // Boost aligned signals in early phase
      }
      break;
    case 'MIDDLE':
      // Middle phase is most reliable for trend following
      if ((prediction === 'BUY' && regime.direction === 'UP') ||
          (prediction === 'SELL' && regime.direction === 'DOWN')) {
        return 1.2; // Stronger boost for middle phase
      }
      break;
    case 'LATE':
      // Late phase - reduce confidence in trend continuation
      if ((prediction === 'BUY' && regime.direction === 'UP') ||
          (prediction === 'SELL' && regime.direction === 'DOWN')) {
        return 0.9; // Slightly reduce confidence in late phase
      } else if ((prediction === 'SELL' && regime.direction === 'UP') ||
                (prediction === 'BUY' && regime.direction === 'DOWN')) {
        return 1.1; // Slightly boost counter-trend signals in late phase
      }
      break;
  }
  
  return 1.0; // Default multiplier
}
