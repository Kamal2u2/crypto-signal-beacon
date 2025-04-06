
import { KlineData } from '../binanceService';
import { calculateATR } from './atr';
import { calculateSMA, calculateEMA } from './movingAverages';
import { calculateADX } from './trendIndicators';
import { calculateBollingerBands } from './bollingerBands';

export type MarketRegimeType = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'UNDEFINED';

export interface MarketRegimeAnalysis {
  regime: MarketRegimeType;
  strength: number; // 0-100, how strong the regime is
  direction: 'UP' | 'DOWN' | 'NEUTRAL'; // For trending markets
  volatility: number; // Normalized volatility level (0-100)
}

/**
 * Detects the current market regime based on multiple indicators
 * @param klineData Recent price data
 * @returns Market regime analysis
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
  
  // Calculate indicators for regime detection
  const adxResult = calculateADX(highs, lows, closes);
  const atr = calculateATR(klineData);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema10 = calculateEMA(closes, 10);
  const bbands = calculateBollingerBands(closes);
  
  // Get latest values - fixing the ADX access method
  const lastADX = adxResult.adx[adxResult.adx.length - 1];
  const lastATR = atr[atr.length - 1];
  const lastSMA20 = sma20[sma20.length - 1];
  const lastSMA50 = sma50[sma50.length - 1];
  const lastEMA10 = ema10[ema10.length - 1];
  const lastClose = closes[closes.length - 1];
  const lastBBWidth = (bbands.upper[bbands.upper.length - 1] - bbands.lower[bbands.lower.length - 1]) / bbands.middle[bbands.middle.length - 1];
  
  // Historical ATR for volatility normalization
  const atrAvg = atr.slice(-20).reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0) / 
                atr.slice(-20).filter(val => !isNaN(val)).length;
  const normalizedATR = lastATR / atrAvg;
  
  // Calculate price volatility relative to its average
  const volatilityLevel = Math.min(100, normalizedATR * 50);
  
  // Calculate BB squeeze - narrow bands indicate potential breakout
  const bbWidthHistory = [];
  for (let i = bbands.upper.length - 20; i < bbands.upper.length; i++) {
    if (!isNaN(bbands.upper[i]) && !isNaN(bbands.lower[i]) && !isNaN(bbands.middle[i]) && bbands.middle[i] !== 0) {
      bbWidthHistory.push((bbands.upper[i] - bbands.lower[i]) / bbands.middle[i]);
    }
  }
  const avgBBWidth = bbWidthHistory.reduce((sum, val) => sum + val, 0) / bbWidthHistory.length;
  const isBBSqueeze = lastBBWidth < avgBBWidth * 0.85;
  
  // Trend determination
  const trendStrength = Math.min(100, lastADX * 2);
  const isTrending = lastADX > 25; // ADX > 25 indicates trending market
  
  // Direction determination
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  if (lastSMA20 > lastSMA50 && lastClose > lastSMA20) {
    direction = 'UP';
  } else if (lastSMA20 < lastSMA50 && lastClose < lastSMA20) {
    direction = 'DOWN';
  } else if (lastClose > lastEMA10 && lastEMA10 > lastSMA20) {
    direction = 'UP';
  } else if (lastClose < lastEMA10 && lastEMA10 < lastSMA20) {
    direction = 'DOWN';
  }
  
  // Volatility conditions
  const isVolatile = volatilityLevel > 70;
  
  // Ranging market detection - price moving between levels with low ADX
  const isRanging = lastADX < 20 && !isBBSqueeze && !isVolatile;
  
  // Determine the regime
  let regime: MarketRegimeType = 'UNDEFINED';
  let strength = 0;
  
  if (isVolatile) {
    regime = 'VOLATILE';
    strength = volatilityLevel;
  } else if (isTrending) {
    regime = 'TRENDING';
    strength = trendStrength;
  } else if (isRanging) {
    regime = 'RANGING';
    strength = Math.min(100, 100 - trendStrength);
  } else {
    // Default case
    regime = lastADX > 15 ? 'TRENDING' : 'RANGING';
    strength = 50;
  }
  
  return {
    regime,
    strength,
    direction,
    volatility: volatilityLevel
  };
};

/**
 * Adjusts prediction confidence based on market regime
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
  
  switch (regime.regime) {
    case 'TRENDING':
      // In strong trends, boost trend-following signals
      if ((prediction === 'BUY' && regime.direction === 'UP') || 
          (prediction === 'SELL' && regime.direction === 'DOWN')) {
        // Boost confidence for signals aligned with trend
        adjustedConfidence = Math.min(100, confidence * (1 + regime.strength / 200));
      } else if ((prediction === 'BUY' && regime.direction === 'DOWN') || 
                (prediction === 'SELL' && regime.direction === 'UP')) {
        // Reduce confidence for signals against the trend
        adjustedConfidence = Math.max(0, confidence * (1 - regime.strength / 150));
      }
      break;
    
    case 'RANGING':
      // In ranging markets, reduce extreme signals and favor HOLD
      if (prediction === 'BUY' || prediction === 'SELL') {
        // Reduce confidence in strong buy/sell signals
        adjustedConfidence = Math.max(0, confidence * (1 - regime.strength / 150));
        
        // Convert to HOLD if confidence drops too low
        if (adjustedConfidence < 50 && regime.strength > 65) {
          adjustedPrediction = 'HOLD';
          adjustedConfidence = Math.min(100, 55 + regime.strength / 5);
        }
      } else if (prediction === 'HOLD') {
        // Increase hold signals in ranging markets
        adjustedConfidence = Math.min(100, confidence * (1 + regime.strength / 200));
      }
      break;
      
    case 'VOLATILE':
      // In volatile markets, reduce all signal confidence and favor caution
      adjustedConfidence = Math.max(0, confidence * (1 - regime.volatility / 150));
      
      // If very volatile, suggest holding
      if (regime.volatility > 85 && 
         (prediction === 'BUY' || prediction === 'SELL')) {
        adjustedPrediction = 'HOLD';
        adjustedConfidence = Math.min(100, 50 + regime.volatility / 5);
      }
      break;
  }
  
  return {
    prediction: adjustedPrediction,
    confidence: Math.round(adjustedConfidence)
  };
};
