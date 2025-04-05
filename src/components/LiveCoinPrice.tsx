
import React, { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, RefreshCw, Clock, Cpu } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPrice } from '@/utils/chartFormatters';

interface LiveCoinPriceProps {
  price: number | null;
  symbol: string;
  className?: string;
  isSimulated?: boolean;
}

const LiveCoinPrice: React.FC<LiveCoinPriceProps> = ({ 
  price, 
  symbol, 
  className, 
  isSimulated = false 
}) => {
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track time since last update
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update the time since last update display more frequently
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Only start the interval if we have received at least one price update
    if (lastUpdateTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 1000);
        
        if (seconds < 60) {
          setTimeSinceUpdate(`${seconds}s ago`);
        } else if (seconds < 3600) {
          setTimeSinceUpdate(`${Math.floor(seconds / 60)}m ago`);
        } else {
          setTimeSinceUpdate(`${Math.floor(seconds / 3600)}h ago`);
        }
      }, 500); // Update every 0.5 seconds for smoother countdown
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastUpdateTime]);
  
  // Immediately update display price with high-priority rendering
  useEffect(() => {
    if (price !== null) {
      // First time initialization
      if (displayPrice === null) {
        setDisplayPrice(price);
        setPreviousPrice(price);
        setLastUpdateTime(new Date());
        return;
      }
      
      // Always update immediately
      setPreviousPrice(displayPrice);
      setDisplayPrice(price);
      
      // Set direction and flash for any price change
      if (price !== displayPrice) {
        setPriceDirection(price > displayPrice ? 'up' : 'down');
        setFlashAnimation(true);
      }
      
      // Always update the timestamp to show freshness
      setLastUpdateTime(new Date());
      
      // Reset flash animation after a short period
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setFlashAnimation(false);
        timeoutRef.current = null;
      }, 500); // Reduced to 500ms for quicker animation refresh
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [price, displayPrice]);

  // Don't render anything if we don't have a price
  if (displayPrice === null) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-150", // Reduced animation duration
        flashAnimation && priceDirection === 'up' && "bg-green-50 dark:bg-green-900/20",
        flashAnimation && priceDirection === 'down' && "bg-red-50 dark:bg-red-900/20",
        "bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-base text-gray-600 dark:text-gray-300 font-medium">{symbol}</span>
            {lastUpdateTime && (
              <div className="flex items-center text-xs text-gray-400 ml-2">
                <Clock className="h-3 w-3 mr-1" />
                {timeSinceUpdate}
                {lastUpdateTime && new Date().getTime() - lastUpdateTime.getTime() > 3000 && (
                  <span className="ml-2 text-amber-500 animate-pulse">
                    <RefreshCw className="h-3 w-3" />
                  </span>
                )}
              </div>
            )}
            
            {isSimulated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1 text-xs">
                      <Cpu className="h-3 w-3" />
                      <span>Simulated</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Using simulated data. Real market data is unavailable.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-3xl font-bold",
            priceDirection === 'up' && "text-green-600 dark:text-green-500",
            priceDirection === 'down' && "text-red-600 dark:text-red-500",
            !priceDirection && "text-gray-800 dark:text-gray-200"
          )}>
            ${formatPrice(displayPrice)}
          </span>
          
          {priceDirection && (
            <span className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full ml-3",
              priceDirection === 'up' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : 
                                       "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            )}>
              {priceDirection === 'up' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(LiveCoinPrice);
