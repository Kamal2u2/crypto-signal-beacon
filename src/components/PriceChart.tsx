
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ComposedChart } from 'recharts';
import { KlineData } from '@/services/binanceService';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon } from 'lucide-react';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, isPending, symbol }) => {
  if (isPending) {
    return (
      <Card className="price-chart-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Skeleton className="w-full h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="price-chart-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32">
            <InfoIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-600">No data available</p>
            <p className="text-sm text-gray-500 mt-1">Waiting for data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare volume data - normalize for better visualization
  const maxVolume = Math.max(...data.map(item => item.volume));
  const normalizedData = data.map(item => ({
    ...item,
    normalizedVolume: (item.volume / maxVolume) * 100
  }));

  return (
    <Card className="price-chart-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
          <span className="text-sm text-gray-600">{symbol}</span>
        </div>
      </CardHeader>
      <CardContent>
        <ComposedChart
          width={500}
          height={400}
          data={normalizedData}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
          <YAxis yAxisId="left" orientation="left" domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'normalizedVolume') {
                return [data[normalizedData.indexOf(value as any)].volume.toFixed(2), 'Volume'];
              }
              return [parseFloat(value as string).toFixed(2), name];
            }}
            labelFormatter={(time) => new Date(time).toLocaleString()}
          />
          <Area 
            yAxisId="left" 
            type="monotone" 
            dataKey="close" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.3} 
          />
          <Bar 
            yAxisId="right" 
            dataKey="normalizedVolume" 
            fill="#82ca9d" 
            fillOpacity={0.5} 
          />
        </ComposedChart>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
