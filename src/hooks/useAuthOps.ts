
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
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        setTimeout(async () => {
          let profile = await fetchUserProfile(data.user.id);
          if (!profile) {
            console.log("No profile found during login, attempting to create one");
            try {
              await createUserProfile(data.user.id, data.user.email || '');
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
              if (createError.code === '23505') {
                console.log("Profile already exists, attempting to fetch again");
                profile = await fetchUserProfile(data.user.id);
              } else {
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
          }

          if (profile && !profile.is_approved) {
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

  // signUp function
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);

      // The previous approach of using filter is not supported. We'll attempt sign up first, and gracefully handle duplicate email errors.
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
          setLoading(false);
          return;
        }
        throw authError;
      }

      if (authData.user) {
        console.log("Auth user created successfully with ID:", authData.user.id);

        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for user to be ready

        try {
          const profileExists = await checkProfileExists(authData.user.id);

          if (!profileExists) {
            await createUserProfile(authData.user.id, authData.user.email || '');
          } else {
            console.log("Profile already exists for new user, skipping creation");
          }

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
          if (profileCreationError.code === '23505') {
            console.log("Profile already exists for this user, signup successful");
            toast({
              title: "Registration Successful",
              description: authData.session ? "You are now logged in." : "Please check your email to confirm your account before logging in.",
            });
            if (authData.session) {
              navigate('/');
            } else {
              navigate('/login');
            }
          } else {
            console.error("Profile creation error:", profileCreationError);
            await supabase.auth.signOut();
            throw profileCreationError;
          }
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

  // signOut function
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
    navigate('/login');
  };

  return { signIn, signUp, signOut };
}
