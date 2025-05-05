
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
    console.log("Setting up auth effect");
    let isMounted = true;
    let authTimeout: NodeJS.Timeout | null = null;
    
    // Shorter timeout to prevent infinite loading
    authTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log("Auth timeout reached, setting loading to false");
        setLoading(false);
      }
    }, 5000); // 5 seconds timeout
    
    const setupAuth = async () => {
      try {
        // Set up auth state change listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log("Auth state changed:", event, session ? "Session exists" : "No session");
            
            if (!isMounted) return;
            
            if (event === 'SIGNED_IN' && session?.user) {
              // Defer profile fetching to prevent deadlocks
              setTimeout(async () => {
                if (!isMounted) return;
                
                try {
                  // On sign-in, try to fetch user profile
                  const profile = await fetchUserProfile(session.user.id);
                  
                  if (profile && isMounted) {
                    console.log("User signed in with profile:", profile.email);
                    setUser(profile);
                    
                    // Redirect to home page if on login or signup
                    if (['/login', '/signup'].includes(location.pathname)) {
                      navigate('/', { replace: true });
                    }
                  } else if (isMounted) {
                    console.log("SIGNED_IN event but no profile found, creating one");
                    try {
                      // Profile not found, create one
                      await createUserProfile(session.user.id, session.user.email || '');
                      const newProfile = await fetchUserProfile(session.user.id);
                      
                      if (newProfile && isMounted) {
                        setUser(newProfile);
                        if (['/login', '/signup'].includes(location.pathname)) {
                          navigate('/', { replace: true });
                        }
                      } else {
                        console.error("Failed to create/fetch profile on sign in");
                        if (isMounted) setUser(null);
                      }
                    } catch (createError) {
                      console.error("Error creating profile on sign in:", createError);
                      if (isMounted) setUser(null);
                    }
                  }
                } catch (profileError) {
                  console.error("Error handling auth state change:", profileError);
                  if (isMounted) setUser(null);
                } finally {
                  if (isMounted) {
                    setLoading(false);
                  }
                }
              }, 0);
            } else if (event === 'SIGNED_OUT') {
              if (isMounted) {
                console.log("User signed out");
                setUser(null);
                setLoading(false);
              }
            } else if (event === 'USER_UPDATED' && session?.user) {
              setTimeout(async () => {
                if (!isMounted) return;
                
                try {
                  const profile = await fetchUserProfile(session.user.id);
                  if (profile && isMounted) {
                    setUser(profile);
                  }
                } catch (error) {
                  console.error("Error updating user profile:", error);
                } finally {
                  if (isMounted) {
                    setLoading(false);
                  }
                }
              }, 0);
            }
            
            // Make sure loading is false after any auth state change
            if (isMounted) {
              setLoading(false);
            }
          }
        );
        
        // Check for an existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          console.log("Existing session found for:", session.user.email);
          // Defer profile fetching to prevent deadlocks
          setTimeout(async () => {
            if (!isMounted) return;
            
            try {
              const profile = await fetchUserProfile(session.user.id);
              
              if (profile && isMounted) {
                console.log("User profile found for session");
                setUser(profile);
              } else {
                console.log("No profile found for session user - creating one");
                try {
                  await createUserProfile(session.user.id, session.user.email || '');
                  const newProfile = await fetchUserProfile(session.user.id);
                  
                  if (newProfile && isMounted) {
                    setUser(newProfile);
                  } else {
                    console.log("Could not create/fetch profile on session check");
                    if (isMounted) setUser(null);
                  }
                } catch (createError) {
                  console.error("Error creating profile on session check:", createError);
                  if (isMounted) setUser(null);
                }
              }
            } catch (error) {
              console.error("Error with existing session profile:", error);
              if (isMounted) setUser(null);
            } finally {
              if (isMounted) {
                setLoading(false);
              }
            }
          }, 0);
        } else {
          console.log("No existing session found");
          if (isMounted) setUser(null);
          if (isMounted) {
            setLoading(false);
          }
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
      if (authTimeout) clearTimeout(authTimeout);
    };
  }, [fetchUserProfile, navigate, location.pathname, createUserProfile]);

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
