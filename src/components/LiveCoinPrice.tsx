
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';

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
  
  // Track 24h price changes (simulated for now)
  const [dailyChange, setDailyChange] = useState<number>(0);
  const [dailyChangePercent, setDailyChangePercent] = useState<number>(0);
  
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
  
  // Simulate 24h price changes (in a real app, you would get this from the API)
  useEffect(() => {
    if (displayPrice) {
      // Simulate a random 24h change between -5% and +5%
      const randomPercent = (Math.random() * 10) - 5;
      setDailyChangePercent(randomPercent);
      
      // Calculate the absolute change
      const absChange = (displayPrice * randomPercent) / 100;
      setDailyChange(absChange);
    }
  }, [displayPrice]);
  
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
  
  // Function to format price with appropriate decimal places
  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 100) return price.toFixed(3);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.1) return price.toFixed(5);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-300",
        flashAnimation && priceDirection === 'up' && "bg-green-50",
        flashAnimation && priceDirection === 'down' && "bg-red-50",
        "bg-white shadow-md border border-gray-200",
        className
      )}
    >
      <div className="flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-base text-gray-600 font-medium">{symbol}</span>
            {lastUpdateTime && (
              <div className="flex items-center text-xs text-gray-400 ml-2">
                <Clock className="h-3 w-3 mr-1" />
                {timeSinceUpdate}
                {lastUpdateTime && new Date().getTime() - lastUpdateTime.getTime() > 10000 && (
                  <span className="ml-2 text-amber-500 animate-pulse">
                    <RefreshCw className="h-3 w-3" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-3xl font-bold",
            priceDirection === 'up' && "text-green-600",
            priceDirection === 'down' && "text-red-600",
            !priceDirection && "text-gray-800"
          )}>
            ${formatPrice(displayPrice)}
          </span>
          
          {priceDirection && (
            <span className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full ml-3",
              priceDirection === 'up' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}>
              {priceDirection === 'up' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">24h Change:</span>
            <span className={cn(
              "flex items-center text-sm font-medium",
              dailyChangePercent > 0 ? "text-green-600" : "text-red-600"
            )}>
              {dailyChangePercent > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              ${Math.abs(dailyChange).toFixed(2)} ({dailyChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCoinPrice;
