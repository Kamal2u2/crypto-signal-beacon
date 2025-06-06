
import { useState, useCallback, useMemo } from 'react';
import { KlineData } from '@/services/binanceService';
import { SignalSummary, SignalType } from '@/services/technicalAnalysisService';
import { findSupportResistanceLevels } from '@/services/technical/supportResistance';

// Define types for the chart settings
interface ChartState {
  showVolume: boolean;
  showGrid: boolean;
  showMACD: boolean;
  showRSI: boolean;
  showLegend: boolean;
  candlesticks: boolean;
  darkMode: boolean;
  zoomLevel: number;
  showMA: boolean;
  showBollinger: boolean;
  showSupportResistance: boolean;
  showPriceLabels: boolean;
  showSignals: boolean; 
  showSignalHistory: boolean; // Added to toggle signal history visibility
}

// Define extended candle type with signal properties
interface ProcessedCandle extends KlineData {
  formattedTime?: string;
  signalType?: SignalType;
  signalConfidence?: number;
}

export const useChartData = (klineData: KlineData[], signalData?: SignalSummary | null, signalHistory?: Array<{type: SignalType, time: number, confidence: number}>) => {
  // State for chart settings
  const [chartState, setChartState] = useState<ChartState>({
    showVolume: true,
    showGrid: true,
    showMACD: false,
    showRSI: false,
    showLegend: true,
    candlesticks: true,
    darkMode: false,
    zoomLevel: 1,
    showMA: true,
    showBollinger: false,
    showSupportResistance: true,
    showPriceLabels: true,
    showSignals: true,
    showSignalHistory: true // Show signal history by default
  });

  // Generic function to toggle chart settings
  const toggleSetting = useCallback((setting: keyof ChartState) => {
    setChartState(prevState => ({
      ...prevState,
      [setting]: !prevState[setting],
    }));
  }, []);

  // Zoom In and Out Handlers
  const handleZoomIn = useCallback(() => {
    setChartState(prevState => ({
      ...prevState,
      zoomLevel: Math.min(prevState.zoomLevel + 0.1, 2), // Limit zoom level to 2
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setChartState(prevState => ({
      ...prevState,
      zoomLevel: Math.max(prevState.zoomLevel - 0.1, 0.5), // Limit zoom level to 0.5
    }));
  }, []);

  // Add state for manual price update
  const [manualCurrentPrice, setManualCurrentPrice] = useState<number | null>(null);

  // Update current price externally (for real-time updates)
  const updateCurrentPrice = useCallback((price: number) => {
    setManualCurrentPrice(price);
  }, []);

  // Calculate derived data using useMemo to avoid unnecessary recalculations
  const chartData = useMemo(() => {
    if (!klineData || klineData.length === 0) return [];
    
    // Deep copy the data to avoid mutations
    const processedData: ProcessedCandle[] = klineData.map(candle => {
      // Add formatted time for display
      const date = new Date(candle.openTime);
      const formattedTime = date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return {
        ...candle,
        formattedTime
      };
    });
    
    // Update the last candle with the latest price if available
    if (manualCurrentPrice !== null && processedData.length > 0) {
      const lastCandle = processedData[processedData.length - 1];
      // Only update close price if the manual price is more recent
      if (manualCurrentPrice !== lastCandle.close) {
        processedData[processedData.length - 1] = {
          ...lastCandle,
          close: manualCurrentPrice
        };
      }
    }
    
    // Mark candles that have signals
    if (signalHistory && chartState.showSignalHistory) {
      processedData.forEach(candle => {
        const candleTime = new Date(candle.openTime).getTime();
        // Find if any signal was generated at this candle's time
        const signal = signalHistory.find(s => 
          Math.abs(s.time - candleTime) < 60000 // Within 1 minute
        );
        
        if (signal) {
          candle.signalType = signal.type;
          candle.signalConfidence = signal.confidence;
        }
      });
    }
    
    return processedData;
  }, [klineData, manualCurrentPrice, signalHistory, chartState.showSignalHistory]);

  // Determine the Y-axis domain based on chart data
  const yDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 100] as [number, number]; // Default domain
    
    const prices = chartData.map(item => item.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05; // 5% padding
    
    return [minPrice - padding, maxPrice + padding] as [number, number];
  }, [chartData]);

  const supportResistanceLevels = useMemo(() => {
    if (!chartData || chartData.length === 0) return { support: [], resistance: [] };
    
    const highs = chartData.map(item => item.high);
    const lows = chartData.map(item => item.low);
    const closes = chartData.map(item => item.close);
    
    return findSupportResistanceLevels(highs, lows, closes);
  }, [chartData]);

  return {
    chartState,
    toggleSetting,
    handleZoomIn,
    handleZoomOut,
    chartData,
    yDomain,
    supportResistanceLevels,
    updateCurrentPrice
  };
};
