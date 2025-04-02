
import React, { useEffect, useState } from 'react';
import { 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Legend,
  ReferenceLine
} from 'recharts';
import { KlineData } from '@/services/binanceService';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD } from '@/services/technicalAnalysisService';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, isPending, symbol }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (data.length === 0) return;

    // Extract closing prices for technical indicators
    const prices = data.map(candle => candle.close);
    
    // Calculate technical indicators
    const sma20 = calculateSMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    const rsiValues = calculateRSI(prices);
    const macdResult = calculateMACD(prices);
    
    // Create chart data with indicators
    const formattedData = data.map((candle, index) => {
      const date = new Date(candle.openTime);
      const formattedDate = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      return {
        time: formattedDate,
        price: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        sma20: sma20[index],
        ema50: ema50[index],
        rsi: rsiValues[index],
        macd: macdResult.macd[index],
        signal: macdResult.signal[index],
        histogram: macdResult.histogram[index],
        volume: candle.volume
      };
    });
    
    setChartData(formattedData);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center bg-crypto-secondary rounded-lg">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">
            {isPending ? "Loading chart data..." : "No data available"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {isPending ? "Please wait..." : "Select a coin pair and timeframe to view data"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate price formatter based on price range
  const minPrice = Math.min(...data.map(d => d.low));
  const maxPrice = Math.max(...data.map(d => d.high));
  const priceRange = maxPrice - minPrice;
  const pricePrecision = priceRange < 1 ? 6 : priceRange < 10 ? 4 : priceRange < 100 ? 2 : 0;

  const formatPrice = (price: number) => price.toFixed(pricePrecision);

  return (
    <div className="h-[400px] w-full bg-crypto-secondary rounded-lg p-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            tick={{ fill: '#9CA3AF' }}
            axisLine={{ stroke: '#4B5563' }}
          />
          <YAxis 
            tickFormatter={formatPrice}
            domain={['auto', 'auto']}
            tick={{ fill: '#9CA3AF' }}
            axisLine={{ stroke: '#4B5563' }}
            tickCount={8}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }}
            formatter={(value: number, name: string) => {
              if (name === 'price' || name === 'open' || name === 'high' || name === 'low' || name === 'sma20' || name === 'ema50') {
                return [formatPrice(value), name];
              }
              if (name === 'rsi') return [value.toFixed(2), 'RSI'];
              if (name === 'macd') return [value.toFixed(4), 'MACD'];
              if (name === 'signal') return [value.toFixed(4), 'Signal'];
              if (name === 'histogram') return [value.toFixed(4), 'Histogram'];
              return [value, name];
            }}
            labelFormatter={(time) => `Time: ${time}`}
          />
          <Legend verticalAlign="top" height={36} />
          
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#3B82F6" 
            fill="url(#colorPrice)" 
            fillOpacity={0.3}
            name="Price"
          />
          <Line 
            type="monotone" 
            dataKey="sma20" 
            stroke="#10B981" 
            dot={false} 
            name="SMA 20"
          />
          <Line 
            type="monotone" 
            dataKey="ema50" 
            stroke="#F59E0B" 
            dot={false} 
            name="EMA 50"
          />
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
