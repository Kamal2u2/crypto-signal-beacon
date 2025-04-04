
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

  // Use refs to track previous values to avoid unnecessary recalculations
  const lastDataLengthRef = useRef<number>(0);
  const lastSignalFingerprintRef = useRef<string | null>(null);
  const cachedResultRef = useRef<any>(null);
  
  // Create a fingerprint for the current data and signal state
  const currentFingerprint = useMemo(() => {
    const dataLength = data.length;
    const lastCandleFingerprint = dataLength > 0 
      ? `${data[dataLength - 1].close}-${data[dataLength - 1].high}-${data[dataLength - 1].low}`
      : '';
    
    const signalFingerprint = signalData 
      ? `${signalData.overallSignal}-${signalData.confidence}` 
      : 'no-signal';
      
    return `${dataLength}-${lastCandleFingerprint}-${signalFingerprint}-${chartState.zoomLevel}`;
  }, [data, signalData, chartState.zoomLevel]);

  const toggleSetting = useCallback((setting: keyof ChartState) => {
    setChartState(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  }, []);

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

  const processedData = useMemo(() => {
    // Use cache if nothing has changed
    if (currentFingerprint === lastSignalFingerprintRef.current && cachedResultRef.current) {
      return cachedResultRef.current;
    }
    
    lastSignalFingerprintRef.current = currentFingerprint;
    lastDataLengthRef.current = data.length;
    
    if (!data || data.length === 0) {
      const emptyResult = { 
        chartData: [], 
        yDomain: [0, 1] as [number, number], 
        supportResistanceLevels: { support: [], resistance: [] } 
      };
      cachedResultRef.current = emptyResult;
      return emptyResult;
    }
    
    const prices = data.map(item => item.close);
    const highs = data.map(item => item.high);
    const lows = data.map(item => item.low);
    const sma20 = calculateSMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    const rsiData = calculateRSI(prices);
    const macdResult = calculateMACD(prices);
    const bollingerBands = calculateBollingerBands(prices);
    
    const supportResistanceLevels = findSupportResistanceLevels(highs, lows, prices);
    const maxVolume = Math.max(...data.map(item => item.volume));
    
    const zoomFactor = chartState.zoomLevel / 100;
    const dataLength = data.length;
    const visibleDataCount = Math.max(Math.floor(dataLength * zoomFactor), 10);
    const zoomedData = data.slice(Math.max(0, dataLength - visibleDataCount), dataLength);
    
    let minPrice = Math.min(...zoomedData.map(item => item.low)) * 0.995;
    let maxPrice = Math.max(...zoomedData.map(item => item.high)) * 1.005;
    
    const yDomain: [number, number] = [minPrice, maxPrice];
    
    const chartData = zoomedData.map((item, index) => {
      const dataIndex = Math.max(0, dataLength - visibleDataCount) + index;
      
      const enhancedData: any = {
        ...item,
        time: item.openTime,
        date: new Date(item.openTime),
        formattedTime: formatXAxisTime(item.openTime),
        normalizedVolume: (item.volume / maxVolume) * 100,
        sma20: sma20[dataIndex],
        ema50: ema50[dataIndex],
        rsi: rsiData[dataIndex],
        macd: macdResult.macd[dataIndex],
        signal: macdResult.signal[dataIndex],
        histogram: macdResult.histogram[dataIndex],
        histogramColor: macdResult.histogram[dataIndex] >= 0 ? "#22c55e" : "#ef4444",
        upper: bollingerBands.upper[dataIndex],
        middle: bollingerBands.middle[dataIndex],
        lower: bollingerBands.lower[dataIndex],
        priceColor: item.close > item.open ? "#22c55e" : item.close < item.open ? "#ef4444" : "#8B5CF6",
        changePercent: item.open > 0 ? ((item.close - item.open) / item.open) * 100 : 0
      };
      
      return enhancedData;
    });

    let signalMap: { [key: string]: 'BUY' | 'SELL' } = {};
    
    if (signalData && signalData.signals) {
      const lastCandleTime = data[data.length - 1].openTime;
      if (signalData.overallSignal === 'BUY' || signalData.overallSignal === 'SELL') {
        signalMap[lastCandleTime.toString()] = signalData.overallSignal;
      }
    }

    const result = {
      chartData,
      yDomain,
      supportResistanceLevels,
      signalMap
    };
    
    cachedResultRef.current = result;
    return result;
  }, [data, chartState.zoomLevel, signalData, currentFingerprint]);

  return {
    chartState,
    toggleSetting,
    handleZoomIn,
    handleZoomOut,
    ...processedData
  };
};
