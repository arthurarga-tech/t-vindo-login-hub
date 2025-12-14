import { Settings, Printer, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type PrintMode = "none" | "on_order" | "on_confirm";

export default function Configuracoes() {
  const { data: establishment, isLoading } = useEstablishment();
  const queryClient = useQueryClient();
  
  // Print settings
  const [printMode, setPrintMode] = useState<PrintMode>("none");
  
  // Theme colors
  const [themePrimaryColor, setThemePrimaryColor] = useState("#ea580c");
  const [themeSecondaryColor, setThemeSecondaryColor] = useState("#1e293b");
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (establishment) {
      setPrintMode(((establishment as any).print_mode as PrintMode) || "none");
      setThemePrimaryColor((establishment as any).theme_primary_color || "#ea580c");
      setThemeSecondaryColor((establishment as any).theme_secondary_color || "#1e293b");
    }
  }, [establishment]);

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>
      
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
