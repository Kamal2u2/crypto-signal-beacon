
export const formatXAxisTime = (time: number): string => {
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error formatting X axis time:', error);
    return 'Error';
  }
};

export const formatTooltipTime = (time: number): string => {
  try {
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
    return 'Error';
  }
};
