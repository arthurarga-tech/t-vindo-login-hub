import { Settings, Printer, Palette, CreditCard, Bell, MessageCircle, ChevronDown, ChevronUp, Download, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle, Type } from "lucide-react";
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
import { useQZTrayContext } from "@/contexts/QZTrayContext";

// Unified print mode: method_trigger or "none"
// browser_on_order, browser_on_confirm, qz_on_order, qz_on_confirm, none
type PrintMode = "none" | "browser_on_order" | "browser_on_confirm" | "qz_on_order" | "qz_on_confirm";

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
  const qzTray = useQZTrayContext();
  
  // Unified print mode
  const [printMode, setPrintMode] = useState<PrintMode>("none");
  const [qzTrayPrinter, setQzTrayPrinter] = useState("");
  
  // Print customization settings
  const [printFontSize, setPrintFontSize] = useState(12);
  const [printMarginLeft, setPrintMarginLeft] = useState(-4);
  const [printMarginRight, setPrintMarginRight] = useState(10);
  
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

  // Check if saved printer is available in current printers list
  const savedPrinterAvailable = qzTrayPrinter && qzTray.printers.includes(qzTrayPrinter);
  const savedPrinterMissing = qzTrayPrinter && qzTray.isConnected && qzTray.printers.length > 0 && !savedPrinterAvailable;

  useEffect(() => {
    if (establishment) {
      // Convert legacy format to new unified format
      const legacyPrintMode = (establishment as any).print_mode;
      const legacyQzEnabled = (establishment as any).qz_tray_enabled === true;
      
      let newPrintMode: PrintMode = "none";
      if (legacyPrintMode === "on_order") {
        newPrintMode = legacyQzEnabled ? "qz_on_order" : "browser_on_order";
      } else if (legacyPrintMode === "on_confirm") {
        newPrintMode = legacyQzEnabled ? "qz_on_confirm" : "browser_on_confirm";
      } else if (legacyPrintMode === "browser_on_order" || legacyPrintMode === "browser_on_confirm" || 
                 legacyPrintMode === "qz_on_order" || legacyPrintMode === "qz_on_confirm") {
        newPrintMode = legacyPrintMode as PrintMode;
      }
      
      setPrintMode(newPrintMode);
      setQzTrayPrinter((establishment as any).qz_tray_printer || "");
      setPrintFontSize((establishment as any).print_font_size || 12);
      setPrintMarginLeft((establishment as any).print_margin_left ?? -4);
      setPrintMarginRight((establishment as any).print_margin_right ?? 10);
      setThemePrimaryColor((establishment as any).theme_primary_color || "#ea580c");
      setThemeSecondaryColor((establishment as any).theme_secondary_color || "#1e293b");
      setCardCreditFee(String((establishment as any).card_credit_fee || 0));
      setCardDebitFee(String((establishment as any).card_debit_fee || 0));
      setNotificationSoundEnabled((establishment as any).notification_sound_enabled !== false);
      setWhatsappEnabled((establishment as any).whatsapp_notifications_enabled === true);
      
      const savedTemplates = (establishment as any).whatsapp_message_templates;
      if (savedTemplates && typeof savedTemplates === "object") {
        setWhatsappTemplates({ ...defaultTemplates, ...savedTemplates });
      }
    }
  }, [establishment, defaultTemplates]);

  // Auto-select saved printer when printers are loaded
  useEffect(() => {
    if (qzTray.isConnected && qzTray.printers.length > 0 && qzTray.savedPrinter) {
      if (qzTray.printers.includes(qzTray.savedPrinter)) {
        console.log("[Config] Auto-selecionando impressora salva:", qzTray.savedPrinter);
        setQzTrayPrinter(qzTray.savedPrinter);
      }
    }
  }, [qzTray.isConnected, qzTray.printers, qzTray.savedPrinter]);

  const handleQZConnect = async () => {
    if (qzTray.isConnected) {
      await qzTray.disconnect();
    } else {
      const result = await qzTray.connect();
      console.log("[Config] Conexão resultado:", result);
      console.log("[Config] Impressoras encontradas:", result?.printers);
    }
  };
  
  const handlePrinterChange = (printer: string) => {
    console.log("[Config] Impressora selecionada:", printer);
    setQzTrayPrinter(printer);
    qzTray.setSavedPrinter(printer);
  };

  const handleTestPrint = async () => {
    if (!qzTray.isConnected) {
      toast.error("QZ Tray não está conectado");
      return;
    }
    if (!qzTrayPrinter) {
      toast.error("Selecione uma impressora");
      return;
    }

    const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; size: 58mm auto; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 58mm; padding: 4mm; text-align: center; }
    .header { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .success { font-size: 14px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="header">🖨️ TESTE QZ TRAY</div>
  <div class="line"></div>
  <div>Impressão silenciosa</div>
  <div>funcionando corretamente!</div>
  <div class="line"></div>
  <div class="success">✅ Configuração OK</div>
  <div style="font-size: 10px; margin-top: 8px;">
    ${new Date().toLocaleString("pt-BR")}
  </div>
</body>
</html>`;

    const success = await qzTray.printHtml(testHtml, qzTrayPrinter);
    if (success) {
      toast.success("Impressão enviada com sucesso!");
    } else {
      toast.error(qzTray.error || "Erro ao imprimir");
    }
  };

  const handleSave = async () => {
    if (!establishment?.id) return;

    setSaving(true);
    try {
      // Derive legacy fields from unified print mode for backward compatibility
      const isQzMode = printMode.startsWith("qz_");
      const legacyPrintMode = printMode === "none" ? "none" 
        : (printMode.includes("on_order") ? "on_order" : "on_confirm");
      
      const { error } = await supabase
        .from("establishments")
        .update({
          print_mode: printMode, // Store new unified format
          printer_name: null, // Deprecated
          qz_tray_enabled: isQzMode,
          qz_tray_printer: qzTrayPrinter || null,
          print_font_size: printFontSize,
          print_margin_left: printMarginLeft,
          print_margin_right: printMarginRight,
          theme_primary_color: themePrimaryColor,
          theme_secondary_color: themeSecondaryColor,
          card_credit_fee: parseFloat(cardCreditFee.replace(",", ".")) || 0,
          card_debit_fee: parseFloat(cardDebitFee.replace(",", ".")) || 0,
          notification_sound_enabled: notificationSoundEnabled,
          whatsapp_notifications_enabled: whatsappEnabled,
          whatsapp_message_templates: whatsappTemplates,
        })
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>

      {/* Card - WhatsApp Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <CardTitle>Notificações WhatsApp</CardTitle>
          </div>
          <CardDescription>
            Envie notificações automáticas de status do pedido para o WhatsApp do cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp-enabled" className="font-medium cursor-pointer">
                Ativar notificações por WhatsApp
              </Label>
              <p className="text-sm text-muted-foreground">
                Ao mudar o status do pedido, abrirá o WhatsApp com a mensagem pronta para enviar
              </p>
            </div>
            <Switch
              id="whatsapp-enabled"
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
            />
          </div>

          {whatsappEnabled && (
            <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>Personalizar mensagens</span>
                  {templatesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Variáveis disponíveis:</strong><br />
                    <code className="text-xs bg-background px-1 py-0.5 rounded">{"{nome_cliente}"}</code> - Nome do cliente<br />
                    <code className="text-xs bg-background px-1 py-0.5 rounded">{"{numero_pedido}"}</code> - Número do pedido<br />
                    <code className="text-xs bg-background px-1 py-0.5 rounded">{"{total}"}</code> - Valor total<br />
                    <code className="text-xs bg-background px-1 py-0.5 rounded">{"{nome_estabelecimento}"}</code> - Nome do estabelecimento
                  </p>
                </div>

                {Object.entries(templateLabels).map(([key, { label, description }]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">{label}</Label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetTemplate(key)}
                        className="text-xs"
                      >
                        Restaurar padrão
                      </Button>
                    </div>
                    <Textarea
                      value={whatsappTemplates[key] || ""}
                      onChange={(e) => updateTemplate(key, e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm text-green-800 dark:text-green-200">
              💡 Ao mudar o status do pedido, o WhatsApp será aberto automaticamente com a mensagem pronta. 
              Você só precisa clicar em "Enviar". Funciona no navegador (WhatsApp Web) e no celular (App).
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>
      
      {/* Card - Notificações */}
      <Card>
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Card - Impressão de Pedidos (Unificado) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <CardTitle>Impressão de Pedidos</CardTitle>
          </div>
          <CardDescription>
            Configure quando e como os pedidos devem ser impressos automaticamente (impressora térmica 58mm)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={printMode} onValueChange={(value) => setPrintMode(value as PrintMode)}>
            {/* Desativado */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="none" id="print-none" className="mt-0.5" />
              <div>
                <Label htmlFor="print-none" className="font-medium cursor-pointer">
                  Não imprimir automaticamente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Você pode imprimir manualmente clicando no botão de impressão do pedido
                </p>
              </div>
            </div>
            
            {/* Navegador - Ao pedir */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="browser_on_order" id="print-browser-on-order" className="mt-0.5" />
              <div>
                <Label htmlFor="print-browser-on-order" className="font-medium cursor-pointer">
                  Navegador - Ao receber pedido
                </Label>
                <p className="text-sm text-muted-foreground">
                  Abre diálogo de impressão do navegador quando um novo pedido chegar
                </p>
              </div>
            </div>
            
            {/* Navegador - Ao confirmar */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="browser_on_confirm" id="print-browser-on-confirm" className="mt-0.5" />
              <div>
                <Label htmlFor="print-browser-on-confirm" className="font-medium cursor-pointer">
                  Navegador - Ao confirmar pedido
                </Label>
                <p className="text-sm text-muted-foreground">
                  Abre diálogo de impressão quando você confirmar o pedido no painel
                </p>
              </div>
            </div>

            {/* QZ Tray - Ao pedir */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
              <RadioGroupItem value="qz_on_order" id="print-qz-on-order" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="print-qz-on-order" className="font-medium cursor-pointer flex items-center gap-2">
                  QZ Tray - Ao receber pedido
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Silencioso</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Imprime diretamente sem diálogo quando um novo pedido chegar (requer QZ Tray)
                </p>
              </div>
            </div>
            
            {/* QZ Tray - Ao confirmar */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
              <RadioGroupItem value="qz_on_confirm" id="print-qz-on-confirm" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="print-qz-on-confirm" className="font-medium cursor-pointer flex items-center gap-2">
                  QZ Tray - Ao confirmar pedido
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Silencioso</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Imprime diretamente sem diálogo quando você confirmar o pedido (requer QZ Tray)
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* QZ Tray Configuration - Only show when QZ mode is selected */}
          {(printMode === "qz_on_order" || printMode === "qz_on_confirm") && (
            <div className="space-y-4 pt-4 border-t mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className={qzTray.isConnected ? "h-4 w-4 text-green-600" : "h-4 w-4 text-muted-foreground"} />
                <span className="font-medium text-sm">Configuração QZ Tray</span>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {qzTray.isConnected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-600">Conectado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">Desconectado</span>
                    </>
                  )}
                </div>
                <Button
                  variant={qzTray.isConnected ? "outline" : "default"}
                  size="sm"
                  onClick={handleQZConnect}
                  disabled={qzTray.isConnecting}
                >
                  {qzTray.isConnecting ? "Conectando..." : qzTray.isConnected ? "Desconectar" : "Conectar"}
                </Button>
              </div>

              {/* Error Message */}
              {qzTray.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <XCircle className="h-5 w-5 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Erro de conexão</p>
                    <p>{qzTray.error}</p>
                  </div>
                </div>
              )}

              {/* Saved printer warning */}
              {savedPrinterMissing && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-300">Impressora não encontrada</p>
                    <p className="text-amber-600 dark:text-amber-400">
                      A impressora "{qzTrayPrinter}" salva anteriormente não está mais disponível.
                    </p>
                  </div>
                </div>
              )}

              {/* Printer Selection */}
              {qzTray.isConnected && (
                <div className="space-y-2">
                  <Label>Impressora</Label>
                  {qzTray.printers.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Nenhuma impressora instalada no sistema.
                      </p>
                    </div>
                  ) : (
                    <Select value={savedPrinterAvailable ? qzTrayPrinter : ""} onValueChange={handlePrinterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma impressora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {qzTray.printers.map((printer) => (
                          <SelectItem key={printer} value={printer}>
                            {printer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => qzTray.getPrinters()}
                    >
                      Atualizar Lista
                    </Button>
                    {qzTrayPrinter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestPrint}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Testar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Success indicator */}
              {qzTray.isConnected && qzTrayPrinter && savedPrinterAvailable && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">
                    Pronto! Impressão silenciosa em <strong>{qzTrayPrinter}</strong>
                  </span>
                </div>
              )}

              {/* Requirements */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                    <span>Como instalar QZ Tray?</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Download className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">1. Baixe o QZ Tray</p>
                        <p className="text-muted-foreground">
                          <a
                            href="https://qz.io/download/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            qz.io/download
                          </a>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                      <p className="font-medium">2. Mantenha o QZ Tray rodando na bandeja do sistema</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Printer className="h-4 w-4 text-primary mt-0.5" />
                      <p className="font-medium">3. Conecte e selecione sua impressora acima</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card - Personalização da Impressão */}
      <Card>
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
                <span className="text-xs text-muted-foreground">-5mm</span>
                <input
                  type="range"
                  id="printMarginLeft"
                  min="-5"
                  max="10"
                  step="1"
                  value={printMarginLeft}
                  onChange={(e) => setPrintMarginLeft(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">10mm</span>
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
                <span className="text-xs text-muted-foreground">-5mm</span>
                <input
                  type="range"
                  id="printMarginRight"
                  min="-5"
                  max="10"
                  step="1"
                  value={printMarginRight}
                  onChange={(e) => setPrintMarginRight(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">10mm</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste para evitar cortes do lado direito
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium mb-3">Pré-visualização</p>
            <div 
              className="bg-background border rounded p-3 max-w-[200px] mx-auto font-mono"
              style={{ 
                fontSize: `${Math.max(10, printFontSize - 2)}px`,
                paddingLeft: `${Math.max(0, printMarginLeft * 2 + 12)}px`,
                paddingRight: `${Math.max(0, printMarginRight * 2 + 12)}px`
              }}
            >
              <div className="text-center font-bold mb-1">PEDIDO #123</div>
              <div className="border-t border-dashed my-1"></div>
              <div className="flex justify-between">
                <span>1x Produto</span>
                <span>R$ 25,00</span>
              </div>
              <div className="border-t border-dashed my-1"></div>
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>R$ 25,00</span>
              </div>
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
                  printMarginRight
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
      <Card>
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
      <Card>
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
                />
                <Input
                  value={themePrimaryColor}
                  onChange={(e) => setThemePrimaryColor(e.target.value)}
                  placeholder="#ea580c"
                  className="flex-1 font-mono"
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
                />
                <Input
                  value={themeSecondaryColor}
                  onChange={(e) => setThemeSecondaryColor(e.target.value)}
                  placeholder="#1e293b"
                  className="flex-1 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Usada em textos e elementos secundários
              </p>
            </div>
          </div>
          
          {/* Preview */}
          <div className="mt-4 p-4 rounded-lg border">
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
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
