
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetType } from '@/services/binanceService';

interface AssetTypeSelectorProps {
  selectedAssetType: AssetType;
  setSelectedAssetType: (type: AssetType) => void;
}

const AssetTypeSelector: React.FC<AssetTypeSelectorProps> = ({
  selectedAssetType,
  setSelectedAssetType
}) => {
  return (
    <div className="mb-4">
      <Tabs
        value={selectedAssetType}
        onValueChange={(value) => setSelectedAssetType(value as AssetType)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger 
            value={AssetType.CRYPTO}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Crypto Pairs
          </TabsTrigger>
          <TabsTrigger 
            value={AssetType.STOCKS}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Stocks
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default AssetTypeSelector;
