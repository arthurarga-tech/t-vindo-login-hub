import { useState, useCallback, useRef, useEffect } from "react";

interface QZTrayState {
  isConnected: boolean;
  isConnecting: boolean;
  printers: string[];
  error: string | null;
}

// Global qz instance
let qz: any = null;

// Load QZ Tray dynamically
const loadQZ = async () => {
  if (qz) return qz;
  
  try {
    const module = await import("qz-tray");
    qz = module.default;
    return qz;
  } catch (err) {
    console.error("Failed to load qz-tray module:", err);
    throw new Error("Não foi possível carregar o módulo QZ Tray");
  }
};

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
      const qzInstance = await loadQZ();
      
      // Check if already connected
      if (qzInstance.websocket.isActive()) {
        console.log("QZ Tray already connected");
        setState((prev) => ({ ...prev, isConnected: true, isConnecting: false }));
        return;
      }

      console.log("Configuring QZ Tray security...");
      
      // Configure certificate (for unsigned usage - shows warning on first use)
      qzInstance.security.setCertificatePromise(() => {
        return Promise.resolve("");
      });

      qzInstance.security.setSignaturePromise(() => {
        return () => Promise.resolve("");
      });

      console.log("Attempting to connect to QZ Tray...");
      
      // Connect to QZ Tray with timeout
      const connectPromise = qzInstance.websocket.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: QZ Tray não respondeu. Verifique se está rodando.")), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);

      console.log("QZ Tray connected successfully!");
      
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
    } catch (err: any) {
      console.error("QZ Tray connection error:", err);
      
      let errorMessage = "Erro ao conectar ao QZ Tray.";
      
      if (err.message?.includes("Timeout")) {
        errorMessage = err.message;
      } else if (err.message?.includes("Unable to establish")) {
        errorMessage = "QZ Tray não encontrado. Verifique se está instalado e rodando.";
      } else if (err.message?.includes("WebSocket")) {
        errorMessage = "Erro de conexão WebSocket. Verifique se o QZ Tray está rodando.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [state.isConnected, state.isConnecting]);

  const disconnect = useCallback(async () => {
    if (!state.isConnected || !qz) return;

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
    if (!state.isConnected || !qz) {
      setState((prev) => ({ ...prev, error: "QZ Tray não está conectado" }));
      return [];
    }

    try {
      console.log("Fetching printers...");
      const printerList = await qz.printers.find();
      const printers = Array.isArray(printerList) ? printerList : [printerList];
      console.log("Found printers:", printers);
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
      if (!state.isConnected || !qz) {
        setState((prev) => ({ ...prev, error: "QZ Tray não está conectado" }));
        return false;
      }

      if (!printerName) {
        setState((prev) => ({ ...prev, error: "Nenhuma impressora selecionada" }));
        return false;
      }

      try {
        console.log("Creating print config for:", printerName);
        const config = qz.configs.create(printerName, {
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          size: { width: 58, height: null },
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

        console.log("Sending print job...");
        await qz.print(config, data);
        console.log("Print job sent successfully");
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qz && qz.websocket.isActive()) {
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
