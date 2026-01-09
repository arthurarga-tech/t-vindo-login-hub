import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEstablishment } from "@/hooks/useEstablishment";

// Allowed image types and their extensions
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  folder?: string;
  maxSize?: number; // in bytes, defaults to 5MB
}

export function ImageUpload({ 
  value, 
  onChange, 
  folder = "products",
  maxSize = MAX_FILE_SIZE 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: establishment } = useEstablishment();

  const validateFile = (file: File): string | null => {
    // Validate file type by MIME type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return "Formato não permitido. Use apenas JPG ou PNG.";
    }

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return "Extensão de arquivo inválida. Use apenas .jpg, .jpeg ou .png";
    }

    // Validate file size
    const maxSizeInMB = Math.round(maxSize / (1024 * 1024));
    if (file.size > maxSize) {
      return `A imagem deve ter no máximo ${maxSizeInMB}MB`;
    }

    return null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    if (!establishment?.id) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      // SECURITY: Use establishment_id as folder prefix for ownership validation via RLS
      const fileName = `${establishment.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      onChange(publicUrl.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={handleUpload}
        className="hidden"
      />

      {value ? (
        <div className="space-y-2">
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-32"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Trocar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-32 h-32 flex flex-col items-center justify-center gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-xs">Adicionar foto</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
