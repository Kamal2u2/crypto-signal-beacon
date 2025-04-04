
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
  Bar,
  Cell,
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
  yDomain: [number, number];  // Explicitly typed as tuple with exactly 2 numbers
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
            
            <linearGradient id="upCandle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="downCandle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
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
          
          {/* Candlestick representation */}
          {chartData.map((entry, index) => (
            <React.Fragment key={`candle-${index}`}>
              {/* Vertical line from low to high */}
              <Line
                yAxisId="left"
                data={[{ ...entry, lowHigh: [entry.low, entry.high] }]}
                type="monotone"
                dataKey="lowHigh"
                stroke={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                strokeWidth={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls={true}
              />
              {/* Rectangle for open-close */}
              <Bar
                yAxisId="left"
                data={[entry]}
                dataKey={(item) => Math.abs(item.open - item.close)}
                barSize={6}
                fill={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                stroke="none"
                isAnimationActive={false}
                baseValue={Math.min(entry.open, entry.close)}
                style={{ opacity: 0.8 }}
              />
            </React.Fragment>
          ))}
          
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
          
          <Area 
            yAxisId="left" 
            type="monotone" 
            dataKey="close" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            fill="url(#colorPrice)" 
            name="Price"
            animationDuration={500}
            isAnimationActive={false}
            dot={false}
            activeDot={true}
          />
          
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
            <Bar 
              yAxisId="right" 
              dataKey="normalizedVolume" 
              name="Volume"
              animationDuration={500}
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.close >= entry.open ? "#22c55e70" : "#ef444470"} 
                />
              ))}
            </Bar>
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
