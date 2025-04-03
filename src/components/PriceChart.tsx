import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  ComposedChart, 
  Line, 
  Legend, 
  ReferenceLine, 
  Scatter,
  Cell
} from 'recharts';
import { KlineData } from '@/services/binanceService';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  InfoIcon, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  Clock, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands, 
  findSupportResistanceLevels 
} from '@/services/technicalAnalysisService';
import { SignalSummary } from '@/services/technicalAnalysisService';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
  signalData?: SignalSummary | null;
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const dataPoint = payload[0].payload;
  
  return (
    <div className="p-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <p className="text-sm font-semibold text-gray-800 mb-1.5">{formatTooltipTime(dataPoint.time)}</p>
      <Separator className="mb-2" />
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Open:</span>
          <span className="text-xs font-semibold">${dataPoint.open.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-500">High:</span>
          <span className="text-xs font-semibold">${dataPoint.high.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Low:</span>
          <span className="text-xs font-semibold">${dataPoint.low.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Close:</span>
          <span className="text-xs font-semibold">${dataPoint.close.toFixed(2)}</span>
        </div>
        
        {dataPoint.sma20 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-red-400 rounded-full"></div>
            <span className="text-xs text-gray-500">SMA20:</span>
            <span className="text-xs font-semibold">${dataPoint.sma20.toFixed(2)}</span>
          </div>
        )}
        
        {dataPoint.ema50 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-500">EMA50:</span>
            <span className="text-xs font-semibold">${dataPoint.ema50.toFixed(2)}</span>
          </div>
        )}
        
        {dataPoint.volume && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <span className="text-xs text-gray-500">Volume:</span>
            <span className="text-xs font-semibold">{dataPoint.volume.toFixed(2)}</span>
          </div>
        )}
        
        {dataPoint.rsi && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-amber-400 rounded-full"></div>
            <span className="text-xs text-gray-500">RSI:</span>
            <span className="text-xs font-semibold">{dataPoint.rsi.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {dataPoint.signalType && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className={cn(
            "flex items-center justify-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full",
            dataPoint.signalType === 'BUY' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {dataPoint.signalType === 'BUY' ? (
              <ArrowUpCircle className="h-3 w-3" />
            ) : (
              <ArrowDownCircle className="h-3 w-3" />
            )}
            {dataPoint.signalType} SIGNAL
          </div>
        </div>
      )}
    </div>
  );
};

const PriceChart: React.FC<PriceChartProps> = ({ 
  data, 
  isPending, 
  symbol, 
  signalData 
}) => {
  const [showMA, setShowMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showPriceLabels, setShowPriceLabels] = useState(true);

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
  }).filter(Boolean) as any[];

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.max(10, prev - 20));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.min(100, prev + 20));
  };

  const signalData2 = showSignals ? signalPoints : [];

  return (
    <Card className="chart-container shadow-xl h-full border border-indigo-100/50">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-indigo-900">
              {symbol} Price Chart
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm">
            <button 
              className={cn(
                "p-1.5 rounded-md text-gray-700 hover:bg-gray-100 transition-all",
                showPriceLabels ? "bg-indigo-100" : "bg-white"
              )}
              onClick={() => setShowPriceLabels(!showPriceLabels)}
              title={showPriceLabels ? "Hide price labels" : "Show price labels"}
            >
              {showPriceLabels ? (
                <Eye className="h-4 w-4 text-indigo-600" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            
            <button 
              className="p-1.5 rounded-md bg-white text-gray-700 hover:bg-gray-100 transition-all"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-gray-700">{zoomLevel}%</span>
            <button 
              className="p-1.5 rounded-md bg-white text-gray-700 hover:bg-gray-100 transition-all"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap mt-2 gap-1.5">
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showMA ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowMA(!showMA)}
          >
            Moving Avg
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showBollinger ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowBollinger(!showBollinger)}
          >
            Bollinger
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showVolume ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowVolume(!showVolume)}
          >
            Volume
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showRSI ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowRSI(!showRSI)}
          >
            RSI
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showMACD ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowMACD(!showMACD)}
          >
            MACD
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showSupportResistance ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowSupportResistance(!showSupportResistance)}
          >
            Support/Resist
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showSignals ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setShowSignals(!showSignals)}
          >
            Signals
          </button>
        </div>
      </CardHeader>
      <CardContent className="bg-white p-4 flex-1 min-h-0 h-full">
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-1 min-h-0 h-[500px]">
            <ChartContainer 
              config={{
                price: {
                  label: 'Price',
                  color: '#8B5CF6'
                },
                volume: {
                  label: 'Volume',
                  color: '#0EA5E9'
                },
                sma20: {
                  label: 'SMA 20',
                  color: '#EF4444'
                },
                ema50: {
                  label: 'EMA 50',
                  color: '#10B981'
                }
              }}
              className="h-full w-full"
            >
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
                  
                  <linearGradient id="upCandle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="downCandle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
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
                  tickSize={4}
                  tickMargin={8}
                  allowDecimals={false}
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
                
                <Tooltip content={<CustomTooltip />} />
                
                {chartData.map((entry, index) => (
                  <React.Fragment key={`candle-${index}`}>
                    <Line
                      yAxisId="left"
                      data={[entry]}
                      type="monotone"
                      dataKey={(item: any) => [item.low, item.high]}
                      stroke={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                    
                    {showPriceLabels && index === chartData.length - 1 && (
                      <text
                        x={chartData.length * 50}
                        y={entry.close > entry.open 
                          ? yDomain[0] + (entry.close - yDomain[0]) * 0.95 
                          : yDomain[0] + (entry.close - yDomain[0]) * 1.05}
                        fill={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        ${entry.close.toFixed(2)} ({entry.changePercent.toFixed(2)}%)
                      </text>
                    )}
                  </React.Fragment>
                ))}
                
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
                    shape={(props: any) => {
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
            </ChartContainer>
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
                    fill="#22c55e"
                    name="Histogram"
                    radius={[2, 2, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.histogram >= 0 ? "#22c55e" : "#ef4444"} 
                      />
                    ))}
                  </Bar>
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" strokeWidth={1.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
