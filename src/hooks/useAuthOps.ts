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
      
      // First check if the user exists in auth database
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) {
        console.error("Sign in error:", authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error("No user returned from authentication");
      }
      
      console.log("Auth successful for:", authData.user.email);
      
      // Check if profile exists
      const profile = await fetchUserProfile(authData.user.id);
      
      if (profile) {
        console.log("Profile found after login:", profile.email);
        setUser(profile);
        sonnerToast.success("Signed in successfully!");
        navigate('/', { replace: true });
      } else {
        console.log("No profile found after login, creating one now");
        try {
          // Create profile if doesn't exist
          await createUserProfile(authData.user.id, authData.user.email || email);
          
          // Fetch the newly created profile
          const newProfile = await fetchUserProfile(authData.user.id);
          
          if (newProfile) {
            console.log("Profile created and fetched successfully");
            setUser(newProfile);
            sonnerToast.success("Signed in successfully!");
            navigate('/', { replace: true });
          } else {
            console.error("Failed to create/fetch profile during login");
            throw new Error("Failed to create user profile");
          }
        } catch (profileError: any) {
          console.error("Error creating profile during login:", profileError);
          throw new Error("Failed to create user profile: " + profileError.message);
        }
      }
    } catch (error: any) {
      console.error("Sign in exception:", error);
      
      let errorMessage = "An error occurred during sign in.";
      
      // Interpret common error messages
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email or password is incorrect. Please try again.";
      } else if (error.message === "Email not confirmed") {
        errorMessage = "Please check your email and confirm your account before logging in.";
      } else if (error.message?.includes("profile")) {
        errorMessage = "Could not access your user profile. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show toast for errors but also throw for the login form to handle
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw new Error(errorMessage);
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
        
        // Create user profile right away 
        try {
          await createUserProfile(authData.user.id, email);
          
          // If we have a session, user is auto signed in
          if (authData.session) {
            // Fetch the newly created profile
            const profile = await fetchUserProfile(authData.user.id);
            
            if (profile) {
              setUser(profile);
              sonnerToast.success("Registration successful! You are now logged in.");
              navigate('/', { replace: true });
            } else {
              // Profile creation may have failed
              console.error("Profile not found after creation");
              toast({
                title: "Profile Creation Failed",
                description: "We couldn't create your profile. Please try logging in.",
                variant: "destructive",
              });
              // Still redirect to home if we have a session
              navigate('/', { replace: true });
            }
          } else {
            // Email confirmation is required
            sonnerToast.success("Registration successful! Please check your email to confirm your account.");
            navigate('/login', { replace: true });
          }
        } catch (profileError) {
          console.error("Error creating profile after signup:", profileError);
          toast({
            title: "Profile Creation Failed",
            description: "We couldn't create your profile. Please try logging in.",
            variant: "destructive",
          });
          // If we have a session, still redirect to home
          if (authData.session) {
            navigate('/', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
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
