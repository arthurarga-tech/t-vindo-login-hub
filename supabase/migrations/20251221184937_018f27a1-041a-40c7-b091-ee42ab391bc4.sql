-- Add WhatsApp notification fields to establishments
ALTER TABLE public.establishments 
ADD COLUMN whatsapp_notifications_enabled boolean DEFAULT false,
ADD COLUMN whatsapp_message_templates jsonb DEFAULT '{
  "confirmed": "✅ Olá {nome_cliente}! Seu pedido #{numero_pedido} foi confirmado! Valor: R$ {total}. Obrigado pela preferência! - {nome_estabelecimento}",
  "preparing": "👨‍🍳 Olá {nome_cliente}! Seu pedido #{numero_pedido} está sendo preparado! - {nome_estabelecimento}",
  "ready_pickup": "📦 Olá {nome_cliente}! Seu pedido #{numero_pedido} está pronto para retirada! - {nome_estabelecimento}",
  "ready_delivery": "🚚 Olá {nome_cliente}! Seu pedido #{numero_pedido} está pronto e aguardando o motoboy! - {nome_estabelecimento}",
  "out_for_delivery": "🛵 Olá {nome_cliente}! Seu pedido #{numero_pedido} saiu para entrega! - {nome_estabelecimento}",
  "delivered": "🎉 Olá {nome_cliente}! Seu pedido #{numero_pedido} foi entregue! Bom apetite! - {nome_estabelecimento}",
  "picked_up": "🎉 Olá {nome_cliente}! Pedido #{numero_pedido} retirado com sucesso! Bom apetite! - {nome_estabelecimento}",
  "served": "🍽️ Olá {nome_cliente}! Seu pedido #{numero_pedido} foi servido! Bom apetite! - {nome_estabelecimento}"
}'::jsonb;