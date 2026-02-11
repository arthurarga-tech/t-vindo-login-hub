
# Corrigir Conexao QZ Tray - "Connection blocked by client"

## Problema

O erro "Connection blocked by client" ocorre porque a funcao `setSignaturePromise` esta com a sintaxe incorreta. A API do QZ Tray espera uma **factory function** que recebe `toSign` e retorna uma funcao `(resolve, reject) => ...`. O codigo atual usa uma arrow function que retorna outra arrow function, mas o formato nao corresponde ao esperado pela biblioteca.

Codigo atual (errado):
```
qz.security.setSignaturePromise(() => (resolve, reject) => {
  ...
});
```

Codigo correto (conforme documentacao QZ Tray):
```
qz.security.setSignaturePromise(function(toSign) {
  return function(resolve, reject) {
    resolve(null); // untrusted mode
  };
});
```

## Solucao

**Arquivo: `src/lib/qzTrayService.ts`**

Corrigir a funcao `setupSecurity`:
1. `setSignaturePromise` deve receber uma funcao que aceita `toSign` (string) e retorna uma funcao `(resolve, reject)`
2. No modo untrusted (sem certificado), simplesmente resolver com `null`
3. Tambem corrigir `setCertificatePromise` para seguir o padrao exato da documentacao

## Resultado

Ao clicar "Conectar", o QZ Tray vai abrir o popup "Allow/Deny" (modo Untrusted). O usuario clica "Allow" e marca "Remember" para nao aparecer novamente. A conexao sera estabelecida e as impressoras listadas.
