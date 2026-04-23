CREATE OR REPLACE FUNCTION admin_set_role(target_user_id uuid, new_role text)
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
  IF new_role NOT IN ('free', 'standard', 'premium', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE profile SET role = new_role WHERE user_id = target_user_id;
END;
$$;
