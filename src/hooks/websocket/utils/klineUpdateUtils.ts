
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
  
  if (existingIndex !== -1) {
    // Update existing kline
    updatedData[existingIndex] = newKline;
  } else {
    // Add new kline
    updatedData.push(newKline);
    // Limit array size to prevent memory issues
    if (updatedData.length > 1000) {
      updatedData.shift();
    }
  }
  
  // Update refs and state
  klineDataRef.current = updatedData;
  setKlineData(updatedData);
  
  // Generate and process new signals
  const newSignals = generateSignals(updatedData);
  processNewSignal(newSignals);
};
