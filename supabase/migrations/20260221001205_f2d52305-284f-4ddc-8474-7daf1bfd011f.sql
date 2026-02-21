
-- Add customer_display_name to orders for storing typed name (used for printing)
ALTER TABLE public.orders ADD COLUMN customer_display_name text;

-- Update create_or_update_public_customer: when phone is empty,
-- find or create a single "Balcão" customer per establishment
CREATE OR REPLACE FUNCTION public.create_or_update_public_customer(
  p_establishment_id uuid,
  p_name text,
  p_phone text,
  p_address text DEFAULT NULL,
  p_address_number text DEFAULT NULL,
  p_address_complement text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_phone_trimmed text;
BEGIN
  v_phone_trimmed := NULLIF(TRIM(COALESCE(p_phone, '')), '');

  IF v_phone_trimmed IS NOT NULL THEN
    -- Phone provided: upsert by phone (existing behavior)
    SELECT id INTO v_customer_id
    FROM customers
    WHERE establishment_id = p_establishment_id AND phone = v_phone_trimmed;

    IF v_customer_id IS NOT NULL THEN
      UPDATE customers SET
        name = p_name,
        phone = v_phone_trimmed,
        address = p_address,
        address_number = p_address_number,
        address_complement = p_address_complement,
        neighborhood = p_neighborhood,
        city = p_city,
        updated_at = now()
      WHERE id = v_customer_id;
    ELSE
      INSERT INTO customers (
        establishment_id, name, phone, address, address_number,
        address_complement, neighborhood, city
      ) VALUES (
        p_establishment_id, p_name, v_phone_trimmed, p_address, p_address_number,
        p_address_complement, p_neighborhood, p_city
      )
      RETURNING id INTO v_customer_id;
    END IF;
  ELSE
    -- No phone: find or create a single "Balcão" customer for this establishment
    SELECT id INTO v_customer_id
    FROM customers
    WHERE establishment_id = p_establishment_id
      AND name = 'Balcão'
      AND (phone IS NULL OR phone = '')
    LIMIT 1;

    IF v_customer_id IS NULL THEN
      INSERT INTO customers (
        establishment_id, name, phone, order_origin
      ) VALUES (
        p_establishment_id, 'Balcão', '', 'counter'
      )
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  RETURN v_customer_id;
END;
$function$;
