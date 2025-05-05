
-- Function to get a user profile by ID while bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(user_id UUID)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile public.user_profiles;
BEGIN
  SELECT * INTO profile 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN profile;
END;
$$;
