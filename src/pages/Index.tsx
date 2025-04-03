import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus, Maximize2, Minimize2 } from 'lucide-react';
import ControlPanel from '@/components/ControlPanel';
import PriceChart, { BacktestResults } from '@/components/PriceChart';
import SignalDisplay from '@/components/SignalDisplay';
import ConfidenceControl from '@/components/ConfidenceControl';
import BacktestPanel, { BacktestSettings } from '@/components/BacktestPanel';
import LiveCoinPrice from '@/components/LiveCoinPrice';
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
  
  const [isBacktestMode, setIsBacktestMode] = useState<boolean>(false);
  const [isRunningBacktest, setIsRunningBacktest] = useState<boolean>(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
  const [fullscreenChart, setFullscreenChart] = useState<boolean>(false);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isAudioInitialized, setIsAudioInitialized] = useState<boolean>(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  
  const debugCounterRef = useRef<number>(0);

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
    console.log(`Price update received: ${price} for ${selectedPair.symbol}`);
    setCurrentPrice(price);
  }, [selectedPair.symbol]);

  // Initial data fetch and WebSocket setup
  useEffect(() => {
    if (!isBacktestMode) {
      const fetchAndInitialize = async () => {
        setIsLoading(true);
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
          
          // Get initial price
          const initialPrice = await fetchCurrentPrice(selectedPair.symbol);
          setCurrentPrice(initialPrice);
          
          // Initialize price WebSocket
          initializePriceWebSocket(
            selectedPair.symbol,
            handlePriceUpdate
          );
          
        } catch (error) {
          console.error('Error initializing data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAndInitialize();
      
      // Cleanup WebSocket on unmount or when pair/interval changes
      return () => {
        closeWebSocket();
        closePriceWebSocket();
      };
    }
  }, [selectedPair.symbol, selectedInterval, isBacktestMode, handleKlineUpdate, handlePriceUpdate]);

  // Keep alive ping for price websocket
  useEffect(() => {
    const pingInterval = setInterval(() => {
      pingPriceWebSocket();
    }, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(pingInterval);
    };
  }, []);

  // Update manual refresh to reconnect WebSocket
  const handleRefresh = () => {
    if (!isBacktestMode) {
      closeWebSocket();
      closePriceWebSocket();
      initializeWebSocket(selectedPair.symbol, selectedInterval, handleKlineUpdate);
      initializePriceWebSocket(selectedPair.symbol, handlePriceUpdate);
    }
  };

  const handlePairChange = (pair: CoinPair) => {
    setSelectedPair(pair);
    setLastSignalType(null);
    setBacktestResults(null);
    
    // Close and reopen WebSockets when pair changes
    closeWebSocket();
    closePriceWebSocket();
    initializeWebSocket(pair.symbol, selectedInterval, handleKlineUpdate);
    initializePriceWebSocket(pair.symbol, handlePriceUpdate);
    
    console.log(`Switching to pair: ${pair.symbol}`);
  };

  const handleBacktestModeToggle = () => {
    const newMode = !isBacktestMode;
    setIsBacktestMode(newMode);
    
    if (newMode) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      setIsAutoRefreshEnabled(false);
      
      toast({
        title: "Backtest Mode Enabled",
        description: "Live trading signals are paused. Configure and run backtests.",
      });
    } else {
      setBacktestResults(null);
      fetchData();
      
      toast({
        title: "Live Trading Mode Enabled",
        description: "Returned to real-time trading signals.",
      });
    }
  };

  const runBacktest = async (settings: BacktestSettings) => {
    setIsRunningBacktest(true);
    setBacktestResults(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Running backtest with settings:", settings);
      
      const data = await fetchKlineData(settings.pair.symbol, settings.interval, 100);
      
      if (data.length > 0) {
        setKlineData(data);
        
        const mockSignals = generateMockBacktestSignals(data, settings);
        const mockPerformance = calculateMockPerformance(mockSignals, settings);
        
        const results: BacktestResults = {
          signals: mockSignals,
          performance: mockPerformance
        };
        
        setBacktestResults(results);
        
        toast({
          title: "Backtest Completed",
          description: `${mockSignals.length} signals generated with ${mockPerformance.winRate.toFixed(1)}% win rate`,
        });
      } else {
        toast({
          title: "Backtest Failed",
          description: "Could not retrieve historical data for backtest",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Backtest error:", error);
      toast({
        title: "Backtest Error",
        description: "An error occurred during backtesting",
        variant: "destructive"
      });
    } finally {
      setIsRunningBacktest(false);
    }
  };

  const generateMockBacktestSignals = (data: KlineData[], settings: BacktestSettings) => {
    const signals: BacktestResults['signals'] = [];
    
    for (let i = 10; i < data.length - 20; i += Math.floor(Math.random() * 10) + 5) {
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const price = data[i].close;
      const time = data[i].openTime;
      
      if (type === 'BUY' && i + 10 < data.length) {
        const futurePrice = data[i + 10].close;
        const profitPercent = ((futurePrice - price) / price) * 100;
        const outcome = profitPercent > 0 ? 'WIN' : 'LOSS';
        
        signals.push({
          time,
          price,
          type,
          profit: futurePrice - price,
          profitPercent,
          outcome
        });
      } 
      else if (type === 'SELL' && i + 10 < data.length) {
        const futurePrice = data[i + 10].close;
        const profitPercent = ((price - futurePrice) / price) * 100;
        const outcome = profitPercent > 0 ? 'WIN' : 'LOSS';
        
        signals.push({
          time,
          price,
          type,
          profit: price - futurePrice,
          profitPercent,
          outcome
        });
      }
    }
    
    return signals;
  };

  const calculateMockPerformance = (signals: BacktestResults['signals'], settings: BacktestSettings) => {
    const winningTrades = signals.filter(s => s.outcome === 'WIN').length;
    const losingTrades = signals.filter(s => s.outcome === 'LOSS').length;
    const totalTrades = signals.length;
    const winRate = (winningTrades / totalTrades) * 100;
    
    const profits = signals.filter(s => s.outcome === 'WIN').map(s => s.profitPercent || 0);
    const losses = signals.filter(s => s.outcome === 'LOSS').map(s => s.profitPercent || 0);
    
    const totalProfit = profits.reduce((sum, val) => sum + val, 0);
    const totalLoss = Math.abs(losses.reduce((sum, val) => sum + val, 0));
    
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    
    const averageProfit = profits.length > 0 ? totalProfit / profits.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((sum, val) => sum + val, 0) / losses.length : 0;
    
    let maxDrawdown = 0;
    let cumProfit = 0;
    let peakProfit = 0;
    
    signals.forEach(signal => {
      if (signal.profitPercent) {
        cumProfit += signal.profitPercent;
        peakProfit = Math.max(peakProfit, cumProfit);
        const drawdown = peakProfit - cumProfit;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    });
    
    const netProfit = signals.reduce((sum, signal) => sum + (signal.profitPercent || 0), 0);
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      netProfit,
      maxDrawdown,
      averageProfit,
      averageLoss
    };
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
            <button
              className={cn(
                "text-xs px-3 py-1 rounded-full transition-colors ml-2",
                isBacktestMode 
                  ? "bg-amber-100 text-amber-700 border border-amber-300" 
                  : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-blue-50"
              )}
              onClick={handleBacktestModeToggle}
            >
              {isBacktestMode ? "Exit Backtest Mode" : "Enter Backtest Mode"}
            </button>
          </div>
        </div>
      </header>
      
      <main className={cn(
        "container py-8 space-y-6",
        fullscreenChart && "h-screen overflow-hidden"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Tabs defaultValue="controls">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="controls">Trading Controls</TabsTrigger>
                <TabsTrigger value="backtest" disabled={!isBacktestMode}>Backtest</TabsTrigger>
              </TabsList>
              
              <TabsContent value="controls" className="mt-4">
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
                
                <div className="mt-6">
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
              
              <TabsContent value="backtest" className="mt-4">
                <BacktestPanel
                  selectedPair={selectedPair}
                  selectedInterval={selectedInterval}
                  onRunBacktest={runBacktest}
                  isRunning={isRunningBacktest}
                  results={backtestResults}
                />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className={cn(
            "lg:col-span-3 flex flex-col",
            fullscreenChart && "fixed inset-0 z-50 bg-white p-4 overflow-auto"
          )}>
            {!isBacktestMode && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* Live price display */}
                <LiveCoinPrice 
                  price={currentPrice} 
                  symbol={selectedPair.label}
                  className="glass-card bg-white rounded-lg shadow-md border border-gray-200"
                />
                
                {/* Signal card */}
                {signalData && (
                  <div className={cn(
                    "glass-card p-4 flex flex-wrap items-center justify-between gap-4 bg-white rounded-lg shadow-md border flex-grow",
                    {
                      'border-crypto-buy': signalData.overallSignal === 'BUY',
                      'border-crypto-sell': signalData.overallSignal === 'SELL',
                      'border-crypto-hold': signalData.overallSignal === 'HOLD',
                      'border-gray-300': signalData.overallSignal === 'NEUTRAL',
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
              </div>
            )}
            
            <div className="relative flex-grow min-h-0 h-full">
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 z-10"
                onClick={toggleFullscreenChart}
              >
                {fullscreenChart ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            
              <div className="crypto-chart-container h-full">
                <PriceChart 
                  data={klineData}
                  isPending={isLoading}
                  symbol={selectedPair.symbol}
                  signalData={!isBacktestMode ? signalData : null}
                  backtestMode={isBacktestMode}
                  backtestResults={backtestResults}
                />
              </div>
            </div>
            
            {!fullscreenChart && !isBacktestMode && (
              <div className="mt-6">
                <SignalDisplay 
                  signalData={signalData}
                  symbol={selectedPair.label}
                  lastPrice={currentPrice}
                  confidenceThreshold={confidenceThreshold}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className={cn(
        "mt-12 py-6 border-t border-crypto-border bg-crypto-accent",
        fullscreenChart && "hidden"
      )}>
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
