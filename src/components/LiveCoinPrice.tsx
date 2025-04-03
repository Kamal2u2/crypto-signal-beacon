
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface LiveCoinPriceProps {
  price: number | null;
  symbol: string;
  className?: string;
}

const LiveCoinPrice: React.FC<LiveCoinPriceProps> = ({ price, symbol, className }) => {
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [flashAnimation, setFlashAnimation] = useState(false);
  
  // Add debounce mechanism to prevent too frequent UI updates
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Debounce function for price updates
  useEffect(() => {
    // Don't update too frequently - minimum 300ms between updates to prevent lag
    const now = Date.now();
    
    if (price !== null && previousPrice !== null && now - lastUpdateTimeRef.current > 300) {
      setPriceDirection(price > previousPrice ? 'up' : price < previousPrice ? 'down' : null);
      setFlashAnimation(true);
      lastUpdateTimeRef.current = now;
      
      // Clear previous timeout if it exists
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Reset flash animation
      animationTimeoutRef.current = setTimeout(() => {
        setFlashAnimation(false);
        animationTimeoutRef.current = null;
      }, 1000);
    }
    
    if (price !== null && previousPrice === null) {
      setPreviousPrice(price);
      lastUpdateTimeRef.current = now;
    }
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [price, previousPrice]);
  
  // Update previous price with a slight delay to reduce flickering
  useEffect(() => {
    if (price !== null && price !== previousPrice) {
      const delay = setTimeout(() => {
        setPreviousPrice(price);
      }, 500); // Delay update slightly to show direction change
      
      return () => clearTimeout(delay);
    }
  }, [price, previousPrice]);
  
  if (price === null) return null;
  
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
        <span className="text-sm text-gray-500 font-medium">{symbol} Price</span>
        <div className="flex items-center">
          <span className={cn(
            "text-2xl font-bold",
            priceDirection === 'up' && "text-green-600",
            priceDirection === 'down' && "text-red-600"
          )}>
            ${price.toFixed(2)}
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
        </div>
      </div>
    </div>
  );
};

export default LiveCoinPrice;
