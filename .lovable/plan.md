

# Plano de Implementacao - 3 Melhorias

## 1. Impressao Automatica via QZ Tray

### O que e o QZ Tray
QZ Tray e um software instalado no computador que permite imprimir diretamente pela web sem o dialogo do navegador. Ele se comunica via WebSocket local.

### Implementacao

**Novo arquivo: `src/lib/qzTrayService.ts`**
- Servico singleton para gerenciar conexao com QZ Tray
- Importa `qz-tray` via CDN (script dinamico) ou npm
- Funcoes: `connect()`, `disconnect()`, `isConnected()`, `getPrinters()`, `print(html)`
- Assinatura digital: implementar funcao de signing usando uma chave publica/privada. Para o dominio ficar "Verified" (como no print do cardapioweb.com), sera necessario gerar um certificado QZ Tray. Inicialmente, o sistema funcionara como "Untrusted" (o usuario clica "Allow" e marca "Remember") - mesma abordagem do print enviado
- Funcao `setCertificate(cert)` e `setSignature(signFn)` para quando o usuario tiver certificado proprio

**Novo arquivo: `src/hooks/useQzTray.ts`**
- Hook React que encapsula o servico
- States: `isConnected`, `printers`, `selectedPrinter`, `isConnecting`
- Auto-connect ao montar (se QZ Tray estiver instalado)
- Persistir impressora selecionada no localStorage
- Funcao `printRaw(html)` que envia para impressora selecionada

**Modificar: `src/pages/dashboard/Configuracoes.tsx`**
- Adicionar nova opcao no RadioGroup de modo de impressao:
  - `qz_on_order` - QZ Tray automatico ao receber pedido
  - `qz_on_confirm` - QZ Tray automatico ao confirmar pedido
- Quando modo QZ selecionado, exibir:
  - Status de conexao com QZ Tray (conectado/desconectado)
  - Botao "Conectar ao QZ Tray"
  - Dropdown com lista de impressoras detectadas
  - Botao "Imprimir Teste" via QZ Tray
  - Link para download do QZ Tray (qz.io)

**Modificar: `src/hooks/usePrintOrder.ts`**
- Adicionar modo QZ Tray: quando ativo, enviar HTML para o QZ Tray ao inves de abrir dialogo do navegador
- O QZ Tray imprime silenciosamente (sem dialogo)

**Modificar: `src/pages/dashboard/Pedidos.tsx`**
- Detectar modo `qz_on_order` / `qz_on_confirm` e usar o hook `useQzTray` para impressao silenciosa

**Sobre o certificado/assinatura:**
- O QZ Tray exige que mensagens sejam assinadas digitalmente para suprimir o popup "Untrusted"
- Para isso, e necessario comprar uma licenca do QZ Tray e gerar certificado no painel deles
- Inicialmente, o sistema funcionara sem certificado (popup "Allow" aparece na primeira vez, usuario marca "Remember this decision")
- Futuramente, pode-se adicionar um campo nas configuracoes para o usuario colar seu certificado e chave privada

### Dependencia
- Pacote npm `qz-tray` sera adicionado ao projeto

---

## 2. Corrigir Cor da Barra de Navegacao Mobile no Dashboard

### Problema
O print mostra a barra do navegador mobile na cor laranja padrao (#ea580c) ao inves da cor primaria configurada pelo estabelecimento. O hook `useThemeColor` ja existe mas so e usado nas paginas publicas da loja, nao no dashboard.

### Solucao

**Modificar: `src/components/dashboard/DashboardLayout.tsx`**
- Importar e usar o hook `useThemeColor` passando `(establishment as any)?.theme_primary_color`
- Isso vai atualizar a meta tag `theme-color` com a cor primaria do estabelecimento quando o dono estiver no painel

Mudanca simples de 2 linhas:
```
import { useThemeColor } from "@/hooks/useThemeColor";
// dentro de DashboardLayout:
useThemeColor((establishment as any)?.theme_primary_color);
```

---

## 3. Corrigir Duplicidade de Carregamento na Pagina de Login

### Problema
Ao acessar a pagina de login ou ao efetuar login, ha uma sensacao de "carregamento duplo" - possivelmente o `ProtectedRoute` e o `LoginCard` competindo por redirecionamento.

### Causa Raiz
1. O `LoginCard` tem um `useEffect` que redireciona para `/dashboard` quando `user` existe
2. O `ProtectedRoute` tambem redireciona e mostra um spinner enquanto `loading` ou `isLoadingSubscription`
3. Quando o usuario faz login, o `LoginCard` redireciona para `/dashboard`, que monta o `ProtectedRoute`, que mostra spinner enquanto carrega subscription, que depende de `useEstablishment`, que depende de `useAuth` - criando uma cadeia de loading states

### Solucao

**Modificar: `src/components/login/LoginCard.tsx`**
- Mostrar um estado de loading no botao "Entrar" enquanto o auth state esta sendo resolvido (apos signIn bem-sucedido)
- Remover o `navigate('/dashboard')` duplicado no `handleLogin` (ja existe no useEffect)
- Adicionar `if (loading) return null` ou um spinner simples para evitar flash do formulario quando usuario ja esta logado

**Modificar: `src/pages/Index.tsx`**
- Adicionar verificacao de auth loading: se `loading` esta true, mostrar spinner centralizado ao inves de renderizar logo + LoginCard simultaneamente
- Se `user` ja existe e `!loading`, redirecionar imediatamente sem mostrar a pagina de login

Isso elimina o efeito de "carregar 2 coisas" porque:
- A pagina Index nao renderiza o formulario se o usuario ja esta logado
- O LoginCard nao tenta navegar em 2 lugares diferentes ao mesmo tempo

---

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| `src/lib/qzTrayService.ts` | **NOVO** - servico de conexao QZ Tray |
| `src/hooks/useQzTray.ts` | **NOVO** - hook React para QZ Tray |
| `src/pages/dashboard/Configuracoes.tsx` | Adicionar opcoes QZ Tray |
| `src/hooks/usePrintOrder.ts` | Adicionar modo QZ Tray |
| `src/pages/dashboard/Pedidos.tsx` | Integrar impressao QZ Tray |
| `src/components/dashboard/DashboardLayout.tsx` | Adicionar useThemeColor |
| `src/components/login/LoginCard.tsx` | Corrigir redirecionamento duplo |
| `src/pages/Index.tsx` | Adicionar loading/redirect guard |

