
import * as React from "react"

import { cn } from "@/lib/utils"
import { SignalType } from "@/services/technical/types"

// Extended Card interface to support signal styling
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  signal?: SignalType;
  highlightSignal?: boolean;
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, signal, highlightSignal = false, ...props }, ref) => {
  // Apply signal-specific styling if signal is provided and highlighting is enabled
  const signalStyleClasses = signal && highlightSignal ? {
    'BUY': 'border-crypto-buy/80 border-2 bg-crypto-buy/5',
    'SELL': 'border-crypto-sell/80 border-2 bg-crypto-sell/5',
    'HOLD': 'border-crypto-hold/80 border-2 bg-crypto-hold/5', 
    'NEUTRAL': 'border-border bg-card'
  }[signal] : '';

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        signalStyleClasses,
        className
      )}
      {...props}
    />
  );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
