
# Melhorias na Tela de Mesas/Comandas: Detalhes e Adicionar Item

## Problemas Identificados

1. **OrderDetailModal (mini-pagina ao clicar no card)**: O modal usa `max-w-lg` com `overflow-y-auto`, mas o conteudo interno (badges, botoes de acao, informacoes do cliente) nao quebra corretamente em telas pequenas, gerando scroll horizontal. Em mobile, o modal nao ocupa a tela inteira, desperdicando espaco.

2. **Botao "+ Adicionar" no TableCard**: Atualmente abre o mesmo `OrderDetailModal` (detalhe do pedido), forcando o garcom a clicar novamente em "Adicionar" dentro do modal. Sao cliques desnecessarios.

3. **OrderAddItemModal (tela de adicionar item)**: Ja possui busca por produto, mas falta filtro por categoria. O layout pode melhorar para mobile.

---

## Plano de Implementacao

### 1. Corrigir OrderDetailModal para Mobile

**Arquivo**: `src/components/pedidos/OrderDetailModal.tsx`

- Em mobile, o modal ocupara tela inteira (`w-full h-full sm:max-w-lg sm:max-h-[90vh]`)
- Corrigir o header com badges que causam overflow horizontal: usar `flex-wrap` nos badges de status/tipo
- Botoes de acao no rodape: usar layout empilhado em mobile (`flex-col` em telas pequenas) com touch targets de 44px
- Garantir que todo o conteudo tenha scroll vertical fluido sem scroll horizontal

### 2. Botao "+ Adicionar" Abre Direto o AddItemModal

**Arquivo**: `src/pages/dashboard/Mesas.tsx`

- Criar novo state `addingItemOrder` para controlar qual pedido esta recebendo item
- No `TableCard`, o `onAddItem` agora abrira o `OrderAddItemModal` diretamente (sem passar pelo detalhe)
- Importar e renderizar `OrderAddItemModal` na pagina Mesas

### 3. Melhorar OrderAddItemModal com Filtro por Categoria

**Arquivo**: `src/components/pedidos/OrderAddItemModal.tsx`

- Adicionar filtro horizontal de categorias (chips/badges clicaveis) acima da lista de produtos
- Chip "Todos" selecionado por padrao + chips para cada categoria ativa
- Filtro funciona em conjunto com a busca por texto
- Em mobile: area de produtos usa `overflow-y-auto` com `div` nativo (sem ScrollArea do Radix para evitar conflitos de scroll)
- Touch targets de 44px nos botoes de produto
- Layout fullscreen em mobile para melhor aproveitamento de tela

---

## Detalhes Tecnicos

### OrderDetailModal - Mudancas CSS

- Classe do DialogContent: adicionar responsividade mobile-first
- Header: `flex-wrap gap-1` nos badges para evitar overflow
- Botoes de acao: `flex-wrap gap-2` com `min-h-[44px]` para touch
- Secao de itens: garantir `overflow-x-hidden`

### Mesas.tsx - Novo Fluxo

```text
TableCard "+ Adicionar"
    |
    v
OrderAddItemModal (direto)
    |
    v
Selecionar produto -> Customizar -> Confirmar
```

### OrderAddItemModal - Filtro de Categorias

```text
[Todos] [Lanches] [Bebidas] [Sobremesas]  <-- chips horizontais com scroll
[_______ Buscar produto... _______]        <-- busca por texto
|                                  |
|  Lista de produtos filtrados     |       <-- scroll vertical nativo
|  com touch targets de 44px       |
|__________________________________|
```

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/pedidos/OrderDetailModal.tsx` | Layout responsivo, fix scroll horizontal, touch targets |
| `src/pages/dashboard/Mesas.tsx` | Novo state + renderizar OrderAddItemModal direto |
| `src/components/pedidos/OrderAddItemModal.tsx` | Filtro por categoria, layout mobile fullscreen, touch targets |
| `src/components/mesas/TableCard.tsx` | Nenhuma mudanca (ja tem onAddItem) |
