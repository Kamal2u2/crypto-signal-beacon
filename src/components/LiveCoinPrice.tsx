
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

interface LiveCoinPriceProps {
  price: number | null;
  symbol: string;
  className?: string;
}

const LiveCoinPrice: React.FC<LiveCoinPriceProps> = ({ price, symbol, className }) => {
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track time since last update
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update the time since last update display
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
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastUpdateTime]);
  
  // Immediately update display price when we get a new price
  useEffect(() => {
    if (price !== null) {
      // First time initialization
      if (displayPrice === null) {
        setDisplayPrice(price);
        setPreviousPrice(price);
        setLastUpdateTime(new Date());
        return;
      }
      
      // Only update if price actually changed
      if (price !== displayPrice) {
        console.log(`Price update received: ${symbol} = $${price}`);
        setPreviousPrice(displayPrice);
        setDisplayPrice(price);
        setPriceDirection(price > displayPrice ? 'up' : 'down');
        setFlashAnimation(true);
        setLastUpdateTime(new Date());
        
        // Reset flash animation after 1 second
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setFlashAnimation(false);
          timeoutRef.current = null;
        }, 1000);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [price, displayPrice, symbol]);

  // Don't render anything if we don't have a price
  if (displayPrice === null) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
        flashAnimation && priceDirection === 'up' && "bg-green-50",
        flashAnimation && priceDirection === 'down' && "bg-red-50",
        className
      )}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500 font-medium">{symbol} Price</span>
          {lastUpdateTime && (
            <span className="text-xs text-gray-400">({timeSinceUpdate})</span>
          )}
        </div>
        <div className="flex items-center">
          <span className={cn(
            "text-2xl font-bold",
            priceDirection === 'up' && "text-green-600",
            priceDirection === 'down' && "text-red-600"
          )}>
            ${displayPrice.toFixed(2)}
          </span>
          {priceDirection && (
            <span className={cn(
              "ml-2",
              priceDirection === 'up' && "text-green-600",
              priceDirection === 'down' && "text-red-600"
            )}>
              {priceDirection === 'up' ? (
                <ArrowUp className="h-5 w-5" />
              ) : (
                <ArrowDown className="h-5 w-5" />
              )}
            </span>
          )}
          {lastUpdateTime && new Date().getTime() - lastUpdateTime.getTime() > 10000 && (
            <span className="ml-2 text-amber-500 animate-pulse">
              <RefreshCw className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCoinPrice;
