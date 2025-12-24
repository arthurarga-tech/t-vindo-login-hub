-- Permitir que membros/owners possam deletar clientes do seu estabelecimento
CREATE POLICY "Members can delete establishment customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
  is_establishment_member(auth.uid(), establishment_id) 
  OR is_establishment_owner(auth.uid(), establishment_id)
);