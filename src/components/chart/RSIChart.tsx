
import React, { memo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { formatTooltipTime } from '@/utils/chartFormatters';

interface RSIChartProps {
  chartData: any[];
}

const RSIChart: React.FC<RSIChartProps> = ({ chartData }) => {
  return (
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
            tickFormatter={(value) => value.toString()}
          />
          <Tooltip 
            formatter={(value) => [parseFloat(value.toString()).toFixed(2), 'RSI']}
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
            isAnimationActive={false} // Disable animation to reduce flickering
          />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1.5} />
          <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 2" strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(RSIChart);
