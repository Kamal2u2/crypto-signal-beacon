
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/auth';

export function useUserProfile() {
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching user profile for ID:', userId);
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        if (!error.message.includes("infinite recursion")) {
          console.error('Error fetching user profile:', error);
          toast({
            title: "Error",
            description: "Failed to fetch user profile: " + error.message,
            variant: "destructive",
          });
        } else {
          console.error('Error fetching user profile (RLS issue):', error);
        }
        return null;
      }

      console.log('Profile fetched:', profile ? 'found' : 'not found');
      return profile as UserProfile | null;
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

  const checkProfileExists = async (userId: string): Promise<boolean> => {
    try {
      console.log('Checking if profile exists for ID:', userId);
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId);

      if (error) {
        console.error('Error checking if profile exists:', error);
        return false;
      }

      return !!(count && count > 0);
    } catch (error: any) {
      console.error('Exception in checkProfileExists:', error);
      return false;
    }
  };

  const createUserProfile = async (userId: string, email: string): Promise<boolean> => {
    try {
      console.log('Creating user profile for ID:', userId, 'and email:', email);
      // First check if profile exists
      const profileExists = await checkProfileExists(userId);

      if (profileExists) {
        console.log("Profile already exists for user, skipping creation");
        return true;
      }

      const { error } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email,
        is_user_approved: true,
        user_role: 'user'
      });

      if (error) {
        if (error.code === '23505') {
          console.log("Profile already exists (detected via error), skipping creation");
          return true;
        }
        console.error('Error creating user profile:', error);
        throw error;
      }
      console.log('User profile created successfully');
      return true;
    } catch (error: any) {
      console.error('Exception in createUserProfile:', error);
      throw error;
    }
  };

  return { fetchUserProfile, createUserProfile, checkProfileExists };
}
