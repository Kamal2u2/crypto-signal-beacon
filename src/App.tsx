
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkLoaded, ClerkLoading, useAuth } from "@clerk/clerk-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";
import UserProfile from "./pages/UserProfile";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ClerkLoading>
            <div className="flex items-center justify-center h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute requireAuth={true} />}>
                <Route path="/profile" element={<UserProfile />} />
                {/* Add other protected routes here */}
              </Route>
              
              {/* Admin routes */}
              <Route element={<ProtectedRoute requireAuth={true} requireAdmin={true} />}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ClerkLoaded>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
