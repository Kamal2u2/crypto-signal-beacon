
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ComposedChart, Line, Legend } from 'recharts';
import { KlineData } from '@/services/binanceService';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon } from 'lucide-react';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '@/services/technicalAnalysisService';

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
  
  if (isPending) {
    return (
      <Card className="price-chart-card">
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
      <Card className="price-chart-card">
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
  const sma20 = calculateSMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);
  const rsiData = calculateRSI(prices);
  const macdResult = calculateMACD(prices);
  const bollingerBands = calculateBollingerBands(prices);

  // Prepare volume data - normalize for better visualization
  const maxVolume = Math.max(...data.map(item => item.volume));
  
  // Combine all data for chart
  const chartData = data.map((item, index) => {
    const enhancedData: any = {
      ...item,
      time: item.openTime,
      normalizedVolume: (item.volume / maxVolume) * 100,
      sma20: sma20[index],
      ema50: ema50[index],
      rsi: rsiData[index],
      macd: macdResult.macd[index],
      signal: macdResult.signal[index],
      histogram: macdResult.histogram[index],
      histogramColor: macdResult.histogram[index] >= 0 ? "#00ff00" : "#ff0000",
      upper: bollingerBands.upper[index],
      middle: bollingerBands.middle[index],
      lower: bollingerBands.lower[index]
    };
    
    return enhancedData;
  });

  return (
    <Card className="price-chart-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{symbol}</span>
            <div className="flex gap-1">
              <button 
                className={cn("px-2 py-1 text-xs rounded", 
                  showMA ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}
                onClick={() => setShowMA(!showMA)}
              >
                MA
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded", 
                  showBollinger ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}
                onClick={() => setShowBollinger(!showBollinger)}
              >
                BB
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded", 
                  showVolume ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}
                onClick={() => setShowVolume(!showVolume)}
              >
                VOL
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded", 
                  showRSI ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}
                onClick={() => setShowRSI(!showRSI)}
              >
                RSI
              </button>
              <button 
                className={cn("px-2 py-1 text-xs rounded", 
                  showMACD ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}
                onClick={() => setShowMACD(!showMACD)}
              >
                MACD
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
            <YAxis yAxisId="left" orientation="left" domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide={!showVolume} />
            <Tooltip 
              formatter={(value, name, props) => {
                if (!props || !value) return ['-', name];
                
                if (name === 'normalizedVolume') {
                  // Find the corresponding data point in the original data
                  const dataIndex = chartData.findIndex(item => 
                    item.normalizedVolume === value);
                  if (dataIndex >= 0 && data[dataIndex]) {
                    return [data[dataIndex].volume.toFixed(2), 'Volume'];
                  }
                  return ['-', 'Volume'];
                }
                return [parseFloat(value as string).toFixed(2), name];
              }}
              labelFormatter={(time) => time ? new Date(time).toLocaleString() : 'Unknown time'}
            />
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="close" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.3} 
              name="Price"
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
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="middle" 
                  stroke="#387908" 
                  dot={false} 
                  name="Middle Band"
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="#ff7300" 
                  dot={false} 
                  name="Lower Band"
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
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="ema50" 
                  stroke="#00ff00" 
                  dot={false} 
                  name="EMA 50"
                />
              </>
            )}
            
            {showVolume && (
              <Bar 
                yAxisId="right" 
                dataKey="normalizedVolume" 
                fill="#82ca9d" 
                fillOpacity={0.5} 
                name="Volume"
              />
            )}
            
            <Legend />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [parseFloat(value as string).toFixed(2), 'RSI']}
                labelFormatter={(time) => time ? new Date(time).toLocaleString() : 'Unknown time'}
              />
              <Line type="monotone" dataKey="rsi" stroke="#8884d8" dot={false} />
              <Line strokeDasharray="3 3" stroke="#ff0000" dataKey={() => 70} dot={false} />
              <Line strokeDasharray="3 3" stroke="#ff0000" dataKey={() => 30} dot={false} />
              <Line strokeDasharray="3 3" stroke="#00ff00" dataKey={() => 50} dot={false} />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
              <YAxis />
              <Tooltip 
                formatter={(value) => [parseFloat(value as string).toFixed(4), 'MACD']}
                labelFormatter={(time) => time ? new Date(time).toLocaleString() : 'Unknown time'}
              />
              <Line type="monotone" dataKey="macd" stroke="#ff0000" dot={false} />
              <Line type="monotone" dataKey="signal" stroke="#0000ff" dot={false} />
              <Bar dataKey="histogram" fill="histogramColor" />
            </ComposedChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
