-- Helper: is the calling user a developer?
CREATE OR REPLACE FUNCTION is_developer()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM profile WHERE user_id = auth.uid() AND role = 'developer')
$$;

-- List all non-developer profiles with email
CREATE OR REPLACE FUNCTION admin_list_profiles()
RETURNS TABLE(user_id uuid, email text, role text, first_name text, last_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_developer() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.user_id, u.email::text, p.role::text, p.first_name, p.last_name
    FROM profile p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.role != 'developer'
    ORDER BY u.created_at DESC;
END;
$$;

-- Grant or revoke lifetime for a user
CREATE OR REPLACE FUNCTION admin_set_lifetime(target_user_id uuid, grant_lifetime boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_developer() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF (SELECT role FROM profile WHERE user_id = target_user_id) = 'developer' THEN
    RAISE EXCEPTION 'Cannot modify developer accounts';
  END IF;
  UPDATE profile
  SET role = CASE WHEN grant_lifetime THEN 'lifetime' ELSE 'free' END
  WHERE user_id = target_user_id;
END;
$$;
