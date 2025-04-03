import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ComposedChart, Line, Legend, ReferenceLine, Scatter } from 'recharts';
import { KlineData } from '@/services/binanceService';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, BarChart3, Clock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, findSupportResistanceLevels } from '@/services/technicalAnalysisService';
import { SignalSummary, TradingSignal } from '@/services/technicalAnalysisService';
import { Badge } from '@/components/ui/badge';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
  signalData?: SignalSummary | null;
  backtestMode?: boolean;
  backtestResults?: BacktestResults | null;
}

export interface BacktestResults {
  signals: BacktestSignal[];
  performance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    netProfit: number;
    maxDrawdown: number;
    averageProfit: number;
    averageLoss: number;
  };
}

export interface BacktestSignal {
  time: number;
  price: number;
  type: 'BUY' | 'SELL';
  exitTime?: number;
  exitPrice?: number;
  profit?: number;
  profitPercent?: number;
  outcome?: 'WIN' | 'LOSS' | 'OPEN';
  exitReason?: string;
}

const formatXAxisTime = (time: number): string => {
  const date = new Date(time);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTooltipTime = (time: number): string => {
  const date = new Date(time);
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
};

const PriceChart: React.FC<PriceChartProps> = ({ 
  data, 
  isPending, 
  symbol, 
  signalData, 
  backtestMode = false,
  backtestResults = null
}) => {
  const [showMA, setShowMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  if (isPending) {
    return (
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Skeleton className="w-full h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32">
            <InfoIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-600">No data available</p>
            <p className="text-sm text-gray-500 mt-1">Waiting for data...</p>
          </div>
        </CardContent>
      </Card>
    );
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
  
  const zoomFactor = zoomLevel / 100;
  const dataLength = data.length;
  const visibleDataCount = Math.max(Math.floor(dataLength * zoomFactor), 10);
  const zoomedData = data.slice(Math.max(0, dataLength - visibleDataCount), dataLength);
  
  let minPrice = Math.min(...zoomedData.map(item => item.low)) * 0.995;
  let maxPrice = Math.max(...zoomedData.map(item => item.high)) * 1.005;
  
  const yDomain = [minPrice, maxPrice];
  
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
      lower: bollingerBands.lower[dataIndex]
    };
    
    return enhancedData;
  });

  let signalMap: { [key: string]: 'BUY' | 'SELL' } = {};
  
  if (signalData && signalData.signals && !backtestMode) {
    const lastCandleTime = data[data.length - 1].openTime;
    if (signalData.overallSignal === 'BUY' || signalData.overallSignal === 'SELL') {
      signalMap[lastCandleTime.toString()] = signalData.overallSignal;
    }
  }
  
  if (backtestMode && backtestResults && backtestResults.signals) {
    backtestResults.signals.forEach(signal => {
      signalMap[signal.time.toString()] = signal.type;
    });
  }

  const signalPoints = Object.keys(signalMap).map(timeKey => {
    const time = parseInt(timeKey);
    const dataPoint = data.find(item => item.openTime === time);
    
    if (!dataPoint) return null;
    
    return {
      time,
      date: new Date(time),
      formattedTime: formatXAxisTime(time),
      price: dataPoint.close,
      signalY: signalMap[timeKey] === 'BUY' 
        ? dataPoint.low * 0.995
        : dataPoint.high * 1.005,
      signalType: signalMap[timeKey]
    };
  }).filter(Boolean);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.max(10, prev - 20));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.min(100, prev + 20));
  };

  const signalData2 = showSignals ? signalPoints : [];

  return (
    <Card className="chart-container shadow-lg h-full">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Price Chart
            </CardTitle>
            {backtestMode && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                Backtest Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                className="p-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-gray-700">{zoomLevel}%</span>
              <button 
                className="p-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1">
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showMA ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowMA(!showMA)}
              >
                MA
              </button>
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showBollinger ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowBollinger(!showBollinger)}
              >
                BB
              </button>
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showVolume ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowVolume(!showVolume)}
              >
                VOL
              </button>
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showRSI ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowRSI(!showRSI)}
              >
                RSI
              </button>
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showMACD ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowMACD(!showMACD)}
              >
                MACD
              </button>
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showSupportResistance ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowSupportResistance(!showSupportResistance)}
              >
                S/R
              </button>
              <button 
                className={cn("px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors shadow-sm", 
                  showSignals ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
                onClick={() => setShowSignals(!showSignals)}
              >
                Signals
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-white p-4 flex-1 min-h-0 h-full">
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-1 min-h-0 h-full">
            <ResponsiveContainer width="100%" height="100%" className="chart-content-wrapper">
              <ComposedChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  bottom: 20,
                  left: 30,
                }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                <XAxis 
                  dataKey="formattedTime" 
                  tick={{fontSize: 12, fill: "#64748B"}}
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  tickCount={6}
                  minTickGap={30}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  domain={yDomain} 
                  tick={{fontSize: 12, fill: "#64748B"}}
                  tickFormatter={(value) => value.toFixed(0)}
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  width={60}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  hide={!showVolume} 
                  tick={{fontSize: 12, fill: "#64748B"}}
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  width={40}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (!props || !value) return ['-', name];
                    
                    if (name === 'normalizedVolume') {
                      const dataIndex = chartData.findIndex(item => 
                        item.normalizedVolume === value);
                      if (dataIndex >= 0 && zoomedData[dataIndex]) {
                        return [zoomedData[dataIndex].volume.toFixed(2), 'Volume'];
                      }
                      return ['-', 'Volume'];
                    }
                    
                    if (name === 'close' || name === 'open' || name === 'high' || name === 'low' || 
                        name === 'sma20' || name === 'ema50' || name === 'upper' || 
                        name === 'middle' || name === 'lower') {
                      return [parseFloat(value as string).toFixed(2), name];
                    }
                    
                    if (name === 'macd' || name === 'signal' || name === 'histogram') {
                      return [parseFloat(value as string).toFixed(4), name];
                    }
                    
                    return [parseFloat(value as string).toFixed(2), name];
                  }}
                  labelFormatter={(time) => {
                    const dataPoint = chartData.find(item => item.formattedTime === time);
                    return dataPoint ? formatTooltipTime(dataPoint.time) : 'Unknown time';
                  }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    padding: '10px', 
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                />
                
                <Area 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  fill="url(#colorPrice)" 
                  name="Price"
                  animationDuration={500}
                  isAnimationActive={false}
                />
                
                {showBollinger && (
                  <>
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="upper" 
                      stroke="#F43F5E" 
                      dot={false} 
                      name="Upper Band"
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="middle" 
                      stroke="#8B5CF6" 
                      dot={false} 
                      name="Middle Band"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="lower" 
                      stroke="#3B82F6" 
                      dot={false} 
                      name="Lower Band"
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </>
                )}
                
                {showMA && (
                  <>
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="sma20" 
                      stroke="#EF4444" 
                      dot={false} 
                      name="SMA 20"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="ema50" 
                      stroke="#10B981" 
                      dot={false} 
                      name="EMA 50"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </>
                )}
                
                {showVolume && (
                  <Bar 
                    yAxisId="right" 
                    dataKey="normalizedVolume" 
                    fill="url(#colorVolume)" 
                    opacity={0.7} 
                    name="Volume"
                    animationDuration={500}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                )}
                
                {showSupportResistance && supportResistanceLevels.support.map((level, index) => (
                  <ReferenceLine 
                    key={`support-${index}`} 
                    y={level} 
                    yAxisId="left"
                    stroke="#22c55e" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ 
                      value: `S: ${level.toFixed(0)}`, 
                      position: 'insideBottomLeft',
                      fill: '#22c55e',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                ))}
                
                {showSupportResistance && supportResistanceLevels.resistance.map((level, index) => (
                  <ReferenceLine 
                    key={`resistance-${index}`} 
                    y={level} 
                    yAxisId="left"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ 
                      value: `R: ${level.toFixed(0)}`, 
                      position: 'insideTopLeft',
                      fill: '#ef4444',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                ))}
                
                {showSignals && signalPoints.length > 0 && (
                  <Scatter
                    yAxisId="left"
                    name="Signals"
                    data={signalPoints}
                    shape={(props) => {
                      if (!props || !props.payload) return null;
                      
                      const { cx, cy, payload } = props;
                      const signalType = payload.signalType;
                      
                      const yScale = props.yAxis.scale;
                      const explicitY = yScale(payload.signalY);
                      
                      if (signalType === 'BUY') {
                        return (
                          <svg x={cx - 15} y={explicitY - 15} width="30" height="30" viewBox="0 0 30 30">
                            <circle cx="15" cy="15" r="12" fill="#22c55e" opacity="0.9" />
                            <path d="M15 7 L15 23 M9 13 L15 7 L21 13" stroke="white" strokeWidth="2" fill="none" />
                          </svg>
                        );
                      } 
                      else if (signalType === 'SELL') {
                        return (
                          <svg x={cx - 15} y={explicitY - 15} width="30" height="30" viewBox="0 0 30 30">
                            <circle cx="15" cy="15" r="12" fill="#ef4444" opacity="0.9" />
                            <path d="M15 7 L15 23 M9 17 L15 23 L21 17" stroke="white" strokeWidth="2" fill="none" />
                          </svg>
                        );
                      }
                      
                      return null;
                    }}
                  />
                )}
                
                <Legend 
                  verticalAlign="top" 
                  wrapperStyle={{ lineHeight: '40px' }}
                  iconSize={12}
                  iconType="circle"
                  formatter={(value, entry) => (
                    <span style={{ color: '#1E293B', fontSize: '12px', fontWeight: 500 }}>{value}</span>
                  )}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {showRSI && (
            <div style={{ height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{fontSize: 12, fill: "#64748B"}}
                    height={15}
                    stroke="#94A3B8"
                    minTickGap={30}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{fontSize: 12, fill: "#64748B"}}
                    width={30}
                    stroke="#94A3B8" 
                  />
                  <Tooltip 
                    formatter={(value) => [parseFloat(value as string).toFixed(2), 'RSI']}
                    labelFormatter={(time) => {
                      const dataPoint = chartData.find(item => item.formattedTime === time);
                      return dataPoint ? formatTooltipTime(dataPoint.time) : 'Unknown time';
                    }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      padding: '10px', 
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rsi" 
                    stroke="#F59E0B" 
                    dot={false} 
                    strokeWidth={2} 
                    animationDuration={500}
                  />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1.5} />
                  <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 2" strokeWidth={1.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {showMACD && (
            <div style={{ height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{fontSize: 12, fill: "#64748B"}}
                    height={15}
                    stroke="#94A3B8"
                    minTickGap={30}
                  />
                  <YAxis 
                    tick={{fontSize: 12, fill: "#64748B"}}
                    width={30}
                    stroke="#94A3B8" 
                  />
                  <Tooltip 
                    formatter={(value) => [parseFloat(value as string).toFixed(4), 'MACD']}
                    labelFormatter={(time) => {
                      const dataPoint = chartData.find(item => item.formattedTime === time);
                      return dataPoint ? formatTooltipTime(dataPoint.time) : 'Unknown time';
                    }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      padding: '10px', 
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="macd" 
                    stroke="#10B981" 
                    dot={false} 
                    strokeWidth={2}
                    name="MACD Line"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="signal" 
                    stroke="#F43F5E" 
                    dot={false} 
                    strokeWidth={2}
                    name="Signal Line"
                  />
                  <Bar 
                    dataKey="histogram" 
                    fill="histogramColor"
                    name="Histogram"
                    radius={[2, 2, 0, 0]}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" strokeWidth={1.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {backtestMode && backtestResults && (
            <div className="mt-2 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
              <h3 className="text-base font-bold mb-3 text-indigo-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-700" />
                <span>Backtest Performance</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Win Rate</span>
                  <p className="text-lg font-bold text-gray-800">
                    {backtestResults.performance.winRate.toFixed(1)}%
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Profit Factor</span>
                  <p className="text-lg font-bold text-gray-800">
                    {backtestResults.performance.profitFactor.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Net Profit</span>
                  <p className={cn(
                    "text-lg font-bold",
                    backtestResults.performance.netProfit >= 0 ? "text-crypto-buy" : "text-crypto-sell"
                  )}>
                    {backtestResults.performance.netProfit >= 0 ? "+" : ""}{backtestResults.performance.netProfit.toFixed(2)}%
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Max Drawdown</span>
                  <p className="text-lg font-bold text-crypto-sell">
                    {backtestResults.performance.maxDrawdown.toFixed(2)}%
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Total Trades</span>
                  <p className="text-lg font-bold text-gray-800">
                    {backtestResults.performance.totalTrades}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Winning Trades</span>
                  <p className="text-lg font-bold text-crypto-buy">
                    {backtestResults.performance.winningTrades}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Losing Trades</span>
                  <p className="text-lg font-bold text-crypto-sell">
                    {backtestResults.performance.losingTrades}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
                  <span className="text-xs text-gray-500">Avg Profit/Loss</span>
                  <p className="text-lg font-bold text-gray-800">
                    +{backtestResults.performance.averageProfit.toFixed(2)}% / -{Math.abs(backtestResults.performance.averageLoss).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
