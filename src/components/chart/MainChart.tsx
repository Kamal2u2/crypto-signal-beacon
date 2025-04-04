
import React, { memo, useMemo, useEffect, useState, useRef } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ReferenceLine
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { CustomTooltip } from './ChartTooltip';
import { formatPrice } from '@/utils/chartFormatters';

interface MainChartProps {
  chartData: any[];
  showMA: boolean;
  showBollinger: boolean;
  showVolume: boolean;
  showSupportResistance: boolean;
  yDomain: [number, number];
  supportResistanceLevels: {
    support: number[];
    resistance: number[];
  };
  showPriceLabels: boolean;
  currentPrice?: number | null;
}

// Create a highly optimized MainChart component that minimizes re-renders
const MainChart: React.FC<MainChartProps> = memo(({
  chartData,
  showMA,
  showBollinger,
  showVolume,
  showSupportResistance,
  yDomain,
  supportResistanceLevels,
  showPriceLabels,
  currentPrice: externalCurrentPrice
}) => {
  // Track current price in state to force rerender when it changes
  const [localCurrentPrice, setLocalCurrentPrice] = useState<number | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Update local state when external price changes, using requestAnimationFrame for smooth updates
  useEffect(() => {
    if (externalCurrentPrice !== undefined && 
        externalCurrentPrice !== null && 
        externalCurrentPrice !== lastPriceRef.current) {
      
      lastPriceRef.current = externalCurrentPrice;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Schedule price update on next animation frame for smoother rendering
      animationFrameRef.current = requestAnimationFrame(() => {
        setLocalCurrentPrice(externalCurrentPrice);
        animationFrameRef.current = null;
      });
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [externalCurrentPrice]);
  
  // Calculate current price to display
  const currentPrice = useMemo(() => {
    // Use external current price if provided, otherwise use last candle price
    if (localCurrentPrice !== null) {
      return localCurrentPrice;
    }
    return chartData.length > 0 ? chartData[chartData.length - 1].close : null;
  }, [chartData, localCurrentPrice]);

  // Create support/resistance lines with memoization
  const supportLines = useMemo(() => {
    if (!showSupportResistance) return [];
    return supportResistanceLevels.support.map((level, index) => (
      <ReferenceLine 
        key={`support-${level}-${index}`}
        y={level} 
        yAxisId="left"
        stroke="#22c55e" 
        strokeWidth={1.5}
        strokeDasharray="3 3"
        ifOverflow="hidden"
        label={{ 
          value: `S: ${formatPrice(level)}`, 
          position: 'insideBottomLeft',
          fill: '#22c55e',
          fontSize: 10,
          fontWeight: 'bold'
        }}
      />
    ));
  }, [supportResistanceLevels.support, showSupportResistance]);

  const resistanceLines = useMemo(() => {
    if (!showSupportResistance) return [];
    return supportResistanceLevels.resistance.map((level, index) => (
      <ReferenceLine 
        key={`resistance-${level}-${index}`}
        y={level} 
        yAxisId="left"
        stroke="#ef4444" 
        strokeWidth={1.5}
        strokeDasharray="3 3"
        ifOverflow="hidden"
        label={{ 
          value: `R: ${formatPrice(level)}`, 
          position: 'insideTopLeft',
          fill: '#ef4444',
          fontSize: 10,
          fontWeight: 'bold'
        }}
      />
    ));
  }, [supportResistanceLevels.resistance, showSupportResistance]);

  // Memoize price reference line to avoid re-renders
  const priceReferenceLine = useMemo(() => {
    if (!currentPrice || !showPriceLabels) return null;
    return (
      <ReferenceLine
        y={currentPrice}
        yAxisId="left"
        stroke="#8B5CF6"
        strokeDasharray="3 3"
        ifOverflow="hidden"
        label={{
          value: `$${formatPrice(currentPrice)}`,
          position: 'right',
          fill: '#8B5CF6',
          fontSize: 11,
          fontWeight: 'bold'
        }}
      />
    );
  }, [currentPrice, showPriceLabels]);

  // Format Y-axis ticks to display proper price values
  const formatYAxisTick = (value: number) => {
    return formatPrice(value);
  };

  // Only include technical indicators if they're enabled
  const technicalLines = useMemo(() => {
    const lines = [];
    
    if (showMA) {
      lines.push(
        <Line 
          key="sma20"
          yAxisId="left" 
          type="monotone" 
          dataKey="sma20" 
          stroke="#ef4444" 
          dot={false} 
          strokeWidth={1.5}
          name="SMA 20"
          isAnimationActive={false}
          connectNulls={true}
          activeDot={false}
        />,
        <Line 
          key="ema50"
          yAxisId="left" 
          type="monotone" 
          dataKey="ema50" 
          stroke="#22c55e" 
          dot={false} 
          strokeWidth={1.5}
          name="EMA 50"
          isAnimationActive={false}
          connectNulls={true}
          activeDot={false}
        />
      );
    }
    
    if (showBollinger) {
      lines.push(
        <Line 
          key="upper"
          yAxisId="left" 
          type="monotone" 
          dataKey="upper" 
          stroke="#64748b" 
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false} 
          name="Upper Band"
          isAnimationActive={false}
          connectNulls={true}
          activeDot={false}
        />,
        <Line 
          key="middle"
          yAxisId="left" 
          type="monotone" 
          dataKey="middle" 
          stroke="#64748b" 
          strokeWidth={1}
          dot={false} 
          name="Middle Band"
          isAnimationActive={false}
          connectNulls={true}
          activeDot={false}
        />,
        <Line 
          key="lower"
          yAxisId="left" 
          type="monotone" 
          dataKey="lower" 
          stroke="#64748b" 
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false} 
          name="Lower Band"
          isAnimationActive={false}
          connectNulls={true}
          activeDot={false}
        />
      );
    }
    
    return lines;
  }, [showMA, showBollinger]);

  return (
    <div className="h-[500px] w-full">
      <ChartContainer 
        config={{
          price: {
            label: 'Price',
            color: '#8B5CF6'
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
            yAxisId="left" 
            orientation="left" 
            domain={yDomain} 
            tick={{fontSize: 11, fill: "#64748B"}}
            tickFormatter={formatYAxisTick}
            stroke="#94A3B8"
            strokeWidth={1.5}
            width={60}
            tickSize={4}
            tickMargin={6}
            allowDecimals={true}
          />
          
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          
          {/* Price line chart */}
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="close" 
            stroke="#8B5CF6" 
            strokeWidth={2.5}
            name="Price"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 5, fill: "#8B5CF6", stroke: "white", strokeWidth: 2 }}
            connectNulls={true}
          />
          
          {/* Technical indicators */}
          {technicalLines}
          
          {/* Current price label */}
          {priceReferenceLine}
          
          {/* Support/Resistance lines */}
          {supportLines}
          {resistanceLines}
          
          <Legend 
            verticalAlign="top" 
            wrapperStyle={{ lineHeight: '40px' }}
            iconSize={10}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: '#1E293B', fontSize: '11px', fontWeight: 500 }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary rerenders
  
  // Always rerender if the current price changes
  if (prevProps.currentPrice !== nextProps.currentPrice) return false;
  
  if (prevProps.chartData.length !== nextProps.chartData.length) return false;
  
  // Compare chart options
  if (prevProps.showMA !== nextProps.showMA) return false;
  if (prevProps.showBollinger !== nextProps.showBollinger) return false;
  if (prevProps.showVolume !== nextProps.showVolume) return false;
  if (prevProps.showSupportResistance !== nextProps.showSupportResistance) return false;
  if (prevProps.showPriceLabels !== nextProps.showPriceLabels) return false;
  
  // Compare yDomain
  if (prevProps.yDomain[0] !== nextProps.yDomain[0] || prevProps.yDomain[1] !== nextProps.yDomain[1]) return false;
  
  // Compare support/resistance levels only if they're shown
  if (nextProps.showSupportResistance) {
    if (prevProps.supportResistanceLevels.support.length !== nextProps.supportResistanceLevels.support.length ||
        prevProps.supportResistanceLevels.resistance.length !== nextProps.supportResistanceLevels.resistance.length) {
      return false;
    }
  }
  
  // Only compare last data point for performance
  if (prevProps.chartData.length > 0 && nextProps.chartData.length > 0) {
    const prevLast = prevProps.chartData[prevProps.chartData.length - 1];
    const nextLast = nextProps.chartData[nextProps.chartData.length - 1];
    
    if (prevLast.close !== nextLast.close || 
        prevLast.high !== nextLast.high || 
        prevLast.low !== nextLast.low) {
      return false;
    }
  }
  
  // If we made it here, props are effectively equal
  return true;
});

MainChart.displayName = 'MainChart';

export default MainChart;
