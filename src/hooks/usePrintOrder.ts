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
  printFontSize?: number;
  printMarginLeft?: number;
  printMarginRight?: number;
  printFontBold?: boolean;
  printLineHeight?: number;
  printContrastHigh?: boolean;
}

export interface PrintResult {
  success: boolean;
  usedFallback: boolean;
  printerUnavailable?: boolean;
  isMobile?: boolean;
}

// Detect mobile devices
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function generateReceiptHtml(
  order: Order, 
  establishmentName: string, 
  logoUrl?: string | null, 
  fontSize: number = 12, 
  marginLeft: number = 0, 
  marginRight: number = 0, 
  _applyPrinterOffset: boolean = true, // kept for API compatibility, not used anymore
  fontBold: boolean = true,
  lineHeight: number = 1.4,
  highContrast: boolean = false
): string {
  // Validate order data
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

  console.log("[usePrintOrder] Gerando HTML do recibo", {
    orderNumber: safeOrder.order_number,
    itemCount: safeOrder.items.length,
    hasCustomer: !!safeOrder.customer?.name,
    fontSize,
    marginLeft,
    marginRight,
  });

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

  // Use user-configured margins directly (no more offsets)
  const paddingLeft = 2 + marginLeft;
  const paddingRight = 2 + marginRight;

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
@media print {
  html, body {
    width: 58mm !important;
    max-width: 58mm !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Courier New', monospace;
  font-size: ${fontSize}px;
  font-weight: ${fontWeight};
  width: 58mm;
  max-width: 58mm;
  min-height: fit-content;
  padding: 2mm ${paddingRight}mm 2mm ${paddingLeft}mm;
  line-height: ${lineHeight};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
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
    }
    .item-name {
      font-weight: ${extraBoldWeight};
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
<div class="header">${logoUrl ? `<img src="${logoUrl}" alt="${establishmentName}" class="store-logo" />` : ''}
<div class="store-name">${establishmentName}</div>
<div class="order-number">PEDIDO #${safeOrder.order_number}</div>
<div class="order-type">${orderTypeLabels[safeOrder.order_type] || safeOrder.order_type}</div>
<div>${formatInSaoPaulo(safeOrder.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
</div>
<div class="section">
<div class="section-title">Cliente</div>
<div class="customer-info">
<div><strong>${(order.customer as any)?.name || "Cliente"}</strong></div>
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
<div class="addon">+ ${addon.quantity || 1}x ${addon.addon_name} (R$ ${(addon.addon_price || 0).toFixed(2).replace(".", ",")})</div>`).join("") || ""}${(item as any).observation ? `<div class="addon" style="font-style: italic;">Obs: ${(item as any).observation}</div>` : ""}`).join("") : '<div class="item">Nenhum item</div>'}
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

export function usePrintOrder() {
  const printOrder = useCallback(async ({
    order,
    establishmentName,
    logoUrl,
    useQZTray = false,
    qzTrayPrinter,
    qzPrintFn,
    isPrinterAvailable = true,
    printFontSize = 12,
    printMarginLeft = 0,
    printMarginRight = 0,
    printFontBold = true,
    printLineHeight = 1.4,
    printContrastHigh = false,
  }: PrintOrderOptions): Promise<PrintResult> => {
    // Na impressão real, aplica o offset da impressora automaticamente
    const htmlContent = generateReceiptHtml(
      order, 
      establishmentName, 
      logoUrl, 
      printFontSize, 
      printMarginLeft, 
      printMarginRight, 
      true,
      printFontBold,
      printLineHeight,
      printContrastHigh
    );

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
    const mobile = isMobileDevice();
    console.log("[usePrintOrder] Usando impressão do navegador, isMobile:", mobile);
    
    const usedFallback = useQZTray && !!qzTrayPrinter;

    if (mobile) {
      // Mobile: Open new window with print button for user to tap
      const mobileHtml = htmlContent.replace('</body>', `
        <div id="print-button-container" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; text-align: center;">
          <button onclick="window.print()" style="padding: 16px 32px; font-size: 18px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: bold;">
            🖨️ Imprimir Pedido
          </button>
          <p style="margin-top: 8px; font-size: 12px; color: #666;">Toque no botão acima para imprimir</p>
        </div>
        <style>
          @media print { 
            #print-button-container { display: none !important; } 
          }
        </style>
      </body>`);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(mobileHtml);
        printWindow.document.close();
        console.log("[usePrintOrder] Página mobile de impressão aberta");
        return { success: true, usedFallback, isMobile: true };
      }
    } else {
      // Desktop: Use hidden iframe for more reliable printing
      try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; border: none; visibility: hidden;';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          
          // Wait for content to load before printing (increased delay for styles)
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              console.error("[usePrintOrder] Erro ao imprimir via iframe:", e);
            }
            // Remove iframe after printing (increased delay)
            setTimeout(() => {
              iframe.remove();
            }, 2000);
          }, 500);
          
          console.log("[usePrintOrder] Iframe de impressão criado");
          return { success: true, usedFallback, isMobile: false };
        }
        
        iframe.remove();
      } catch (error) {
        console.error("[usePrintOrder] Erro ao criar iframe:", error);
      }
      
      // Fallback: Use window.open if iframe fails
      console.log("[usePrintOrder] Fallback para window.open");
      const printWindow = window.open("", "_blank", "width=300,height=600");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        };
        return { success: true, usedFallback, isMobile: false };
      }
    }
    
    console.error("[usePrintOrder] Falha ao abrir janela de impressão");
    return { success: false, usedFallback: false, isMobile: mobile };
  }, []);

  return { printOrder };
}

// Export HTML generator for use in settings test
export { generateReceiptHtml };
