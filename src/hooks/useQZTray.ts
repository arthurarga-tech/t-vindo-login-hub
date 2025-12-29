import { useState, useCallback, useRef, useEffect } from "react";
import qz from "qz-tray";

interface QZTrayState {
  isConnected: boolean;
  isConnecting: boolean;
  printers: string[];
  error: string | null;
}

export function useQZTray() {
  const [state, setState] = useState<QZTrayState>({
    isConnected: false,
    isConnecting: false,
    printers: [],
    error: null,
  });
  
  const connectionAttempted = useRef(false);

  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Check if already connected
      if (qz.websocket.isActive()) {
        setState((prev) => ({ ...prev, isConnected: true, isConnecting: false }));
        return;
      }

      // Configure certificate (for unsigned usage - shows warning on first use)
      qz.security.setCertificatePromise(() => {
        return Promise.resolve(""); // Empty for unsigned
      });

      qz.security.setSignaturePromise(() => {
        return (hash: string) => Promise.resolve(""); // Empty for unsigned
      });

      // Connect to QZ Tray
      await qz.websocket.connect();

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
    } catch (err: any) {
      console.error("QZ Tray connection error:", err);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: err.message || "Erro ao conectar ao QZ Tray. Verifique se está instalado e rodando.",
      }));
    }
  }, [state.isConnected, state.isConnecting]);

  const disconnect = useCallback(async () => {
    if (!state.isConnected) return;

    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
      setState((prev) => ({
        ...prev,
        isConnected: false,
        printers: [],
      }));
    } catch (err: any) {
      console.error("QZ Tray disconnect error:", err);
    }
  }, [state.isConnected]);

  const getPrinters = useCallback(async (): Promise<string[]> => {
    if (!state.isConnected) {
      setState((prev) => ({ ...prev, error: "QZ Tray não está conectado" }));
      return [];
    }

    try {
      const printerList = await qz.printers.find();
      const printers = Array.isArray(printerList) ? printerList : [printerList];
      setState((prev) => ({ ...prev, printers, error: null }));
      return printers;
    } catch (err: any) {
      console.error("Error getting printers:", err);
      setState((prev) => ({
        ...prev,
        error: err.message || "Erro ao listar impressoras",
      }));
      return [];
    }
  }, [state.isConnected]);

  const printHtml = useCallback(
    async (htmlContent: string, printerName: string): Promise<boolean> => {
      if (!state.isConnected) {
        setState((prev) => ({ ...prev, error: "QZ Tray não está conectado" }));
        return false;
      }

      if (!printerName) {
        setState((prev) => ({ ...prev, error: "Nenhuma impressora selecionada" }));
        return false;
      }

      try {
        const config = qz.configs.create(printerName, {
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          size: { width: 58, height: null }, // 58mm width, auto height
          units: "mm",
          scaleContent: true,
          rasterize: true,
        });

        const data = [
          {
            type: "html",
            format: "plain",
            data: htmlContent,
          },
        ];

        await qz.print(config, data);
        setState((prev) => ({ ...prev, error: null }));
        return true;
      } catch (err: any) {
        console.error("QZ Tray print error:", err);
        setState((prev) => ({
          ...prev,
          error: err.message || "Erro ao imprimir",
        }));
        return false;
      }
    },
    [state.isConnected]
  );

  // Auto-connect on mount if QZ Tray is available
  useEffect(() => {
    if (!connectionAttempted.current) {
      connectionAttempted.current = true;
      // Try to connect silently on first load
      connect().catch(() => {
        // Silently fail - user can manually connect
      });
    }
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qz.websocket.isActive()) {
        qz.websocket.disconnect().catch(() => {});
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    getPrinters,
    printHtml,
  };
}
