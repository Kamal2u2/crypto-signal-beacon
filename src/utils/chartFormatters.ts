
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
