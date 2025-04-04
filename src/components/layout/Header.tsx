
import React from 'react';
import { toast } from '@/components/ui/use-toast';
import { requestNotificationPermission } from '@/services/notificationService';
import { cn } from '@/lib/utils';

interface HeaderProps {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  notificationsEnabled,
  setNotificationsEnabled
}) => {
  return (
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
  );
};

export default Header;
