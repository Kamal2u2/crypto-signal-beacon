
import React, { memo } from 'react';
import { Separator } from '@/components/ui/separator';
import { formatTooltipTime } from '@/utils/chartFormatters';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const CustomTooltip = memo(({ active, payload, label }: CustomTooltipProps) => {
  // Return null if not active or no payload to prevent rendering when not needed
  if (!active || !payload || !payload.length || !payload[0] || !payload[0].payload) {
    return null;
  }

  const dataPoint = payload[0].payload;
  
  return (
    <div className="p-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md">
      <p className="text-xs font-semibold text-gray-800 mb-1">{formatTooltipTime(dataPoint.time)}</p>
      <Separator className="mb-1.5" />
      
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
          <span className="text-[10px] text-gray-500">Open:</span>
          <span className="text-[10px] font-semibold">${dataPoint.open.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
          <span className="text-[10px] text-gray-500">High:</span>
          <span className="text-[10px] font-semibold">${dataPoint.high.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 bg-red-500 rounded-full"></div>
          <span className="text-[10px] text-gray-500">Low:</span>
          <span className="text-[10px] font-semibold">${dataPoint.low.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 bg-purple-500 rounded-full"></div>
          <span className="text-[10px] text-gray-500">Close:</span>
          <span className="text-[10px] font-semibold">${dataPoint.close.toFixed(2)}</span>
        </div>
        
        {typeof dataPoint.volume === 'number' && (
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
            <span className="text-[10px] text-gray-500">Volume:</span>
            <span className="text-[10px] font-semibold">{(dataPoint.volume/1000).toFixed(0)}K</span>
          </div>
        )}
        
        {typeof dataPoint.rsi === 'number' && (
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 bg-amber-400 rounded-full"></div>
            <span className="text-[10px] text-gray-500">RSI:</span>
            <span className="text-[10px] font-semibold">{dataPoint.rsi.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      {dataPoint.signalType && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-200">
          <div className={cn(
            "flex items-center justify-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            dataPoint.signalType === 'BUY' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {dataPoint.signalType === 'BUY' ? (
              <ArrowUpCircle className="h-2.5 w-2.5" />
            ) : (
              <ArrowDownCircle className="h-2.5 w-2.5" />
            )}
            {dataPoint.signalType} SIGNAL
          </div>
        </div>
      )}
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';
