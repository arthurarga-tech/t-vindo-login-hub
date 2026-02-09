

# 1. Unificar Seletor de Produtos + Filtro de Categorias no Novo Pedido

## Problema Atual

Existem **dois componentes diferentes** que fazem a mesma coisa (selecionar produto com addons):

1. **`QuickOrderProductList.tsx`** - usado no "Novo Pedido" (Balcao/Mesa) - tem busca mas **sem filtro de categorias**, usa layout Collapsible por categoria, cada categoria faz queries separadas
2. **`OrderAddItemModal.tsx`** - usado em Mesas "+ Adicionar" e no detalhe do pedido - tem busca **com filtro de categorias** (chips), layout flat com scroll

Ambos fazem: exibir produtos, buscar, selecionar, customizar addons (quantidade, observacao).

## Solucao: Componente Unificado `ProductSelector`

Criar um componente reutilizavel `ProductSelector` que sera usado nos dois contextos. Ele contera:
- Filtro horizontal de categorias (chips)
- Campo de busca
- Lista de produtos agrupada por categoria com scroll nativo
- Dialog de customizacao de addons (quantidade, observacao, extras)

### Diferenca entre contextos

| Aspecto | Novo Pedido (QuickOrder) | Adicionar Item (OrderAdd) |
|---------|--------------------------|---------------------------|
| Output | Retorna item para cart local | Salva direto no banco |
| Callback | `onSelectProduct(product, qty, obs, addons)` | `onSelectProduct(product, qty, obs, addons)` |

A unica diferenca e **o que acontece depois** da selecao. O componente `ProductSelector` e identico nos dois casos.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/pedidos/ProductSelector.tsx` | **NOVO** - componente unificado de selecao de produto |
| `src/components/pedidos/QuickOrderProductList.tsx` | Refatorar para usar `ProductSelector` |
| `src/components/pedidos/OrderAddItemModal.tsx` | Refatorar para usar `ProductSelector` (remover logica duplicada) |

## Detalhes do ProductSelector

O componente recebera:
- `establishmentId: string`
- `onSelectProduct: (data: { product, quantity, observation, addons }) => void`

Internamente tera:
1. Busca de categorias e produtos via hooks existentes
2. Chips de filtro horizontal (Todos + categorias ativas)
3. Input de busca com icone
4. Lista de produtos agrupada por categoria, com headers sticky
5. Ao clicar em produto: abre dialog interno de customizacao (addons, quantidade, observacao)
6. Touch targets de 48px para mobile
7. Scroll vertical nativo (sem ScrollArea do Radix)

O `QuickOrderProductList` passara a ser um wrapper fino que importa `ProductSelector` e repassa o callback `onAddItem`.

O `OrderAddItemModal` usara `ProductSelector` no step "select" e mantendo apenas o wrapper do Dialog.

---

# 2. Descricao Completa das Funcionalidades do Sistema Tavindo

## Modulos do Sistema

### Loja Online (Cardapio Digital)
- Pagina publica acessivel por link compartilhavel (ex: tavindo.app/loja/slug)
- Catalogo de produtos organizado por categorias com imagens
- Sistema de adicionais/extras configuravel por categoria (ex: "Toppings", "Proteinas extras") com selecao multipla e quantidade
- Carrinho de compras com edicao de itens, addons e observacoes
- Checkout com formulario de dados do cliente (nome, telefone, endereco)
- Agendamento de pedidos para data/hora futura
- Horario de funcionamento automatico (abre/fecha conforme configurado)
- Fechamento temporario da loja com um clique
- Temas personalizaveis (cores primaria e secundaria)
- Pagina de confirmacao de pedido
- Rastreamento de pedido em tempo real pelo cliente

### Gestao de Pedidos (Painel Administrativo)
- Visualizacao Kanban com colunas de status (Pendente, Confirmado, Preparando, Pronto, Saiu para Entrega, Entregue)
- Visualizacao em lista alternativa
- Atualizacao de status com drag-and-drop no Kanban
- Notificacao sonora para novos pedidos
- Filtros por status, data (hoje, ontem, semana, mes), busca por cliente/numero
- Filtro de pedidos agendados
- Detalhamento completo do pedido (itens, addons, observacoes, dados do cliente)
- Edicao de pedidos existentes (adicionar/remover itens, alterar quantidades e addons)
- Impressao termica automatica (ao receber pedido ou ao confirmar)
- Personalizacao do recibo (tamanho de fonte, margens, negrito, contraste, altura de linha)
- Tempo de preparo configuravel exibido ao cliente
- Criacao rapida de pedidos pelo balcao (Novo Pedido)

### Mesas e Comandas
- Criacao de mesas com numero e nome do cliente
- Cards visuais de mesas abertas com numero, cliente, itens, total e tempo decorrido
- Adicao rapida de itens diretamente do card da mesa
- Fechamento de comanda com selecao de forma de pagamento
- Validacao contra mesas duplicadas
- Suporte a comanda aberta (pedidos incrementais na mesma mesa)
- Receita financeira registrada na data de fechamento (nao de abertura)

### Catalogo de Produtos
- Categorias com ordenacao drag-and-drop
- Produtos com nome, descricao, preco, imagem, ativo/inativo
- Upload de imagem com recorte (crop) integrado
- Reordenacao de produtos por arraste
- Sistema de adicionais por categoria (grupos de extras com min/max selecoes, obrigatorio/opcional)

### Modalidades de Atendimento
- Delivery (entrega) com rastreamento de status
- Retirada no local
- Comer no local
- Atendimento em mesa (comanda)
- Cada modalidade habilitada/desabilitada independentemente

### Gestao de Clientes
- Listagem de clientes com filtros
- Historico de pedidos por cliente
- Origem do cliente (delivery, balcao, mesa)
- Dados de contato (nome, telefone, endereco)

### Financeiro
- Resumo financeiro (receita bruta, despesas, saldo)
- Grafico de receitas e despesas por periodo
- Listagem de transacoes (entradas e saidas)
- Cadastro de despesas manuais
- Categorias de despesas personalizaveis
- Filtros por periodo (hoje, ontem, semana, mes, trimestre, customizado)
- Desconto automatico de taxas de cartao de credito/debito
- Receitas geradas automaticamente a partir de pedidos

### Configuracoes
- Modo de impressao (desativado, ao receber, ao confirmar)
- Personalizacao do recibo termico (fonte, margens, negrito, contraste)
- Cores do tema da loja
- Taxas de cartao de credito e debito
- Som de notificacao
- Notificacoes WhatsApp automaticas por status do pedido com templates personalizaveis

### Meu Negocio
- Dados do estabelecimento (nome, descricao, logo, banner)
- Endereco completo
- Telefone e WhatsApp
- Horario de funcionamento por dia da semana
- Modalidades de servico (delivery, retirada, comer no local, mesa)
- Metodos de pagamento aceitos (Pix, credito, debito, dinheiro)
- Link publico da loja (slug personalizavel)

### Autenticacao e Seguranca
- Login com email e senha
- Recuperacao de senha por email
- Alteracao de senha com validacao da senha atual
- Rotas protegidas (painel administrativo)
- Politicas de seguranca no banco de dados (RLS)

### Planos e Assinatura
- Exibicao de planos disponiveis
- Integracao com Stripe para pagamento de assinaturas
- Portal de gerenciamento de assinatura
- Banner de status da assinatura

## Diferenciais para Venda

1. **Sem necessidade de app** - funciona 100% no navegador, tanto para o dono quanto para o cliente
2. **Tempo real** - pedidos aparecem instantaneamente no painel sem recarregar
3. **Mobile-first** - otimizado para garcom com celular na mao
4. **Impressao termica** - recibo formatado para impressoras 58mm
5. **WhatsApp integrado** - notificacoes automaticas de status
6. **Multi-modalidade** - delivery, balcao, mesa e retirada no mesmo sistema
7. **Financeiro automatico** - receitas geradas automaticamente dos pedidos
8. **Agendamento** - cliente pode agendar pedido para hora futura
9. **Personalizavel** - cores, mensagens WhatsApp, recibo, horarios

## Melhorias Futuras Sugeridas

1. **Dashboard com metricas** - graficos de vendas do dia, ticket medio, produtos mais vendidos, horarios de pico
2. **Programa de fidelidade** - pontos por pedido, cupons de desconto
3. **Multi-usuarios** - diferentes perfis (admin, garcom, caixa, cozinha) com permissoes
4. **Tela da Cozinha (KDS)** - monitor na cozinha mostrando pedidos em preparacao
5. **Integracao iFood/Rappi** - receber pedidos de marketplaces no mesmo painel
6. **Relatorios avancados** - exportar para Excel, relatorio fiscal, DRE simplificado
7. **Cardapio com QR Code** - cliente escaneia na mesa e faz pedido pelo celular
8. **Chat com cliente** - comunicacao direta dentro do sistema
9. **Controle de estoque** - baixa automatica ao vender, alertas de estoque baixo
10. **App PWA** - instalar como aplicativo no celular do dono e dos garcons

