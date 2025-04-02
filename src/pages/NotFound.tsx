import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-crypto-primary text-foreground">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Not Found</h1>
      <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
      <Button asChild variant="outline">
        <Link to="/">Go back home</Link>
      </Button>
    </div>
  );
};

export default NotFound;
