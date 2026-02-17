import { Settings, Printer, Palette, CreditCard, Bell, MessageCircle, ChevronDown, ChevronUp, Type } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { generateReceiptHtml } from "@/hooks/usePrintOrder";

type PrintMode = "none" | "browser_on_order" | "browser_on_confirm";

const templateLabels: Record<string, { label: string; description: string }> = {
  confirmed: { label: "Pedido Confirmado", description: "Quando o pedido é confirmado" },
  preparing: { label: "Preparando", description: "Quando o preparo começa" },
  ready_pickup: { label: "Pronto p/ Retirada", description: "Quando está pronto para retirar" },
  ready_delivery: { label: "Pronto (Delivery)", description: "Quando está pronto aguardando motoboy" },
  out_for_delivery: { label: "Saiu p/ Entrega", description: "Quando saiu para entrega" },
  delivered: { label: "Entregue", description: "Quando foi entregue" },
  picked_up: { label: "Retirado", description: "Quando foi retirado pelo cliente" },
  served: { label: "Servido", description: "Quando foi servido no local" },
};

export default function Configuracoes() {
  const { data: establishment, isLoading } = useEstablishment();
  const queryClient = useQueryClient();
  const { defaultTemplates } = useWhatsAppNotification();
  
  
  // Simplified print mode (browser only)
  const [printMode, setPrintMode] = useState<PrintMode>("none");
  
  // Print customization settings
  const [printFontSize, setPrintFontSize] = useState(12);
  const [printMarginLeft, setPrintMarginLeft] = useState(0);
  const [printMarginRight, setPrintMarginRight] = useState(0);
  const [printFontBold, setPrintFontBold] = useState(true);
  const [printLineHeight, setPrintLineHeight] = useState(1.4);
  const [printContrastHigh, setPrintContrastHigh] = useState(false);
  
  // Theme colors
  const [themePrimaryColor, setThemePrimaryColor] = useState("#ea580c");
  const [themeSecondaryColor, setThemeSecondaryColor] = useState("#1e293b");

  // Card fees
  const [cardCreditFee, setCardCreditFee] = useState("0");
  const [cardDebitFee, setCardDebitFee] = useState("0");

  // Notification settings
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);

  // WhatsApp settings
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<Record<string, string>>(defaultTemplates);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (establishment) {
      const legacyPrintMode = establishment.print_mode;
      
      let newPrintMode: PrintMode = "none";
      if (legacyPrintMode === "on_order" || legacyPrintMode === "browser_on_order") {
        newPrintMode = "browser_on_order";
      } else if (legacyPrintMode === "on_confirm" || legacyPrintMode === "browser_on_confirm") {
        newPrintMode = "browser_on_confirm";
      }
      setPrintMode(newPrintMode);
      setPrintFontSize(establishment.print_font_size ?? 12);
      setPrintMarginLeft(establishment.print_margin_left ?? 0);
      setPrintMarginRight(establishment.print_margin_right ?? 0);
      setPrintFontBold(establishment.print_font_bold !== false);
      setPrintLineHeight(establishment.print_line_height ?? 1.4);
      setPrintContrastHigh(establishment.print_contrast_high === true);
      setThemePrimaryColor(establishment.theme_primary_color || "#ea580c");
      setThemeSecondaryColor(establishment.theme_secondary_color || "#1e293b");
      setCardCreditFee(String(establishment.card_credit_fee || 0));
      setCardDebitFee(String(establishment.card_debit_fee || 0));
      setNotificationSoundEnabled(establishment.notification_sound_enabled !== false);
      setWhatsappEnabled(establishment.whatsapp_notifications_enabled === true);
      
      const savedTemplates = establishment.whatsapp_message_templates;
      if (savedTemplates && typeof savedTemplates === "object") {
        setWhatsappTemplates({ ...defaultTemplates, ...(savedTemplates as Record<string, string>) });
      }
    }
  }, [establishment, defaultTemplates]);

  const handleSave = async () => {
    if (!establishment?.id) return;

    setSaving(true);
    try {
      const updateData: Record<string, any> = {
          print_mode: printMode,
          print_font_size: printFontSize,
          print_margin_left: printMarginLeft,
          print_margin_right: printMarginRight,
          print_font_bold: printFontBold,
          print_line_height: printLineHeight,
          print_contrast_high: printContrastHigh,
          theme_primary_color: themePrimaryColor,
          theme_secondary_color: themeSecondaryColor,
          card_credit_fee: parseFloat(cardCreditFee.replace(",", ".")) || 0,
          card_debit_fee: parseFloat(cardDebitFee.replace(",", ".")) || 0,
          notification_sound_enabled: notificationSoundEnabled,
          whatsapp_notifications_enabled: whatsappEnabled,
          whatsapp_message_templates: whatsappTemplates,
        };

      const { error } = await supabase
        .from("establishments")
        .update(updateData)
        .eq("id", establishment.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["establishment"] });
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (key: string, value: string) => {
    setWhatsappTemplates((prev) => ({ ...prev, [key]: value }));
  };

  const resetTemplate = (key: string) => {
    setWhatsappTemplates((prev) => ({ ...prev, [key]: defaultTemplates[key] }));
  };

  if (isLoading) {
    return (
      <div 
        className="space-y-6"
        data-testid="configuracoes-page-loading"
        aria-busy="true"
        aria-label="Carregando configurações"
      >
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6"
      data-testid="configuracoes-page"
      role="main"
      aria-label="Página de configurações"
    >
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="configuracoes-title">
          Configurações
        </h1>
      </div>
      
      {/* Card - Notificações */}
      <Card data-testid="configuracoes-notifications-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notificações</CardTitle>
          </div>
          <CardDescription>
            Configure as notificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="notification-sound" className="font-medium cursor-pointer">
                Som de notificação
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som quando um novo pedido chegar
              </p>
            </div>
            <Switch
              id="notification-sound"
              checked={notificationSoundEnabled}
              onCheckedChange={setNotificationSoundEnabled}
              data-testid="configuracoes-notification-sound-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card - Impressão de Pedidos */}
      <Card data-testid="configuracoes-print-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <CardTitle>Impressão de Pedidos</CardTitle>
          </div>
          <CardDescription>
            Configure quando os pedidos devem ser impressos automaticamente (impressora térmica 58mm)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup 
            value={printMode} 
            onValueChange={(value) => setPrintMode(value as PrintMode)}
            data-testid="configuracoes-print-mode-group"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="none" id="print-none" className="mt-0.5" data-testid="configuracoes-print-mode-none" />
              <div>
                <Label htmlFor="print-none" className="font-medium cursor-pointer">
                  Não imprimir automaticamente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Você pode imprimir manualmente clicando no botão de impressão do pedido
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="browser_on_order" id="print-browser-on-order" className="mt-0.5" data-testid="configuracoes-print-mode-on-order" />
              <div>
                <Label htmlFor="print-browser-on-order" className="font-medium cursor-pointer">
                  Imprimir ao receber pedido
                </Label>
                <p className="text-sm text-muted-foreground">
                  Abre diálogo de impressão do navegador quando um novo pedido chegar
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="browser_on_confirm" id="print-browser-on-confirm" className="mt-0.5" data-testid="configuracoes-print-mode-on-confirm" />
              <div>
                <Label htmlFor="print-browser-on-confirm" className="font-medium cursor-pointer">
                  Imprimir ao confirmar pedido
                </Label>
                <p className="text-sm text-muted-foreground">
                  Abre diálogo de impressão quando você confirmar o pedido no painel
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Ao imprimir, selecione a impressora desejada no diálogo do navegador. Para definir uma impressora padrão, 
              marque a opção "Lembrar" ou configure nas preferências de impressão do seu navegador.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const html = generateReceiptHtml(
                {
                  order_number: 0,
                  order_type: "delivery",
                  status: "confirmed",
                  payment_method: "pix",
                  subtotal: 25,
                  delivery_fee: 5,
                  total: 30,
                  created_at: new Date().toISOString(),
                  customer: { name: "Teste Impressão", phone: "(00) 0000-0000" },
                  items: [{ quantity: 1, product_name: "Produto Teste", product_price: 25, total: 25, addons: [] }],
                } as any,
                establishment?.name || "Estabelecimento",
                establishment?.logo_url,
                printFontSize,
                printMarginLeft,
                printMarginRight,
                true,
                printFontBold,
                printLineHeight,
                printContrastHigh,
              );
              // Use window.open (same method as real printing) — works on mobile/Rawbt
              const printWindow = window.open("", "_blank");
              if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                const triggerPrint = () => {
                  printWindow.focus();
                  printWindow.print();
                  printWindow.onafterprint = () => printWindow.close();
                  setTimeout(() => { try { if (!printWindow.closed) printWindow.close(); } catch {} }, 60000);
                };
                const imgs = printWindow.document.querySelectorAll('img');
                if (imgs.length === 0) { triggerPrint(); }
                else {
                  let cnt = 0;
                  const done = () => { cnt++; if (cnt >= imgs.length) triggerPrint(); };
                  imgs.forEach(img => img.complete ? done() : (img.onload = done, img.onerror = done));
                  setTimeout(triggerPrint, 3000);
                }
              } else {
                toast.error("Popup bloqueado. Permita popups para imprimir.");
              }
            }}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Teste
          </Button>
        </CardContent>
      </Card>

      {/* Card - Personalização da Impressão */}
      <Card data-testid="configuracoes-print-customization-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <CardTitle>Personalização do Recibo</CardTitle>
          </div>
          <CardDescription>
            Ajuste o tamanho da fonte e centralização do recibo para sua impressora
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="printFontSize">Tamanho da Fonte</Label>
                <span className="text-sm font-medium text-muted-foreground">{printFontSize}px</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">8px</span>
                <input
                  type="range"
                  id="printFontSize"
                  min="8"
                  max="18"
                  step="1"
                  value={printFontSize}
                  onChange={(e) => setPrintFontSize(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">18px</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aumenta o tamanho do texto no recibo impresso
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="printMarginLeft">Ajuste de Margem Esquerda</Label>
                <span className="text-sm font-medium text-muted-foreground">{printMarginLeft}mm</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">-15mm</span>
                <input
                  type="range"
                  id="printMarginLeft"
                  min="-15"
                  max="20"
                  step="1"
                  value={printMarginLeft}
                  onChange={(e) => setPrintMarginLeft(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">20mm</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste para centralizar o conteúdo na sua impressora térmica
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="printMarginRight">Ajuste de Margem Direita</Label>
                <span className="text-sm font-medium text-muted-foreground">{printMarginRight}mm</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">-15mm</span>
                <input
                  type="range"
                  id="printMarginRight"
                  min="-15"
                  max="20"
                  step="1"
                  value={printMarginRight}
                  onChange={(e) => setPrintMarginRight(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">20mm</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste para evitar cortes do lado direito
              </p>
            </div>

            {/* New print visibility options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="printFontBold" className="font-medium cursor-pointer">
                    Texto em Negrito
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Usa fonte em negrito para melhor visibilidade
                  </p>
                </div>
                <Switch
                  id="printFontBold"
                  checked={printFontBold}
                  onCheckedChange={setPrintFontBold}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="printLineHeight">Espaçamento de Linhas</Label>
                  <span className="text-sm font-medium text-muted-foreground">{printLineHeight.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">1.2</span>
                  <input
                    type="range"
                    id="printLineHeight"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={printLineHeight}
                    onChange={(e) => setPrintLineHeight(Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">2.0</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Aumenta o espaço entre linhas para melhor legibilidade
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="printContrastHigh" className="font-medium cursor-pointer">
                    Alto Contraste
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Linhas mais grossas e separadores mais visíveis
                  </p>
                </div>
                <Switch
                  id="printContrastHigh"
                  checked={printContrastHigh}
                  onCheckedChange={setPrintContrastHigh}
                />
              </div>
            </div>
          </div>

          {/* Preview Real usando iframe */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium mb-3">Pré-visualização (58mm)</p>
            <div className="bg-white border rounded overflow-hidden mx-auto" style={{ maxWidth: '220px' }}>
              <iframe
                srcDoc={(() => {
                  const testOrderPreview = {
                    order_number: 123,
                    order_type: 'delivery',
                    status: 'confirmed',
                    payment_method: 'cash',
                    subtotal: 89.80,
                    delivery_fee: 5.00,
                    total: 94.80,
                    change_for: 100,
                    notes: 'Sem cebola',
                    created_at: new Date().toISOString(),
                    customer: {
                      name: 'João Silva',
                      phone: '(11) 99999-9999',
                      address: 'Rua das Flores',
                      address_number: '123',
                      neighborhood: 'Centro',
                      city: 'São Paulo'
                    },
                    items: [
                      {
                        quantity: 2,
                        product_name: 'Pizza Grande',
                        product_price: 44.90,
                        total: 89.80,
                        addons: [
                          { quantity: 1, addon_name: 'Borda recheada', addon_price: 5.00 }
                        ]
                      }
                    ]
                  };
                  return generateReceiptHtml(
                    testOrderPreview as any,
                    establishment?.name || "Estabelecimento",
                    establishment?.logo_url || null,
                    printFontSize,
                    printMarginLeft,
                    printMarginRight,
                    true,
                    printFontBold,
                    printLineHeight,
                    printContrastHigh
                  );
                })()}
                style={{ 
                  width: '100%', 
                  height: '350px', 
                  border: 'none',
                  pointerEvents: 'none',
                  background: 'white'
                }}
                title="Preview do recibo"
              />
            </div>
          </div>

          {/* Test Print Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={async () => {
                const { generateReceiptHtml } = await import("@/hooks/usePrintOrder");
                const testOrder = {
                  id: "test",
                  order_number: 123,
                  order_type: "delivery",
                  status: "confirmed",
                  payment_method: "pix",
                  subtotal: 25.00,
                  delivery_fee: 5.00,
                  total: 30.00,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  establishment_id: establishment?.id || "",
                  customer_id: "test",
                  customer: {
                    id: "test",
                    name: "Cliente Teste",
                    phone: "(11) 99999-9999",
                    address: "Rua Exemplo",
                    address_number: "123",
                    neighborhood: "Centro",
                    city: "São Paulo",
                    establishment_id: establishment?.id || "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  items: [
                    {
                      id: "item1",
                      order_id: "test",
                      product_id: "prod1",
                      product_name: "Produto de Teste",
                      product_price: 25.00,
                      quantity: 1,
                      total: 25.00,
                      created_at: new Date().toISOString(),
                      addons: []
                    }
                  ]
                };
                
                  const html = generateReceiptHtml(
                    testOrder as any,
                    establishment?.name || "Estabelecimento",
                    establishment?.logo_url,
                    printFontSize,
                    printMarginLeft,
                    printMarginRight,
                    true,
                    printFontBold,
                    printLineHeight,
                    printContrastHigh
                  );
                
                const printWindow = window.open("", "_blank", "width=400,height=600");
                if (printWindow) {
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.onload = () => {
                    printWindow.print();
                  };
                }
              }}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Teste
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Imprime um pedido de exemplo com as configurações atuais
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card - Taxas de Pagamento */}
      <Card data-testid="configuracoes-payment-fees-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Taxas de Pagamento</CardTitle>
          </div>
          <CardDescription>
            Configure as taxas da maquininha de cartão para cálculo automático do valor líquido das vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cardCreditFee">Taxa de Crédito (%)</Label>
              <Input
                id="cardCreditFee"
                type="text"
                placeholder="3.5"
                value={cardCreditFee}
                onChange={(e) => setCardCreditFee(e.target.value)}
                data-testid="configuracoes-credit-fee-input"
              />
              <p className="text-xs text-muted-foreground">
                Ex: 3.5 para uma taxa de 3,5%
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardDebitFee">Taxa de Débito (%)</Label>
              <Input
                id="cardDebitFee"
                type="text"
                placeholder="1.5"
                value={cardDebitFee}
                onChange={(e) => setCardDebitFee(e.target.value)}
                data-testid="configuracoes-debit-fee-input"
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1.5 para uma taxa de 1,5%
              </p>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 As taxas serão descontadas automaticamente das vendas por cartão no módulo financeiro, 
              exibindo o valor bruto e o valor líquido (após taxas).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card - Personalização */}
      <Card data-testid="configuracoes-theme-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Personalização</CardTitle>
          </div>
          <CardDescription>Defina as cores do tema da sua loja pública</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="themePrimaryColor">Cor Principal</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="themePrimaryColor"
                  value={themePrimaryColor}
                  onChange={(e) => setThemePrimaryColor(e.target.value)}
                  className="h-10 w-16 rounded border border-input cursor-pointer"
                  data-testid="configuracoes-primary-color-picker"
                />
                <Input
                  value={themePrimaryColor}
                  onChange={(e) => setThemePrimaryColor(e.target.value)}
                  placeholder="#ea580c"
                  className="flex-1 font-mono"
                  data-testid="configuracoes-primary-color-input"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Usada no cabeçalho e botões principais
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="themeSecondaryColor">Cor Secundária</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="themeSecondaryColor"
                  value={themeSecondaryColor}
                  onChange={(e) => setThemeSecondaryColor(e.target.value)}
                  className="h-10 w-16 rounded border border-input cursor-pointer"
                  data-testid="configuracoes-secondary-color-picker"
                />
                <Input
                  value={themeSecondaryColor}
                  onChange={(e) => setThemeSecondaryColor(e.target.value)}
                  placeholder="#1e293b"
                  className="flex-1 font-mono"
                  data-testid="configuracoes-secondary-color-input"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Usada em textos e elementos secundários
              </p>
            </div>
          </div>
          
          {/* Preview */}
          <div className="mt-4 p-4 rounded-lg border" data-testid="configuracoes-theme-preview">
            <p className="text-sm font-medium mb-3">Pré-visualização</p>
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-24 rounded-md flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: themePrimaryColor }}
              >
                Principal
              </div>
              <div 
                className="h-12 w-24 rounded-md flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: themeSecondaryColor }}
              >
                Secundária
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          size="lg"
          data-testid="configuracoes-save-button"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
