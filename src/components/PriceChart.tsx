
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { KlineData } from '@/services/binanceService';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  InfoIcon, 
  ZoomIn, 
  ZoomOut, 
  Eye,
  EyeOff
} from 'lucide-react';
import { SignalSummary } from '@/services/technicalAnalysisService';
import { useChartData } from '@/hooks/useChartData';
import MainChart from './chart/MainChart';
import RSIChart from './chart/RSIChart';
import MACDChart from './chart/MACDChart';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
  signalData?: SignalSummary | null;
}

const PriceChart: React.FC<PriceChartProps> = ({ 
  data, 
  isPending, 
  symbol, 
  signalData 
}) => {
  const {
    chartState,
    toggleSetting,
    handleZoomIn,
    handleZoomOut,
    chartData,
    yDomain,
    supportResistanceLevels
  } = useChartData(data, signalData);

  if (isPending) {
    return (
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Skeleton className="w-full h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32">
            <InfoIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-600">No data available</p>
            <p className="text-sm text-gray-500 mt-1">Waiting for data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    showMA,
    showBollinger,
    showVolume,
    showRSI,
    showMACD,
    showSupportResistance,
    showSignals,
    zoomLevel,
    showPriceLabels
  } = chartState;

  // Calculate dynamic height for the main chart container based on which indicator charts are shown
  const getMainChartHeight = () => {
    if (showRSI && showMACD) return 'h-[60%]';
    if (showRSI || showMACD) return 'h-[70%]';
    return 'h-full';
  };

  return (
    <Card className="chart-container shadow-xl h-full border border-indigo-100/50">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-indigo-900">
              {symbol} Price Chart
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm">
            <button 
              className={cn(
                "p-1.5 rounded-md text-gray-700 hover:bg-gray-100 transition-all",
                showPriceLabels ? "bg-indigo-100" : "bg-white"
              )}
              onClick={() => toggleSetting('showPriceLabels')}
              title={showPriceLabels ? "Hide price labels" : "Show price labels"}
            >
              {showPriceLabels ? (
                <Eye className="h-4 w-4 text-indigo-600" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            
            <button 
              className="p-1.5 rounded-md bg-white text-gray-700 hover:bg-gray-100 transition-all"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-gray-700">{zoomLevel}%</span>
            <button 
              className="p-1.5 rounded-md bg-white text-gray-700 hover:bg-gray-100 transition-all"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap mt-2 gap-1.5">
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showMA ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showMA')}
          >
            Moving Avg
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showBollinger ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showBollinger')}
          >
            Bollinger
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showVolume ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showVolume')}
          >
            Volume
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showRSI ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showRSI')}
          >
            RSI
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showMACD ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showMACD')}
          >
            MACD
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showSupportResistance ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showSupportResistance')}
          >
            Support/Resist
          </button>
          <button 
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors shadow-sm", 
              showSignals ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => toggleSetting('showSignals')}
          >
            Signals
          </button>
        </div>
      </CardHeader>
      <CardContent className="bg-white p-4 flex-1 min-h-0 h-full">
        <div className="flex flex-col gap-4 h-full">
          <div className={cn("w-full", getMainChartHeight())}>
            <MainChart 
              chartData={chartData}
              showMA={showMA}
              showBollinger={showBollinger}
              showVolume={showVolume}
              showSupportResistance={showSupportResistance}
              yDomain={yDomain}
              supportResistanceLevels={supportResistanceLevels}
              showPriceLabels={showPriceLabels}
            />
          </div>
          
          {showRSI && (
            <div className="w-full h-[150px]">
              <RSIChart chartData={chartData} />
            </div>
          )}
          
          {showMACD && (
            <div className="w-full h-[150px]">
              <MACDChart chartData={chartData} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
