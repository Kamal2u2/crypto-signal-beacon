
import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon } from 'lucide-react';

interface ChartLoadingStateProps {
  isPending: boolean;
  hasData: boolean;
}

const ChartLoadingState: React.FC<ChartLoadingStateProps> = ({ isPending, hasData }) => {
  if (isPending) {
    return (
      <CardContent className="flex justify-center items-center h-64">
        <Skeleton className="w-full h-48" />
      </CardContent>
    );
  }

  if (!hasData) {
    return (
      <CardContent>
        <div className="flex flex-col items-center justify-center h-32">
          <InfoIcon className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-600">No data available</p>
          <p className="text-sm text-gray-500 mt-1">Waiting for data...</p>
        </div>
      </CardContent>
    );
  }

  return null;
};

export default ChartLoadingState;
