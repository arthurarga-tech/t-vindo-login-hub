import { useState, useRef } from "react";
import { Upload, X, Loader2, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEstablishment } from "@/hooks/useEstablishment";
import { ImageCropModal } from "./ImageCropModal";

// Allowed image types and their extensions
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  folder?: string;
  maxSize?: number; // in bytes, defaults to 5MB
  aspectRatio?: number; // aspect ratio for cropping (e.g., 1 for square, 16/9 for banner)
  enableCrop?: boolean; // whether to show crop modal
}

export function ImageUpload({ 
  value, 
  onChange, 
  folder = "products",
  maxSize = MAX_FILE_SIZE,
  aspectRatio = 1,
  enableCrop = true,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Store the file name for later use
    setSelectedFileName(file.name);

    if (enableCrop) {
      // Read file and show crop modal
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageSrc(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Upload directly without cropping
      uploadFile(file);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const uploadFile = async (fileOrBlob: File | Blob) => {
    if (!establishment?.id) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = selectedFileName?.split(".").pop() || "jpg";
      // SECURITY: Use establishment_id as folder prefix for ownership validation via RLS
      const fileName = `${establishment.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, fileOrBlob);

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
      setSelectedFileName(null);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setSelectedImageSrc(null);
    await uploadFile(croppedBlob);
  };

  const handleCropModalClose = () => {
    setCropModalOpen(false);
    setSelectedImageSrc(null);
    setSelectedFileName(null);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="space-y-2" data-testid="image-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="image-upload-input"
        aria-label="Selecionar imagem"
      />

      {value ? (
        <div className="space-y-2">
          <div 
            className="relative w-32 h-32 rounded-lg overflow-hidden border border-border"
            data-testid="image-upload-preview"
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              data-testid="image-upload-preview-image"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={handleRemove}
              data-testid="image-upload-remove-button"
              aria-label="Remover imagem"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-32"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            data-testid="image-upload-change-button"
            aria-label="Trocar imagem"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
            ) : enableCrop ? (
              <Crop className="h-4 w-4 mr-1" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4 mr-1" aria-hidden="true" />
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
          data-testid="image-upload-add-button"
          aria-label="Adicionar imagem"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <>
              {enableCrop ? <Crop className="h-6 w-6" aria-hidden="true" /> : <Upload className="h-6 w-6" aria-hidden="true" />}
              <span className="text-xs">Adicionar foto</span>
            </>
          )}
        </Button>
      )}

      {/* Crop Modal */}
      {selectedImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          onClose={handleCropModalClose}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={aspectRatio}
          title="Recortar Imagem"
        />
      )}
    </div>
  );
}
