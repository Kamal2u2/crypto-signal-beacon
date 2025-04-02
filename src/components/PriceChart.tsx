import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
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
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
            <YAxis domain={['dataMin', 'dataMax']} />
            <Tooltip />
            <Area type="monotone" dataKey="close" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
