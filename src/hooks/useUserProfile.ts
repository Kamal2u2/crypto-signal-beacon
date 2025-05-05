
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/auth';

export function useUserProfile() {
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      // Try first with RPC which bypasses RLS
      const { data: profileData, error: rpcError } = await supabase.rpc(
        'get_user_profile_by_id',
        { user_id: userId }
      );
      
      if (!rpcError && profileData) {
        console.log('Profile fetched via RPC:', profileData);
        return profileData as UserProfile;
      }
      
      if (rpcError) {
        console.log('RPC not available, falling back to direct query');
      }
      
      // Fallback to direct query
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
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
      
      // First try with RPC
      const { data: exists, error: rpcError } = await supabase.rpc(
        'profile_exists',
        { user_id: userId }
      );
      
      if (!rpcError && exists !== null) {
        console.log('Profile existence checked via RPC:', exists);
        return !!exists;
      }
      
      if (rpcError) {
        console.log('RPC not available, falling back to direct query');
      }
      
      // Fallback to direct ID check
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

      // Try to create the profile via RPC first (most reliable method)
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email,
        is_user_approved: true,
        user_role: 'user'
      });
      
      if (!rpcError) {
        console.log('User profile created successfully via RPC');
        return true;
      }
      
      console.log('RPC failed, attempting direct insert:', rpcError);
      
      // Direct insert as fallback with several retries
      for (let i = 0; i < 3; i++) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            is_approved: true,
            role: 'user'
          });
          
        if (!insertError) {
          console.log('User profile created successfully via direct insert');
          return true;
        }
        
        console.error(`Insert attempt ${i+1} failed:`, insertError);
        
        // Wait a short time before retry
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      throw new Error('Failed to create user profile after multiple attempts');
    } catch (error: any) {
      console.error('Exception in createUserProfile:', error);
      throw error;
    }
  };

  return { fetchUserProfile, createUserProfile, checkProfileExists };
}
