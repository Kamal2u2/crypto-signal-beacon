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
  
  const [isBacktestMode, setIsBacktestMode] = useState<boolean>(false);
  const [isRunningBacktest, setIsRunningBacktest] = useState<boolean>(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
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
    if (!isBacktestMode) {
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
    }
  }, [selectedPair.symbol, isBacktestMode, handlePriceUpdate]);

  useEffect(() => {
    if (!isBacktestMode) {
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
    }
  }, [selectedPair.symbol, selectedInterval, isBacktestMode, handleKlineUpdate]);

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
    
    // Instead of immediately reopening here, let the effects handle it
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
      console.log("Running backtest with settings:", settings);
      
      // Convert date range to timestamps
      const fromTimestamp = settings.dateRange.from.getTime();
      const toTimestamp = settings.dateRange.to ? settings.dateRange.to.getTime() : Date.now();
      
      // Calculate time difference
      const timeDiff = toTimestamp - fromTimestamp;
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Limit the backtest to max 90 days to avoid excessive API calls
      if (daysDiff > 90) {
        toast({
          title: "Date Range Too Large",
          description: "Backtest is limited to 90 days maximum. Please select a smaller date range.",
          variant: "destructive"
        });
        setIsRunningBacktest(false);
        return;
      }
      
      // Fetch historical data from Binance for the specified time period
      toast({
        title: "Fetching Historical Data",
        description: `Loading ${settings.pair.label} data for backtest...`,
      });
      
      const data = await fetchKlineData(
        settings.pair.symbol, 
        settings.interval, 
        500,
        fromTimestamp,
        toTimestamp
      );
      
      if (data.length === 0) {
        toast({
          title: "No Data Available",
          description: "Could not retrieve historical data for the selected period",
          variant: "destructive"
        });
        setIsRunningBacktest(false);
        return;
      }
      
      // Set the kline data for the chart
      setKlineData(data);
      
      // Process the data and generate trading signals
      toast({
        title: "Generating Signals",
        description: "Analyzing price data and generating trading signals...",
      });
      
      // Process the signals with our technical analysis
      const backtestSignals = await processBacktestData(data, settings);
      const backtestPerformance = calculateBacktestPerformance(backtestSignals, settings);
      
      const results: BacktestResults = {
        signals: backtestSignals,
        performance: backtestPerformance
      };
      
      setBacktestResults(results);
      
      toast({
        title: "Backtest Completed",
        description: `${backtestSignals.length} signals analyzed with ${backtestPerformance.winRate.toFixed(1)}% win rate`,
      });
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

  // Process backtest data to generate signals
  const processBacktestData = async (data: KlineData[], settings: BacktestSettings) => {
    const signals: BacktestResults['signals'] = [];
    
    // Initialize variables for tracking position state
    let inPosition = false;
    let entryPrice = 0;
    let entryTime = 0;
    let positionType: 'BUY' | 'SELL' | null = null;
    
    // We'll use a sliding window approach to simulate real-time trading
    // For each point in time, we'll only use the data available up to that point
    // to make trading decisions, simulating how a trader would experience it
    for (let i = 30; i < data.length; i++) {
      // Get the data up to the current candle (to avoid look-ahead bias)
      const historicalData = data.slice(0, i);
      
      // Generate signals based on our technical analysis
      const signalData = generateSignals(historicalData);
      
      const currentCandle = data[i];
      const currentTime = currentCandle.openTime;
      const currentPrice = currentCandle.close;
      
      // Check if we should generate a new signal at this point
      if (!inPosition) {
        // Check for entry signal (only if we're not already in a position)
        if (signalData.overallSignal === 'BUY' && signalData.confidence >= 60) {
          inPosition = true;
          entryPrice = currentPrice;
          entryTime = currentTime;
          positionType = 'BUY';
        } else if (signalData.overallSignal === 'SELL' && signalData.confidence >= 60) {
          inPosition = true;
          entryPrice = currentPrice;
          entryTime = currentTime;
          positionType = 'SELL';
        }
      } else {
        // If we're in a position, check for exit conditions
        if (positionType === 'BUY') {
          // For BUY positions, we could exit if:
          // 1. We get a SELL signal
          // 2. Stop loss is hit (configurable percentage below entry)
          // 3. Take profit is hit (configurable percentage above entry)
          
          // Check for stop loss (default 2%)
          const stopLossPrice = entryPrice * 0.98;
          // Check for take profit (default 4%)
          const takeProfitPrice = entryPrice * 1.04;
          
          let exitReason = '';
          let profitPercent = 0;
          
          if (settings.useStopLoss && currentPrice <= stopLossPrice) {
            // Stop loss hit
            profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            exitReason = 'Stop loss';
          } else if (settings.useTakeProfit && currentPrice >= takeProfitPrice) {
            // Take profit hit
            profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            exitReason = 'Take profit';
          } else if (signalData.overallSignal === 'SELL' && signalData.confidence >= 60) {
            // Exit on opposite signal
            profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            exitReason = 'Signal reversal';
          } else if (i === data.length - 1) {
            // Exit at end of data if still in position
            profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            exitReason = 'End of period';
          } else {
            // No exit condition met yet
            continue;
          }
        
          // Add the completed trade to signals
          signals.push({
            time: entryTime,
            price: entryPrice,
            type: 'BUY',
            exitTime: currentTime,
            exitPrice: currentPrice,
            profit: currentPrice - entryPrice,
            profitPercent: profitPercent,
            outcome: profitPercent > 0 ? 'WIN' : 'LOSS',
            exitReason
          });
          
          // Reset position tracking
          inPosition = false;
          entryPrice = 0;
          entryTime = 0;
          positionType = null;
          
        } else if (positionType === 'SELL') {
          // For SELL positions (short selling), we could exit if:
          // 1. We get a BUY signal
          // 2. Stop loss is hit (configurable percentage above entry)
          // 3. Take profit is hit (configurable percentage below entry)
          
          // Check for stop loss (default 2% above entry for shorts)
          const stopLossPrice = entryPrice * 1.02;
          // Check for take profit (default 4% below entry for shorts)
          const takeProfitPrice = entryPrice * 0.96;
          
          let exitReason = '';
          let profitPercent = 0;
          
          if (settings.useStopLoss && currentPrice >= stopLossPrice) {
            // Stop loss hit
            profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
            exitReason = 'Stop loss';
          } else if (settings.useTakeProfit && currentPrice <= takeProfitPrice) {
            // Take profit hit
            profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
            exitReason = 'Take profit';
          } else if (signalData.overallSignal === 'BUY' && signalData.confidence >= 60) {
            // Exit on opposite signal
            profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
            exitReason = 'Signal reversal';
          } else if (i === data.length - 1) {
            // Exit at end of data if still in position
            profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
            exitReason = 'End of period';
          } else {
            // No exit condition met yet
            continue;
          }
          
          // Add the completed trade to signals
          signals.push({
            time: entryTime,
            price: entryPrice,
            type: 'SELL',
            exitTime: currentTime,
            exitPrice: currentPrice,
            profit: entryPrice - currentPrice,
            profitPercent: profitPercent,
            outcome: profitPercent > 0 ? 'WIN' : 'LOSS',
            exitReason
          });
          
          // Reset position tracking
          inPosition = false;
          entryPrice = 0;
          entryTime = 0;
          positionType = null;
        }
      }
    }
    
    return signals;
  };

  const calculateBacktestPerformance = (signals: BacktestResults['signals'], settings: BacktestSettings) => {
    // If no signals were generated, return default performance metrics
    if (signals.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        netProfit: 0,
        maxDrawdown: 0,
        averageProfit: 0,
        averageLoss: 0
      };
    }
    
    const winningTrades = signals.filter(s => s.outcome === 'WIN').length;
    const losingTrades = signals.filter(s => s.outcome === 'LOSS').length;
    const totalTrades = signals.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const profits = signals.filter(s => s.outcome === 'WIN').map(s => s.profitPercent || 0);
    const losses = signals.filter(s => s.outcome === 'LOSS').map(s => s.profitPercent || 0);
    
    const totalProfit = profits.reduce((sum, val) => sum + val, 0);
    const totalLoss = Math.abs(losses.reduce((sum, val) => sum + val, 0));
    
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    
    const averageProfit = profits.length > 0 ? totalProfit / profits.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((sum, val) => sum + val, 0) / losses.length : 0;
    
    // Calculate drawdown
    let maxDrawdown = 0;
    let peakCapital = settings.initialCapital;
    let currentCapital = settings.initialCapital;
    
    // Sort signals by time to simulate chronological trades
    const sortedSignals = [...signals].sort((a, b) => a.time - b.time);
    
    sortedSignals.forEach(signal => {
      // Apply position sizing to each trade
      const positionSize = currentCapital * (settings.positionSize / 100);
      const profitLoss = positionSize * (signal.profitPercent || 0) / 100;
      
      // Update capital after trade
      currentCapital += profitLoss;
      
      // Update peak capital if new high
      if (currentCapital > peakCapital) {
        peakCapital = currentCapital;
      }
      
      // Calculate drawdown from peak
      const drawdown = ((peakCapital - currentCapital) / peakCapital) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    // Calculate net profit percentage from initial capital
    const netProfit = ((currentCapital - settings.initialCapital) / settings.initialCapital) * 100;
    
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
            <button
              className={cn(
                "text-xs px-3 py-1 rounded-full transition-colors ml-2",
                isBacktestMode 
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-800" 
                  : "bg-secondary text-muted-foreground border border-border hover:bg-primary/10"
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
            
            {/* News Panel for selected coin */}
            <div className="mt-6">
              <NewsPanel coinSymbol={selectedPair.symbol} />
            </div>
          </div>
          
          <div className={cn(
            "lg:col-span-3 flex flex-col",
            fullscreenChart && "fixed inset-0 z-50 bg-background p-4 overflow-auto"
          )}>
            {!isBacktestMode && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* Live price display */}
                <LiveCoinPrice 
                  price={currentPrice} 
                  symbol={selectedPair.label}
                  className="glass-card rounded-lg shadow-md border border-border"
                />
                
                {/* Signal card */}
                {signalData && (
                  <div className={cn(
                    "glass-card p-4 flex flex-wrap items-center justify-between gap-4 rounded-lg shadow-md border flex-grow",
                    {
                      'border-crypto-buy': signalData.overallSignal === 'BUY',
                      'border-crypto-sell': signalData.overallSignal === 'SELL',
                      'border-crypto-hold': signalData.overallSignal === 'HOLD',
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
                      <div className="flex flex-wrap gap-4">
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
            )}
            
            <div className="relative flex-grow min-h-[500px]">
              <div className="absolute inset-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
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
                  backtestMode={isBacktestMode}
                  backtestResults={backtestResults}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
