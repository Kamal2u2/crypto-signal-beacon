
import { TradingSignal, IndicatorSignal } from '../types';

export const generateSupportResistanceSignals = (
  supportResistance: { support: number[], resistance: number[] },
  lastPrice: number
): { signals: TradingSignal[], indicators: { [key: string]: IndicatorSignal } } => {
  const signals: TradingSignal[] = [];
  const indicators: { [key: string]: IndicatorSignal } = {};
  
  const { support, resistance } = supportResistance;
  
  if (support.length > 0 && resistance.length > 0) {
    const closestSupport = support.reduce((prev, curr) => 
      Math.abs(curr - lastPrice) < Math.abs(prev - lastPrice) ? curr : prev
    );
    
    const closestResistance = resistance.reduce((prev, curr) => 
      Math.abs(curr - lastPrice) < Math.abs(prev - lastPrice) ? curr : prev
    );
    
    const distanceToSupport = Math.abs(lastPrice - closestSupport) / lastPrice;
    const distanceToResistance = Math.abs(closestResistance - lastPrice) / lastPrice;
    
    if (distanceToSupport < 0.01 && lastPrice > closestSupport) { // Within 1% of support and above it
      signals.push({
        indicator: 'Support/Resistance',
        type: 'BUY',
        message: `Price bouncing off support at ${closestSupport.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'BUY', weight: 2, confidence: 65 };
    } else if (distanceToResistance < 0.01 && lastPrice < closestResistance) { // Within 1% of resistance and below it
      signals.push({
        indicator: 'Support/Resistance',
        type: 'SELL',
        message: `Price rejected at resistance of ${closestResistance.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'SELL', weight: 2, confidence: 65 };
    } else if (distanceToResistance < distanceToSupport) {
      signals.push({
        indicator: 'Support/Resistance',
        type: 'HOLD',
        message: `Price closer to resistance at ${closestResistance.toFixed(2)} than support at ${closestSupport.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'HOLD', weight: 2, confidence: 65 };
    } else {
      signals.push({
        indicator: 'Support/Resistance',
        type: 'HOLD',
        message: `Price closer to support at ${closestSupport.toFixed(2)} than resistance at ${closestResistance.toFixed(2)}.`,
        strength: 2
      });
      indicators['Support/Resistance'] = { signal: 'HOLD', weight: 2, confidence: 65 };
    }
  } else {
    signals.push({
      indicator: 'Support/Resistance',
      type: 'NEUTRAL',
      message: 'No clear support/resistance levels detected.',
      strength: 1
    });
    indicators['Support/Resistance'] = { signal: 'NEUTRAL', weight: 1, confidence: 50 };
  }
  
  return { signals, indicators };
};
