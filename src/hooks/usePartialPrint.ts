import { useCallback } from "react";
import { usePrintSettings } from "./usePrintSettings";
import { useEstablishment } from "./useEstablishment";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";

interface PartialPrintItem {
  product_name: string;
  product_price: number;
  quantity: number;
  observation?: string;
  addons: { name: string; price: number; quantity: number }[];
  total: number;
}

interface PartialPrintData {
  tableNumber: string;
  orderNumber: number;
  items: PartialPrintItem[];
  total: number;
}

// ESC/POS commands
const ESC_BOLD_ON = '\x1B\x45\x01';
const ESC_BOLD_OFF = '\x1B\x45\x00';
const ESC_DOUBLE_ON = '\x1B\x21\x30';
const ESC_DOUBLE_OFF = '\x1B\x21\x00';
const ESC_CENTER = '\x1B\x61\x01';
const ESC_LEFT = '\x1B\x61\x00';
const LINE_WIDTH = 32;
const SEPARATOR = '-'.repeat(LINE_WIDTH);
const DOUBLE_SEPARATOR = '='.repeat(LINE_WIDTH);

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

function generatePartialHtml(
  data: PartialPrintData,
  establishmentName: string,
  logoUrl?: string | null,
  fontSize: number = 12,
  marginLeft: number = 0,
  marginRight: number = 0,
  fontBold: boolean = true,
  lineHeight: number = 1.4,
  highContrast: boolean = false,
  showAddonPrices: boolean = true
): string {
  const fontWeight = fontBold ? 'bold' : 'normal';
  const extraBoldWeight = fontBold ? '900' : 'bold';
  const borderStyle = highContrast ? '2px dashed #000' : '1px dashed #000';
  const solidBorderStyle = highContrast ? '2px solid #000' : '1px solid #000';
  const basePadding = 3;
  const finalPaddingLeft = Math.max(1, basePadding + marginLeft);
  const finalPaddingRight = Math.max(1, basePadding + marginRight);
  const now = new Date().toISOString();

  const hasValidLogo = logoUrl && logoUrl.trim() !== '';
  const logoHtml = hasValidLogo
    ? `<img src="${logoUrl}" alt="${establishmentName}" style="max-width:40mm;max-height:20mm;margin-bottom:4px;" onerror="this.style.display='none';" />`
    : '';

  const itemsHtml = data.items.map(item => `
<div style="margin:4px 0;overflow:hidden;" class="clearfix">
<span style="display:inline-block;width:18px;">${item.quantity}x</span>
<span style="font-weight:${extraBoldWeight};max-width:70%;display:inline-block;">${item.product_name}</span>
<span style="float:right;text-align:right;">R$ ${item.total.toFixed(2).replace('.', ',')}</span>
</div>${item.addons?.map(a => `
<div style="padding-left:12px;font-size:${Math.round(fontSize * 0.92)}px;color:#333;">+ ${a.quantity}x ${a.name}${showAddonPrices ? ` (R$ ${a.price.toFixed(2).replace('.', ',')})` : ''}</div>`).join('') || ''}${item.observation ? `<div style="padding-left:12px;font-size:${Math.round(fontSize * 0.92)}px;font-style:italic;">Obs: ${item.observation}</div>` : ''}`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Comanda Parcial - Mesa ${data.tableNumber}</title>
<style>
@page { margin: 0; padding: 0; size: 58mm auto; }
* { margin: 0; padding: 0; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; }
html { width: 58mm; }
body {
  font-family: 'Courier New', monospace;
  font-size: ${fontSize}px;
  font-weight: ${fontWeight};
  width: 58mm;
  max-width: 58mm;
  margin: 0 auto;
  padding: 2mm ${finalPaddingRight}mm 2mm ${finalPaddingLeft}mm;
  line-height: ${lineHeight};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media print {
  html, body { width: 58mm !important; max-width: 58mm !important; margin: 0 auto !important; padding-left: ${finalPaddingLeft}mm !important; padding-right: ${finalPaddingRight}mm !important; }
}
.clearfix::after { content: ""; display: table; clear: both; }
</style>
</head>
<body>
<div style="text-align:center;margin-bottom:8px;border-bottom:${borderStyle};padding-bottom:8px;">
${logoHtml}
<div style="font-size:14px;font-weight:${extraBoldWeight};margin-bottom:4px;">${establishmentName}</div>
<div style="font-size:${Math.round(fontSize * 1.5)}px;font-weight:${extraBoldWeight};margin:8px 0;">MESA ${data.tableNumber}</div>
<div style="font-size:${Math.round(fontSize * 1.2)}px;font-weight:${extraBoldWeight};">PEDIDO #${data.orderNumber}</div>
<div style="margin-top:6px;padding:3px 8px;border:${highContrast ? '3px' : '2px'} solid #000;display:inline-block;font-weight:${extraBoldWeight};font-size:${Math.round(fontSize * 1.1)}px;">★ NOVOS ITENS ★</div>
<div style="margin-top:4px;">${formatInSaoPaulo(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
</div>
<div style="margin:8px 0;border-bottom:${borderStyle};padding-bottom:8px;">
<div style="font-weight:${extraBoldWeight};margin-bottom:4px;text-transform:uppercase;font-size:${Math.round(fontSize * 0.92)}px;">ITENS ADICIONADOS</div>
${itemsHtml}
</div>
<div style="margin:8px 0;">
<div style="width:100%;overflow:hidden;font-weight:${extraBoldWeight};font-size:${Math.round(fontSize * 1.17)}px;border-top:${solidBorderStyle};padding-top:4px;" class="clearfix">
<span style="float:left;">TOTAL NOVOS</span>
<span style="float:right;text-align:right;">R$ ${data.total.toFixed(2).replace('.', ',')}</span>
</div>
</div>
<div style="text-align:center;margin-top:8px;font-size:${Math.round(fontSize * 0.83)}px;page-break-after:avoid;margin-bottom:0;">
<div>Comanda parcial</div>
</div>
</body>
</html>`;
}

function generatePartialText(
  data: PartialPrintData,
  establishmentName: string,
  showAddonPrices: boolean = true
): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push(ESC_CENTER + ESC_BOLD_ON + establishmentName.toUpperCase() + ESC_BOLD_OFF + ESC_LEFT);
  lines.push(ESC_CENTER + ESC_DOUBLE_ON + `MESA ${data.tableNumber}` + ESC_DOUBLE_OFF + ESC_LEFT);
  lines.push(ESC_CENTER + ESC_DOUBLE_ON + `PEDIDO #${data.orderNumber}` + ESC_DOUBLE_OFF + ESC_LEFT);
  lines.push(DOUBLE_SEPARATOR);
  lines.push(ESC_CENTER + ESC_BOLD_ON + '*** NOVOS ITENS ***' + ESC_BOLD_OFF + ESC_LEFT);
  lines.push(DOUBLE_SEPARATOR);
  lines.push(centerText(formatInSaoPaulo(now, 'dd/MM/yyyy HH:mm', { locale: ptBR })));
  lines.push(SEPARATOR);

  lines.push(ESC_BOLD_ON + 'ITENS ADICIONADOS' + ESC_BOLD_OFF);
  for (const item of data.items) {
    const qty = `${item.quantity}x `;
    const name = item.product_name;
    const price = formatBRL(item.total);
    const nameMax = LINE_WIDTH - qty.length - price.length - 1;
    const truncName = name.length > nameMax ? name.substring(0, nameMax) : name;
    lines.push(ESC_BOLD_ON + rightAlignRow(qty + truncName, price) + ESC_BOLD_OFF);

    if (item.addons?.length > 0) {
      for (const addon of item.addons) {
        const priceStr = showAddonPrices ? ` (${formatBRL(addon.price)})` : '';
        lines.push(`  + ${addon.quantity}x ${addon.name}${priceStr}`);
      }
    }
    if (item.observation) {
      lines.push(`  Obs: ${item.observation}`);
    }
  }
  lines.push(SEPARATOR);

  lines.push(DOUBLE_SEPARATOR);
  lines.push(ESC_BOLD_ON + rightAlignRow('TOTAL NOVOS', formatBRL(data.total)) + ESC_BOLD_OFF);
  lines.push(DOUBLE_SEPARATOR);

  lines.push(centerText('Comanda parcial'));
  lines.push('');

  return lines.join('\n');
}

export function usePartialPrint() {
  const { data: establishment } = useEstablishment();
  const printSettings = usePrintSettings();

  const printPartial = useCallback((data: PartialPrintData) => {
    if (!establishment) return;

    const { printMode } = printSettings;

    // Only print if print mode is configured for on_order
    const shouldBrowserPrint = printMode === "browser_on_order";
    const shouldRawbtPrint = printMode === "rawbt_on_order";

    if (!shouldBrowserPrint && !shouldRawbtPrint) return;

    if (shouldRawbtPrint) {
      const textContent = generatePartialText(
        data,
        establishment.name,
        printSettings.printAddonPrices
      );
      try {
        const base64 = btoa(unescape(encodeURIComponent(textContent)));
        const url = `rawbt:base64,${base64}`;
        // Silent via iframe
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 5000);
      } catch {
        console.error("Failed to encode partial receipt for RawBT");
      }
      return;
    }

    if (shouldBrowserPrint) {
      const htmlContent = generatePartialHtml(
        data,
        establishment.name,
        establishment.logo_url,
        printSettings.printFontSize,
        printSettings.printMarginLeft,
        printSettings.printMarginRight,
        printSettings.printFontBold,
        printSettings.printLineHeight,
        printSettings.printContrastHigh,
        printSettings.printAddonPrices
      );

      try {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 500);
          return;
        }
      } catch { /* popup blocked */ }

      // Fallback: iframe
      try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:0;left:0;width:58mm;height:100vh;border:none;opacity:0;pointer-events:none;';
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
        }
      } catch { /* failed */ }
    }
  }, [establishment, printSettings]);

  return { printPartial };
}

export type { PartialPrintData, PartialPrintItem };
