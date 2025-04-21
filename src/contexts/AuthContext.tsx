
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

  const { signIn, signUp, signOut } = useAuthOps({ setUser, setLoading });

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          let profile = await fetchUserProfile(session.user.id);

          // If no profile exists, try to create one
          if (!profile) {
            console.log("No profile found, attempting to create one");
            try {
              await createUserProfile(session.user.id, session.user.email || '');
              // Fetch the newly created profile
              profile = await fetchUserProfile(session.user.id);
            } catch (createError) {
              console.error("Failed to create profile:", createError);
            }
          }

          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error('Error in session check:', error);
        toast({
          title: "Error",
          description: "Session check failed: " + error.message,
          variant: "destructive",
        });
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          let profile = await fetchUserProfile(session.user.id);

          if (!profile) {
            console.log("No profile found during auth state change, attempting to create one");
            try {
              await createUserProfile(session.user.id, session.user.email || '');
              profile = await fetchUserProfile(session.user.id);
            } catch (createError) {
              console.error("Failed to create profile during auth state change:", createError);
            }
          }

          setUser(profile);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    checkUser();
    return () => subscription.unsubscribe();
  }, [toast, fetchUserProfile, createUserProfile]);

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
