import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import ControlPanel from '@/components/ControlPanel';
import PriceChart from '@/components/PriceChart';
import SignalDisplay from '@/components/SignalDisplay';
import ConfidenceControl from '@/components/ConfidenceControl';
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
  playSignalSound,
  requestNotificationPermission,
  sendSignalNotification
} from '@/services/notificationService';

const Index = () => {
  // State for user selections
  const [selectedPair, setSelectedPair] = useState<CoinPair>(COIN_PAIRS[0]);
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('15m');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(false);
  
  // Signal settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [alertVolume, setAlertVolume] = useState<number>(0.7);
  
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
  
  // Notification permission state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

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
        
        // Check if signal meets the confidence threshold
        const isSignalValid = signals.overallSignal !== 'NEUTRAL' && 
                             signals.overallSignal !== 'HOLD' && 
                             signals.confidence >= confidenceThreshold;
        
        // Check if we need to play a notification sound or send browser notification
        if (isAudioInitialized && alertsEnabled && isSignalValid && signals.overallSignal !== lastSignalType) {
          if (signals.overallSignal === 'BUY' || signals.overallSignal === 'SELL') {
            // Play sound alert
            playSignalSound(signals.overallSignal, alertVolume);
            
            // Send browser notification if enabled
            if (notificationsEnabled) {
              sendSignalNotification(
                signals.overallSignal, 
                selectedPair.label, 
                signals.confidence
              );
            }
            
            // Show toast notification
            toast({
              title: `${signals.overallSignal} Signal Detected`,
              description: `${selectedPair.label} - Confidence: ${signals.confidence.toFixed(0)}%`,
              variant: signals.overallSignal === 'BUY' ? 'default' : 'destructive',
            });
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
  }, [selectedPair, selectedInterval, isAudioInitialized, lastSignalType, alertsEnabled, alertVolume, confidenceThreshold, notificationsEnabled]);

  // Set up initial data fetch
  useEffect(() => {
    fetchData();
    
    // Initialize audio on first render
    const initAudio = () => {
      initializeAudio();
      setIsAudioInitialized(true);
      document.removeEventListener('click', initAudio);
      
      // Also try to request notification permission
      const hasPermission = requestNotificationPermission();
      setNotificationsEnabled(hasPermission);
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
      <header className="w-full py-6 border-b border-crypto-border bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container">
          <h1 className="text-3xl font-bold text-center text-gray-800">
            Crypto Signal by Kamal
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Real-time cryptocurrency trading signals powered by advanced technical analysis
          </p>
          <div className="flex justify-center mt-2">
            <button
              className={cn(
                "text-xs px-3 py-1 rounded-full transition-colors",
                notificationsEnabled 
                  ? "bg-green-100 text-green-700 border border-green-300" 
                  : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-blue-50"
              )}
              onClick={() => {
                const hasPermission = requestNotificationPermission();
                setNotificationsEnabled(hasPermission);
                
                toast({
                  title: hasPermission 
                    ? "Notifications enabled" 
                    : "Notification permission required",
                  description: hasPermission 
                    ? "You will receive browser notifications for new signals" 
                    : "Please allow notifications in your browser settings",
                  variant: hasPermission ? "default" : "destructive",
                });
              }}
            >
              {notificationsEnabled ? "Notifications On" : "Enable Notifications"}
            </button>
          </div>
        </div>
      </header>
      
      <main className="container py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
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
          </div>
          <div className="md:col-span-1">
            <ConfidenceControl
              confidenceThreshold={confidenceThreshold}
              setConfidenceThreshold={setConfidenceThreshold}
              alertVolume={alertVolume}
              setAlertVolume={setAlertVolume}
              alertsEnabled={alertsEnabled}
              setAlertsEnabled={setAlertsEnabled}
            />
          </div>
        </div>
        
        {/* Signal Summary Card at the top for better visibility */}
        {signalData && (
          <div className={cn(
            "glass-card p-4 mb-4 flex flex-wrap items-center justify-between gap-4",
            {
              'opacity-50': signalData.confidence < confidenceThreshold
            }
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-full",
                {
                  'bg-crypto-buy text-white': signalData.overallSignal === 'BUY',
                  'bg-crypto-sell text-white': signalData.overallSignal === 'SELL',
                  'bg-crypto-hold text-white': signalData.overallSignal === 'HOLD',
                  'bg-gray-400 text-white': signalData.overallSignal === 'NEUTRAL'
                }
              )}>
                {signalData.overallSignal === 'BUY' && <ArrowUp className="h-6 w-6" />}
                {signalData.overallSignal === 'SELL' && <ArrowDown className="h-6 w-6" />}
                {(signalData.overallSignal === 'HOLD' || signalData.overallSignal === 'NEUTRAL') && <Minus className="h-6 w-6" />}
              </div>
              
              <div>
                <h2 className={cn(
                  "text-xl font-bold",
                  {
                    'text-crypto-buy': signalData.overallSignal === 'BUY',
                    'text-crypto-sell': signalData.overallSignal === 'SELL',
                    'text-crypto-hold': signalData.overallSignal === 'HOLD',
                    'text-gray-600': signalData.overallSignal === 'NEUTRAL'
                  }
                )}>
                  {signalData.overallSignal} {selectedPair.label}
                </h2>
                <p className="text-sm text-gray-600">
                  {signalData.confidence.toFixed(0)}% confidence 
                  {signalData.confidence < confidenceThreshold && (
                    <span className="text-crypto-sell ml-2">(Below threshold)</span>
                  )}
                </p>
              </div>
            </div>
            
            {signalData.priceTargets && (signalData.overallSignal === 'BUY' || signalData.overallSignal === 'SELL') && (
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Entry</span>
                  <span className="font-medium">${signalData.priceTargets.entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-crypto-sell">Stop Loss</span>
                  <span className="font-medium">${signalData.priceTargets.stopLoss.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-crypto-buy">Target 1</span>
                  <span className="font-medium">${signalData.priceTargets.target1.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-crypto-buy">Target 2</span>
                  <span className="font-medium">${signalData.priceTargets.target2.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-crypto-buy">Target 3</span>
                  <span className="font-medium">${signalData.priceTargets.target3.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
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
              confidenceThreshold={confidenceThreshold}
            />
          </div>
        </div>
      </main>
      
      <footer className="mt-12 py-6 border-t border-crypto-border bg-crypto-accent">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            Crypto Signal by Kamal — Advanced trading signals with real-time data
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Disclaimer: This tool is for educational purposes only. Always do your own research before making trading decisions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
