
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import ControlPanel from '@/components/ControlPanel';
import PriceChart from '@/components/PriceChart';
import SignalDisplay from '@/components/SignalDisplay';
import { 
  CoinPair, 
  COIN_PAIRS, 
  TimeInterval, 
  fetchKlineData,
  fetchCurrentPrice,
  KlineData
} from '@/services/binanceService';
import { 
  generateSignals, 
  SignalSummary, 
  SignalType 
} from '@/services/technicalAnalysisService';
import { 
  initializeAudio, 
  playSignalSound 
} from '@/services/notificationService';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  // State for user selections
  const [selectedPair, setSelectedPair] = useState<CoinPair>(COIN_PAIRS[0]);
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('15m');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(false);
  
  // State for data
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [signalData, setSignalData] = useState<SignalSummary | null>(null);
  const [lastSignalType, setLastSignalType] = useState<SignalType | null>(null);
  
  // Interval reference
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio initialization flag
  const [isAudioInitialized, setIsAudioInitialized] = useState<boolean>(false);

  // Function to fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch kline data
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval, 100);
      
      if (data.length > 0) {
        setKlineData(data);
        
        // Generate signals
        const signals = generateSignals(data);
        setSignalData(signals);
        
        // Check if we need to play a notification sound
        if (isAudioInitialized && signals.overallSignal !== lastSignalType) {
          if (signals.overallSignal === 'BUY' || signals.overallSignal === 'SELL') {
            playSignalSound(signals.overallSignal);
          }
          setLastSignalType(signals.overallSignal);
        }
        
        // Fetch current price
        const price = await fetchCurrentPrice(selectedPair.symbol);
        setCurrentPrice(price);
      } else {
        toast({
          title: "No data available",
          description: `Could not retrieve data for ${selectedPair.label}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data from Binance API",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPair, selectedInterval, isAudioInitialized, lastSignalType]);

  // Set up initial data fetch
  useEffect(() => {
    fetchData();
    
    // Initialize audio on first render
    const initAudio = () => {
      initializeAudio();
      setIsAudioInitialized(true);
      document.removeEventListener('click', initAudio);
    };
    
    // Audio needs to be initialized after a user interaction
    document.addEventListener('click', initAudio);
    
    return () => {
      document.removeEventListener('click', initAudio);
    };
  }, [fetchData]);

  // Set up auto-refresh
  useEffect(() => {
    if (isAutoRefreshEnabled) {
      refreshTimerRef.current = setInterval(fetchData, refreshInterval);
      
      toast({
        title: "Auto-refresh enabled",
        description: `Data will refresh every ${refreshInterval / 1000} seconds`
      });
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
    
    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [isAutoRefreshEnabled, refreshInterval, fetchData]);
  
  // Refresh when pair or interval changes
  useEffect(() => {
    fetchData();
  }, [selectedPair, selectedInterval, fetchData]);

  // User manually refreshes
  const handleRefresh = () => {
    fetchData();
  };

  // Handle pair change
  const handlePairChange = (pair: CoinPair) => {
    setSelectedPair(pair);
    setLastSignalType(null); // Reset signal type when pair changes
  };

  return (
    <div className="min-h-screen bg-crypto-primary text-foreground">
      <header className="w-full py-6 border-b border-gray-800">
        <div className="container">
          <h1 className="text-3xl font-bold text-center text-primary">Crypto Signal Beacon</h1>
          <p className="text-center text-muted-foreground mt-2">
            Real-time cryptocurrency trading signals powered by technical analysis
          </p>
        </div>
      </header>
      
      <main className="container py-6 space-y-6">
        <ControlPanel 
          selectedPair={selectedPair}
          setSelectedPair={handlePairChange}
          selectedInterval={selectedInterval}
          setSelectedInterval={setSelectedInterval}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          isAutoRefreshEnabled={isAutoRefreshEnabled}
          setIsAutoRefreshEnabled={setIsAutoRefreshEnabled}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <PriceChart 
              data={klineData}
              isPending={isLoading}
              symbol={selectedPair.symbol}
            />
          </div>
          
          <div className="md:col-span-1">
            <SignalDisplay 
              signalData={signalData}
              symbol={selectedPair.label}
              lastPrice={currentPrice}
            />
          </div>
        </div>
      </main>
      
      <footer className="mt-12 py-6 border-t border-gray-800 bg-crypto-secondary">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            Crypto Signal Beacon — Real-time trading signals 
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Disclaimer: This tool is for educational purposes only. Always do your own research before making trading decisions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
