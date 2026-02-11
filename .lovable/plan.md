

# Corrigir Onboarding de Novos Usuarios

## Problema Raiz

Quando um novo usuario se cadastra, o sistema:
1. Cria o usuario no auth (OK)
2. Cria um registro em `profiles` com o `establishment_name` (OK, via trigger `handle_new_user`)
3. **NAO cria o establishment** -- este e o problema central

Sem um registro na tabela `establishments`, todas as funcionalidades falham:
- "Meu Negocio" nao carrega dados e nao permite salvar (o `handleSave` verifica `establishment?.id`)
- Upload de logo/banner falha porque o `ImageUpload` verifica `establishment?.id`
- O nome do estabelecimento nao aparece pre-preenchido
- Nenhuma outra funcionalidade do dashboard funciona

## Solucao

Atualizar a funcao `handle_new_user` no banco de dados para automaticamente:
1. Criar o establishment com o nome fornecido no cadastro
2. Criar o registro em `establishment_members` (como owner)
3. Vincular o `establishment_id` no profile

Isso garante que ao fazer login pela primeira vez, o usuario ja tem tudo configurado.

## Detalhes Tecnicos

### 1. Migracoes SQL

Alterar a funcao `handle_new_user()` para:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_establishment_id uuid;
  v_establishment_name text;
BEGIN
  v_establishment_name := COALESCE(
    new.raw_user_meta_data ->> 'establishment_name',
    'Meu Estabelecimento'
  );

  -- Criar o establishment
  INSERT INTO public.establishments (owner_id, name)
  VALUES (new.id, v_establishment_name)
  RETURNING id INTO v_establishment_id;

  -- Criar membership como owner
  INSERT INTO public.establishment_members (establishment_id, user_id, role)
  VALUES (v_establishment_id, new.id, 'owner');

  -- Criar profile vinculado
  INSERT INTO public.profiles (user_id, establishment_name, establishment_id)
  VALUES (new.id, v_establishment_name, v_establishment_id);

  RETURN new;
END;
$$;
```

### 2. Corrigir usuario existente (b42aab40-...)

Executar SQL para criar o establishment do usuario que ja se cadastrou e esta sem dados:

```sql
-- Criar establishment para o usuario existente
INSERT INTO establishments (owner_id, name)
VALUES ('b42aab40-5dae-4be0-ae01-9afbe39631ad', 'LosHermAnos')
RETURNING id;

-- Usar o ID retornado para criar membership e atualizar profile
INSERT INTO establishment_members (establishment_id, user_id, role)
VALUES (<id_retornado>, 'b42aab40-5dae-4be0-ae01-9afbe39631ad', 'owner');

UPDATE profiles
SET establishment_id = <id_retornado>
WHERE user_id = 'b42aab40-5dae-4be0-ae01-9afbe39631ad';
```

### 3. Ajuste no `useEstablishment.ts`

Trocar `.single()` por `.maybeSingle()` nas queries para evitar erros 406 quando nao ha dados (ja e uma boa pratica e previne crashes durante a janela entre cadastro e criacao do establishment).

### 4. Ajuste no `MeuNegocio.tsx`

Adicionar tratamento para quando `establishment` e `null` (nao encontrado) -- exibir mensagem amigavel ao inves de um formulario vazio que nao funciona.

## Arquivos a serem modificados

- **Migracao SQL**: Atualizar funcao `handle_new_user` + corrigir usuario existente
- `src/hooks/useEstablishment.ts`: Trocar `.single()` por `.maybeSingle()`
- `src/pages/dashboard/MeuNegocio.tsx`: Tratar caso de establishment nulo

## Resultado

- Novos usuarios terao establishment criado automaticamente no cadastro
- Nome do estabelecimento ja vira pre-preenchido em "Meu Negocio"
- Upload de logo/banner funcionara imediatamente
- Salvar alteracoes funcionara normalmente
- O usuario existente (LosHermAnos) sera corrigido manualmente

