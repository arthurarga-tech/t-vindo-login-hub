-- Fix STORAGE_EXPOSURE: Update storage policies to validate establishment ownership via folder structure
-- Files must be uploaded to {establishment_id}/... path and user must be member/owner

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- INSERT: Members can upload to their establishment's folder
CREATE POLICY "Members can upload to their establishment folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (
    EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE (storage.foldername(name))[1] = e.id::text
      AND (public.is_establishment_owner(auth.uid(), e.id) OR 
           public.is_establishment_member(auth.uid(), e.id))
    )
  )
);

-- UPDATE: Members can update files in their establishment's folder  
CREATE POLICY "Members can update their establishment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (
    EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE (storage.foldername(name))[1] = e.id::text
      AND (public.is_establishment_owner(auth.uid(), e.id) OR 
           public.is_establishment_member(auth.uid(), e.id))
    )
  )
);

-- DELETE: Members can delete files in their establishment's folder
CREATE POLICY "Members can delete their establishment images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (
    EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE (storage.foldername(name))[1] = e.id::text
      AND (public.is_establishment_owner(auth.uid(), e.id) OR 
           public.is_establishment_member(auth.uid(), e.id))
    )
  )
);

-- Fix DEFINER_OR_RPC_BYPASS: Add defense-in-depth authorization check to trigger
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
  -- Only process when order reaches final status (avoid duplicate processing)
  IF NEW.status IN ('delivered', 'picked_up', 'served') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'picked_up', 'served')) THEN
    
    -- Check if transaction already exists for this order
    IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Defense-in-depth: verify caller is authorized
    -- This provides additional security even though orders RLS should already enforce this
    IF auth.uid() IS NOT NULL AND 
       NOT (is_establishment_owner(auth.uid(), NEW.establishment_id) OR 
            is_establishment_member(auth.uid(), NEW.establishment_id)) THEN
      RAISE EXCEPTION 'Unauthorized: not a member of this establishment';
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