
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

  // Function to create a user profile
  const createUserProfile = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email,
        is_user_approved: true, // Auto-approve for now to fix login issues
        user_role: 'user'
      });

      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
      
      return true;
    } catch (error: any) {
      console.error('Exception in createUserProfile:', error);
      throw error;
    }
  };

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

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to prevent potential recursive loops with RLS
        setTimeout(async () => {
          let profile = await fetchUserProfile(session.user.id);
          
          // If no profile exists, try to create one
          if (!profile) {
            console.log("No profile found during auth state change, attempting to create one");
            try {
              await createUserProfile(session.user.id, session.user.email || '');
              // Fetch the newly created profile
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
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      if (data.user) {
        // Use setTimeout to prevent potential recursive loops with RLS
        setTimeout(async () => {
          let profile = await fetchUserProfile(data.user.id);
          
          // If no profile exists, try to create one
          if (!profile) {
            console.log("No profile found during login, attempting to create one");
            try {
              await createUserProfile(data.user.id, data.user.email || '');
              // Fetch the newly created profile
              profile = await fetchUserProfile(data.user.id);
              
              if (!profile) {
                toast({
                  title: "Error",
                  description: "Could not create user profile. Please contact support.",
                  variant: "destructive",
                });
                await supabase.auth.signOut();
                return;
              }
            } catch (createError: any) {
              console.error("Failed to create profile during login:", createError);
              toast({
                title: "Error",
                description: "Failed to create profile: " + createError.message,
                variant: "destructive",
              });
              await supabase.auth.signOut();
              return;
            }
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
      if (error.message === "Email not confirmed") {
        toast({
          title: "Email Not Confirmed",
          description: "Please check your email and confirm your account before logging in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // First, check if a user with this email already exists in the auth system
      // The filter parameter is not supported in PageParams type, so we need to modify this approach
      const { data, error: emailCheckError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });
      
      // If we didn't get an error about user not found, that means the user exists
      if (!emailCheckError || (emailCheckError && !emailCheckError.message.includes("Email not found"))) {
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
        
        // Wait a bit longer to ensure the auth user is fully created in the database
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          // Now create the user profile
          await createUserProfile(authData.user.id, authData.user.email || '');

          toast({
            title: "Registration Successful",
            description: authData.session ? "You are now logged in." : "Please check your email to confirm your account before logging in.",
          });
          
          if (authData.session) {
            navigate('/');
          } else {
            navigate('/login');
          }
        } catch (profileCreationError: any) {
          console.error("Profile creation error:", profileCreationError);
          // Clean up by signing out
          await supabase.auth.signOut();
          throw profileCreationError;
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.message.includes("Email signups are disabled")) {
        toast({
          title: "Email Registration Disabled",
          description: "Email registration is currently disabled. Please contact the administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
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
