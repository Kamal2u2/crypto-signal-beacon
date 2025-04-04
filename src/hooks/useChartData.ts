
import { useState, useMemo, useCallback, useRef } from 'react';
import { KlineData } from '@/services/binanceService';
import { SignalSummary } from '@/services/technicalAnalysisService';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands, 
  findSupportResistanceLevels 
} from '@/services/technicalAnalysisService';
import { formatXAxisTime } from '@/utils/chartFormatters';

export interface ChartState {
  showMA: boolean;
  showBollinger: boolean;
  showVolume: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showSupportResistance: boolean;
  showSignals: boolean;
  zoomLevel: number;
  showPriceLabels: boolean;
}

export const useChartData = (data: KlineData[], signalData?: SignalSummary | null) => {
  const [chartState, setChartState] = useState<ChartState>({
    showMA: false,
    showBollinger: false,
    showVolume: false,
    showRSI: false,
    showMACD: false,
    showSupportResistance: true,
    showSignals: true,
    zoomLevel: 100,
    showPriceLabels: true
  });

  // Track the previous data fingerprint to avoid unnecessary calculations
  const prevDataFingerprintRef = useRef<string>('');
  const prevChartStateRef = useRef<ChartState>(chartState);
  const cachedResultRef = useRef<any>({
    chartData: [],
    yDomain: [0, 1] as [number, number],
    supportResistanceLevels: { support: [], resistance: [] }
  });
  
  // Toggle chart settings
  const toggleSetting = useCallback((setting: keyof ChartState) => {
    setChartState(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  }, []);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    setChartState(prev => ({
      ...prev,
      zoomLevel: Math.max(10, prev.zoomLevel - 20)
    }));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setChartState(prev => ({
      ...prev,
      zoomLevel: Math.min(100, prev.zoomLevel + 20)
    }));
  }, []);

  // Create a data fingerprint for cache comparison
  const dataFingerprint = useMemo(() => {
    if (!data || data.length === 0) return 'empty';
    
    const lastCandle = data[data.length - 1];
    const signalString = signalData ? 
      `${signalData.overallSignal}-${signalData.confidence}` : 
      'no-signal';
    
    return `${data.length}-${lastCandle.close}-${lastCandle.high}-${lastCandle.low}-${signalString}-${chartState.zoomLevel}`;
  }, [data, signalData, chartState.zoomLevel]);

  // Memoized calculation of chart data
  const processedData = useMemo(() => {
    // Return cached results if data hasn't changed
    const chartStateChanged = JSON.stringify(chartState) !== JSON.stringify(prevChartStateRef.current);
    if (dataFingerprint === prevDataFingerprintRef.current && !chartStateChanged) {
      return cachedResultRef.current;
    }
    
    // Update refs with current values
    prevDataFingerprintRef.current = dataFingerprint;
    prevChartStateRef.current = { ...chartState };
    
    // Handle empty data case
    if (!data || data.length === 0) {
      const emptyResult = { 
        chartData: [], 
        yDomain: [0, 1] as [number, number], 
        supportResistanceLevels: { support: [], resistance: [] } 
      };
      cachedResultRef.current = emptyResult;
      return emptyResult;
    }
    
    // Extract data arrays for technical indicators
    const prices = data.map(item => item.close);
    const highs = data.map(item => item.high);
    const lows = data.map(item => item.low);
    
    // Calculate technical indicators only if needed
    let sma20: number[] = [];
    let ema50: number[] = [];
    let rsiData: number[] = [];
    let macdResult = { macd: [], signal: [], histogram: [] };
    let bollingerBands = { upper: [], middle: [], lower: [] };
    
    // Only calculate indicators that are actually being displayed
    if (chartState.showMA || chartState.showSignals) {
      sma20 = calculateSMA(prices, 20);
      ema50 = calculateEMA(prices, 50);
    }
    
    if (chartState.showRSI || chartState.showSignals) {
      rsiData = calculateRSI(prices);
    }
    
    if (chartState.showMACD || chartState.showSignals) {
      macdResult = calculateMACD(prices);
    }
    
    if (chartState.showBollinger || chartState.showSignals) {
      bollingerBands = calculateBollingerBands(prices);
    }
    
    // Find support/resistance levels if needed
    const supportResistanceLevels = chartState.showSupportResistance ? 
      findSupportResistanceLevels(highs, lows, prices) : 
      { support: [], resistance: [] };
    
    // Calculate volume normalization base
    const maxVolume = Math.max(...data.map(item => item.volume));
    
    // Apply zoom factor
    const zoomFactor = chartState.zoomLevel / 100;
    const dataLength = data.length;
    const visibleDataCount = Math.max(Math.floor(dataLength * zoomFactor), 10);
    const zoomedData = data.slice(Math.max(0, dataLength - visibleDataCount), dataLength);
    
    // Calculate y-axis domain based on visible data
    const padding = 0.002; // 0.2% padding
    let minPrice = Math.min(...zoomedData.map(item => item.low)) * (1 - padding);
    let maxPrice = Math.max(...zoomedData.map(item => item.high)) * (1 + padding);
    
    const yDomain: [number, number] = [minPrice, maxPrice];
    
    // Create enhanced chart data with all required properties
    const chartData = zoomedData.map((item, index) => {
      const dataIndex = Math.max(0, dataLength - visibleDataCount) + index;
      
      const enhancedData: any = {
        ...item,
        time: item.openTime,
        date: new Date(item.openTime),
        formattedTime: formatXAxisTime(item.openTime),
        normalizedVolume: maxVolume > 0 ? (item.volume / maxVolume) * 100 : 0,
        priceColor: item.close > item.open ? "#22c55e" : item.close < item.open ? "#ef4444" : "#8B5CF6",
        changePercent: item.open > 0 ? ((item.close - item.open) / item.open) * 100 : 0
      };
      
      // Only add technical indicators if they're being used
      if (chartState.showMA || chartState.showSignals) {
        enhancedData.sma20 = sma20[dataIndex];
        enhancedData.ema50 = ema50[dataIndex];
      }
      
      if (chartState.showRSI || chartState.showSignals) {
        enhancedData.rsi = rsiData[dataIndex];
      }
      
      if (chartState.showMACD || chartState.showSignals) {
        enhancedData.macd = macdResult.macd[dataIndex];
        enhancedData.signal = macdResult.signal[dataIndex];
        enhancedData.histogram = macdResult.histogram[dataIndex];
        enhancedData.histogramColor = macdResult.histogram[dataIndex] >= 0 ? "#22c55e" : "#ef4444";
      }
      
      if (chartState.showBollinger || chartState.showSignals) {
        enhancedData.upper = bollingerBands.upper[dataIndex];
        enhancedData.middle = bollingerBands.middle[dataIndex];
        enhancedData.lower = bollingerBands.lower[dataIndex];
      }
      
      return enhancedData;
    });

    // Map signals to chart data if available
    if (signalData && signalData.signals && chartState.showSignals) {
      const lastCandleTime = data[data.length - 1].openTime;
      if (signalData.overallSignal === 'BUY' || signalData.overallSignal === 'SELL') {
        // Add signal to the last candle
        const lastIndex = chartData.length - 1;
        if (lastIndex >= 0) {
          chartData[lastIndex].signalType = signalData.overallSignal;
        }
      }
    }

    // Cache and return the result
    const result = {
      chartData,
      yDomain,
      supportResistanceLevels
    };
    
    cachedResultRef.current = result;
    return result;
  }, [data, chartState, signalData, dataFingerprint]);

  return {
    chartState,
    toggleSetting,
    handleZoomIn,
    handleZoomOut,
    ...processedData
  };
};
