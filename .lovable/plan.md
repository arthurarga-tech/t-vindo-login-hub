

# Implementar Sistema de Usuarios com Funcoes e Permissoes

## Visao Geral

Criar um sistema completo de gerenciamento de usuarios onde o proprietario pode adicionar membros com funcoes especificas (Gerente, Atendente, Cozinha, Garcom), cada um com acesso limitado a areas especificas do dashboard. O convite sera feito por email + senha temporaria.

## Funcoes e Permissoes de Acesso

```text
+-------------+--------+-----------+----------+---------+---------+--------+----------+--------+-------+
| Pagina      | Owner  | Gerente   | Atendente| Cozinha | Garcom  |
+-------------+--------+-----------+----------+---------+---------+
| Pedidos     |   X    |     X     |    X     |  X(*)   |   X     |
| Mesas       |   X    |     X     |    X     |         |   X     |
| Financeiro  |   X    |     X     |          |         |         |
| Catalogo    |   X    |     X     |    X     |         |         |
| Meu Negocio |   X    |     X     |          |         |         |
| Clientes    |   X    |     X     |    X     |         |         |
| Usuarios    |   X    |           |          |         |         |
| Meu Plano   |   X    |           |          |         |         |
| Configuracoes|  X    |     X     |          |         |         |
+-------------+--------+-----------+----------+---------+---------+

(*) Cozinha: acesso somente ao Kanban de pedidos, sem valores
```

## Etapas de Implementacao

### Etapa 1: Banco de Dados

- Adicionar novos valores ao enum `establishment_role`: `attendant`, `kitchen`, `waiter`
- Criar uma edge function `create-team-member` que:
  - Recebe email, senha temporaria e role
  - Cria o usuario via Supabase Admin API (`supabase.auth.admin.createUser`)
  - Vincula ao estabelecimento na tabela `establishment_members`
  - Cria o perfil na tabela `profiles`
- Atualizar a RLS policy de `profiles` para permitir que owners vejam perfis dos membros do seu estabelecimento (necessario para exibir nomes na tabela de usuarios)

### Etapa 2: Hook de Permissoes (`useUserRole`)

Criar um hook `useUserRole` que:
- Busca o role do usuario logado na tabela `establishment_members`
- Retorna o role e funcoes auxiliares como `canAccess(page)` e `isOwner`
- Define o mapeamento de quais paginas cada role pode acessar

### Etapa 3: Controle de Acesso no Sidebar

- Filtrar os itens do menu com base no role do usuario
- Cozinha ve apenas "Gestao de Pedidos"
- Garcom ve "Gestao de Pedidos" e "Mesas"
- Atendente ve Pedidos, Mesas, Catalogo, Clientes
- Gerente ve tudo exceto Usuarios e Meu Plano
- Owner ve tudo

### Etapa 4: Protecao de Rotas

- Atualizar o `ProtectedRoute` ou criar um wrapper que redireciona para a primeira pagina permitida caso o usuario tente acessar uma rota nao autorizada

### Etapa 5: Pagina de Usuarios (refatorar `Usuarios.tsx`)

- Formulario de adicao com campos: Email, Senha temporaria, Funcao (select com Gerente/Atendente/Cozinha/Garcom)
- Chamar a edge function `create-team-member` ao submeter
- Tabela com lista de membros mostrando nome, email, funcao, data de entrada
- Botao de editar funcao (apenas owner)
- Botao de remover membro (apenas owner)
- Indicacao visual do proprietario (sem botoes de acao)

### Etapa 6: Ajuste no Kanban para Cozinha

- Quando o role for `kitchen`, ocultar valores monetarios nos cards de pedido
- Mostrar apenas nome dos itens, quantidades e observacoes

## Detalhes Tecnicos

### Edge Function `create-team-member`

```text
POST /create-team-member
Body: { email, password, role, establishment_id }
Auth: Bearer token do owner

1. Verifica se o caller e owner do establishment
2. Cria usuario via supabase.auth.admin.createUser()
3. Insere em establishment_members (establishment_id, user_id, role)
4. Insere em profiles (user_id, establishment_name, establishment_id)
5. Retorna o novo membro criado
```

### Mapeamento de permissoes (useUserRole)

```text
const rolePermissions = {
  owner:     ["pedidos","mesas","financeiro","catalogo","meu-negocio","clientes","usuarios","meu-plano","configuracoes"],
  manager:   ["pedidos","mesas","financeiro","catalogo","meu-negocio","clientes","configuracoes"],
  attendant: ["pedidos","mesas","catalogo","clientes"],
  kitchen:   ["pedidos"],
  waiter:    ["pedidos","mesas"],
}
```

### Arquivos a criar/modificar

1. **Criar** `supabase/functions/create-team-member/index.ts` -- edge function
2. **Criar** `src/hooks/useUserRole.ts` -- hook de permissoes
3. **Modificar** `src/components/dashboard/DashboardSidebar.tsx` -- filtrar menu por role
4. **Modificar** `src/components/auth/ProtectedRoute.tsx` -- verificar permissao de rota
5. **Modificar** `src/pages/dashboard/Usuarios.tsx` -- refatorar formulario e tabela
6. **Modificar** `src/components/pedidos/OrderCard.tsx` -- ocultar valores para cozinha
7. **Migrar** banco: adicionar valores ao enum `establishment_role`

