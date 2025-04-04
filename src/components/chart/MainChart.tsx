
import React from 'react';
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
}

const MainChart: React.FC<MainChartProps> = ({
  chartData,
  showSupportResistance,
  yDomain,
  supportResistanceLevels,
  showPriceLabels
}) => {
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
            tickFormatter={(value) => value.toString()}
            stroke="#94A3B8"
            strokeWidth={1.5}
            width={60}
            tickSize={4}
            tickMargin={8}
            allowDecimals={false}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Simple price line chart */}
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="close" 
            stroke="#8B5CF6" 
            strokeWidth={3}
            name="Price"
            animationDuration={500}
            dot={false}
            activeDot={{ r: 6, fill: "#8B5CF6", stroke: "white", strokeWidth: 2 }}
          />
          
          {showPriceLabels && chartData.length > 0 && (
            <Line
              yAxisId="left"
              data={[chartData[chartData.length - 1]]}
              type="monotone"
              dataKey="close"
              stroke="transparent"
              dot={false}
              isAnimationActive={false}
              label={({ x, y, value }) => {
                const entry = chartData[chartData.length - 1];
                return (
                  <text
                    x={x + 10}
                    y={y}
                    fill={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    ${entry.close.toFixed(2)} ({entry.changePercent.toFixed(2)}%)
                  </text>
                );
              }}
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
          
          <Legend 
            verticalAlign="top" 
            wrapperStyle={{ lineHeight: '40px' }}
            iconSize={12}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: '#1E293B', fontSize: '12px', fontWeight: 500 }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
};

export default MainChart;
