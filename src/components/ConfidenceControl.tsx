
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { testAudioAlert } from '@/services/notificationService';

interface ConfidenceControlProps {
  confidenceThreshold: number;
  setConfidenceThreshold: (value: number) => void;
  alertVolume: number;
  setAlertVolume: (value: number) => void;
  alertsEnabled: boolean;
  setAlertsEnabled: (value: boolean) => void;
}

const ConfidenceControl: React.FC<ConfidenceControlProps> = ({
  confidenceThreshold,
  setConfidenceThreshold,
  alertVolume,
  setAlertVolume,
  alertsEnabled,
  setAlertsEnabled
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Signal Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Confidence Threshold</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-sm text-xs">
                      Signals with confidence below this threshold will not trigger notifications. 
                      Higher values mean fewer but more reliable signals.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={cn(
              "text-sm font-medium",
              confidenceThreshold < 50 ? "text-yellow-500" : 
              confidenceThreshold < 70 ? "text-green-500" : "text-blue-500"
            )}>
              {confidenceThreshold}%
            </span>
          </div>
          <Slider
            value={[confidenceThreshold]}
            min={0}
            max={100}
            step={5}
            onValueChange={(values) => setConfidenceThreshold(values[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More signals</span>
            <span>Higher quality</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {alertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span className="text-sm font-medium">Alert Sounds</span>
            </div>
            <Switch
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
            />
          </div>
          
          {alertsEnabled && (
            <>
              <div className="pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Alert Volume</span>
                  <span className="text-sm font-medium text-gray-500">{Math.round(alertVolume * 100)}%</span>
                </div>
                <Slider
                  value={[alertVolume * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(values) => setAlertVolume(values[0] / 100)}
                  className="w-full mt-2"
                />
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testAudioAlert('BUY', alertVolume)}
                  className="text-crypto-buy border-crypto-buy hover:bg-crypto-buy/10"
                >
                  Test Buy Alert
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testAudioAlert('SELL', alertVolume)}
                  className="text-crypto-sell border-crypto-sell hover:bg-crypto-sell/10"
                >
                  Test Sell Alert
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfidenceControl;
