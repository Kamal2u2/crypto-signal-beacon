
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
  -- Check if user exists in auth.users to satisfy the foreign key constraint
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    -- Insert profile only if user exists
    INSERT INTO public.user_profiles (id, email, is_approved, role)
    VALUES (user_id, user_email, is_user_approved, user_role);
  ELSE
    -- Raise exception if user doesn't exist in auth.users
    RAISE EXCEPTION 'User with ID % does not exist in auth.users', user_id;
  END IF;
END;
$$;
