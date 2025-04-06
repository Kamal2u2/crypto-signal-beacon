
import React, { memo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { CustomTooltip } from './ChartTooltip';
import { formatPrice } from '@/utils/chartFormatters';
import { SignalType } from '@/services/technical/types';

interface SignalChartProps {
  chartData: any[];
  currentPrice?: number | null;
  signalHistory?: Array<{type: SignalType, time: number, confidence: number}>;
}

const SignalChart: React.FC<SignalChartProps> = memo(({
  chartData,
  currentPrice,
  signalHistory = []
}) => {
  // Process the data to include signals
  const processedData = chartData.map(candle => {
    const candleTime = new Date(candle.openTime).getTime();
    
    // Find signals near this candle's time
    const signal = signalHistory.find(s => 
      Math.abs(s.time - candleTime) < 60000 // Within 1 minute of candle
    );
    
    return {
      ...candle,
      signalType: signal?.type || null,
      signalConfidence: signal?.confidence || null
    };
  });

  // Separate buy and sell signals for better visualization
  const buySignals = processedData
    .filter(item => item.signalType === 'BUY')
    .map(item => ({
      openTime: item.openTime,
      close: item.close,
      value: item.close
    }));
    
  const sellSignals = processedData
    .filter(item => item.signalType === 'SELL')
    .map(item => ({
      openTime: item.openTime,
      close: item.close,
      value: item.close
    }));

  // Format Y-axis ticks to display proper price values
  const formatYAxisTick = (value: number) => {
    return formatPrice(value);
  };

  // Calculate Y domain based on data
  const allPrices = processedData.map(d => d.close);
  const minPrice = Math.min(...allPrices) * 0.995;
  const maxPrice = Math.max(...allPrices) * 1.005;

  return (
    <div className="h-[350px] w-full">
      <ChartContainer 
        config={{
          price: {
            label: 'Price',
            color: '#8B5CF6'
          },
          signals: {
            label: 'Signals',
            color: '#10B981'
          }
        }}
        className="h-full w-full"
      >
        <ComposedChart
          data={processedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
          
          <XAxis 
            dataKey="formattedTime" 
            tick={{fontSize: 11, fill: "#64748B"}}
            stroke="#94A3B8"
            strokeWidth={1.5}
            tickCount={5}
            minTickGap={30}
            height={20}
          />
          
          <YAxis 
            domain={[minPrice, maxPrice]}
            tickFormatter={formatYAxisTick}
            tick={{fontSize: 11, fill: "#64748B"}}
            stroke="#94A3B8"
            strokeWidth={1.5}
            width={60}
          />
          
          <Tooltip content={<CustomTooltip signalKey="signalType" />} />
          
          <Legend />
          
          {/* Price line */}
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#8B5CF6" 
            dot={false}
            strokeWidth={2}
            name="Price"
            isAnimationActive={false}
            connectNulls={true}
          />
          
          {/* Buy signals */}
          <Scatter 
            name="Buy Signal" 
            data={buySignals} 
            fill="#10B981" 
            line={false}
            shape={(props) => {
              const { cx, cy } = props;
              return (
                <svg>
                  <polygon 
                    points={`${cx},${cy-10} ${cx-6},${cy} ${cx+6},${cy}`} 
                    fill="#10B981" 
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </svg>
              );
            }}
            isAnimationActive={false}
          />
          
          {/* Sell signals */}
          <Scatter 
            name="Sell Signal" 
            data={sellSignals} 
            fill="#EF4444" 
            line={false}
            shape={(props) => {
              const { cx, cy } = props;
              return (
                <svg>
                  <polygon 
                    points={`${cx},${cy+10} ${cx-6},${cy} ${cx+6},${cy}`} 
                    fill="#EF4444" 
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </svg>
              );
            }}
            isAnimationActive={false}
          />
          
          {/* Current price line */}
          {currentPrice && (
            <ReferenceLine 
              y={currentPrice} 
              stroke="#8B5CF6" 
              strokeDasharray="3 3"
              label={{
                position: 'right',
                value: `$${formatPrice(currentPrice)}`,
                fill: '#8B5CF6',
                fontSize: 11
              }}
            />
          )}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
});

SignalChart.displayName = 'SignalChart';

export default SignalChart;
