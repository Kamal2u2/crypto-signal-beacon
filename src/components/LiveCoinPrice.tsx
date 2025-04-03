
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

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
  
  // Immediately update display price when we get a new price
  useEffect(() => {
    if (price !== null) {
      // First time initialization
      if (displayPrice === null) {
        setDisplayPrice(price);
        setPreviousPrice(price);
        return;
      }
      
      // Only update if price actually changed
      if (price !== displayPrice) {
        setPreviousPrice(displayPrice);
        setDisplayPrice(price);
        setPriceDirection(price > displayPrice ? 'up' : 'down');
        setFlashAnimation(true);
        
        // Reset flash animation after 1 second
        const timeout = setTimeout(() => {
          setFlashAnimation(false);
        }, 1000);
        
        return () => clearTimeout(timeout);
      }
    }
  }, [price, displayPrice]);

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
        <span className="text-sm text-gray-500 font-medium">{symbol} Price</span>
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
        </div>
      </div>
    </div>
  );
};

export default LiveCoinPrice;
