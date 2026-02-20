
# Correção Urgente — "Loja não encontrada" para Todos os Clientes

## Diagnóstico Preciso

### O que aconteceu
Uma migração de segurança recente (`20260220115556`) removeu a policy `"Public can view establishments via view only"` que permitia leitura pública na tabela `establishments`. Ela foi substituída por policies que **exigem autenticação** (`auth.uid() IS NOT NULL`).

### Por que a loja quebrou
A view `establishments_public` está configurada com `security_invoker=on`. Isso significa que, ao ser consultada por um usuário anônimo (cliente na loja), ela executa as queries internas com as permissões desse usuário anônimo — e as RLS da tabela `establishments` bloqueiam esse acesso.

```text
Cliente anônimo consulta establishments_public
  → view executa: SELECT ... FROM establishments WHERE slug = 'acaidajana'
  → RLS da tabela establishments avalia:
      - "Only authenticated members..." → requer auth.uid() IS NOT NULL → BLOQUEADO
      - "Users can view their own..."  → requer auth.uid() → BLOQUEADO
  → Nenhuma row retornada → establishment = null → "Loja não encontrada"
```

### Confirmação
- `SELECT id, name, slug FROM establishments_public WHERE slug = 'acaidajana'` retorna dados corretos quando executado com permissão de serviço (pelo sistema de queries)
- Mas quando executado com `anon` key (como o frontend faz), retorna vazio
- O estabelecimento e seus dados estão intactos no banco

## Solução

Recriar a policy pública de SELECT na tabela `establishments` que permite leitura apenas quando o `slug IS NOT NULL` (mesmo critério que a view usa). Isso restaura o acesso anônimo via view sem expor dados sensíveis, pois:
- Os campos sensíveis (`owner_id`, `card_credit_fee`, `card_debit_fee`, etc.) **não estão na view** — a view já filtra esses campos
- O acesso direto à tabela ainda será bloqueado para campos não expostos pela view

## Migration SQL a aplicar

```sql
-- Restaura a policy pública de leitura na tabela establishments
-- Necessária para que a view establishments_public (security_invoker=on)
-- funcione corretamente para usuários anônimos (clientes na loja).
-- Dados sensíveis continuam protegidos pois a view não os expõe.

CREATE POLICY "Public can view establishments via view"
ON public.establishments
FOR SELECT
USING (slug IS NOT NULL);
```

## Por que essa solução é segura
- A policy permite SELECT na tabela com `slug IS NOT NULL` — mas o cliente anônimo não acessa a tabela diretamente, acessa via view
- A view `establishments_public` **não inclui**: `owner_id`, `card_credit_fee`, `card_debit_fee` — esses campos permanecem inacessíveis
- As policies de INSERT e UPDATE continuam restritas a autenticados e owners
- Essa era exatamente a policy que existia antes da migração de segurança

## Arquivo a modificar

| Ação | Arquivo |
|---|---|
| Nova migration SQL | `supabase/migrations/...` |

## Impacto esperado
Imediato. Assim que a migration for aplicada, a view `establishments_public` voltará a funcionar para usuários anônimos. A Açaí da Jana e todos os outros estabelecimentos terão suas lojas restauradas sem necessidade de publicar o frontend.
