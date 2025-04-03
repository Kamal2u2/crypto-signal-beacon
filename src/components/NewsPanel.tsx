
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  relatedCoins: string[];
}

interface NewsPanelProps {
  coinSymbol: string;
}

// Mock news data - in a real app, this would come from an API
const mockNewsData: NewsItem[] = [
  {
    title: "Bitcoin Hits New All-Time High as Institutional Adoption Grows",
    url: "https://example.com/news/1",
    source: "CryptoNews",
    publishedAt: "2025-04-02T10:30:00Z",
    relatedCoins: ["BTC", "ETH"]
  },
  {
    title: "Ethereum Upgrade Set to Improve Network Throughput",
    url: "https://example.com/news/2",
    source: "BlockchainToday",
    publishedAt: "2025-04-02T08:15:00Z",
    relatedCoins: ["ETH"]
  },
  {
    title: "BNB Chain Announces New Developer Fund",
    url: "https://example.com/news/3",
    source: "CoinDesk",
    publishedAt: "2025-04-01T23:45:00Z",
    relatedCoins: ["BNB", "ETH"]
  },
  {
    title: "Solana DeFi Projects See Surge in TVL",
    url: "https://example.com/news/4",
    source: "DeFi Pulse",
    publishedAt: "2025-04-01T14:20:00Z",
    relatedCoins: ["SOL"]
  },
  {
    title: "Cardano Announces New Partnership for Enterprise Blockchain Solutions",
    url: "https://example.com/news/5",
    source: "CryptoDaily",
    publishedAt: "2025-04-01T11:10:00Z",
    relatedCoins: ["ADA"]
  },
  {
    title: "XRP Legal Case Developments: What You Need to Know",
    url: "https://example.com/news/6",
    source: "CryptoLawReview",
    publishedAt: "2025-03-31T16:30:00Z",
    relatedCoins: ["XRP"]
  },
  {
    title: "Bitcoin Mining Difficulty Reaches New Heights",
    url: "https://example.com/news/7",
    source: "MiningWeekly",
    publishedAt: "2025-03-31T09:45:00Z",
    relatedCoins: ["BTC"]
  },
  {
    title: "Polkadot Ecosystem Expanding with New Parachains",
    url: "https://example.com/news/8",
    source: "ChainUpdate",
    publishedAt: "2025-03-30T22:15:00Z",
    relatedCoins: ["DOT"]
  },
  {
    title: "Crypto Market Analysis: Weekly Trends and Predictions",
    url: "https://example.com/news/9",
    source: "MarketWatch",
    publishedAt: "2025-03-30T12:00:00Z",
    relatedCoins: ["BTC", "ETH", "BNB", "SOL", "ADA"]
  },
  {
    title: "DeFi Protocol Security: Recent Audits and Findings",
    url: "https://example.com/news/10",
    source: "SecurityNow",
    publishedAt: "2025-03-30T08:30:00Z",
    relatedCoins: ["ETH", "SOL", "AVAX"]
  }
];

const NewsPanel: React.FC<NewsPanelProps> = ({ coinSymbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAllNews, setShowAllNews] = useState<boolean>(false);

  useEffect(() => {
    // Simulate API call
    const fetchNews = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, fetch from an actual API
        // const response = await fetch(`https://crypto-news-api.com/news/${coinSymbol}`);
        // const data = await response.json();
        
        setTimeout(() => {
          // Filter mock news based on coin symbol
          const filteredNews = showAllNews 
            ? mockNewsData 
            : mockNewsData.filter(item => 
                item.relatedCoins.includes(coinSymbol.split('-')[0]) || 
                item.relatedCoins.includes(coinSymbol.split('USDT')[0])
              );
          
          setNews(filteredNews);
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching news:', error);
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [coinSymbol, showAllNews]);

  return (
    <Card className="news-panel-card bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Crypto News</CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowAllNews(!showAllNews)}
          className="text-xs"
        >
          {showAllNews ? "Show Relevant News" : "Show All News"}
        </Button>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            // Loading state
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="mb-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))
          ) : news.length > 0 ? (
            news.map((item, index) => (
              <div key={index} className="mb-4 pb-4 border-b last:border-0 border-border">
                <a 
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <h3 className="font-medium text-foreground group-hover:text-primary mb-2 flex items-start">
                    {item.title}
                    <ExternalLink className="h-3 w-3 ml-1 mt-1 inline opacity-70" />
                  </h3>
                </a>
                <div className="flex items-center text-xs text-muted-foreground space-x-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    {item.source}
                  </Badge>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 inline" />
                    {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No news available for {coinSymbol}.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NewsPanel;
