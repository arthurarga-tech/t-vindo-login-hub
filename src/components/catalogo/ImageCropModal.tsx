import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw } from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for banner
  title?: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropModal({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
  title = "Recortar Imagem",
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
      const newCrop = centerAspectCrop(width, height, aspectRatio);
      setCrop(newCrop);
    },
    [aspectRatio]
  );

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate the scale between natural and displayed size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate cropped dimensions
    let cropWidth = completedCrop.width * scaleX;
    let cropHeight = completedCrop.height * scaleY;

    // Limit max dimension to 1200px for performance
    const maxDimension = 1200;
    if (cropWidth > maxDimension || cropHeight > maxDimension) {
      const scaleFactor = maxDimension / Math.max(cropWidth, cropHeight);
      cropWidth = Math.round(cropWidth * scaleFactor);
      cropHeight = Math.round(cropHeight * scaleFactor);
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Fill white background before drawing — prevents black pixels when
    // converting transparent PNG areas to JPEG (canvas default is transparent = black in JPEG)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    // Draw the cropped image with optional resizing
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.8 // Compress to 80% quality
      );
    });
  }, [completedCrop]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (imgRef.current) {
      const { naturalWidth: width, naturalHeight: height } = imgRef.current;
      const newCrop = centerAspectCrop(width, height, aspectRatio);
      setCrop(newCrop);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="max-h-[60vh] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Imagem para recortar"
                onLoad={onImageLoad}
                className="max-w-full max-h-[55vh] object-contain"
              />
            </ReactCrop>
          </div>

          <p className="text-sm text-muted-foreground">
            Arraste para ajustar a área de recorte
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isProcessing}
          >
            <RotateCw className="h-4 w-4 mr-1" />
            Resetar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !completedCrop}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
