
import { KlineData } from '@/services/market/types';
import { updateKlineData } from '@/services/binanceService';
import { generateSignals } from '@/services/technical/signals/generateSignals';

export const handleKlineUpdate = (
  newKline: KlineData,
  klineDataRef: React.MutableRefObject<KlineData[]>,
  setKlineData: (data: KlineData[]) => void,
  processNewSignal: (signals: any) => void
) => {
  // Update the global kline data cache
  updateKlineData(newKline);
  
  // Create a copy of the current data array
  const updatedData = [...klineDataRef.current];
  
  // Find if this kline already exists in our data
  const existingIndex = updatedData.findIndex(k => k.openTime === newKline.openTime);
  
  // For minor price updates to the current candle, don't trigger a full re-render
  if (existingIndex !== -1) {
    const existingKline = updatedData[existingIndex];
    // Reduced threshold to 0.03% to make signals more responsive
    const priceDiffPercent = Math.abs((existingKline.close - newKline.close) / existingKline.close) * 100;
    const isSignificantUpdate = priceDiffPercent >= 0.03;
    
    // Always update our reference data
    updatedData[existingIndex] = newKline;
    klineDataRef.current = updatedData;
    
    // Always generate signals to check for new ones
    const newSignals = generateSignals(updatedData);
    
    // Only trigger state update for significant changes
    if (isSignificantUpdate) {
      setKlineData(updatedData);
      processNewSignal(newSignals);
    } else {
      // For minor updates - still process signal if it's BUY/SELL with sufficient confidence
      if (newSignals && (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') && 
          newSignals.confidence >= 50) {
        processNewSignal(newSignals);
      }
    }
  } else {
    // Add new kline
    updatedData.push(newKline);
    // Limit array size to prevent memory issues
    if (updatedData.length > 1000) {
      updatedData.shift();
    }
    
    // Update refs and state
    klineDataRef.current = updatedData;
    setKlineData(updatedData);
    
    // Generate and process new signals
    const newSignals = generateSignals(updatedData);
    processNewSignal(newSignals);
  }
};
