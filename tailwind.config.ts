
import { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        crypto: {
          primary: "#FFFFFF", // Light background
          secondary: "#F8FAFC", // Slightly off-white for cards
          accent: "#EEF2FF", // Light accent color
          buy: "#22c55e", // Green for buy signals 
          sell: "#ef4444", // Red for sell signals
          hold: "#f59e0b", // Amber/yellow for hold signals
          border: "#E2E8F0", // Light border color
          chart: {
            line: "#3B82F6", // Blue for chart lines
            grid: "#E2E8F0", // Light grid lines
            sma: "#EF4444", // Red for SMA
            ema: "#10B981", // Green for EMA
            volume: "#0EA5E9", // Blue for volume
            bollingerUpper: "#F43F5E", // Pink for upper Bollinger band
            bollingerLower: "#3B82F6", // Blue for lower Bollinger band
            bollingerMiddle: "#8B5CF6", // Purple for middle Bollinger band
            price: "#8B5CF6", // Purple for price line
            rsi: "#F59E0B", // Amber for RSI
            macd: "#10B981", // Green for MACD
            signal: "#F43F5E", // Pink for signal line
            histogram: {
              positive: "#22c55e", // Green for positive histogram
              negative: "#ef4444" // Red for negative histogram
            },
            support: "#22c55e", // Green for support levels
            resistance: "#ef4444", // Red for resistance levels
          },
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        tooltip: "0 3px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "input-focus": "0 0 0 2px rgba(59, 130, 246, 0.2)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'var(--foreground)',
            '[class~="lead"]': {
              color: 'var(--muted-foreground)',
            },
            a: {
              color: 'var(--primary)',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            strong: {
              color: 'var(--foreground)',
              fontWeight: '600',
            },
            'ol[type="A"]': {
              '--list-counter-style': 'upper-alpha',
            },
            'ol[type="a"]': {
              '--list-counter-style': 'lower-alpha',
            },
            'ol[type="A" s]': {
              '--list-counter-style': 'upper-alpha',
            },
            'ol[type="a" s]': {
              '--list-counter-style': 'lower-alpha',
            },
            'ol[type="I"]': {
              '--list-counter-style': 'upper-roman',
            },
            'ol[type="i"]': {
              '--list-counter-style': 'lower-roman',
            },
            'ol[type="I" s]': {
              '--list-counter-style': 'upper-roman',
            },
            'ol[type="i" s]': {
              '--list-counter-style': 'lower-roman',
            },
            'ol[type="1"]': {
              '--list-counter-style': 'decimal',
            },
            'ol > li': {
              position: 'relative',
            },
            'ol > li::before': {
              content: 'counter(list-item, var(--list-counter-style, decimal)) "."',
              position: 'absolute',
              fontWeight: '400',
              color: 'var(--muted-foreground)',
              left: '-1.5em',
            },
            'ul > li': {
              position: 'relative',
            },
            'ul > li::before': {
              content: '""',
              position: 'absolute',
              backgroundColor: 'var(--muted-foreground)',
              borderRadius: '50%',
              width: '0.375em',
              height: '0.375em',
              top: 'calc(0.875em - 0.1875em)',
              left: '-1.2em',
            },
            hr: {
              borderColor: 'var(--border)',
              borderTopWidth: 1,
              marginTop: '2em',
              marginBottom: '2em',
            },
            blockquote: {
              fontWeight: '500',
              fontStyle: 'italic',
              color: 'var(--foreground)',
              borderLeftWidth: '0.25rem',
              borderLeftColor: 'var(--border)',
              quotes: '"\\201C""\\201D""\\2018""\\2019"',
              marginTop: '1.2em',
              marginBottom: '1.2em',
              paddingLeft: '1em',
            },
            code: {
              color: 'var(--foreground)',
              fontWeight: '500',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '"`"',
            },
            'code::after': {
              content: '"`"',
            },
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addBase, theme }) {
      addBase({
        ':root': {
          '--card-rgb': '255, 255, 255', // White in RGB format for light mode
        },
        '.dark': {
          '--card-rgb': '57, 59, 71', // Dark card color in RGB format for dark mode
        }
      });
    }
  ],
  safelist: [
    {
      pattern: /bg-(card|secondary)\/\d+/,
    },
  ],
} satisfies Config;

export default config;
