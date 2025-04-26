
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuthOps } from '@/hooks/useAuthOps';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { fetchUserProfile } = useUserProfile();

  // Initialize auth operations with our state setters
  const { signIn, signUp, signOut } = useAuthOps({ setUser, setLoading });

  // Check for existing session on mount and setup auth state listener
  useEffect(() => {
    console.log("Setting up auth effect");
    let isMounted = true;
    
    const setupAuth = async () => {
      try {
        console.log("Checking for existing session...");
        
        // Get current session first to handle initial load
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          console.log("Session found, handling authentication");
          try {
            const profile = await fetchUserProfile(session.user.id);
            
            if (profile && isMounted) {
              setUser(profile);
              if (['/login', '/signup'].includes(location.pathname)) {
                navigate('/', { replace: true });
              }
            } 
          } catch (error) {
            console.error("Error with existing session profile:", error);
          }
        } else {
          console.log("No existing session found");
          if (isMounted) setUser(null);
          
          // If on a protected route without auth, redirect to login
          const currentPath = location.pathname;
          if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/') {
            navigate('/login', { replace: true });
          }
        }
        
        // Set up auth state change listener after initial session check
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log("Auth state changed:", event, session ? "Session exists" : "No session");
            
            if (!isMounted) return;
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (session?.user) {
                try {
                  const profile = await fetchUserProfile(session.user.id);
                  
                  if (profile && isMounted) {
                    setUser(profile);
                    
                    if (['/login', '/signup'].includes(location.pathname)) {
                      navigate('/', { replace: true });
                    }
                  }
                } catch (profileError) {
                  console.error("Error handling auth state change:", profileError);
                }
              }
            } else if (event === 'SIGNED_OUT') {
              if (isMounted) {
                setUser(null);
              }
            }
          }
        );
        
        if (isMounted) {
          setLoading(false);
        }
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in auth setup:", error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    setupAuth();
    
    return () => {
      isMounted = false;
    };
  }, [fetchUserProfile, navigate, location.pathname]);

  // Provide auth context to components
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
