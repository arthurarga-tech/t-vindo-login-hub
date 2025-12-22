-- Add authorization check to create_default_financial_categories() function
-- This prevents unauthorized RPC calls from manipulating other establishments' data

CREATE OR REPLACE FUNCTION public.create_default_financial_categories(est_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add ownership/membership check to prevent unauthorized access
  IF NOT (is_establishment_owner(auth.uid(), est_id) OR is_establishment_member(auth.uid(), est_id)) THEN
    RAISE EXCEPTION 'Access denied: not authorized for this establishment';
  END IF;
  
  -- Default expense categories
  INSERT INTO financial_categories (establishment_id, name, type, icon, is_default) VALUES
    (est_id, 'Equipamentos', 'expense', 'wrench', true),
    (est_id, 'Aluguel', 'expense', 'home', true),
    (est_id, 'Gás', 'expense', 'flame', true),
    (est_id, 'Combustível', 'expense', 'fuel', true),
    (est_id, 'Luz', 'expense', 'zap', true),
    (est_id, 'Água', 'expense', 'droplet', true),
    (est_id, 'Internet', 'expense', 'wifi', true),
    (est_id, 'Salários', 'expense', 'users', true),
    (est_id, 'Fornecedores', 'expense', 'truck', true),
    (est_id, 'Manutenção', 'expense', 'tool', true),
    (est_id, 'Marketing', 'expense', 'megaphone', true),
    (est_id, 'Impostos', 'expense', 'file-text', true),
    (est_id, 'Outros', 'expense', 'more-horizontal', true);
  
  -- Default income categories
  INSERT INTO financial_categories (establishment_id, name, type, icon, is_default) VALUES
    (est_id, 'Vendas', 'income', 'shopping-bag', true),
    (est_id, 'Outros', 'income', 'plus-circle', true);
END;
$$;