
-- Update handle_new_user to also create establishment + membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_establishment_id uuid;
  v_establishment_name text;
BEGIN
  v_establishment_name := COALESCE(
    new.raw_user_meta_data ->> 'establishment_name',
    'Meu Estabelecimento'
  );

  -- Create the establishment
  INSERT INTO public.establishments (owner_id, name)
  VALUES (new.id, v_establishment_name)
  RETURNING id INTO v_establishment_id;

  -- Create membership as owner
  INSERT INTO public.establishment_members (establishment_id, user_id, role)
  VALUES (v_establishment_id, new.id, 'owner');

  -- Create profile linked to establishment
  INSERT INTO public.profiles (user_id, establishment_name, establishment_id)
  VALUES (new.id, v_establishment_name, v_establishment_id);

  RETURN new;
END;
$$;
