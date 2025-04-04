import {
  useEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAllCoinPairs,
  fetchKlineData,
  CoinPair,
  TimeInterval,
  KlineData,
  initializeWebSocket,
  closeWebSocket,
  initializePriceWebSocket,
  closePriceWebSocket,
} from "@/services/binanceService";
import { playSignalSound, requestNotificationPermission } from "@/services/notificationService";
import TradingViewChart, { DOMESTIC_TV_CHART_ID } from "@/components/TradingViewChart";
import SignalAnalysis from "@/components/SignalAnalysis";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { Navigation } from "@/components/Navigation";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [coinPairs, setCoinPairs] = useState<CoinPair[]>([]);
  const [selectedCoinPair, setSelectedCoinPair] = useState<CoinPair>({
    symbol: "BTCUSDT",
    label: "BTC/USDT",
  });
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [interval, setInterval] = useState<TimeInterval>("15m");
  const [volume, setVolume] = useState<number>(0.5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [realtimeDataEnabled, setRealtimeDataEnabled] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [signal, setSignal] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChartFullscreen, setIsChartFullscreen] = useState<boolean>(false);
  const [chartLoaded, setChartLoaded] = useState<boolean>(false);
  const tvChartContainerRef: MutableRefObject<HTMLDivElement | null> = useRef(null);
  const { toast } = useToast();
  const { userId, getToken } = useAuth();

  useEffect(() => {
    loadCoinPairs();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    loadInitialChartData();
  }, [selectedCoinPair, interval]);

  useEffect(() => {
    if (realtimeDataEnabled) {
      initializeDataStream();
      initializePriceStream();
    } else {
      closeWebSocket();
      closePriceWebSocket();
    }

    return () => {
      closeWebSocket();
      closePriceWebSocket();
    };
  }, [selectedCoinPair, interval, realtimeDataEnabled]);

  const loadCoinPairs = async () => {
    try {
      const pairs = await fetchAllCoinPairs();
      setCoinPairs(pairs);
    } catch (error) {
      console.error("Error loading coin pairs:", error);
      toast({
        title: "Error loading coin pairs",
        description: "Failed to load available trading pairs",
        variant: "destructive",
      });
    }
  };

  const loadInitialChartData = async () => {
    try {
      const data = await fetchKlineData(selectedCoinPair.symbol, interval);
      setKlineData(data);
    } catch (error) {
      console.error("Error loading initial chart data:", error);
      toast({
        title: "Error loading chart data",
        description: "Failed to load initial chart data",
        variant: "destructive",
      });
    }
  };

  const initializeDataStream = () => {
    initializeWebSocket(
      selectedCoinPair.symbol,
      interval,
      (kline) => {
        setKlineData((prevData) => {
          const existingIndex = prevData.findIndex(
            (item) => item.openTime === kline.openTime
          );

          if (existingIndex > -1) {
            const newData = [...prevData];
            newData[existingIndex] = kline;
            return newData;
          } else {
            const newData = [...prevData, kline];
            return newData.slice(-500);
          }
        });
      }
    );
  };

  const initializePriceStream = () => {
    initializePriceWebSocket(selectedCoinPair.symbol, (price) => {
      setCurrentPrice(price);
    });
  };

  const handleCoinPairSelect = (coinPair: CoinPair) => {
    setSelectedCoinPair(coinPair);
  };

  const handleIntervalSelect = (interval: TimeInterval) => {
    setInterval(interval);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const handleNotificationsToggle = () => {
    setNotificationsEnabled((prev) => !prev);
  };

  const handleRealtimeDataToggle = () => {
    setRealtimeDataEnabled((prev) => !prev);
  };

  const handleSignalAnalysis = (signalData: any) => {
    setSignal(signalData.signal);
    setConfidence(signalData.confidence);

    if (notificationsEnabled) {
      playSignalSound(signalData.signal, volume);
    }
  };

  const handleSignalTrigger = (signalType: string, symbol: string, confidence: number) => {
    const validSignalType: "BUY" | "SELL" | "HOLD" | "NEUTRAL" = 
      signalType === "BUY" ? "BUY" :
      signalType === "SELL" ? "SELL" :
      signalType === "HOLD" ? "HOLD" : "NEUTRAL";
    
    if (notificationsEnabled) {
      playSignalSound(validSignalType, volume);
    }
  };

  const handleChartLoaded = () => {
    setChartLoaded(true);
  };

  return (
    <>
      <Navigation />
      
      <main className="min-h-screen flex flex-col">
        <SignedIn>
          <div className="bg-primary/10 py-4 px-6 mb-4">
            <div className="container mx-auto">
              <p className="text-center font-semibold">
                Welcome to the Signal Analysis Dashboard
              </p>
            </div>
          </div>
        </SignedIn>
        
        <SignedOut>
          <div className="bg-primary/10 py-8 px-6 mb-4">
            <div className="container mx-auto text-center">
              <h2 className="text-2xl font-bold mb-3">Welcome to Signal Analysis</h2>
              <p className="mb-6">Sign up to access premium trading signals and analysis tools.</p>
              <div className="flex justify-center space-x-4">
                <Link 
                  to="/sign-in" 
                  className="bg-white text-primary border border-primary px-6 py-2 rounded-lg font-medium hover:bg-primary/10"
                >
                  Sign In
                </Link>
                <Link 
                  to="/sign-up" 
                  className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </SignedOut>
        
        <div className="container mx-auto px-4 py-8 flex flex-col lg:flex-row">
          <div className="lg:w-3/4 mb-4 lg:mb-0 lg:pr-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedCoinPair.label} Real-Time Analysis
                  {currentPrice !== null && (
                    <Badge variant="secondary" className="ml-2">
                      Price: ${currentPrice.toFixed(2)}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Powered by TradingView and Binance WebSocket
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <TradingViewChart
                  symbol={selectedCoinPair.symbol}
                  interval={interval}
                  klineData={klineData}
                  onChartLoaded={handleChartLoaded}
                  onSignalTrigger={handleSignalTrigger}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:w-1/4">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Signal Analysis</CardTitle>
                <CardDescription>
                  Real-time analysis of trading signals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignalAnalysis
                  klineData={klineData}
                  onSignalAnalysis={handleSignalAnalysis}
                  setAnalysisRunning={setAnalysisRunning}
                />
                {signal && confidence !== null && (
                  <div className="mt-4">
                    <p>
                      <strong>Signal:</strong> {signal}
                    </p>
                    <p>
                      <strong>Confidence:</strong> {confidence.toFixed(0)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Accordion type="single" collapsible>
              <AccordionItem value="settings">
                <AccordionTrigger>Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="coin-pair">Coin Pair</Label>
                      <Select onValueChange={(value) => {
                        const coinPair = coinPairs.find((pair) => pair.symbol === value);
                        if (coinPair) {
                          handleCoinPairSelect(coinPair);
                        }
                      }}>
                        <SelectTrigger id="coin-pair">
                          <SelectValue placeholder={selectedCoinPair.label} />
                        </SelectTrigger>
                        <SelectContent>
                          {coinPairs.map((pair) => (
                            <SelectItem key={pair.symbol} value={pair.symbol}>
                              {pair.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-interval">Time Interval</Label>
                      <Select onValueChange={(value) => {
                        handleIntervalSelect(value as TimeInterval);
                      }}>
                        <SelectTrigger id="time-interval">
                          <SelectValue placeholder={interval} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1m">1m</SelectItem>
                          <SelectItem value="5m">5m</SelectItem>
                          <SelectItem value="15m">15m</SelectItem>
                          <SelectItem value="30m">30m</SelectItem>
                          <SelectItem value="1h">1h</SelectItem>
                          <SelectItem value="4h">4h</SelectItem>
                          <SelectItem value="1d">1d</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volume">Volume</Label>
                      <Slider
                        defaultValue={[volume * 100]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        aria-label="Volume"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Notifications</Label>
                      <Switch
                        id="notifications"
                        checked={notificationsEnabled}
                        onCheckedChange={handleNotificationsToggle}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="realtime-data">Realtime Data</Label>
                      <Switch
                        id="realtime-data"
                        checked={realtimeDataEnabled}
                        onCheckedChange={handleRealtimeDataToggle}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>
    </>
  );
};

export default Index;
