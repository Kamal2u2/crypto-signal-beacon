
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from './useUserProfile';
import { UserProfile } from '@/types/auth';

interface UseAuthOpsProps {
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export function useAuthOps({ setUser, setLoading }: UseAuthOpsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchUserProfile, createUserProfile, checkProfileExists } = useUserProfile();

  // signIn function
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting sign in for:", email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      if (data.user) {
        console.log("Sign in successful for:", data.user.email);
        
        // Fetch user profile immediately
        try {
          const userProfile = await fetchUserProfile(data.user.id);
          if (userProfile) {
            setUser(userProfile);
            console.log("User profile set, navigating to homepage");
            
            // Force navigation to home page after successful login and profile fetch
            navigate('/', { replace: true });
            
            toast({
              title: "Welcome back!",
              description: "You have successfully signed in.",
            });
          } else {
            console.log("No profile found after login, attempting to create one");
            try {
              await createUserProfile(data.user.id, data.user.email || '');
              const newProfile = await fetchUserProfile(data.user.id);
              if (newProfile) {
                setUser(newProfile);
                navigate('/', { replace: true });
              } else {
                // Handle case where profile creation succeeded but fetching failed
                console.error("Created profile but couldn't fetch it");
                navigate('/', { replace: true });
              }
            } catch (profileError) {
              console.error("Error creating profile after login:", profileError);
              // Still navigate even if profile creation failed
              navigate('/', { replace: true });
            }
          }
        } catch (profileError) {
          console.error("Error fetching user profile after login:", profileError);
          // If profile fetch fails, still navigate to home page
          navigate('/', { replace: true });
        }
      }
    } catch (error: any) {
      console.error("Sign in exception:", error);
      
      if (error.message === "Email not confirmed") {
        toast({
          title: "Email Not Confirmed",
          description: "Please check your email and confirm your account before logging in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign In Failed",
          description: error.message || "An error occurred during sign in.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // signUp function
  const signUp = async (email: string, password: string) => {
    try {
      console.log("Attempting sign up for:", email);
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          toast({
            title: "Email already in use",
            description: "This email address is already registered.",
            variant: "destructive",
          });
        } else {
          throw authError;
        }
        return;
      }

      if (authData.user) {
        console.log("Auth user created successfully with ID:", authData.user.id);

        // Let the auth state listener handle profile creation and setting the user
        toast({
          title: "Registration Successful",
          description: authData.session 
            ? "You are now logged in." 
            : "Please check your email to confirm your account before logging in.",
        });
        
        if (authData.session) {
          navigate('/', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);

      toast({
        title: "Sign Up Failed",
        description: error.message || "An error occurred during sign up.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // signOut function
  const signOut = async () => {
    try {
      console.log("Signing out...");
      setLoading(true);
      
      await supabase.auth.signOut();
      
      setUser(null);
      navigate('/login', { replace: true });
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        title: "Sign Out Failed",
        description: error.message || "An error occurred during sign out.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { signIn, signUp, signOut };
}
