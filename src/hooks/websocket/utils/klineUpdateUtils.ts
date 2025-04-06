
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
    // Only update if there's a meaningful price change (0.1% or more)
    const priceDiffPercent = Math.abs((existingKline.close - newKline.close) / existingKline.close) * 100;
    const isSignificantUpdate = priceDiffPercent >= 0.1;
    
    // Always update our reference data
    updatedData[existingIndex] = newKline;
    klineDataRef.current = updatedData;
    
    // Only trigger state update for significant changes
    if (isSignificantUpdate) {
      setKlineData(updatedData);
      
      // Generate and process new signals
      const newSignals = generateSignals(updatedData);
      processNewSignal(newSignals);
    } else {
      // Minor update - still generate signals but don't update UI
      const newSignals = generateSignals(updatedData);
      
      // Only process if there's an actionable BUY/SELL signal
      if (newSignals && (newSignals.signal === 'BUY' || newSignals.signal === 'SELL')) {
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
