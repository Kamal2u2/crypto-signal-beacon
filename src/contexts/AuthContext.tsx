
import { createContext, useContext, useEffect, useState } from 'react';
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
  const { toast } = useToast();
  const { fetchUserProfile, createUserProfile } = useUserProfile();

  // Initialize auth operations with our state setters
  const { signIn, signUp, signOut } = useAuthOps({ setUser, setLoading });

  // Check for existing session on mount and setup auth state listener
  useEffect(() => {
    const setupAuth = async () => {
      try {
        // First set up the auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth state changed:", event, session ? "Session exists" : "No session");
          
          if (session?.user) {
            // Use setTimeout to avoid potential deadlocks with Supabase auth
            setTimeout(async () => {
              try {
                // Check if user profile exists
                const profile = await fetchUserProfile(session.user.id);
                
                if (profile) {
                  console.log("Profile found, setting user state");
                  setUser(profile);
                } else {
                  console.log("No profile found, attempting to create one");
                  try {
                    await createUserProfile(session.user.id, session.user.email || '');
                    const newProfile = await fetchUserProfile(session.user.id);
                    setUser(newProfile);
                  } catch (createError) {
                    console.error("Failed to create profile:", createError);
                  }
                }
              } catch (error) {
                console.error("Error handling auth state change:", error);
              } finally {
                setLoading(false);
              }
            }, 0);
          } else {
            console.log("No session, clearing user state");
            setUser(null);
            setLoading(false);
          }
        });

        // Then check for an existing session
        console.log("Checking for existing session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No existing session found");
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("Session found, fetching user profile");
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile) {
          console.log("Profile found, setting user state");
          setUser(profile);
        } else {
          console.log("No profile found, attempting to create one");
          try {
            await createUserProfile(session.user.id, session.user.email || '');
            const newProfile = await fetchUserProfile(session.user.id);
            setUser(newProfile);
          } catch (createError) {
            console.error("Failed to create profile:", createError);
          }
        }

        setLoading(false);
        
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
  }, [fetchUserProfile, createUserProfile, toast]);

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
