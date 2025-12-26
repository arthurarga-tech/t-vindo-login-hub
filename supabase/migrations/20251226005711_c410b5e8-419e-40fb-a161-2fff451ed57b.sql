-- Adicionar coluna de agendamento na tabela orders
ALTER TABLE public.orders 
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Adicionar configuração de agendamento no estabelecimento
ALTER TABLE public.establishments 
ADD COLUMN allow_scheduling BOOLEAN DEFAULT false;

-- Índice para otimizar queries de pedidos agendados
CREATE INDEX idx_orders_scheduled_for ON public.orders(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.orders.scheduled_for IS 'Data/hora agendada para o pedido, NULL significa pedido imediato';
COMMENT ON COLUMN public.establishments.allow_scheduling IS 'Se true, permite que clientes agendem pedidos quando a loja está fechada';