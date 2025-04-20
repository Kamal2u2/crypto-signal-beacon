
-- Function to create a user profile while bypassing RLS
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  is_user_approved BOOLEAN DEFAULT false,
  user_role TEXT DEFAULT 'user'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_approved, role)
  VALUES (user_id, user_email, is_user_approved, user_role);
END;
$$;
