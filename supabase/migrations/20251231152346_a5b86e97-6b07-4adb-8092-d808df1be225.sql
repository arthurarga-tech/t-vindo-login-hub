-- RPC function to get customers with stats, pagination, and filters
-- This calculates statistics efficiently in the database
CREATE OR REPLACE FUNCTION get_customers_with_stats(
  p_establishment_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_sort_by text DEFAULT 'recent'
)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  created_at timestamptz,
  updated_at timestamptz,
  total_orders bigint,
  total_spent numeric,
  last_order_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller has access to this establishment
  IF NOT (is_establishment_owner(auth.uid(), p_establishment_id) OR 
          is_establishment_member(auth.uid(), p_establishment_id)) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this establishment';
  END IF;

  RETURN QUERY
  WITH customer_stats AS (
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.address,
      c.address_number,
      c.address_complement,
      c.neighborhood,
      c.city,
      c.created_at,
      c.updated_at,
      COUNT(o.id)::bigint as total_orders,
      COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric as total_spent,
      MAX(CASE WHEN o.status != 'cancelled' THEN o.created_at ELSE NULL END) as last_order_at
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE c.establishment_id = p_establishment_id
      AND (p_search IS NULL OR p_search = '' OR 
           c.name ILIKE '%' || p_search || '%' OR 
           c.phone LIKE '%' || p_search || '%')
      AND (p_neighborhood IS NULL OR p_neighborhood = '' OR c.neighborhood = p_neighborhood)
    GROUP BY c.id, c.name, c.phone, c.address, c.address_number, c.address_complement, c.neighborhood, c.city, c.created_at, c.updated_at
  ),
  counted AS (
    SELECT 
      cs.*,
      COUNT(*) OVER() as total_count
    FROM customer_stats cs
  )
  SELECT 
    counted.id,
    counted.name,
    counted.phone,
    counted.address,
    counted.address_number,
    counted.address_complement,
    counted.neighborhood,
    counted.city,
    counted.created_at,
    counted.updated_at,
    counted.total_orders,
    counted.total_spent,
    counted.last_order_at,
    counted.total_count
  FROM counted
  ORDER BY 
    CASE WHEN p_sort_by = 'recent' THEN counted.created_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'orders' THEN counted.total_orders END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'spent' THEN counted.total_spent END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'name' THEN counted.name END ASC NULLS LAST,
    counted.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- RPC function to get customer stats summary for dashboard cards
CREATE OR REPLACE FUNCTION get_customer_stats_summary(
  p_establishment_id uuid,
  p_search text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL
)
RETURNS TABLE (
  total_customers bigint,
  customers_with_orders bigint,
  total_revenue numeric,
  total_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller has access to this establishment
  IF NOT (is_establishment_owner(auth.uid(), p_establishment_id) OR 
          is_establishment_member(auth.uid(), p_establishment_id)) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this establishment';
  END IF;

  RETURN QUERY
  WITH filtered_customers AS (
    SELECT c.id
    FROM customers c
    WHERE c.establishment_id = p_establishment_id
      AND (p_search IS NULL OR p_search = '' OR 
           c.name ILIKE '%' || p_search || '%' OR 
           c.phone LIKE '%' || p_search || '%')
      AND (p_neighborhood IS NULL OR p_neighborhood = '' OR c.neighborhood = p_neighborhood)
  ),
  customer_orders AS (
    SELECT 
      fc.id as customer_id,
      COUNT(o.id)::bigint as order_count,
      COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric as customer_spent
    FROM filtered_customers fc
    LEFT JOIN orders o ON o.customer_id = fc.id AND o.status != 'cancelled'
    GROUP BY fc.id
  )
  SELECT 
    COUNT(*)::bigint as total_customers,
    COUNT(CASE WHEN order_count > 0 THEN 1 END)::bigint as customers_with_orders,
    SUM(customer_spent)::numeric as total_revenue,
    SUM(order_count)::bigint as total_orders
  FROM customer_orders;
END;
$$;