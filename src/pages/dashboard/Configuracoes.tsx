import { Settings, Printer, Palette, CreditCard, Bell, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";

type PrintMode = "none" | "on_order" | "on_confirm";

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
  
  // Print settings
  const [printMode, setPrintMode] = useState<PrintMode>("none");
  
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
      setPrintMode(((establishment as any).print_mode as PrintMode) || "none");
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

  const handleSave = async () => {
    if (!establishment?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("establishments")
        .update({
          print_mode: printMode,
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

      {/* Card - Impressão de Pedidos */}
      <Card>
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
          <RadioGroup value={printMode} onValueChange={(value) => setPrintMode(value as PrintMode)}>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="none" id="print-none" className="mt-0.5" />
              <div>
                <Label htmlFor="print-none" className="font-medium cursor-pointer">
                  Não imprimir automaticamente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Você pode imprimir manualmente a qualquer momento clicando no botão de impressão do pedido
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="on_order" id="print-on-order" className="mt-0.5" />
              <div>
                <Label htmlFor="print-on-order" className="font-medium cursor-pointer">
                  Imprimir quando o pedido é feito
                </Label>
                <p className="text-sm text-muted-foreground">
                  O pedido será impresso automaticamente assim que o cliente finalizar o pedido
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <RadioGroupItem value="on_confirm" id="print-on-confirm" className="mt-0.5" />
              <div>
                <Label htmlFor="print-on-confirm" className="font-medium cursor-pointer">
                  Imprimir ao confirmar pedido
                </Label>
                <p className="text-sm text-muted-foreground">
                  O pedido será impresso automaticamente quando você confirmar o pedido no painel
                </p>
              </div>
            </div>
          </RadioGroup>
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
