
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/auth';

export function useUserProfile() {
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      // Use the direct table query instead of a complex join that might cause RLS recursion
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: "Error",
          description: "Failed to fetch user profile: " + error.message,
          variant: "destructive",
        });
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if profile exists:', error);
        return false;
      }

      return !!data;
    } catch (error: any) {
      console.error('Exception in checkProfileExists:', error);
      return false;
    }
  };

  const createUserProfile = async (userId: string, email: string): Promise<boolean> => {
    try {
      console.log('Creating user profile for ID:', userId, 'and email:', email);
      
      // First check if profile exists to avoid duplicates
      const profileExists = await checkProfileExists(userId);

      if (profileExists) {
        console.log("Profile already exists for user, skipping creation");
        return true;
      }

      // Use the RPC function instead of direct insert to bypass RLS
      const { error } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email,
        is_user_approved: true,
        user_role: 'user'
      });
      
      if (error) {
        // If there's an error with the RPC function, try direct insert
        console.warn('Error using RPC, falling back to direct insert:', error);
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            is_approved: true,
            role: 'user'
          });
          
        if (insertError) {
          console.error('Error creating user profile:', insertError);
          throw insertError;
        }
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
