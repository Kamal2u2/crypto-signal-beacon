
// Format timestamp for x-axis display
export const formatXAxisTime = (time: number): string => {
  try {
    if (!time || isNaN(time)) {
      return '00:00';
    }
    
    const date = new Date(time);
    if (isNaN(date.getTime())) {
      return '00:00';
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error formatting X axis time:', error);
    return '00:00';
  }
};

// Format timestamp for tooltip display with more detail
export const formatTooltipTime = (time: number): string => {
  try {
    if (!time || isNaN(time)) {
      return 'Invalid time';
    }
    
    const date = new Date(time);
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting tooltip time:', error);
    return 'Invalid time';
  }
};

// Enhanced price formatter helper for consistent price display
export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) {
    return 'N/A';
  }
  
  // Enhanced formatting based on price magnitude - with more precision for small values
  if (price < 0.0001) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  } else if (price < 0.001) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  } else if (price < 0.01) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  } else if (price < 0.1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  } else if (price < 1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  } else if (price < 10) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else if (price < 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price < 10000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
};
