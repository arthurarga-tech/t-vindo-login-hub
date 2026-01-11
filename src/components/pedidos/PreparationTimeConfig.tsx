import { useState, useEffect } from "react";
import { Timer, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PreparationTimeConfigProps {
  establishmentId: string;
  currentMode: "auto_daily" | "manual";
  currentPreparationTime: number;
  currentDeliveryTime: number;
  calculatedTime: number | null;
  sampleSize: number;
}

export function PreparationTimeConfig({
  establishmentId,
  currentMode,
  currentPreparationTime,
  currentDeliveryTime,
  calculatedTime,
  sampleSize,
}: PreparationTimeConfigProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"auto_daily" | "manual">(currentMode);
  const [preparationTime, setPreparationTime] = useState(currentPreparationTime);
  const [deliveryTime, setDeliveryTime] = useState(currentDeliveryTime);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Reset form when popover opens
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
      queryClient.invalidateQueries({ queryKey: ["establishment"] });
      queryClient.invalidateQueries({ queryKey: ["preparation-time"] });
      setOpen(false);
    } catch (error) {
      console.error("Error saving preparation time config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  // Display values
  const displayTime = mode === "auto_daily" 
    ? calculatedTime 
    : preparationTime + deliveryTime;

  const badgeLabel = currentMode === "auto_daily"
    ? `Preparo: ~${calculatedTime ?? "--"} min`
    : `Preparo: ${currentPreparationTime} min + Entrega: ${currentDeliveryTime} min`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              <Timer className="h-3 w-3" />
              {badgeLabel}
              <Settings2 className="h-3 w-3 ml-1 opacity-50" />
            </Badge>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clique para configurar o tempo de preparo</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Tempo de Preparo</h4>
          </div>

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
      </PopoverContent>
    </Popover>
  );
}
