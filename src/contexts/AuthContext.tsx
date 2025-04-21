
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
  const { fetchUserProfile, createUserProfile } = useUserProfile();

  // Initialize auth operations with our state setters
  const { signIn, signUp, signOut } = useAuthOps({ setUser, setLoading });

  // Check for existing session on mount and setup auth state listener
  useEffect(() => {
    const setupAuth = async () => {
      try {
        // First check for an existing session to avoid flashes
        console.log("Checking for existing session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No existing session found");
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("Session found, handling authentication");
        
        // Set up the auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth state changed:", event, session ? "Session exists" : "No session");
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              // Use setTimeout to avoid potential deadlocks with Supabase auth
              setTimeout(async () => {
                try {
                  // Check if user profile exists
                  const profile = await fetchUserProfile(session.user.id);
                  
                  if (profile) {
                    console.log("Profile found, setting user state");
                    setUser(profile);
                    
                    // Handle redirect for authenticated users on public routes
                    if (['/login', '/signup'].includes(location.pathname)) {
                      console.log("Redirecting authenticated user from public route to home");
                      navigate('/', { replace: true });
                    }
                  } else {
                    console.log("No profile found, attempting to create one");
                    try {
                      await createUserProfile(session.user.id, session.user.email || '');
                      const newProfile = await fetchUserProfile(session.user.id);
                      if (newProfile) {
                        setUser(newProfile);
                        if (['/login', '/signup'].includes(location.pathname)) {
                          navigate('/', { replace: true });
                        }
                      } else {
                        console.error("Profile creation likely succeeded but fetch failed");
                        // Force navigation despite missing profile
                        if (['/login', '/signup'].includes(location.pathname)) {
                          navigate('/', { replace: true });
                        }
                      }
                    } catch (createError) {
                      console.error("Failed to create profile:", createError);
                    }
                  }
                } catch (error) {
                  console.error("Error handling auth state change:", error);
                  // Even if there's an error fetching the profile, we still want to navigate
                  // away from login/signup if the user is authenticated
                  if (session && ['/login', '/signup'].includes(location.pathname)) {
                    navigate('/', { replace: true });
                  }
                } finally {
                  setLoading(false);
                }
              }, 0);
            } else {
              setLoading(false);
            }
          } else if (event === 'SIGNED_OUT') {
            console.log("User signed out, clearing user state");
            setUser(null);
            setLoading(false);
            navigate('/login', { replace: true });
          } else {
            setLoading(false);
          }
        });

        // Perform profile fetching for existing session
        if (session.user) {
          try {
            console.log("Fetching profile for existing session");
            const profile = await fetchUserProfile(session.user.id);
            
            if (profile) {
              console.log("Profile found for existing session");
              setUser(profile);
              
              // If on login/signup page with valid session, redirect to home
              if (['/login', '/signup'].includes(location.pathname)) {
                console.log("Redirecting to home from public route with valid session");
                navigate('/', { replace: true });
              }
            } else {
              console.log("No profile found for existing session, creating one");
              await createUserProfile(session.user.id, session.user.email || '');
              const newProfile = await fetchUserProfile(session.user.id);
              
              if (newProfile) {
                setUser(newProfile);
                if (['/login', '/signup'].includes(location.pathname)) {
                  navigate('/', { replace: true });
                }
              } else {
                console.log("Failed to fetch newly created profile");
                // If on login page with valid auth but no profile, still redirect to home
                if (['/login', '/signup'].includes(location.pathname)) {
                  navigate('/', { replace: true });
                }
              }
            }
          } catch (error) {
            console.error("Error with existing session profile:", error);
            // Even with errors, if authenticated, redirect from login/signup
            if (['/login', '/signup'].includes(location.pathname)) {
              navigate('/', { replace: true });
            }
          }
        }

        setLoading(false);
        
        // Cleanup function
        return () => {
          console.log("Cleaning up auth subscription");
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in auth setup:", error);
        setUser(null);
        setLoading(false);
      }
    };

    setupAuth();
  }, [fetchUserProfile, createUserProfile, navigate, location.pathname]);

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
