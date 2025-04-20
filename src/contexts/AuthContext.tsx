
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

  // Function to fetch user profile with error handling
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: "Error",
          description: "Failed to fetch user profile: " + error.message,
          variant: "destructive",
        });
        return null;
      }
      
      return profile;
    } catch (error: any) {
      console.error('Exception in fetchUserProfile:', error);
      toast({
        title: "Error",
        description: "Exception fetching profile: " + error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
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

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to prevent potential recursive loops with RLS
        setTimeout(async () => {
          const profile = await fetchUserProfile(session.user.id);
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
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      if (data.user) {
        // Use setTimeout to prevent potential recursive loops with RLS
        setTimeout(async () => {
          const profile = await fetchUserProfile(data.user.id);
          
          if (!profile) {
            await supabase.auth.signOut();
            toast({
              title: "Error",
              description: "No profile found for user",
              variant: "destructive",
            });
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

          setUser(profile);
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
          navigate('/');
        }, 0);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // First check if email is already in use by trying to sign in
      const { error: checkError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false // Don't create a new user, just check if exists
        }
      });
      
      // If no error, the email exists and OTP was sent
      if (!checkError) {
        toast({
          title: "Email already in use",
          description: "This email address is already registered.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Create the auth user with signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log("Auth user created successfully with ID:", authData.user.id);
        
        // Wait a longer time to ensure the auth user is fully created in the database
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          // Now create the user profile
          const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: authData.user.id,
            user_email: authData.user.email || '',
            is_user_approved: false,
            user_role: 'user'
          });

          if (profileError) {
            console.error('Error creating user profile:', profileError);
            throw new Error('Failed to create user profile: ' + profileError.message);
          }

          toast({
            title: "Registration Successful",
            description: "Your account is pending admin approval. You will be notified when approved.",
          });
          navigate('/login');
        } catch (profileCreationError: any) {
          console.error("Profile creation error:", profileCreationError);
          // Clean up by signing out
          await supabase.auth.signOut();
          throw profileCreationError;
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
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
