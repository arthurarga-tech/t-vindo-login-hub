
# Plano: Adicionar Botão Ocultar/Mostrar nos Adicionais

## Objetivo
Implementar a funcionalidade de ocultar/mostrar (toggle de visibilidade) nos adicionais dentro dos grupos de adicionais, seguindo o mesmo padrão visual já utilizado em **Categorias** e **Produtos**.

## Análise do Estado Atual

### AddonList.tsx (atual)
- Possui botões de **Editar** (Pencil) e **Excluir** (Trash2)
- Exibe Badge "Inativo" quando `addon.active === false`
- Não possui botão para alternar visibilidade

### Padrão em CategoryList.tsx
- Usa ícones **Eye** (visível) e **EyeOff** (oculto)
- Botões aparecem no hover com `opacity-0 group-hover:opacity-100`
- Tooltips implícitos via `aria-label`

### Padrão em ProductList.tsx
- Botões com texto: "Ocultar" ou "Mostrar"
- Usa ícones **Eye** e **EyeOff** junto com texto
- Visual mais explícito e clicável

## Implementação Proposta

### Mudanças no AddonList.tsx

1. **Importar ícones adicionais**
   - Adicionar `Eye` e `EyeOff` de lucide-react

2. **Adicionar botão de toggle visibilidade**
   - Inserir botão entre o preço e o botão de editar
   - Usar ícone Eye quando ativo, EyeOff quando inativo
   - Adicionar Tooltip para melhor experiência do usuário

3. **Implementar handler de toggle**
   - Criar função `handleToggleActive` que usa `updateAddon.mutateAsync`
   - Alternar o campo `active` do addon

4. **Melhorar visual dos botões**
   - Usar cores diferenciadas:
     - Toggle: cor neutra com destaque ao hover
     - Editar: cor primária sutil
     - Excluir: cor destructive
   - Adicionar Tooltips explicativos em todos os botões

5. **Estilização do item inativo**
   - Aplicar opacidade reduzida no item inteiro quando inativo
   - Manter Badge "Inativo" existente

## Detalhes Técnicos

### Estrutura do botão de toggle

```text
+------------------------------------------+
| Nome do Adicional  [Badge Inativo]       |
|                                          |
| +R$ 5,00  [👁] [✏️] [🗑️]                 |
+------------------------------------------+
        ↑    ↑    ↑
        |    |    +-- Excluir (vermelho)
        |    +------- Editar
        +------------ Ocultar/Mostrar (novo)
```

### Cores e estados dos botões

| Botão | Ícone Ativo | Ícone Inativo | Cor Hover | Tooltip |
|-------|-------------|---------------|-----------|---------|
| Toggle | Eye | EyeOff | muted | "Ocultar adicional" / "Mostrar adicional" |
| Editar | Pencil | - | primary | "Editar adicional" |
| Excluir | Trash2 | - | destructive | "Excluir adicional" |

### Handler de toggle

```text
handleToggleActive(addon):
  1. Chamar updateAddon.mutateAsync({ 
       id: addon.id, 
       data: { active: !addon.active } 
     })
  2. O hook já invalida o cache automaticamente
```

### Visual do item inativo

```text
- Container: adicionar classe condicional para opacidade
  - Ativo: bg-muted/50
  - Inativo: bg-muted/30 com opacity-60
- Preço: manter destaque mesmo quando inativo
- Nome: aplicar text-muted-foreground quando inativo
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/catalogo/AddonList.tsx` | Adicionar botão toggle, handler, tooltips e estilos |

## Benefícios

- Consistência visual com Categorias e Produtos
- Usuário entende claramente que botões são clicáveis
- Tooltips explicam a ação antes do clique
- Cores diferenciadas facilitam identificação rápida
- Acessibilidade mantida com aria-labels

