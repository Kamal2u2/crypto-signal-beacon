
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
  ReferenceLine,
  Bar
} from 'recharts';
import { KlineData } from '@/services/binanceService';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochasticOscillator
} from '@/services/technicalAnalysisService';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, isPending, symbol }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showBollingerBands, setShowBollingerBands] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(false);
  const [showMACD, setShowMACD] = useState<boolean>(false);
  const [showStochastic, setShowStochastic] = useState<boolean>(false);

  useEffect(() => {
    if (data.length === 0) return;

    // Extract closing prices for technical indicators
    const prices = data.map(candle => candle.close);
    const highs = data.map(candle => candle.high);
    const lows = data.map(candle => candle.low);
    
    // Calculate technical indicators
    const sma20 = calculateSMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    const rsiValues = calculateRSI(prices);
    const macdResult = calculateMACD(prices);
    const bollingerBands = calculateBollingerBands(prices, 20, 2);
    const atrValues = calculateATR(prices, highs, lows, 14);
    const stochasticValues = calculateStochasticOscillator(prices, highs, lows, 14, 3);
    
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
        volume: candle.volume,
        bollingerUpper: bollingerBands.upper[index],
        bollingerMiddle: bollingerBands.middle[index],
        bollingerLower: bollingerBands.lower[index],
        atr: atrValues[index],
        stochasticK: stochasticValues?.k[index],
        stochasticD: stochasticValues?.d[index]
      };
    });
    
    setChartData(formattedData);
  }, [data]);

  const toggleIndicator = (indicator: string) => {
    switch (indicator) {
      case 'volume':
        setShowVolume(!showVolume);
        break;
      case 'bollinger':
        setShowBollingerBands(!showBollingerBands);
        break;
      case 'rsi':
        setShowRSI(!showRSI);
        break;
      case 'macd':
        setShowMACD(!showMACD);
        break;
      case 'stochastic':
        setShowStochastic(!showStochastic);
        break;
    }
  };

  if (data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center chart-container">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">
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
    <div className="chart-container h-[450px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <div className="flex space-x-2 text-xs">
          <button 
            onClick={() => toggleIndicator('volume')} 
            className={`px-2 py-1 rounded ${showVolume ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Volume
          </button>
          <button 
            onClick={() => toggleIndicator('bollinger')} 
            className={`px-2 py-1 rounded ${showBollingerBands ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Bollinger
          </button>
          <button 
            onClick={() => toggleIndicator('rsi')} 
            className={`px-2 py-1 rounded ${showRSI ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            RSI
          </button>
          <button 
            onClick={() => toggleIndicator('macd')} 
            className={`px-2 py-1 rounded ${showMACD ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            MACD
          </button>
          <button 
            onClick={() => toggleIndicator('stochastic')} 
            className={`px-2 py-1 rounded ${showStochastic ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Stochastic
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis 
            dataKey="time" 
            tick={{ fill: '#64748B' }}
            axisLine={{ stroke: '#CBD5E1' }}
          />
          <YAxis 
            tickFormatter={formatPrice}
            domain={['auto', 'auto']}
            tick={{ fill: '#64748B' }}
            axisLine={{ stroke: '#CBD5E1' }}
            tickCount={8}
            yAxisId="price"
          />
          {showVolume && (
            <YAxis 
              orientation="right"
              yAxisId="volume"
              domain={['auto', 'auto']}
              tick={{ fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickCount={5}
            />
          )}
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: '0.5rem' }}
            formatter={(value: number, name: string) => {
              if (name === 'price' || name === 'open' || name === 'high' || name === 'low' || 
                  name === 'sma20' || name === 'ema50' || name === 'bollingerUpper' || 
                  name === 'bollingerMiddle' || name === 'bollingerLower') {
                return [formatPrice(value), name];
              }
              if (name === 'rsi') return [value.toFixed(2), 'RSI'];
              if (name === 'macd') return [value.toFixed(4), 'MACD'];
              if (name === 'signal') return [value.toFixed(4), 'Signal'];
              if (name === 'histogram') return [value.toFixed(4), 'Histogram'];
              if (name === 'stochasticK') return [value.toFixed(2), 'Stoch %K'];
              if (name === 'stochasticD') return [value.toFixed(2), 'Stoch %D'];
              if (name === 'volume') return [value.toFixed(2), 'Volume'];
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
            yAxisId="price"
          />
          <Line 
            type="monotone" 
            dataKey="sma20" 
            stroke="#10B981" 
            dot={false} 
            name="SMA 20"
            yAxisId="price"
          />
          <Line 
            type="monotone" 
            dataKey="ema50" 
            stroke="#8B5CF6" 
            dot={false} 
            name="EMA 50"
            yAxisId="price"
          />
          
          {/* Bollinger Bands */}
          {showBollingerBands && (
            <>
              <Line 
                type="monotone" 
                dataKey="bollingerUpper" 
                stroke="#F43F5E" 
                strokeDasharray="3 3"
                dot={false} 
                name="Bollinger Upper"
                yAxisId="price"
              />
              <Line 
                type="monotone" 
                dataKey="bollingerMiddle" 
                stroke="#8B5CF6" 
                strokeDasharray="3 3"
                dot={false} 
                name="Bollinger Middle"
                yAxisId="price"
              />
              <Line 
                type="monotone" 
                dataKey="bollingerLower" 
                stroke="#3B82F6" 
                strokeDasharray="3 3"
                dot={false} 
                name="Bollinger Lower"
                yAxisId="price"
              />
            </>
          )}
          
          {/* Volume */}
          {showVolume && (
            <Bar 
              dataKey="volume" 
              fill="#CBD5E1" 
              opacity={0.5} 
              name="Volume"
              yAxisId="volume"
            />
          )}
          
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
