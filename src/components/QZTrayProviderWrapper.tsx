import { QZTrayProvider } from "@/contexts/QZTrayContext";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useAuth } from "@/hooks/useAuth";

interface QZTrayProviderWrapperProps {
  children: React.ReactNode;
}

export function QZTrayProviderWrapper({ children }: QZTrayProviderWrapperProps) {
  const { user } = useAuth();
  const { data: establishment } = useEstablishment();
  
  // Only enable QZ Tray for authenticated users with establishments
  const qzTrayEnabled = Boolean(
    user && 
    establishment && 
    (establishment as any)?.qz_tray_enabled === true
  );
  
  const savedPrinter = (establishment as any)?.qz_tray_printer || null;
  
  console.log("[QZTrayWrapper] Provider state:", { 
    hasUser: !!user, 
    hasEstablishment: !!establishment,
    qzTrayEnabled, 
    savedPrinter 
  });

  return (
    <QZTrayProvider 
      enabled={qzTrayEnabled} 
      savedPrinterName={savedPrinter}
    >
      {children}
    </QZTrayProvider>
  );
}
