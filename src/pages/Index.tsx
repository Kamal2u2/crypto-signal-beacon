import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus, Maximize2, Minimize2, LayoutDashboard } from 'lucide-react';
import ControlPanel from '@/components/ControlPanel';
import PriceChart from '@/components/PriceChart';
import SignalDisplay from '@/components/SignalDisplay';
import ConfidenceControl from '@/components/ConfidenceControl';
import IndicatorsPanel from '@/components/BacktestPanel';
import LiveCoinPrice from '@/components/LiveCoinPrice';
import NewsPanel from '@/components/NewsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CoinPair, 
  COIN_PAIRS, 
  TimeInterval, 
  fetchKlineData,
  fetchCurrentPrice,
  KlineData,
  initializeWebSocket,
  initializePriceWebSocket,
  closeWebSocket,
  closePriceWebSocket,
  updateKlineData,
  pingPriceWebSocket
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
  sendSignalNotification,
  debugSignalSystem
} from '@/services/notificationService';
import { Button } from '@/components/ui/button';

import './index.css';

const Index = () => {
  const [selectedPair, setSelectedPair] = useState<CoinPair>(COIN_PAIRS[0]);
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('15m');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(false);
  
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(50); // Lower threshold to get more signals
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [alertVolume, setAlertVolume] = useState<number>(0.7);
  
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [signalData, setSignalData] = useState<SignalSummary | null>(null);
  const [lastSignalType, setLastSignalType] = useState<SignalType | null>(null);
  
  const [fullscreenChart, setFullscreenChart] = useState<boolean>(false);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isAudioInitialized, setIsAudioInitialized] = useState<boolean>(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  
  const debugCounterRef = useRef<number>(0);
  
  const lastPriceUpdateRef = useRef<number>(Date.now());

  const handleKlineUpdate = useCallback((newKline: KlineData) => {
    setKlineData(prevData => {
      const updatedData = updateKlineData(newKline);
      
      // Generate new signals with the updated data
      const newSignals = generateSignals(updatedData);
      setSignalData(newSignals);
      
      // Check for new valid signals
      const isSignalValid = newSignals.overallSignal !== 'NEUTRAL' && 
                           newSignals.overallSignal !== 'HOLD' && 
                           newSignals.confidence >= confidenceThreshold;
      
      if (isAudioInitialized && alertsEnabled && isSignalValid && newSignals.overallSignal !== lastSignalType) {
        if (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') {
          playSignalSound(newSignals.overallSignal, alertVolume);
          
          if (notificationsEnabled) {
            sendSignalNotification(
              newSignals.overallSignal, 
              selectedPair.label, 
              newSignals.confidence
            );
          }
          
          toast({
            title: `${newSignals.overallSignal} Signal Detected`,
            description: `${selectedPair.label} - Confidence: ${newSignals.confidence.toFixed(0)}%`,
            variant: newSignals.overallSignal === 'BUY' ? 'default' : 'destructive',
          });
          
          setLastSignalType(newSignals.overallSignal);
        }
      }
      
      return updatedData;
    });
  }, [
    selectedPair.label,
    confidenceThreshold,
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    lastSignalType
  ]);

  const handlePriceUpdate = useCallback((price: number) => {
    console.log(`Price update received in Index: ${price} for ${selectedPair.symbol}`);
    setCurrentPrice(price);
    lastPriceUpdateRef.current = Date.now();
  }, [selectedPair.symbol]);

  useEffect(() => {
    const setupPriceWebSocket = async () => {
      try {
        // Get initial price
        const initialPrice = await fetchCurrentPrice(selectedPair.symbol);
        setCurrentPrice(initialPrice);
        
        // Initialize price WebSocket with explicit callback
        initializePriceWebSocket(
          selectedPair.symbol,
          handlePriceUpdate
        );
        
        // Set up a backup timer to check if we're getting updates
        const checkPriceUpdates = setInterval(() => {
          const now = Date.now();
          const timeSinceLastUpdate = now - lastPriceUpdateRef.current;
          
          // If no price update for 5 seconds, manually fetch a new price
          // and try to reconnect the WebSocket
          if (timeSinceLastUpdate > 5000) {
            console.log(`No price updates for ${Math.round(timeSinceLastUpdate/1000)}s, manually fetching price`);
            
            // Fetch a fresh price
            fetchCurrentPrice(selectedPair.symbol)
              .then(price => {
                if (price !== null) {
                  setCurrentPrice(price);
                  lastPriceUpdateRef.current = now;
                }
              })
              .catch(err => console.error("Error fetching fallback price:", err));
            
            // Try to reconnect the WebSocket
            closePriceWebSocket();
            initializePriceWebSocket(selectedPair.symbol, handlePriceUpdate);
          }
        }, 2000); // Check every 2 seconds
        
        return () => {
          clearInterval(checkPriceUpdates);
          closePriceWebSocket();
        };
      } catch (error) {
        console.error('Error setting up price WebSocket:', error);
        toast({
          title: "Price Connection Error",
          description: "Failed to establish price connection. Try refreshing the page.",
          variant: "destructive"
        });
      }
    };
    
    setupPriceWebSocket();
  }, [selectedPair.symbol, handlePriceUpdate]);

  useEffect(() => {
    const setupKlineWebSocket = async () => {
      try {
        const data = await fetchKlineData(selectedPair.symbol, selectedInterval);
        setKlineData(data);
        
        const signals = generateSignals(data);
        setSignalData(signals);
        
        // Initialize WebSocket after getting initial data
        initializeWebSocket(
          selectedPair.symbol,
          selectedInterval,
          handleKlineUpdate
        );
      } catch (error) {
        console.error('Error initializing kline data:', error);
        toast({
          title: "Connection Error",
          description: "Failed to load chart data. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    setupKlineWebSocket();
    
    // Cleanup WebSocket on unmount or when pair/interval changes
    return () => {
      closeWebSocket();
    };
  }, [selectedPair.symbol, selectedInterval, handleKlineUpdate]);

  const handleRefresh = () => {
    closeWebSocket();
    closePriceWebSocket();
    initializeWebSocket(selectedPair.symbol, selectedInterval, handleKlineUpdate);
    initializePriceWebSocket(selectedPair.symbol, handlePriceUpdate);
  };

  const handlePairChange = (pair: CoinPair) => {
    setSelectedPair(pair);
    setLastSignalType(null);
    
    // Close and reopen WebSockets when pair changes
    closeWebSocket();
    closePriceWebSocket();
    
    // Instead of immediately reopening here, let the effects handle it
    console.log(`Switching to pair: ${pair.symbol}`);
  };

  const toggleFullscreenChart = () => {
    setFullscreenChart(!fullscreenChart);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    debugCounterRef.current += 1;
    const cycleNumber = debugCounterRef.current;
    
    try {
      console.log(`[Cycle ${cycleNumber}] Fetching data for ${selectedPair.symbol} at ${selectedInterval} interval`);
      
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval, 100);
      
      if (data.length > 0) {
        setKlineData(data);
        
        const signals = generateSignals(data);
        setSignalData(signals);
        
        debugSignalSystem(signals, data);
        
        const isSignalValid = signals.overallSignal !== 'NEUTRAL' && 
                             signals.overallSignal !== 'HOLD' && 
                             signals.confidence >= confidenceThreshold;
        
        if (isAudioInitialized && alertsEnabled && isSignalValid && signals.overallSignal !== lastSignalType) {
          if (signals.overallSignal === 'BUY' || signals.overallSignal === 'SELL') {
            playSignalSound(signals.overallSignal, alertVolume);
            
            if (notificationsEnabled) {
              sendSignalNotification(
                signals.overallSignal, 
                selectedPair.label, 
                signals.confidence
              );
            }
            
            toast({
              title: `${signals.overallSignal} Signal Detected`,
              description: `${selectedPair.label} - Confidence: ${signals.confidence.toFixed(0)}%`,
              variant: signals.overallSignal === 'BUY' ? 'default' : 'destructive',
            });
          }
          setLastSignalType(signals.overallSignal);
        }
        
        console.log(`[Cycle ${cycleNumber}] Signal: ${signals.overallSignal}, Confidence: ${signals.confidence.toFixed(0)}%, Threshold: ${confidenceThreshold}%`);
        
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
      console.error(`[Cycle ${cycleNumber}] Error fetching data:`, error);
      toast({
        title: "Error",
        description: "Failed to fetch data from Binance API",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPair, selectedInterval, isAudioInitialized, lastSignalType, alertsEnabled, alertVolume, confidenceThreshold, notificationsEnabled]);

  useEffect(() => {
    fetchData();
    
    const initAudio = () => {
      initializeAudio();
      setIsAudioInitialized(true);
      document.removeEventListener('click', initAudio);
      
      const hasPermission = requestNotificationPermission();
      setNotificationsEnabled(hasPermission);
    };
    
    document.addEventListener('click', initAudio);
    
    return () => {
      document.removeEventListener('click', initAudio);
    };
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="w-full py-6 border-b border-border bg-gradient-to-r from-secondary to-secondary/50 dark:from-secondary/20 dark:to-secondary/10">
        <div className="container">
          <h1 className="text-3xl font-bold text-center text-foreground">
            Crypto Signal by Kamal
          </h1>
          <p className="text-center text-muted-foreground mt-2">
            Real-time cryptocurrency trading signals powered by advanced technical analysis
          </p>
          <div className="flex justify-center mt-2">
            <button
              className={cn(
                "text-xs px-3 py-1 rounded-full transition-colors",
                notificationsEnabled 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-800" 
                  : "bg-secondary text-muted-foreground border border-border hover:bg-primary/10"
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
      
      <main className={cn(
        "container py-8",
        fullscreenChart && "h-screen overflow-hidden"
      )}>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <LiveCoinPrice 
            price={currentPrice} 
            symbol={selectedPair.label}
            className="glass-card rounded-lg shadow-md border border-border flex-grow md:flex-grow-0"
          />
          
          {signalData && (
            <div className={cn(
              "glass-card p-4 flex flex-wrap items-center gap-4 rounded-lg shadow-md border flex-grow",
              {
                'border-crypto-buy border-2': signalData.overallSignal === 'BUY',
                'border-crypto-sell border-2': signalData.overallSignal === 'SELL',
                'border-crypto-hold border-2': signalData.overallSignal === 'HOLD',
                'border-border': signalData.overallSignal === 'NEUTRAL',
                'opacity-70': signalData.confidence < confidenceThreshold
              }
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-full",
                  {
                    'bg-crypto-buy text-white': signalData.overallSignal === 'BUY',
                    'bg-crypto-sell text-white': signalData.overallSignal === 'SELL',
                    'bg-crypto-hold text-white': signalData.overallSignal === 'HOLD',
                    'bg-gray-400 dark:bg-gray-600 text-white': signalData.overallSignal === 'NEUTRAL'
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
                      'text-muted-foreground': signalData.overallSignal === 'NEUTRAL'
                    }
                  )}>
                    {signalData.overallSignal} {selectedPair.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {signalData.confidence.toFixed(0)}% confidence 
                    {signalData.confidence < confidenceThreshold && (
                      <span className="text-crypto-sell ml-2">(Below threshold)</span>
                    )}
                  </p>
                </div>
              </div>
              
              {signalData.priceTargets && (signalData.overallSignal === 'BUY' || signalData.overallSignal === 'SELL') && (
                <div className="flex flex-wrap gap-4 mt-2 md:mt-0 ml-0 md:ml-auto">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Entry</span>
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
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 order-2 xl:order-1">
            <div className="relative min-h-[500px] glass-card rounded-xl shadow-lg mb-6 overflow-hidden">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
                onClick={toggleFullscreenChart}
              >
                {fullscreenChart ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              
              <PriceChart
                data={klineData}
                isPending={isLoading}
                symbol={selectedPair.label}
                signalData={signalData}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="order-2 lg:order-1">
                <SignalDisplay
                  signalData={signalData}
                  symbol={selectedPair.label}
                  lastPrice={currentPrice}
                  confidenceThreshold={confidenceThreshold}
                />
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="glass-card rounded-xl shadow-lg">
                  <div className="p-4 border-b bg-secondary/10 rounded-t-xl flex items-center">
                    <LayoutDashboard className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">News & Updates</h3>
                  </div>
                  <div className="p-0">
                    <NewsPanel coinSymbol={selectedPair.symbol} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="xl:col-span-1 order-1 xl:order-2">
            <div className="glass-card rounded-xl shadow-lg sticky top-4">
              <Tabs defaultValue="controls" className="w-full">
                <TabsList className="w-full grid grid-cols-2 rounded-t-xl border-b">
                  <TabsTrigger value="controls">Trading Controls</TabsTrigger>
                  <TabsTrigger value="indicators">Indicators</TabsTrigger>
                </TabsList>
                
                <TabsContent value="controls" className="p-4">
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
                  
                  <div className="mt-4">
                    <ConfidenceControl
                      confidenceThreshold={confidenceThreshold}
                      setConfidenceThreshold={setConfidenceThreshold}
                      alertVolume={alertVolume}
                      setAlertVolume={setAlertVolume}
                      alertsEnabled={alertsEnabled}
                      setAlertsEnabled={setAlertsEnabled}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="indicators" className="p-4">
                  <IndicatorsPanel
                    selectedPair={selectedPair}
                    selectedInterval={selectedInterval}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
