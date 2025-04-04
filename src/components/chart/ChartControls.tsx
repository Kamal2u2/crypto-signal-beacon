
import React from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, Eye, EyeOff } from 'lucide-react';

interface ChartControlsProps {
  symbol: string;
  chartState: {
    showMA: boolean;
    showBollinger: boolean;
    showVolume: boolean;
    showRSI: boolean;
    showMACD: boolean;
    showSupportResistance: boolean;
    showSignals: boolean;
    zoomLevel: number;
    showPriceLabels: boolean;
  };
  toggleSetting: (setting: string) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

const ChartControls: React.FC<ChartControlsProps> = ({
  symbol,
  chartState,
  toggleSetting,
  handleZoomIn,
  handleZoomOut,
}) => {
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

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-indigo-900">
            {symbol} Price Chart
          </h2>
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
    </>
  );
};

export default ChartControls;
