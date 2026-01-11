import { useState, useEffect } from "react";
import { Timer, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePreparationTime } from "@/hooks/usePreparationTime";

interface PreparationTimeConfigProps {
  establishmentId: string;
}

export function PreparationTimeConfig({
  establishmentId,
}: PreparationTimeConfigProps) {
  const { data: prepTimeData, refetch } = usePreparationTime();
  
  const currentMode = prepTimeData?.mode ?? "auto_daily";
  const currentPreparationTime = prepTimeData?.preparationMinutes ?? 30;
  const currentDeliveryTime = prepTimeData?.deliveryMinutes ?? 30;
  const calculatedTime = prepTimeData?.totalMinutes ?? null;
  const sampleSize = prepTimeData?.sampleSize ?? 0;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"auto_daily" | "manual">(currentMode);
  const [preparationTime, setPreparationTime] = useState(currentPreparationTime);
  const [deliveryTime, setDeliveryTime] = useState(currentDeliveryTime);
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMode(currentMode);
      setPreparationTime(currentPreparationTime);
      setDeliveryTime(currentDeliveryTime);
    }
  }, [open, currentMode, currentPreparationTime, currentDeliveryTime]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("establishments")
        .update({
          preparation_time_mode: mode,
          manual_preparation_time: preparationTime,
          manual_delivery_time: deliveryTime,
        })
        .eq("id", establishmentId);

      if (error) throw error;

      toast.success("Configuração de tempo salva!");
      // Refetch immediately to update the UI
      await refetch();
      setOpen(false);
    } catch (error) {
      console.error("Error saving preparation time config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const badgeLabel = currentMode === "auto_daily"
    ? `Preparo: ~${calculatedTime ?? "--"} min`
    : `Preparo: ${currentPreparationTime} min + Entrega: ${currentDeliveryTime} min`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge 
          variant="secondary" 
          className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
        >
          <Timer className="h-3 w-3" />
          {badgeLabel}
          <Settings2 className="h-3 w-3 ml-1 opacity-50" />
        </Badge>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Tempo de Preparo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "auto_daily" | "manual")}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="auto_daily" id="auto_daily" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="auto_daily" className="cursor-pointer font-medium">
                  Calculado automaticamente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Média baseada nos pedidos finalizados
                  {sampleSize > 0 && ` (${sampleSize} pedidos)`}
                </p>
                {mode === "auto_daily" && calculatedTime && (
                  <p className="text-sm text-primary font-medium">
                    Tempo atual: ~{calculatedTime} min
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="manual" id="manual" className="mt-1" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="manual" className="cursor-pointer font-medium">
                  Tempo fixo configurado
                </Label>
                <p className="text-xs text-muted-foreground">
                  Defina os tempos manualmente
                </p>
              </div>
            </div>
          </RadioGroup>

          {mode === "manual" && (
            <div className="space-y-3 pl-6 pt-2 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="prep-time" className="text-sm">
                  Tempo de preparo
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="prep-time"
                    type="number"
                    min={1}
                    max={180}
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-time" className="text-sm">
                  Tempo de entrega
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="delivery-time"
                    type="number"
                    min={0}
                    max={120}
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Tempo total: <span className="font-medium text-foreground">{preparationTime + deliveryTime} min</span>
              </p>
            </div>
          )}

          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
