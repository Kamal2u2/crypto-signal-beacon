
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from './useUserProfile';
import { UserProfile } from '@/types/auth';
import { toast as sonnerToast } from 'sonner';

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
        
        // Fetch the user profile
        try {
          const profile = await fetchUserProfile(data.user.id);
          if (profile) {
            setUser(profile);
            
            // Show success toast
            sonnerToast.success("Signed in successfully!");
            
            // Force navigation to home page after successful login
            navigate('/', { replace: true });
          } else {
            console.error("No profile found after login");
            toast({
              title: "Profile Error",
              description: "No user profile found. Please try again or contact support.",
              variant: "destructive",
            });
          }
        } catch (profileError) {
          console.error("Error fetching profile after login:", profileError);
          toast({
            title: "Profile Error",
            description: "Error fetching profile. Please try again.",
            variant: "destructive",
          });
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
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // signUp function
  const signUp = async (email: string, password: string) => {
    try {
      console.log("Attempting sign up for:", email);
      setLoading(true);
      
      // Check if the email is already in use before attempting signup
      const { data, error: checkError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing user:", checkError);
      } else if (data) {
        // If we found a profile with this email, it's already in use
        toast({
          title: "Email already in use",
          description: "This email address is already registered.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

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
        setLoading(false);
        return;
      }

      if (authData.user) {
        console.log("Auth user created successfully with ID:", authData.user.id);
        
        // Create user profile if needed
        if (authData.session) {
          try {
            // Check if profile already exists first
            const profileExists = await checkProfileExists(authData.user.id);
            
            if (!profileExists) {
              // Create a profile for this user
              await createUserProfile(authData.user.id, email);
            }
            
            // Fetch the newly created profile
            const profile = await fetchUserProfile(authData.user.id);
            if (profile) {
              setUser(profile);
              
              sonnerToast.success("Registration successful! You are now logged in.");
              
              // If we have a session, user is logged in, redirect to home
              navigate('/', { replace: true });
            }
          } catch (profileError) {
            console.error("Error creating/fetching profile after signup:", profileError);
            toast({
              title: "Profile Creation Failed",
              description: "We couldn't create your profile. Please try logging in.",
              variant: "destructive",
            });
            // Still redirect to home if we have a session
            navigate('/', { replace: true });
          }
        } else {
          sonnerToast.success("Registration successful! Please check your email to confirm your account.");
          // If email confirmation is required, redirect to login
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
      throw error;
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
      
      sonnerToast.success("You have been successfully signed out.");
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
