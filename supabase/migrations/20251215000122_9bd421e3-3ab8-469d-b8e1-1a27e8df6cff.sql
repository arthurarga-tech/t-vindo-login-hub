
-- Add card fees to establishments
ALTER TABLE public.establishments 
ADD COLUMN card_credit_fee numeric DEFAULT 0,
ADD COLUMN card_debit_fee numeric DEFAULT 0;

-- Create financial categories table
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create financial transactions table
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  gross_amount numeric NOT NULL,
  fee_amount numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  payment_method text,
  description text NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_categories
CREATE POLICY "Members can view categories"
ON public.financial_categories FOR SELECT
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can create categories"
ON public.financial_categories FOR INSERT
WITH CHECK (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can update categories"
ON public.financial_categories FOR UPDATE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can delete categories"
ON public.financial_categories FOR DELETE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- RLS policies for financial_transactions
CREATE POLICY "Members can view transactions"
ON public.financial_transactions FOR SELECT
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can create transactions"
ON public.financial_transactions FOR INSERT
WITH CHECK (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can update transactions"
ON public.financial_transactions FOR UPDATE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can delete transactions"
ON public.financial_transactions FOR DELETE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Create function to insert default categories for an establishment
CREATE OR REPLACE FUNCTION public.create_default_financial_categories(est_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Create function to log order as financial transaction
CREATE OR REPLACE FUNCTION public.log_order_as_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_credit_fee numeric;
  v_debit_fee numeric;
  v_fee_amount numeric := 0;
  v_net_amount numeric;
  v_payment_method text;
BEGIN
  -- Only process when order reaches final status
  IF NEW.status IN ('delivered', 'picked_up', 'served') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'picked_up', 'served')) THEN
    
    -- Check if transaction already exists for this order
    IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Get sales category for this establishment
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE establishment_id = NEW.establishment_id
      AND name = 'Vendas'
      AND type = 'income'
    LIMIT 1;
    
    -- If no category exists, create default categories
    IF v_category_id IS NULL THEN
      PERFORM create_default_financial_categories(NEW.establishment_id);
      SELECT id INTO v_category_id
      FROM financial_categories
      WHERE establishment_id = NEW.establishment_id
        AND name = 'Vendas'
        AND type = 'income'
      LIMIT 1;
    END IF;
    
    -- Get card fees from establishment
    SELECT card_credit_fee, card_debit_fee 
    INTO v_credit_fee, v_debit_fee
    FROM establishments
    WHERE id = NEW.establishment_id;
    
    -- Calculate fee based on payment method
    v_payment_method := NEW.payment_method;
    IF v_payment_method = 'credit' THEN
      v_fee_amount := NEW.total * (COALESCE(v_credit_fee, 0) / 100);
    ELSIF v_payment_method = 'debit' THEN
      v_fee_amount := NEW.total * (COALESCE(v_debit_fee, 0) / 100);
    END IF;
    
    v_net_amount := NEW.total - v_fee_amount;
    
    -- Insert financial transaction
    INSERT INTO financial_transactions (
      establishment_id,
      category_id,
      order_id,
      type,
      gross_amount,
      fee_amount,
      net_amount,
      payment_method,
      description,
      transaction_date
    ) VALUES (
      NEW.establishment_id,
      v_category_id,
      NEW.id,
      'income',
      NEW.total,
      v_fee_amount,
      v_net_amount,
      v_payment_method,
      'Pedido #' || NEW.order_number,
      NEW.created_at::date
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic revenue logging
CREATE TRIGGER log_order_transaction
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_as_transaction();

-- Add updated_at triggers
CREATE TRIGGER update_financial_categories_updated_at
BEFORE UPDATE ON public.financial_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
