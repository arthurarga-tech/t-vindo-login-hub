import { Order } from "@/hooks/useOrders";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrintOrderOptions {
  order: Order;
  establishmentName: string;
}

export function usePrintOrder() {
  const printOrder = ({ order, establishmentName }: PrintOrderOptions) => {
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

    const content = `
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
    <div class="store-name">${establishmentName}</div>
    <div class="order-number">PEDIDO #${order.order_number}</div>
    <div class="order-type">${orderTypeLabels[order.order_type] || order.order_type}</div>
    <div>${format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
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

    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };
    }
  };

  return { printOrder };
}
