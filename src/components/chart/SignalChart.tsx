
import React, { memo, useMemo, useRef, useEffect } from 'react';
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

// Enhanced comparison function to minimize re-renders
const arePropsEqual = (prevProps: SignalChartProps, nextProps: SignalChartProps) => {
  // Skip updates if data lengths are different (indicates a major change)
  if (prevProps.chartData.length !== nextProps.chartData.length) {
    return false;
  }
  
  // For price changes, only update if the change is significant (0.05% or more)
  if (prevProps.currentPrice && nextProps.currentPrice) {
    const priceDiffPercent = Math.abs((prevProps.currentPrice - nextProps.currentPrice) / prevProps.currentPrice) * 100;
    if (priceDiffPercent > 0.05) {
      return false;
    }
  } else if (prevProps.currentPrice !== nextProps.currentPrice) {
    return false;
  }
  
  // If signal history changed, we need to update
  if (prevProps.signalHistory?.length !== nextProps.signalHistory?.length) {
    return false;
  }
  
  // Only check the last candle's data to determine if we need an update
  const dataLength = prevProps.chartData.length;
  if (dataLength > 0) {
    const lastItemPrev = prevProps.chartData[dataLength - 1];
    const lastItemNext = nextProps.chartData[dataLength - 1];
    
    // Check for significant changes in the last candle
    if (lastItemPrev.openTime !== lastItemNext.openTime) {
      return false;
    }
    
    // Only update if price change is significant
    const lastCloseDiff = Math.abs((lastItemPrev.close - lastItemNext.close) / lastItemPrev.close) * 100;
    if (lastCloseDiff > 0.05) {
      return false;
    }
  }
  
  // Default to not updating if nothing significant changed
  return true;
};

const SignalChart: React.FC<SignalChartProps> = memo(({
  chartData,
  currentPrice,
  signalHistory = []
}) => {
  const previousDataRef = useRef<any[]>([]);
  const previousPriceRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Process chart data and merge with signal history for visualization
  const processedData = useMemo(() => {
    return chartData.map(candle => {
      const candleTime = new Date(candle.openTime).getTime();
      
      // Find if there was a signal close to this candle's time
      const signal = signalHistory.find(s => 
        Math.abs(s.time - candleTime) < 60000 // Within 1 minute
      );
      
      // Format time for display
      const date = new Date(candle.openTime);
      const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      return {
        ...candle,
        formattedTime,
        signalType: signal?.type || null,
        signalConfidence: signal?.confidence || null
      };
    });
  }, [chartData, signalHistory]);

  useEffect(() => {
    previousDataRef.current = processedData;
    previousPriceRef.current = currentPrice;
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [processedData, currentPrice]);

  // Extract buy and sell signal data points for visualization
  const { buySignals, sellSignals, minPrice, maxPrice } = useMemo(() => {
    // Extract buy signals to highlight on chart
    const buySignals = processedData
      .filter(item => item.signalType === 'BUY')
      .map(item => ({
        openTime: item.openTime,
        close: item.close,
        value: item.close,
        confidence: item.signalConfidence
      }));
      
    // Extract sell signals to highlight on chart
    const sellSignals = processedData
      .filter(item => item.signalType === 'SELL')
      .map(item => ({
        openTime: item.openTime,
        close: item.close,
        value: item.close,
        confidence: item.signalConfidence
      }));

    // Calculate price range for Y axis
    const allPrices = processedData.map(d => d.close);
    const minPrice = Math.min(...allPrices) * 0.995;
    const maxPrice = Math.max(...allPrices) * 1.005;
    
    return { buySignals, sellSignals, minPrice, maxPrice };
  }, [processedData]);

  const formatYAxisTick = (value: number) => {
    return formatPrice(value);
  };

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
          
          {/* Buy signals with triangles pointing up and confidence-based sizing */}
          <Scatter 
            name="Buy Signal" 
            data={buySignals} 
            fill="#10B981" 
            line={false}
            shape={(props) => {
              const { cx, cy, payload } = props;
              // Size based on confidence
              const size = payload?.confidence ? 5 + (payload.confidence / 20) : 8;
              
              return (
                <svg>
                  <polygon 
                    points={`${cx},${cy-size} ${cx-size},${cy} ${cx+size},${cy}`} 
                    fill="#10B981" 
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </svg>
              );
            }}
            isAnimationActive={false}
          />
          
          {/* Sell signals with triangles pointing down and confidence-based sizing */}
          <Scatter 
            name="Sell Signal" 
            data={sellSignals} 
            fill="#EF4444" 
            line={false}
            shape={(props) => {
              const { cx, cy, payload } = props;
              // Size based on confidence
              const size = payload?.confidence ? 5 + (payload.confidence / 20) : 8;
              
              return (
                <svg>
                  <polygon 
                    points={`${cx},${cy+size} ${cx-size},${cy} ${cx+size},${cy}`} 
                    fill="#EF4444" 
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </svg>
              );
            }}
            isAnimationActive={false}
          />
          
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
}, arePropsEqual);

SignalChart.displayName = 'SignalChart';

export default SignalChart;
