import { Order } from "@/hooks/useOrders";
import { ptBR } from "date-fns/locale";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { useCallback } from "react";

interface PrintOrderOptions {
  order: Order;
  establishmentName: string;
  logoUrl?: string | null;
  printFontSize?: number;
  printMarginLeft?: number;
  printMarginRight?: number;
  printFontBold?: boolean;
  printLineHeight?: number;
  printContrastHigh?: boolean;
  printAddonPrices?: boolean;
}

export interface PrintResult {
  success: boolean;
}

function generateReceiptHtml(
  order: Order, 
  establishmentName: string, 
  logoUrl?: string | null, 
  fontSize: number = 12, 
  marginLeft: number = 0, 
  marginRight: number = 0, 
  _applyPrinterOffset: boolean = true,
  fontBold: boolean = true,
  lineHeight: number = 1.4,
  highContrast: boolean = false,
  showAddonPrices: boolean = true
): string {
  const safeOrder = {
    ...order,
    items: order.items || [],
    customer: order.customer || { name: 'Cliente', phone: '' },
    subtotal: order.subtotal || 0,
    total: order.total || 0,
    delivery_fee: order.delivery_fee || 0,
    order_number: order.order_number || 0,
    order_type: order.order_type || 'delivery',
    payment_method: order.payment_method || 'cash',
    created_at: order.created_at || new Date().toISOString(),
  };

  const orderTypeLabels: Record<string, string> = {
    delivery: "Entrega",
    pickup: "Retirada",
    dine_in: "No Local",
  };

  const paymentMethodLabels: Record<string, string> = {
    pix: "Pix",
    credit: "Crédito",
    debit: "Débito",
    cash: "Dinheiro",
  };

  const fontWeight = fontBold ? 'bold' : 'normal';
  const extraBoldWeight = fontBold ? '900' : 'bold';
  const borderStyle = highContrast ? '2px dashed #000' : '1px dashed #000';
  const solidBorderStyle = highContrast ? '2px solid #000' : '1px solid #000';

  const basePadding = 3;
  const finalPaddingLeft = Math.max(1, basePadding + marginLeft);
  const finalPaddingRight = Math.max(1, basePadding + marginRight);

  const hasValidLogo = logoUrl && logoUrl.trim() !== '';
  const logoHtml = hasValidLogo 
    ? `<img src="${logoUrl}" alt="${establishmentName}" class="store-logo" onerror="this.style.display='none';" />`
    : ``;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Pedido #${safeOrder.order_number}</title>
<style>
@page {
  margin: 0;
  padding: 0;
  size: 58mm auto;
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
html {
  width: 58mm;
}
body {
  font-family: 'Courier New', monospace;
  font-size: ${fontSize}px;
  font-weight: ${fontWeight};
  width: 58mm;
  max-width: 58mm;
  margin: 0 auto;
  padding-top: 2mm;
  padding-bottom: 2mm;
  padding-left: ${finalPaddingLeft}mm;
  padding-right: ${finalPaddingRight}mm;
  line-height: ${lineHeight};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media print {
  html, body {
    width: 58mm !important;
    max-width: 58mm !important;
    margin: 0 auto !important;
    padding-left: ${finalPaddingLeft}mm !important;
    padding-right: ${finalPaddingRight}mm !important;
  }
}
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: ${borderStyle};
      padding-bottom: 8px;
    }
    .store-logo {
      max-width: 40mm;
      max-height: 20mm;
      margin-bottom: 4px;
    }
    .store-name {
      font-size: 14px;
      font-weight: ${extraBoldWeight};
      margin-bottom: 4px;
    }
    .order-number {
      font-size: ${Math.round(fontSize * 1.5)}px;
      font-weight: ${extraBoldWeight};
      margin: 8px 0;
    }
    .order-type {
      font-size: ${fontSize}px;
      padding: 2px 6px;
      border: ${highContrast ? '2px' : '1px'} solid #000;
      display: inline-block;
      margin-bottom: 4px;
      font-weight: ${fontBold ? 'bold' : 'normal'};
    }
    .section {
      margin: 8px 0;
      border-bottom: ${borderStyle};
      padding-bottom: 8px;
    }
    .section-title {
      font-weight: ${extraBoldWeight};
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: ${Math.round(fontSize * 0.92)}px;
    }
    .item {
      margin: 4px 0;
      overflow: hidden;
    }
    .item-name {
      font-weight: ${extraBoldWeight};
      max-width: 70%;
      display: inline-block;
    }
    .item-qty {
      display: inline-block;
      width: 18px;
    }
    .item-price {
      float: right;
      text-align: right;
    }
    .addon {
      padding-left: 12px;
      font-size: ${Math.round(fontSize * 0.92)}px;
      color: #333;
    }
    .totals {
      margin-top: 8px;
    }
    .total-row {
      width: 100%;
      overflow: hidden;
    }
    .total-row .label {
      float: left;
    }
    .total-row .value {
      float: right;
      text-align: right;
      max-width: 50%;
    }
    .total-final {
      font-weight: ${extraBoldWeight};
      font-size: ${Math.round(fontSize * 1.17)}px;
      border-top: ${solidBorderStyle};
      padding-top: 4px;
      margin-top: 4px;
    }
    .customer-info {
      font-size: ${Math.round(fontSize * 0.92)}px;
    }
    .notes {
      font-style: italic;
      background: #f0f0f0;
      padding: 4px;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 8px;
      font-size: ${Math.round(fontSize * 0.83)}px;
    }
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
}
</style>
</head>
<body>${(order as any).scheduled_for ? `
<div style="border: 3px solid #000; padding: 6px; margin-bottom: 6px; text-align: center; background: #f0f0f0;">
<div style="font-size: ${Math.round(fontSize * 1.2)}px; font-weight: 900;">⏰ AGENDADO</div>
<div style="font-size: ${Math.round(fontSize * 1.3)}px; font-weight: 900; margin-top: 4px;">
${formatInSaoPaulo((order as any).scheduled_for, "dd/MM 'às' HH:mm", { locale: ptBR })}
</div>
</div>` : ''}
<div class="header">${logoHtml}
<div class="store-name">${establishmentName}</div>
<div class="order-number">${(order as any).table_number ? `MESA ${(order as any).table_number} - PEDIDO #${safeOrder.order_number}` : `PEDIDO #${safeOrder.order_number}`}</div>
<div class="order-type">${orderTypeLabels[safeOrder.order_type] || safeOrder.order_type}</div>${(order as any).table_number ? '' : ''}
<div>${formatInSaoPaulo(safeOrder.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
</div>
<div class="section">
<div class="section-title">Cliente</div>
<div class="customer-info">
<div><strong>${(order as any).customer_display_name || (order.customer as any)?.name || "Cliente"}</strong></div>
<div>${(order.customer as any)?.phone || "-"}</div>${safeOrder.order_type === "delivery" && (order.customer as any)?.address ? `
<div>${(order.customer as any).address}${(order.customer as any).address_number ? `, ${(order.customer as any).address_number}` : ""}</div>${(order.customer as any).address_complement ? `<div>${(order.customer as any).address_complement}</div>` : ""}
<div>${(order.customer as any).neighborhood || ""}${(order.customer as any).city ? ` - ${(order.customer as any).city}` : ""}</div>` : ""}
</div>
</div>
<div class="section">
<div class="section-title">Itens</div>${safeOrder.items.length > 0 ? safeOrder.items.map(item => `
<div class="item clearfix">
<span class="item-qty">${item.quantity || 1}x</span>
<span class="item-name">${item.product_name || "Produto"}</span>
<span class="item-price">R$ ${(item.total || 0).toFixed(2).replace(".", ",")}</span>
</div>${item.addons?.map(addon => `
<div class="addon">+ ${addon.quantity || 1}x ${addon.addon_name}${showAddonPrices ? ` (R$ ${(addon.addon_price || 0).toFixed(2).replace(".", ",")})` : ''}</div>`).join("") || ""}${(item as any).observation ? `<div class="addon" style="font-style: italic;">Obs: ${(item as any).observation}</div>` : ""}`).join("") : '<div class="item">Nenhum item</div>'}
</div>
<div class="section">
<div class="section-title">Pagamento: ${paymentMethodLabels[safeOrder.payment_method] || safeOrder.payment_method}</div>
<div class="totals">
<div class="total-row clearfix">
<span class="label">Subtotal</span>
<span class="value">R$ ${safeOrder.subtotal.toFixed(2).replace(".", ",")}</span>
</div>${safeOrder.delivery_fee > 0 ? `
<div class="total-row clearfix">
<span class="label">Taxa entrega</span>
<span class="value">R$ ${safeOrder.delivery_fee.toFixed(2).replace(".", ",")}</span>
</div>` : ""}
<div class="total-row total-final clearfix">
<span class="label">TOTAL</span>
<span class="value">R$ ${safeOrder.total.toFixed(2).replace(".", ",")}</span>
</div>${safeOrder.payment_method === "cash" && (safeOrder as any).change_for && (safeOrder as any).change_for > 0 ? `
<div style="margin-top: 6px; padding: 4px; border: ${highContrast ? '2px' : '1px'} solid #000; text-align: center;">
<div><strong>TROCO:</strong> R$ ${((safeOrder as any).change_for).toFixed(2).replace(".", ",")}</div>
<div style="font-size: ${Math.round(fontSize * 1.08)}px; font-weight: ${extraBoldWeight};">LEVAR: R$ ${((safeOrder as any).change_for - safeOrder.total).toFixed(2).replace(".", ",")}</div>
</div>` : ""}
</div>
</div>${safeOrder.notes ? `
<div class="section">
<div class="section-title">Observações</div>
<div class="notes">${safeOrder.notes}</div>
</div>` : ""}
<div class="footer" style="page-break-after: avoid; margin-bottom: 0;">
<div>Obrigado pela preferência!</div>
</div>
</body>
</html>`;
}

/**
 * Write receipt HTML to a window and trigger print.
 * The window MUST already be open (opened synchronously on user gesture).
 */
function writeAndPrint(win: Window, htmlContent: string) {
  win.document.open();
  win.document.write(htmlContent);
  win.document.close();

  const triggerPrint = () => {
    // Small delay to let mobile browser fully render the content
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  // Check if images need loading
  const images = win.document.querySelectorAll('img');
  if (images.length === 0) {
    triggerPrint();
    return;
  }

  let loaded = 0;
  const total = images.length;
  let triggered = false;
  const onImgReady = () => {
    loaded++;
    if (loaded >= total && !triggered) {
      triggered = true;
      triggerPrint();
    }
  };
  images.forEach((img) => {
    if (img.complete) onImgReady();
    else { img.onload = onImgReady; img.onerror = onImgReady; }
  });
  // Fallback if images take too long
  setTimeout(() => { if (!triggered) { triggered = true; triggerPrint(); } }, 3000);
}

const LINE_WIDTH = 32;
const SEPARATOR = '-'.repeat(LINE_WIDTH);
const DOUBLE_SEPARATOR = '='.repeat(LINE_WIDTH);

// ESC/POS commands for thermal printers
const ESC_BOLD_ON = '\x1B\x45\x01';
const ESC_BOLD_OFF = '\x1B\x45\x00';
const ESC_DOUBLE_ON = '\x1B\x21\x30'; // Double height + double width + bold
const ESC_DOUBLE_OFF = '\x1B\x21\x00';
const ESC_CENTER = '\x1B\x61\x01';
const ESC_LEFT = '\x1B\x61\x00';

function centerText(text: string): string {
  if (text.length >= LINE_WIDTH) return text;
  const pad = Math.floor((LINE_WIDTH - text.length) / 2);
  return ' '.repeat(pad) + text;
}

function rightAlignRow(label: string, value: string): string {
  const gap = LINE_WIDTH - label.length - value.length;
  if (gap <= 0) return label + ' ' + value;
  return label + ' '.repeat(gap) + value;
}

function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function generateReceiptText(opts: PrintOrderOptions): string {
  const order = opts.order;
  const safeOrder = {
    ...order,
    items: order.items || [],
    customer: order.customer || { name: 'Cliente', phone: '' },
    subtotal: order.subtotal || 0,
    total: order.total || 0,
    delivery_fee: order.delivery_fee || 0,
    order_number: order.order_number || 0,
    order_type: order.order_type || 'delivery',
    payment_method: order.payment_method || 'cash',
    created_at: order.created_at || new Date().toISOString(),
  };

  const orderTypeLabels: Record<string, string> = {
    delivery: 'Entrega',
    pickup: 'Retirada',
    dine_in: 'No Local',
  };

  const paymentLabels: Record<string, string> = {
    pix: 'Pix',
    credit: 'Credito',
    debit: 'Debito',
    cash: 'Dinheiro',
  };

  const lines: string[] = [];

  // Scheduled banner
  if ((order as any).scheduled_for) {
    lines.push(DOUBLE_SEPARATOR);
    lines.push(ESC_BOLD_ON + centerText('AGENDADO') + ESC_BOLD_OFF);
    lines.push(ESC_BOLD_ON + centerText(formatInSaoPaulo((order as any).scheduled_for, "dd/MM 'as' HH:mm", { locale: ptBR })) + ESC_BOLD_OFF);
    lines.push(DOUBLE_SEPARATOR);
  }

  // Header
  lines.push(ESC_CENTER + ESC_BOLD_ON + opts.establishmentName.toUpperCase() + ESC_BOLD_OFF + ESC_LEFT);
  if ((order as any).table_number) {
    lines.push(ESC_CENTER + ESC_DOUBLE_ON + `MESA ${(order as any).table_number}` + ESC_DOUBLE_OFF + ESC_LEFT);
    lines.push(ESC_CENTER + ESC_DOUBLE_ON + `PEDIDO #${safeOrder.order_number}` + ESC_DOUBLE_OFF + ESC_LEFT);
  } else {
    lines.push(ESC_CENTER + ESC_DOUBLE_ON + `PEDIDO #${safeOrder.order_number}` + ESC_DOUBLE_OFF + ESC_LEFT);
  }
  lines.push(centerText(orderTypeLabels[safeOrder.order_type] || safeOrder.order_type));

  lines.push(centerText(formatInSaoPaulo(safeOrder.created_at, 'dd/MM/yyyy HH:mm', { locale: ptBR })));
  lines.push(SEPARATOR);

  // Customer
  lines.push(ESC_BOLD_ON + 'CLIENTE' + ESC_BOLD_OFF);
  lines.push(ESC_BOLD_ON + ((order as any).customer_display_name || (order.customer as any)?.name || 'Cliente') + ESC_BOLD_OFF);
  lines.push((order.customer as any)?.phone || '-');

  if (safeOrder.order_type === 'delivery' && (order.customer as any)?.address) {
    const c = order.customer as any;
    lines.push(`${c.address}${c.address_number ? `, ${c.address_number}` : ''}`);
    if (c.address_complement) lines.push(c.address_complement);
    lines.push(`${c.neighborhood || ''}${c.city ? ` - ${c.city}` : ''}`);
  }
  lines.push(SEPARATOR);

  // Items
  lines.push(ESC_BOLD_ON + 'ITENS' + ESC_BOLD_OFF);
  if (safeOrder.items.length > 0) {
    for (const item of safeOrder.items) {
      const qty = `${item.quantity || 1}x `;
      const name = item.product_name || 'Produto';
      const price = formatBRL(item.total || 0);
      const nameMax = LINE_WIDTH - qty.length - price.length - 1;
      const truncName = name.length > nameMax ? name.substring(0, nameMax) : name;
      lines.push(ESC_BOLD_ON + rightAlignRow(qty + truncName, price) + ESC_BOLD_OFF);

      if (item.addons && item.addons.length > 0) {
        const showPrices = opts.printAddonPrices !== false;
        for (const addon of item.addons) {
          const priceStr = showPrices ? ` (${formatBRL(addon.addon_price || 0)})` : '';
          lines.push(`  + ${addon.quantity || 1}x ${addon.addon_name}${priceStr}`);
        }
      }
      if ((item as any).observation) {
        lines.push(`  Obs: ${(item as any).observation}`);
      }
    }
  } else {
    lines.push('Nenhum item');
  }
  lines.push(SEPARATOR);

  // Payment & totals
  lines.push(ESC_BOLD_ON + `PAGAMENTO: ${paymentLabels[safeOrder.payment_method] || safeOrder.payment_method}` + ESC_BOLD_OFF);
  lines.push(rightAlignRow('Subtotal', formatBRL(safeOrder.subtotal)));
  if (safeOrder.delivery_fee > 0) {
    lines.push(rightAlignRow('Taxa entrega', formatBRL(safeOrder.delivery_fee)));
  }
  lines.push(DOUBLE_SEPARATOR);
  lines.push(ESC_BOLD_ON + rightAlignRow('TOTAL', formatBRL(safeOrder.total)) + ESC_BOLD_OFF);
  lines.push(DOUBLE_SEPARATOR);

  // Change
  if (safeOrder.payment_method === 'cash' && (safeOrder as any).change_for && (safeOrder as any).change_for > 0) {
    lines.push(ESC_BOLD_ON + `TROCO PARA: ${formatBRL((safeOrder as any).change_for)}` + ESC_BOLD_OFF);
    lines.push(ESC_BOLD_ON + `LEVAR: ${formatBRL((safeOrder as any).change_for - safeOrder.total)}` + ESC_BOLD_OFF);
  }

  // Notes
  if (safeOrder.notes) {
    lines.push(SEPARATOR);
    lines.push(ESC_BOLD_ON + 'OBSERVACOES' + ESC_BOLD_OFF);
    lines.push(safeOrder.notes);
  }

  lines.push(SEPARATOR);
  lines.push(centerText('Obrigado pela'));
  lines.push(centerText('preferencia!'));
  lines.push('');

  return lines.join('\n');
}

export function usePrintOrder() {
  /**
   * Generate receipt HTML from order options.
   */
  const buildHtml = useCallback((opts: PrintOrderOptions): string => {
    return generateReceiptHtml(
      opts.order,
      opts.establishmentName,
      opts.logoUrl,
      opts.printFontSize ?? 12,
      opts.printMarginLeft ?? 0,
      opts.printMarginRight ?? 0,
      true,
      opts.printFontBold ?? true,
      opts.printLineHeight ?? 1.4,
      opts.printContrastHigh ?? false,
      opts.printAddonPrices ?? true
    );
  }, []);

  /**
   * Print an order — opens window.open() immediately.
   * MUST be called directly from a user gesture (click handler) with NO awaits before it.
   */
  const printOrder = useCallback((opts: PrintOrderOptions): PrintResult => {
    const htmlContent = buildHtml(opts);

    try {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        writeAndPrint(printWindow, htmlContent);
        return { success: true };
      }
    } catch {
      // popup blocked
    }

    // Desktop fallback: iframe (won't work on mobile but better than nothing)
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 58mm; height: 100vh; border: none; opacity: 0; pointer-events: none;';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 3000);
        }, 300);
        return { success: true };
      }
      iframe.remove();
    } catch { /* both failed */ }

    return { success: false };
  }, [buildHtml]);

  /**
   * Print into a pre-opened window. Use this when you need to await something
   * between the user gesture and the actual print.
   * 
   * Pattern:
   *   const win = window.open("", "_blank"); // on user click, synchronous
   *   await someAsyncWork();
   *   printInWindow(win, opts);
   */
  const printInWindow = useCallback((win: Window | null, opts: PrintOrderOptions) => {
    if (!win || win.closed) return;
    const htmlContent = buildHtml(opts);
    writeAndPrint(win, htmlContent);
  }, [buildHtml]);

  /**
   * Print silently via RawBT app (Android).
   * Generates a plain-text receipt and sends via rawbt:base64 intent URL.
   * RawBT does NOT render HTML — it sends raw bytes to the printer.
   */
  const printViaRawbt = useCallback((opts: PrintOrderOptions & { silent?: boolean }) => {
    const textContent = generateReceiptText(opts);
    try {
      const base64 = btoa(unescape(encodeURIComponent(textContent)));
      const url = `rawbt:base64,${base64}`;
      if (opts.silent) {
        // Use hidden iframe to trigger intent silently (no Android popup)
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 5000);
      } else {
        window.location.href = url;
      }
    } catch {
      try {
        const base64 = btoa(textContent);
        const url = `rawbt:base64,${base64}`;
        if (opts.silent) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);
          setTimeout(() => iframe.remove(), 5000);
        } else {
          window.location.href = url;
        }
      } catch {
        console.error("Failed to encode receipt for RawBT");
      }
    }
  }, []);

  return { printOrder, printInWindow, printViaRawbt, buildHtml };
}

export { generateReceiptHtml };
