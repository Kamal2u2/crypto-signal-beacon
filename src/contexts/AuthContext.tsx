
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Error fetching user profile:', error);
              toast({
                title: "Error",
                description: "Failed to fetch user profile: " + error.message,
                variant: "destructive",
              });
              setUser(null);
            } else if (profile) {
              setUser(profile);
            } else {
              console.error('No profile found for user');
              toast({
                title: "Error",
                description: "No profile found for user",
                variant: "destructive",
              });
              setUser(null);
            }
          } catch (profileError: any) {
            console.error('Exception fetching profile:', profileError);
            toast({
              title: "Error",
              description: "Exception fetching profile: " + profileError.message,
              variant: "destructive",
            });
            setUser(null);
          }
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

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user profile on auth change:', error);
            toast({
              title: "Error",
              description: "Failed to fetch user profile: " + error.message,
              variant: "destructive",
            });
            setUser(null);
          } else if (profile) {
            setUser(profile);
          } else {
            console.error('No profile found for user on auth change');
            toast({
              title: "Error",
              description: "No profile found for user",
              variant: "destructive",
            });
            setUser(null);
          }
        } catch (profileError: any) {
          console.error('Exception fetching profile on auth change:', profileError);
          toast({
            title: "Error",
            description: "Exception fetching profile: " + profileError.message,
            variant: "destructive",
          });
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            toast({
              title: "Error",
              description: "Failed to fetch user profile: " + profileError.message,
              variant: "destructive",
            });
            await supabase.auth.signOut();
            return;
          }

          if (!profile) {
            toast({
              title: "Error",
              description: "No profile found for user",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            return;
          }

          if (!profile.is_approved) {
            await supabase.auth.signOut();
            toast({
              title: "Account Pending Approval",
              description: "Your account is pending admin approval. Please try again later.",
              variant: "destructive",
            });
            return;
          }

          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
          navigate('/');
        } catch (profileError: any) {
          console.error('Exception fetching profile during sign in:', profileError);
          toast({
            title: "Error",
            description: "Exception fetching profile: " + profileError.message,
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        await supabase.from('user_profiles').insert([
          {
            id: data.user.id,
            email: data.user.email,
            is_approved: false,
            role: 'user',
          },
        ]);
      }

      toast({
        title: "Registration Successful",
        description: "Your account is pending admin approval. You will be notified when approved.",
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

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
