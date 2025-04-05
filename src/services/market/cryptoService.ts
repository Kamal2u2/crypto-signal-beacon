import { KlineData, TimeInterval } from './types';

// WebSocket instances for crypto
let priceWebSocket: WebSocket | null = null;
let klineWebSocket: WebSocket | null = null;
let priceWebSocketInterval: NodeJS.Timeout | null = null;
let klineWebSocketInterval: NodeJS.Timeout | null = null;
let klineDataCache: KlineData[] = [];

// Fetch current price for crypto
export const fetchCryptoPrice = async (symbol: string): Promise<number | null> => {
  try {
    console.log(`Fetching current price for crypto: ${symbol}`);
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = await response.json();
    const price = data && data.price ? parseFloat(data.price) : null;
    console.log(`Crypto price received for ${symbol}: ${price}`);
    return price;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return null;
  }
};

// Fetch historical kline data for crypto
export const fetchCryptoKlineData = async (symbol: string, interval: TimeInterval, limit: number = 100): Promise<KlineData[]> => {
  try {
    console.log(`Fetching kline data for crypto: ${symbol} with interval ${interval}`);
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await response.json();
    
    const klineData = data.map((item: any[]) => ({
      openTime: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      closeTime: item[6],
      quoteAssetVolume: parseFloat(item[7]),
      trades: item[8],
      takerBuyBaseAssetVolume: parseFloat(item[9]),
      takerBuyQuoteAssetVolume: parseFloat(item[10])
    }));
    
    console.log(`Received ${klineData.length} kline data points for crypto ${symbol}`);
    return klineData;
  } catch (error) {
    console.error('Error fetching crypto kline data:', error);
    return [];
  }
};

// Initialize WebSocket for crypto price updates
export const initializeCryptoPriceWebSocket = (symbol: string, onPriceUpdate: (price: number) => void) => {
  const wsEndpoint = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;
  
  if (priceWebSocket) {
    priceWebSocket.close();
  }
  
  priceWebSocket = new WebSocket(wsEndpoint);
  
  priceWebSocket.onopen = () => {
    console.log(`Price WebSocket opened for ${symbol}`);
  };
  
  priceWebSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.c) {
        const price = parseFloat(data.c);
        if (!isNaN(price)) {
          onPriceUpdate(price);
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  priceWebSocket.onerror = (error) => {
    console.error('Price WebSocket error:', error);
  };
  
  priceWebSocket.onclose = () => {
    console.log('Price WebSocket closed');
  };
};

// Initialize WebSocket for crypto kline data
export const initializeCryptoKlineWebSocket = (
  symbol: string,
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
) => {
  const wsEndpoint = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
  
  if (klineWebSocket) {
    klineWebSocket.close();
  }
  
  klineWebSocket = new WebSocket(wsEndpoint);
  
  klineWebSocket.onopen = () => {
    console.log(`Kline WebSocket opened for ${symbol}`);
  };
  
  klineWebSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.k) {
        const kline = data.k;
        const klineData: KlineData = {
          openTime: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
          closeTime: kline.T,
          quoteAssetVolume: parseFloat(kline.q),
          trades: kline.n,
          takerBuyBaseAssetVolume: parseFloat(kline.V),
          takerBuyQuoteAssetVolume: parseFloat(kline.Q)
        };
        onKlineUpdate(klineData);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  klineWebSocket.onerror = (error) => {
    console.error('Kline WebSocket error:', error);
  };
  
  klineWebSocket.onclose = () => {
    console.log('Kline WebSocket closed');
  };
};

// Close crypto WebSocket connections
export const closeCryptoWebSocket = () => {
  if (priceWebSocket) {
    priceWebSocket.close();
    priceWebSocket = null;
    console.log('Price WebSocket connection closed.');
  }
  
  if (klineWebSocket) {
    klineWebSocket.close();
    klineWebSocket = null;
    console.log('Kline WebSocket connection closed.');
  }
  
  if (priceWebSocketInterval) {
    clearInterval(priceWebSocketInterval);
    priceWebSocketInterval = null;
  }
  
  if (klineWebSocketInterval) {
    clearInterval(klineWebSocketInterval);
    klineWebSocketInterval = null;
  }
};

// Update Kline Data cache
export const updateKlineData = (newKline: KlineData) => {
  if (!klineDataCache) {
    klineDataCache = [newKline];
    return;
  }
  
  const existingIndex = klineDataCache.findIndex(k => k.openTime === newKline.openTime);
  
  if (existingIndex !== -1) {
    klineDataCache[existingIndex] = newKline;
  } else {
    klineDataCache.push(newKline);
    if (klineDataCache.length > 1000) {
      klineDataCache.shift();
    }
  }
};

// Function to test WebSocket connection
export const testCryptoWebSocketConnection = () => {
  if (priceWebSocket && priceWebSocket.readyState === WebSocket.OPEN) {
    console.log('Price WebSocket connection is open.');
  } else {
    console.log('Price WebSocket connection is closed.');
  }
  
  if (klineWebSocket && klineWebSocket.readyState === WebSocket.OPEN) {
    console.log('Kline WebSocket connection is open.');
  } else {
    console.log('Kline WebSocket connection is closed.');
  }
};

// Ping WebSocket to keep it alive
export const pingCryptoWebSocket = () => {
  if (priceWebSocket && priceWebSocket.readyState === WebSocket.OPEN) {
    priceWebSocket.send('ping');
    console.log('Ping message sent to Price WebSocket server.');
  }
};

// Close price WebSocket only
export const closeCryptoPriceWebSocket = () => {
  if (priceWebSocket) {
    priceWebSocket.close();
    priceWebSocket = null;
    console.log('Price WebSocket connection closed.');
  }
  
  if (priceWebSocketInterval) {
    clearInterval(priceWebSocketInterval);
    priceWebSocketInterval = null;
  }
};
