import { useState } from "react";
import { DoorOpen, DoorClosed, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface StoreQuickCloseProps {
  establishmentId: string;
  isTemporaryClosed: boolean;
}

export function StoreQuickClose({ establishmentId, isTemporaryClosed }: StoreQuickCloseProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleToggleStore = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("establishments")
        .update({ temporary_closed: !isTemporaryClosed })
        .eq("id", establishmentId);

      if (error) throw error;

      toast.success(
        isTemporaryClosed 
          ? "Loja reaberta com sucesso!" 
          : "Loja fechada temporariamente"
      );
      
      queryClient.invalidateQueries({ queryKey: ["establishment"] });
      setOpen(false);
    } catch (error) {
      console.error("Error toggling store status:", error);
      toast.error("Erro ao alterar status da loja");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge
          variant={isTemporaryClosed ? "destructive" : "default"}
          className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5"
          data-testid="store-quick-close-badge"
        >
          {isTemporaryClosed ? (
            <DoorClosed className="h-3.5 w-3.5" />
          ) : (
            <DoorOpen className="h-3.5 w-3.5" />
          )}
          {isTemporaryClosed ? "Fechada Temp." : "Loja Aberta"}
          <Settings2 className="h-3 w-3 ml-0.5" />
        </Badge>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[400px]"
        data-testid="store-quick-close-modal"
      >
        <DialogHeader>
          <DialogTitle data-testid="store-quick-close-title">
            Controle Rápido da Loja
          </DialogTitle>
          <DialogDescription>
            {isTemporaryClosed
              ? "A loja está fechada temporariamente. Clientes não podem fazer pedidos."
              : "A loja está funcionando normalmente seguindo os horários configurados."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div 
            className={`p-4 rounded-lg border ${
              isTemporaryClosed 
                ? "bg-destructive/10 border-destructive/20" 
                : "bg-green-500/10 border-green-500/20"
            }`}
            data-testid="store-quick-close-status"
          >
            <div className="flex items-center gap-3">
              {isTemporaryClosed ? (
                <DoorClosed className="h-8 w-8 text-destructive" />
              ) : (
                <DoorOpen className="h-8 w-8 text-green-600" />
              )}
              <div>
                <p className="font-semibold">
                  {isTemporaryClosed ? "Fechada Temporariamente" : "Loja Aberta"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isTemporaryClosed
                    ? "Clique abaixo para reabrir"
                    : "Seguindo horários normais"}
                </p>
              </div>
            </div>
          </div>

          {isTemporaryClosed ? (
            <Button
              onClick={handleToggleStore}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="store-quick-close-reopen-button"
            >
              <DoorOpen className="h-4 w-4 mr-2" />
              {saving ? "Reabrindo..." : "Reabrir Loja"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleToggleStore}
              disabled={saving}
              className="w-full"
              data-testid="store-quick-close-close-button"
            >
              <DoorClosed className="h-4 w-4 mr-2" />
              {saving ? "Fechando..." : "Fechar Loja Agora"}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {isTemporaryClosed
              ? "Ao reabrir, a loja voltará a seguir os horários de funcionamento normais."
              : "Isso fechará a loja imediatamente, independente dos horários configurados."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
