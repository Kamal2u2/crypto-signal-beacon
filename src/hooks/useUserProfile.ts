
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/auth';

export function useUserProfile() {
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      // Use the direct table query with RLS bypassing
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        // Don't show toast for every error as it can cause a flood
        console.error('Error fetching user profile:', error);
        return null;
      }

      console.log('Profile fetched:', profile ? 'found' : 'not found');
      return profile as UserProfile | null;
    } catch (error: any) {
      console.error('Exception in fetchUserProfile:', error);
      return null;
    }
  };

  const checkProfileExists = async (userId: string): Promise<boolean> => {
    try {
      console.log('Checking if profile exists for ID:', userId);
      // Use direct ID check which is more reliable
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

      // Try to create the profile directly first
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
        
        // If direct insert fails, try the RPC as fallback
        console.log('Attempting to create profile via RPC as fallback');
        const { error: rpcError } = await supabase.rpc('create_user_profile', {
          user_id: userId,
          user_email: email,
          is_user_approved: true,
          user_role: 'user'
        });
        
        if (rpcError) {
          console.error('RPC fallback also failed:', rpcError);
          throw rpcError;
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
