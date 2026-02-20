-- Restaura a policy pública de leitura na tabela establishments
-- Necessária para que a view establishments_public (security_invoker=on)
-- funcione corretamente para usuários anônimos (clientes na loja).
-- Dados sensíveis continuam protegidos pois a view não os expõe
-- (owner_id, card_credit_fee, card_debit_fee estão fora da view).

CREATE POLICY "Public can view establishments via view"
ON public.establishments
FOR SELECT
USING (slug IS NOT NULL);