
import React from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
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
  showMA,
  showBollinger,
  showVolume,
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
          },
          volume: {
            label: 'Volume',
            color: '#0EA5E9'
          },
          sma20: {
            label: 'SMA 20',
            color: '#EF4444'
          },
          ema50: {
            label: 'EMA 50',
            color: '#10B981'
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
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          
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
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={[0, 100]} 
            hide={!showVolume} 
            tick={{fontSize: 12, fill: "#64748B"}}
            stroke="#94A3B8"
            strokeWidth={1.5}
            width={40}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Simple price line chart */}
          <Area 
            yAxisId="left" 
            type="monotone" 
            dataKey="close" 
            stroke="#8B5CF6" 
            strokeWidth={3}
            fill="url(#colorPrice)" 
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
          
          {showBollinger && (
            <>
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="upper" 
                stroke="#F43F5E" 
                dot={false} 
                name="Upper Band"
                strokeDasharray="3 3"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="middle" 
                stroke="#8B5CF6" 
                dot={false} 
                name="Middle Band"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="lower" 
                stroke="#3B82F6" 
                dot={false} 
                name="Lower Band"
                strokeDasharray="3 3"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </>
          )}
          
          {showMA && (
            <>
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="sma20" 
                stroke="#EF4444" 
                dot={false} 
                name="SMA 20"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="ema50" 
                stroke="#10B981" 
                dot={false} 
                name="EMA 50"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </>
          )}
          
          {showVolume && (
            <Area
              yAxisId="right" 
              dataKey="normalizedVolume" 
              name="Volume"
              animationDuration={500}
              isAnimationActive={false}
              fill="url(#colorVolume)"
              stroke="#0EA5E9"
              strokeWidth={1}
              dot={false}
              opacity={0.6}
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
          )}
          
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
