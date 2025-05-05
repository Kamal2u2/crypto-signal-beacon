
-- Function to check if a profile exists by user ID
CREATE OR REPLACE FUNCTION public.profile_exists(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = user_id
  ) INTO profile_exists;
  
  RETURN profile_exists;
END;
$$;
