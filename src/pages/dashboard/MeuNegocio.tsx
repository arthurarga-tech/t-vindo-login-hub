import { Building2, Link2, Check, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function MeuNegocio() {
  const { data: establishment, isLoading } = useEstablishment();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (establishment) {
      setSlug(establishment.slug || "");
      setName(establishment.name || "");
    }
  }, [establishment]);

  const formatSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(formatSlug(e.target.value));
  };

  const handleSave = async () => {
    if (!establishment?.id) return;

    if (!slug.trim()) {
      toast.error("O slug não pode estar vazio");
      return;
    }

    if (slug.length < 3) {
      toast.error("O slug deve ter pelo menos 3 caracteres");
      return;
    }

    setSaving(true);
    try {
      // Check if slug is already taken
      const { data: existing } = await supabase
        .from("establishments")
        .select("id")
        .eq("slug", slug)
        .neq("id", establishment.id)
        .maybeSingle();

      if (existing) {
        toast.error("Este slug já está em uso. Escolha outro.");
        return;
      }

      const { error } = await supabase
        .from("establishments")
        .update({ name, slug })
        .eq("id", establishment.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["establishment"] });
      toast.success("Informações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!slug) {
      toast.error("Configure o slug primeiro");
      return;
    }

    const storeUrl = `${window.location.origin}/loja/${slug}`;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const storeUrl = slug ? `${window.location.origin}/loja/${slug}` : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Meu Negócio</h1>
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
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Meu Negócio</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Informações do Estabelecimento</CardTitle>
          <CardDescription>Gerencie as informações do seu negócio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Estabelecimento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do seu estabelecimento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Link da Loja (slug)</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="slug"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="minha-loja"
                  className="lowercase"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Use apenas letras minúsculas, números e hífens. Este será o link da sua loja pública.
            </p>
          </div>

          {storeUrl && (
            <div className="space-y-2">
              <Label>Link da sua loja</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{storeUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
