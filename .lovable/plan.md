

# Correcao da Impressao RawBT - Texto Puro

## Problema

O esquema de URL `rawbt:base64,` envia dados brutos diretamente para a impressora termica. Ele **nao renderiza HTML** — simplesmente passa os bytes decodificados para a impressora. Por isso, a impressora esta imprimindo o codigo-fonte HTML como texto.

## Solucao

Criar uma funcao que gera um **recibo em texto puro** (sem HTML) formatado para impressoras termicas de 58mm (~32 caracteres por linha), e usar esse texto no `printViaRawbt` ao inves do HTML.

## Mudancas Tecnicas

### 1. Adicionar funcao `generateReceiptText` em `usePrintOrder.ts`

Criar uma nova funcao que gera o recibo como texto puro formatado, com:
- Alinhamento central para cabecalho (nome do estabelecimento, numero do pedido)
- Separadores com tracos `--------------------------------`
- Itens formatados com quantidade, nome e preco
- Addons com prefixo `+`
- Totais alinhados a direita
- Dados do cliente e endereco
- Observacoes
- Informacao de agendamento (se houver)
- Mesa (se houver)
- Troco (se pagamento em dinheiro)

Exemplo de saida:
```text
      ACAI DA JANA
     PEDIDO #409
      Entrega
  19/02/2026 08:07
--------------------------------
CLIENTE
Fulano de Tal
(11) 99999-9999
Rua Exemplo, 123
Bairro - Cidade
--------------------------------
ITENS
1x Acai 500ml         R$ 25,00
  + 1x Granola         R$ 2,00
  Obs: Sem banana
2x Agua               R$ 8,00
--------------------------------
PAGAMENTO: Pix
Subtotal          R$ 35,00
Taxa entrega       R$ 5,00
================================
TOTAL             R$ 40,00
================================
--------------------------------
Obrigado pela preferencia!
```

### 2. Atualizar `printViaRawbt` em `usePrintOrder.ts`

Modificar para usar `generateReceiptText` ao inves de `buildHtml`:
- Gerar texto puro do recibo
- Codificar em Base64
- Navegar para `rawbt:base64,<texto-base64>`

### 3. Arquivos a modificar
- `src/hooks/usePrintOrder.ts` - adicionar `generateReceiptText` e atualizar `printViaRawbt`

Nenhuma outra mudanca necessaria — apenas o conteudo enviado ao RawBT muda de HTML para texto puro. As opcoes de configuracao (tamanho da fonte, margens etc.) se aplicam apenas a impressao pelo navegador e nao afetam o texto puro do RawBT.

