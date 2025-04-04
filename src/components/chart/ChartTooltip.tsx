
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { formatTooltipTime } from '@/utils/chartFormatters';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const dataPoint = payload[0].payload;
  
  return (
    <div className="p-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <p className="text-sm font-semibold text-gray-800 mb-1.5">{formatTooltipTime(dataPoint.time)}</p>
      <Separator className="mb-2" />
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Open:</span>
          <span className="text-xs font-semibold">${dataPoint.open.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-500">High:</span>
          <span className="text-xs font-semibold">${dataPoint.high.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Low:</span>
          <span className="text-xs font-semibold">${dataPoint.low.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Close:</span>
          <span className="text-xs font-semibold">${dataPoint.close.toFixed(2)}</span>
        </div>
        
        {dataPoint.sma20 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-red-400 rounded-full"></div>
            <span className="text-xs text-gray-500">SMA20:</span>
            <span className="text-xs font-semibold">${dataPoint.sma20.toFixed(2)}</span>
          </div>
        )}
        
        {dataPoint.ema50 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-500">EMA50:</span>
            <span className="text-xs font-semibold">${dataPoint.ema50.toFixed(2)}</span>
          </div>
        )}
        
        {dataPoint.volume && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <span className="text-xs text-gray-500">Volume:</span>
            <span className="text-xs font-semibold">{dataPoint.volume.toFixed(2)}</span>
          </div>
        )}
        
        {dataPoint.rsi && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-amber-400 rounded-full"></div>
            <span className="text-xs text-gray-500">RSI:</span>
            <span className="text-xs font-semibold">{dataPoint.rsi.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {dataPoint.signalType && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className={cn(
            "flex items-center justify-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full",
            dataPoint.signalType === 'BUY' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {dataPoint.signalType === 'BUY' ? (
              <ArrowUpCircle className="h-3 w-3" />
            ) : (
              <ArrowDownCircle className="h-3 w-3" />
            )}
            {dataPoint.signalType} SIGNAL
          </div>
        </div>
      )}
    </div>
  );
};
