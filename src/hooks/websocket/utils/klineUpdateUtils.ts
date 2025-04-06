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
    
    // Further reduced threshold to 0.02% to make signals more responsive
    const priceDiffPercent = Math.abs((existingKline.close - newKline.close) / existingKline.close) * 100;
    const isSignificantUpdate = priceDiffPercent >= 0.02;
    
    // Always update our reference data
    updatedData[existingIndex] = newKline;
    klineDataRef.current = updatedData;
    
    // Always generate signals to check for new ones
    const newSignals = generateSignals(updatedData);
    
    // More aggressively trigger UI updates for better responsiveness
    if (isSignificantUpdate) {
      setKlineData(updatedData);
      processNewSignal(newSignals);
    } else {
      // For minor updates - process ANY signal with sufficient confidence
      // Lowered the threshold to 45% and removed signal type restriction
      if (newSignals && newSignals.confidence >= 45) {
        processNewSignal(newSignals);
        
        // For visual updates on low confidence signals, update chart every ~10th update
        // This prevents chart flashing while still keeping it updated
        if (Math.random() < 0.1) {
          setKlineData(updatedData);
        }
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
