import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ComposedChart, Line, Legend, ReferenceLine } from 'recharts';
import { KlineData } from '@/services/binanceService';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, findSupportResistanceLevels } from '@/services/technicalAnalysisService';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, isPending, symbol }) => {
  const [showMA, setShowMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100); // 100% means show all data
  
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

  // Calculate technical indicators
  const prices = data.map(item => item.close);
  const highs = data.map(item => item.high);
  const lows = data.map(item => item.low);
  const sma20 = calculateSMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);
  const rsiData = calculateRSI(prices);
  const macdResult = calculateMACD(prices);
  const bollingerBands = calculateBollingerBands(prices);
  
  // Find support and resistance levels
  const supportResistanceLevels = findSupportResistanceLevels(highs, lows, prices);

  // Prepare volume data - normalize for better visualization
  const maxVolume = Math.max(...data.map(item => item.volume));
  
  // Apply zoom level to data
  const zoomFactor = zoomLevel / 100;
  const dataLength = data.length;
  const visibleDataCount = Math.max(Math.floor(dataLength * zoomFactor), 10); // Show at least 10 data points
  const zoomedData = data.slice(Math.max(0, dataLength - visibleDataCount), dataLength);
  
  // Combine all data for chart
  const chartData = zoomedData.map((item, index) => {
    const dataIndex = Math.max(0, dataLength - visibleDataCount) + index;
    
    const enhancedData: any = {
      ...item,
      time: item.openTime,
      normalizedVolume: (item.volume / maxVolume) * 100,
      sma20: sma20[dataIndex],
      ema50: ema50[dataIndex],
      rsi: rsiData[dataIndex],
      macd: macdResult.macd[dataIndex],
      signal: macdResult.signal[dataIndex],
      histogram: macdResult.histogram[dataIndex],
      histogramColor: macdResult.histogram[dataIndex] >= 0 ? "#00ff00" : "#ff0000",
      upper: bollingerBands.upper[dataIndex],
      middle: bollingerBands.middle[dataIndex],
      lower: bollingerBands.lower[dataIndex]
    };
    
    return enhancedData;
  });

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.max(10, prev - 20)); // Zoom in by reducing visible data
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.min(100, prev + 20)); // Zoom out by increasing visible data
  };

  return (
    <Card className="chart-container">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-600">{zoomLevel}%</span>
              <button 
                className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1">
              <button 
                className={cn("px-2 py-1 text-xs rounded font-medium transition-colors", 
                  showMA ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                onClick={() => setShowMA(!showMA)}
              >
                MA
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded font-medium transition-colors", 
                  showBollinger ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                onClick={() => setShowBollinger(!showBollinger)}
              >
                BB
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded font-medium transition-colors", 
                  showVolume ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                onClick={() => setShowVolume(!showVolume)}
              >
                VOL
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded font-medium transition-colors", 
                  showRSI ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                onClick={() => setShowRSI(!showRSI)}
              >
                RSI
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded font-medium transition-colors", 
                  showMACD ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                onClick={() => setShowMACD(!showMACD)}
              >
                MACD
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded font-medium transition-colors", 
                  showSupportResistance ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                onClick={() => setShowSupportResistance(!showSupportResistance)}
              >
                S/R
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Main price chart */}
          <ComposedChart
            width={500}
            height={300}
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            <XAxis 
              dataKey="time" 
              tickFormatter={(time) => new Date(time).toLocaleTimeString()} 
              tick={{fontSize: 10}}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              domain={['auto', 'auto']} 
              tick={{fontSize: 10}}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={[0, 100]} 
              hide={!showVolume} 
              tick={{fontSize: 10}}
            />
            <Tooltip 
              formatter={(value, name, props) => {
                if (!props || !value) return ['-', name];
                
                if (name === 'normalizedVolume') {
                  // Find the corresponding data point in the original data
                  const dataIndex = chartData.findIndex(item => 
                    item.normalizedVolume === value);
                  if (dataIndex >= 0 && zoomedData[dataIndex]) {
                    return [zoomedData[dataIndex].volume.toFixed(2), 'Volume'];
                  }
                  return ['-', 'Volume'];
                }
                
                // Format different metrics appropriately
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
              labelFormatter={(time) => time ? new Date(time).toLocaleString() : 'Unknown time'}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px', 
                             border: '1px solid #e2e8f0', padding: '8px', fontSize: '12px' }}
            />
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="close" 
              stroke="#8884d8" 
              fill="url(#colorPrice)" 
              name="Price"
              animationDuration={500}
            />
            
            {showBollinger && (
              <>
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="#ff7300" 
                  dot={false} 
                  name="Upper Band"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="middle" 
                  stroke="#387908" 
                  dot={false} 
                  name="Middle Band"
                  strokeWidth={1.5}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="#ff7300" 
                  dot={false} 
                  name="Lower Band"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              </>
            )}
            
            {showMA && (
              <>
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="sma20" 
                  stroke="#ff0000" 
                  dot={false} 
                  name="SMA 20"
                  strokeWidth={1.5}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="ema50" 
                  stroke="#00ff00" 
                  dot={false} 
                  name="EMA 50"
                  strokeWidth={1.5}
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
              />
            )}
            
            {/* Support and Resistance lines */}
            {showSupportResistance && supportResistanceLevels.support.map((level, index) => (
              <ReferenceLine 
                key={`support-${index}`} 
                y={level} 
                yAxisId="left"
                stroke="#22c55e" 
                strokeWidth={1.5}
                strokeDasharray="5 5"
                label={{ 
                  value: `S: ${level.toFixed(2)}`, 
                  position: 'insideBottomLeft',
                  fill: '#22c55e',
                  fontSize: 10
                }}
              />
            ))}
            
            {showSupportResistance && supportResistanceLevels.resistance.map((level, index) => (
              <ReferenceLine 
                key={`resistance-${index}`} 
                y={level} 
                yAxisId="left"
                stroke="#ef4444" 
                strokeWidth={1.5}
                strokeDasharray="5 5"
                label={{ 
                  value: `R: ${level.toFixed(2)}`, 
                  position: 'insideTopLeft',
                  fill: '#ef4444',
                  fontSize: 10
                }}
              />
            ))}
            
            <Legend 
              verticalAlign="top" 
              wrapperStyle={{ lineHeight: '40px' }}
              iconSize={10}
              iconType="circle"
            />
          </ComposedChart>
          
          {/* RSI chart */}
          {showRSI && (
            <ComposedChart
              width={500}
              height={100}
              data={chartData}
              margin={{
                top: 5,
                right: 20,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString()} 
                tick={{fontSize: 10}}
                height={15}
              />
              <YAxis domain={[0, 100]} tick={{fontSize: 10}} width={25} />
              <Tooltip 
                formatter={(value) => [parseFloat(value as string).toFixed(2), 'RSI']}
                labelFormatter={(time) => time ? new Date(time).toLocaleString() : 'Unknown time'}
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px', 
                              border: '1px solid #e2e8f0', padding: '8px', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="rsi" 
                stroke="#8884d8" 
                dot={false} 
                strokeWidth={1.5} 
                animationDuration={500}
              />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 2" />
            </ComposedChart>
          )}
          
          {/* MACD chart */}
          {showMACD && (
            <ComposedChart
              width={500}
              height={100}
              data={chartData}
              margin={{
                top: 5,
                right: 20,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString()} 
                tick={{fontSize: 10}}
                height={15}
              />
              <YAxis tick={{fontSize: 10}} width={25} />
              <Tooltip 
                formatter={(value) => [parseFloat(value as string).toFixed(4), 'MACD']}
                labelFormatter={(time) => time ? new Date(time).toLocaleString() : 'Unknown time'}
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px', 
                              border: '1px solid #e2e8f0', padding: '8px', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="macd" 
                stroke="#ff0000" 
                dot={false} 
                strokeWidth={1.5}
                name="MACD Line"
              />
              <Line 
                type="monotone" 
                dataKey="signal" 
                stroke="#0000ff" 
                dot={false} 
                strokeWidth={1.5}
                name="Signal Line"
              />
              <Bar 
                dataKey="histogram" 
                fill="histogramColor"
                name="Histogram"
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
            </ComposedChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
