import { useEffect } from "react";
import qz from "qz-tray";

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
  const qzTrayEnabled = Boolean(user && establishment && (establishment as any)?.qz_tray_enabled === true);

  const savedPrinter = (establishment as any)?.qz_tray_printer || null;

  useEffect(() => {
    if (!qzTrayEnabled) return;

    const SIGN_URL = "https://singnature-qztray.onrender.com/sign";

    // Certificate (trust)
    qz.security.setCertificatePromise(() =>
      fetch(SIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then((res) => res.json())
        .then((data) => data.certificate),
    );

    // Signature (authorization)
    qz.security.setSignaturePromise((toSign) =>
      fetch(SIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSign),
      })
        .then((res) => res.json())
        .then((data) => data.signature),
    );
  }, [qzTrayEnabled]);

  console.log("[QZTrayWrapper] Provider state:", {
    hasUser: !!user,
    hasEstablishment: !!establishment,
    qzTrayEnabled,
    savedPrinter,
  });

  return (
    <QZTrayProvider enabled={qzTrayEnabled} savedPrinterName={savedPrinter}>
      {children}
    </QZTrayProvider>
  );
}
