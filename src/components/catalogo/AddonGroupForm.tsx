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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { AddonGroup, AddonGroupFormData } from "@/hooks/useAddons";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  min_selections: z.coerce.number().min(0, "Mínimo não pode ser negativo"),
  max_selections: z.coerce.number().min(1, "Máximo deve ser pelo menos 1"),
  required: z.boolean(),
  active: z.boolean(),
});

interface AddonGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: AddonGroup;
  onSubmit: (data: AddonGroupFormData) => Promise<void>;
  isLoading: boolean;
}

export function AddonGroupForm({
  open,
  onOpenChange,
  group,
  onSubmit,
  isLoading,
}: AddonGroupFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      min_selections: 0,
      max_selections: 1,
      required: false,
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (group) {
        form.reset({
          name: group.name,
          min_selections: group.min_selections,
          max_selections: group.max_selections,
          required: group.required,
          active: group.active,
        });
      } else {
        form.reset({
          name: "",
          min_selections: 0,
          max_selections: 1,
          required: false,
          active: true,
        });
      }
    }
  }, [open, group, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      name: values.name,
      min_selections: values.min_selections,
      max_selections: values.max_selections,
      required: values.required,
      active: values.active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {group ? "Editar Grupo de Adicionais" : "Novo Grupo de Adicionais"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Adicionais, Extras, Molhos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_selections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Seleções mínimas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_selections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Seleções máximas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Obrigatório</FormLabel>
                    <FormDescription className="text-xs">
                      Cliente deve selecionar ao menos o mínimo
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription className="text-xs">
                      Exibir na loja pública
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {group ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
