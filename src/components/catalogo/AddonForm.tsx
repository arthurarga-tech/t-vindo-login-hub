import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { Addon, AddonFormData } from "@/hooks/useAddons";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.coerce.number().min(0, "Preço não pode ser negativo"),
  active: z.boolean(),
});

interface AddonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addon?: Addon;
  onSubmit: (data: AddonFormData) => Promise<void>;
  isLoading: boolean;
}

export function AddonForm({
  open,
  onOpenChange,
  addon,
  onSubmit,
  isLoading,
}: AddonFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (addon) {
        form.reset({
          name: addon.name,
          price: addon.price,
          active: addon.active,
        });
      } else {
        form.reset({
          name: "",
          price: 0,
          active: true,
        });
      }
    }
  }, [open, addon, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      name: values.name,
      price: values.price,
      active: values.active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[350px]"
        data-testid="addon-form-modal"
        role="dialog"
        aria-labelledby="addon-form-title"
      >
        <DialogHeader>
          <DialogTitle 
            id="addon-form-title"
            data-testid="addon-form-title"
          >
            {addon ? "Editar Adicional" : "Novo Adicional"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit)} 
            className="space-y-4"
            data-testid="addon-form"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Bacon, Queijo Extra" 
                      {...field} 
                      data-testid="addon-form-name-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      {...field} 
                      data-testid="addon-form-price-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange} 
                      data-testid="addon-form-active-switch"
                      aria-label="Adicional ativo"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="addon-form-cancel-button"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="addon-form-submit-button"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {addon ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
