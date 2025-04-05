
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ControlPanel from '@/components/ControlPanel';
import ConfidenceControl from '@/components/ConfidenceControl';
import IndicatorsPanel from '@/components/BacktestPanel';
import { AssetPair, AssetType, TimeInterval } from '@/services/binanceService';

interface SidebarSectionProps {
  selectedPair: AssetPair;
  selectedInterval: TimeInterval;
  refreshInterval: number;
  isAutoRefreshEnabled: boolean;
  confidenceThreshold: number;
  alertVolume: number;
  alertsEnabled: boolean;
  isLoading: boolean;
  selectedAssetType: AssetType;
  setSelectedAssetType: (type: AssetType) => void;
  setSelectedPair: (pair: AssetPair) => void;
  setSelectedInterval: (interval: TimeInterval) => void;
  setRefreshInterval: (interval: number) => void;
  setIsAutoRefreshEnabled: (enabled: boolean) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setAlertVolume: (volume: number) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  onRefresh: () => void;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  selectedPair,
  selectedInterval,
  refreshInterval,
  isAutoRefreshEnabled,
  confidenceThreshold,
  alertVolume,
  alertsEnabled,
  isLoading,
  selectedAssetType,
  setSelectedAssetType,
  setSelectedPair,
  setSelectedInterval,
  setRefreshInterval,
  setIsAutoRefreshEnabled,
  setConfidenceThreshold,
  setAlertVolume,
  setAlertsEnabled,
  onRefresh
}) => {
  return (
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
              setSelectedPair={setSelectedPair}
              selectedInterval={selectedInterval}
              setSelectedInterval={setSelectedInterval}
              refreshInterval={refreshInterval}
              setRefreshInterval={setRefreshInterval}
              isAutoRefreshEnabled={isAutoRefreshEnabled}
              setIsAutoRefreshEnabled={setIsAutoRefreshEnabled}
              onRefresh={onRefresh}
              isLoading={isLoading}
              selectedAssetType={selectedAssetType}
              setSelectedAssetType={setSelectedAssetType}
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
  );
};

export default SidebarSection;
