
import React, { memo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import { formatTooltipTime } from '@/utils/chartFormatters';

interface MACDChartProps {
  chartData: any[];
}

const MACDChart: React.FC<MACDChartProps> = ({ chartData }) => {
  return (
    <div style={{ height: 100 }} className="overflow-hidden">
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
            tick={{fontSize: 10, fill: "#64748B"}}
            height={15}
            stroke="#94A3B8"
            minTickGap={30}
            tickCount={4}
          />
          <YAxis 
            tick={{fontSize: 10, fill: "#64748B"}}
            width={25}
            stroke="#94A3B8"
            tickFormatter={(value) => value.toFixed(2)}
            tickCount={3}
          />
          <Tooltip 
            formatter={(value) => [parseFloat(value.toString()).toFixed(4), 'MACD']}
            labelFormatter={(time) => {
              const dataPoint = chartData.find(item => item.formattedTime === time);
              return dataPoint ? formatTooltipTime(dataPoint.time) : 'Unknown time';
            }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              padding: '8px', 
              fontSize: '10px',
              boxShadow: '0 2px 3px rgba(0, 0, 0, 0.1)'
            }}
            isAnimationActive={false}
          />
          <Line 
            type="monotone" 
            dataKey="macd" 
            stroke="#10B981" 
            dot={false} 
            strokeWidth={1.5}
            name="MACD Line"
            isAnimationActive={false}
            connectNulls={true}
          />
          <Line 
            type="monotone" 
            dataKey="signal" 
            stroke="#F43F5E" 
            dot={false} 
            strokeWidth={1.5}
            name="Signal Line"
            isAnimationActive={false}
            connectNulls={true}
          />
          <Bar 
            dataKey="histogram" 
            name="Histogram"
            radius={[1, 1, 0, 0]}
            isAnimationActive={false}
            barSize={3}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.histogram >= 0 ? "#22c55e" : "#ef4444"} 
              />
            ))}
          </Bar>
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Use memo with custom comparison function to prevent unnecessary re-renders
export default memo(MACDChart, (prevProps, nextProps) => {
  if (prevProps.chartData.length !== nextProps.chartData.length) return false;
  
  // Only check the last data point's MACD values
  if (prevProps.chartData.length > 0 && nextProps.chartData.length > 0) {
    const prevLast = prevProps.chartData[prevProps.chartData.length - 1];
    const nextLast = nextProps.chartData[nextProps.chartData.length - 1];
    
    return (
      prevLast.macd === nextLast.macd &&
      prevLast.signal === nextLast.signal &&
      prevLast.histogram === nextLast.histogram
    );
  }
  
  return true;
});
