import { Order } from "@/hooks/useOrders";
import { ptBR } from "date-fns/locale";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { useCallback } from "react";

interface PrintOrderOptions {
  order: Order;
  establishmentName: string;
  logoUrl?: string | null;
  useQZTray?: boolean;
  qzTrayPrinter?: string | null;
  qzPrintFn?: (html: string, printer: string) => Promise<boolean>;
  isPrinterAvailable?: boolean;
}

export interface PrintResult {
  success: boolean;
  usedFallback: boolean;
  printerUnavailable?: boolean;
}

function generateReceiptHtml(order: Order, establishmentName: string, logoUrl?: string | null): string {
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedido #${order.order_number}</title>
  <style>
    @page {
      margin: 0;
      size: 58mm auto;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 58mm;
      padding: 4mm;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
    }
    .store-logo {
      max-width: 40mm;
      max-height: 20mm;
      margin-bottom: 4px;
    }
    .store-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .order-number {
      font-size: 18px;
      font-weight: bold;
      margin: 8px 0;
    }
    .order-type {
      font-size: 12px;
      padding: 2px 6px;
      border: 1px solid #000;
      display: inline-block;
      margin-bottom: 4px;
    }
    .section {
      margin: 8px 0;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 11px;
    }
    .item {
      margin: 4px 0;
    }
    .item-name {
      font-weight: bold;
    }
    .item-qty {
      display: inline-block;
      width: 20px;
    }
    .item-price {
      float: right;
    }
    .addon {
      padding-left: 12px;
      font-size: 11px;
      color: #333;
    }
    .totals {
      margin-top: 8px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
    }
    .total-final {
      font-weight: bold;
      font-size: 14px;
      border-top: 1px solid #000;
      padding-top: 4px;
      margin-top: 4px;
    }
    .customer-info {
      font-size: 11px;
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
      font-size: 10px;
    }
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${establishmentName}" class="store-logo" />` : ''}
    <div class="store-name">${establishmentName}</div>
    <div class="order-number">PEDIDO #${order.order_number}</div>
    <div class="order-type">${orderTypeLabels[order.order_type] || order.order_type}</div>
    <div>${formatInSaoPaulo(order.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="customer-info">
      <div><strong>${order.customer?.name || "Cliente"}</strong></div>
      <div>${order.customer?.phone || ""}</div>
      ${order.order_type === "delivery" ? `
        <div>${order.customer?.address || ""} ${order.customer?.address_number ? `, ${order.customer.address_number}` : ""}</div>
        ${order.customer?.address_complement ? `<div>${order.customer.address_complement}</div>` : ""}
        <div>${order.customer?.neighborhood || ""}</div>
        <div>${order.customer?.city || ""}</div>
      ` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Itens</div>
    ${order.items?.map(item => `
      <div class="item clearfix">
        <span class="item-qty">${item.quantity}x</span>
        <span class="item-name">${item.product_name}</span>
        <span class="item-price">R$ ${item.total.toFixed(2).replace(".", ",")}</span>
      </div>
      ${item.addons?.map(addon => `
        <div class="addon">+ ${addon.quantity}x ${addon.addon_name} (R$ ${addon.addon_price.toFixed(2).replace(".", ",")})</div>
      `).join("") || ""}
      ${(item as any).observation ? `<div class="addon" style="font-style: italic;">Obs: ${(item as any).observation}</div>` : ""}
    `).join("") || ""}
  </div>

  <div class="section">
    <div class="section-title">Pagamento: ${paymentMethodLabels[order.payment_method] || order.payment_method}</div>
    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>R$ ${order.subtotal.toFixed(2).replace(".", ",")}</span>
      </div>
      ${order.delivery_fee > 0 ? `
        <div class="total-row">
          <span>Taxa de entrega</span>
          <span>R$ ${order.delivery_fee.toFixed(2).replace(".", ",")}</span>
        </div>
      ` : ""}
      <div class="total-row total-final">
        <span>TOTAL</span>
        <span>R$ ${order.total.toFixed(2).replace(".", ",")}</span>
      </div>
      ${order.payment_method === "cash" && (order as any).change_for && (order as any).change_for > 0 ? `
        <div style="margin-top: 8px; padding: 4px; border: 1px solid #000; text-align: center;">
          <div><strong>TROCO PARA:</strong> R$ ${((order as any).change_for).toFixed(2).replace(".", ",")}</div>
          <div style="font-size: 14px; font-weight: bold;">LEVAR: R$ ${((order as any).change_for - order.total).toFixed(2).replace(".", ",")}</div>
        </div>
      ` : ""}
    </div>
  </div>

  ${order.notes ? `
    <div class="section">
      <div class="section-title">Observações</div>
      <div class="notes">${order.notes}</div>
    </div>
  ` : ""}

  <div class="footer">
    <div>Obrigado pela preferência!</div>
  </div>
</body>
</html>
  `;
}

export function usePrintOrder() {
  const printOrder = useCallback(async ({
    order,
    establishmentName,
    logoUrl,
    useQZTray = false,
    qzTrayPrinter,
    qzPrintFn,
    isPrinterAvailable = true,
  }: PrintOrderOptions): Promise<PrintResult> => {
    const htmlContent = generateReceiptHtml(order, establishmentName, logoUrl);

    console.log("[usePrintOrder] Iniciando impressão", {
      useQZTray,
      qzTrayPrinter,
      isPrinterAvailable,
      hasQzPrintFn: !!qzPrintFn,
    });

    // Check if printer is available when using QZ Tray
    if (useQZTray && qzTrayPrinter && !isPrinterAvailable) {
      console.warn("[usePrintOrder] Impressora não disponível, usando fallback do navegador:", qzTrayPrinter);
      // Fall through to browser print instead of returning error
    }

    // Use QZ Tray for silent printing if enabled and printer is available
    if (useQZTray && qzTrayPrinter && qzPrintFn && isPrinterAvailable) {
      try {
        console.log("[usePrintOrder] Tentando imprimir via QZ Tray...");
        const success = await qzPrintFn(htmlContent, qzTrayPrinter);
        if (success) {
          console.log("[usePrintOrder] Impressão QZ Tray bem sucedida");
          return { success: true, usedFallback: false };
        }
        // If QZ print failed, fall through to browser print
        console.warn("[usePrintOrder] QZ Tray print failed, falling back to browser print");
      } catch (error) {
        console.error("[usePrintOrder] QZ Tray print error, falling back to browser print:", error);
      }
    }

    // Always fallback to browser print
    console.log("[usePrintOrder] Usando impressão do navegador");
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };
      
      // Return fallback info only if QZ was supposed to be used
      const usedFallback = useQZTray && !!qzTrayPrinter;
      console.log("[usePrintOrder] Janela de impressão aberta, usedFallback:", usedFallback);
      return { success: true, usedFallback };
    }
    
    console.error("[usePrintOrder] Falha ao abrir janela de impressão");
    return { success: false, usedFallback: false };
  }, []);

  return { printOrder };
}

// Export HTML generator for use in settings test
export { generateReceiptHtml };
