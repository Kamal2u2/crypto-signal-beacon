
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AssetPair, CRYPTO_PAIRS, STOCK_PAIRS, TimeInterval, AssetType } from '@/services/binanceService';
import { SignalType } from '@/services/technicalAnalysisService';
import { 
  initializeAudio, 
  playSignalSound,
  sendSignalNotification,
  requestNotificationPermission
} from '@/services/notificationService';
import LiveCoinPrice from '@/components/LiveCoinPrice';
import Header from '@/components/layout/Header';
import SignalBanner from '@/components/layout/SignalBanner';
import MainContentSection from '@/components/layout/MainContentSection';
import SidebarSection from '@/components/layout/SidebarSection';
import { useWebSocketData } from '@/hooks/useWebSocketData';
import { usePriceWebSocket } from '@/hooks/usePriceWebSocket';

import './index.css';

const Index = () => {
  // State for asset type
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>(AssetType.CRYPTO);
  
  // State for trading controls
  const [selectedPair, setSelectedPair] = useState<AssetPair>(CRYPTO_PAIRS[0]);
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('15m');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(false);
  
  // State for notification settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(50); // Lower threshold to get more signals
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [alertVolume, setAlertVolume] = useState<number>(0.7);
  const [isAudioInitialized, setIsAudioInitialized] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [lastSignalType, setLastSignalType] = useState<SignalType | null>(null);
  
  // Use custom hooks for data fetching and websocket management
  const { currentPrice } = usePriceWebSocket(selectedPair);
  
  // Handle asset type change
  const handleAssetTypeChange = (type: AssetType) => {
    setSelectedAssetType(type);
    // Select the first pair of the selected asset type
    setSelectedPair(type === AssetType.CRYPTO ? CRYPTO_PAIRS[0] : STOCK_PAIRS[0]);
    setLastSignalType(null);
  };
  
  // Define a type-safe wrapper function for setLastSignalType
  const handleSetLastSignalType = (type: string | null) => {
    if (type === null || type === 'BUY' || type === 'SELL' || type === 'HOLD' || type === 'NEUTRAL') {
      setLastSignalType(type as SignalType | null);
    }
  };
  
  const { 
    klineData, 
    signalData, 
    isLoading, 
    fetchData, 
    handleRefresh 
  } = useWebSocketData({
    selectedPair,
    selectedInterval,
    confidenceThreshold,
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    lastSignalType,
    setLastSignalType: handleSetLastSignalType,
    playSignalSound,
    sendSignalNotification
  });
  
  // Handle pair change
  const handlePairChange = (pair: AssetPair) => {
    setSelectedPair(pair);
    setLastSignalType(null);
    console.log(`Switching to pair: ${pair.symbol}`);
  };

  // Initialize audio on first user interaction
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

  // Add auto-refresh functionality
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isAutoRefreshEnabled && refreshInterval > 0) {
      intervalId = setInterval(() => {
        handleRefresh();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshEnabled, refreshInterval, handleRefresh]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header 
        notificationsEnabled={notificationsEnabled} 
        setNotificationsEnabled={setNotificationsEnabled} 
      />
      
      <main className="container py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <LiveCoinPrice 
            price={currentPrice} 
            symbol={selectedPair.label}
            className="glass-card rounded-lg shadow-md border border-border flex-grow md:flex-grow-0"
          />
          
          <SignalBanner
            signalData={signalData}
            symbol={selectedPair.label}
            currentPrice={currentPrice}
            confidenceThreshold={confidenceThreshold}
          />
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <MainContentSection 
            klineData={klineData}
            isLoading={isLoading}
            symbol={selectedPair.label}
            signalData={signalData}
            currentPrice={currentPrice}
            confidenceThreshold={confidenceThreshold}
            fullscreenChart={false}
            toggleFullscreenChart={() => {}}
          />
          
          <SidebarSection
            selectedPair={selectedPair}
            selectedInterval={selectedInterval}
            refreshInterval={refreshInterval}
            isAutoRefreshEnabled={isAutoRefreshEnabled}
            confidenceThreshold={confidenceThreshold}
            alertVolume={alertVolume}
            alertsEnabled={alertsEnabled}
            isLoading={isLoading}
            selectedAssetType={selectedAssetType}
            setSelectedAssetType={handleAssetTypeChange}
            setSelectedPair={handlePairChange}
            setSelectedInterval={setSelectedInterval}
            setRefreshInterval={setRefreshInterval}
            setIsAutoRefreshEnabled={setIsAutoRefreshEnabled}
            setConfidenceThreshold={setConfidenceThreshold}
            setAlertVolume={setAlertVolume}
            setAlertsEnabled={setAlertsEnabled}
            onRefresh={handleRefresh}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
