import { useState, useCallback, useEffect, useRef } from "react";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface QZTrayState {
  connectionState: ConnectionState;
  printers: string[];
  error: string | null;
}

interface ConnectResult {
  success: boolean;
  printers: string[];
}

// Global qz instance - singleton pattern
let qzModule: any = null;
let moduleLoaded = false;

// Load QZ Tray module once
const getQZ = async () => {
  if (moduleLoaded && qzModule) return qzModule;
  
  try {
    const module = await import("qz-tray");
    qzModule = module.default;
    moduleLoaded = true;
    console.log("[QZ] Module loaded successfully");
    return qzModule;
  } catch (err) {
    console.error("[QZ] Failed to load module:", err);
    throw new Error("Não foi possível carregar o módulo QZ Tray");
  }
};

// Configure security once - MUST be done before any connection attempt
let securityConfigured = false;
const configureSecurityOnce = (qz: any) => {
  if (securityConfigured) return;
  
  // QZ Tray v2.2.5 format for unsigned/demo mode
  // setCertificatePromise receives a callback with resolve/reject
  qz.security.setCertificatePromise(function(resolve: (cert: string) => void, reject: (err: Error) => void) {
    resolve(""); // Empty string for unsigned mode
  });
  
  // setSignaturePromise receives hash to sign and returns a callback with resolve/reject  
  qz.security.setSignaturePromise(function(toSign: string) {
    return function(resolve: (sig: string) => void, reject: (err: Error) => void) {
      resolve(""); // Empty string for unsigned mode
    };
  });
  
  securityConfigured = true;
  console.log("[QZ] Security configured for unsigned mode");
};

export function useQZTray() {
  const [state, setState] = useState<QZTrayState>({
    connectionState: "idle",
    printers: [],
    error: null,
  });
  
  const isOperating = useRef(false);

  // Sync state with actual WebSocket status on mount
  useEffect(() => {
    const syncState = async () => {
      try {
        const qz = await getQZ();
        configureSecurityOnce(qz);
        
        if (qz.websocket.isActive()) {
          console.log("[QZ] Already connected on mount, fetching printers...");
          setState(prev => ({ ...prev, connectionState: "connected", error: null }));
          
          // Fetch printers since we're already connected
          try {
            const printerList = await qz.printers.find();
            const printers = Array.isArray(printerList) 
              ? printerList.filter((p: any) => p && typeof p === 'string') 
              : [printerList].filter(Boolean);
            console.log("[QZ] Lista de impressoras:", printers);
            setState(prev => ({ ...prev, printers }));
          } catch (err) {
            console.error("[QZ] Error fetching printers on mount:", err);
          }
        }
      } catch {
        // Module not loaded yet, ignore
      }
    };
    syncState();
  }, []);

  const connect = useCallback(async (): Promise<ConnectResult> => {
    // Prevent multiple simultaneous operations
    if (isOperating.current) {
      console.log("[QZ] Operation in progress, ignoring connect request");
      return { success: false, printers: [] };
    }

    try {
      isOperating.current = true;
      const qz = await getQZ();

      // Configure security BEFORE any connection attempt
      configureSecurityOnce(qz);

      // Already connected - just fetch printers and return
      if (qz.websocket.isActive()) {
        console.log("[QZ] Already connected, fetching printers...");
        setState(prev => ({ ...prev, connectionState: "connected", error: null }));
        
        const printerList = await qz.printers.find();
        const printers = Array.isArray(printerList) 
          ? printerList.filter((p: any) => p && typeof p === 'string') 
          : [printerList].filter(Boolean);
        console.log("[QZ] Lista de impressoras:", printers);
        setState(prev => ({ ...prev, printers }));
        
        isOperating.current = false;
        return { success: true, printers };
      }

      setState(prev => ({ ...prev, connectionState: "connecting", error: null }));
      console.log("[QZ] Starting connection...");

      // Connect WITHOUT any parameters - let QZ Tray choose the correct WebSocket endpoint
      // QZ Tray will automatically use:
      // - ws://localhost:8181 for HTTP
      // - wss://localhost:8282 for HTTPS
      console.log("[QZ] Calling qz.websocket.connect() without parameters...");
      
      const connectWithTimeout = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout: QZ Tray não respondeu em 15 segundos. Verifique se está instalado e rodando."));
        }, 15000);

        qz.websocket.connect()
          .then(() => {
            clearTimeout(timeout);
            console.log("[QZ] qz.websocket.connect() resolved");
            resolve();
          })
          .catch((err: any) => {
            clearTimeout(timeout);
            console.error("[QZ] qz.websocket.connect() rejected:", err);
            reject(err);
          });
      });

      await connectWithTimeout;

      // Verify connection is actually active
      const isActive = qz.websocket.isActive();
      console.log("[QZ] Connection check - isActive:", isActive);
      
      if (!isActive) {
        throw new Error("Conexão estabelecida mas WebSocket não está ativo");
      }

      console.log("[QZ] Connected successfully!");
      setState(prev => ({ ...prev, connectionState: "connected", error: null }));

      // Auto-load printers after successful connection
      console.log("[QZ] Loading printers...");
      const printerList = await qz.printers.find();
      const printers = Array.isArray(printerList) 
        ? printerList.filter((p: any) => p && typeof p === 'string') 
        : [printerList].filter(Boolean);
      console.log("[QZ] Lista de impressoras:", printers);
      setState(prev => ({ ...prev, printers }));
      
      isOperating.current = false;
      return { success: true, printers };

    } catch (err: any) {
      console.error("[QZ] Connection error:", err);
      
      let errorMessage = "Erro ao conectar ao QZ Tray.";
      
      if (err.message?.includes("Timeout")) {
        errorMessage = err.message;
      } else if (err.message?.includes("Unable to establish") || err.message?.includes("ECONNREFUSED")) {
        errorMessage = "QZ Tray não encontrado. Verifique se está instalado e rodando.";
      } else if (err.message?.includes("WebSocket") || err.message?.includes("Connection closed")) {
        errorMessage = "Erro de conexão. Verifique se o QZ Tray está rodando e tente novamente.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setState(prev => ({
        ...prev,
        connectionState: "error",
        printers: [],
        error: errorMessage,
      }));
      
      isOperating.current = false;
      return { success: false, printers: [] };
    }
  }, []);

  const disconnect = useCallback(async () => {
    // Prevent multiple simultaneous operations
    if (isOperating.current) {
      console.log("[QZ] Operation in progress, ignoring disconnect request");
      return;
    }

    try {
      isOperating.current = true;
      const qz = await getQZ();

      // Check if actually connected
      if (!qz.websocket.isActive()) {
        console.log("[QZ] Already disconnected");
        setState(prev => ({
          ...prev,
          connectionState: "idle",
          printers: [],
          error: null,
        }));
        isOperating.current = false;
        return;
      }

      console.log("[QZ] Disconnecting...");
      await qz.websocket.disconnect();
      console.log("[QZ] Disconnected successfully");
      
      setState(prev => ({
        ...prev,
        connectionState: "idle",
        printers: [],
        error: null,
      }));
    } catch (err: any) {
      console.error("[QZ] Disconnect error:", err);
      // Even if disconnect fails, reset state since we want to be disconnected
      setState(prev => ({
        ...prev,
        connectionState: "idle",
        printers: [],
        error: null,
      }));
    } finally {
      isOperating.current = false;
    }
  }, []);

  const getPrinters = useCallback(async (): Promise<string[]> => {
    try {
      const qz = await getQZ();
      
      if (!qz.websocket.isActive()) {
        setState(prev => ({ ...prev, error: "QZ Tray não está conectado" }));
        return [];
      }

      console.log("[QZ] Fetching printers...");
      const printerList = await qz.printers.find();
      const printers = Array.isArray(printerList) 
        ? printerList.filter((p: any) => p && typeof p === 'string') 
        : [printerList].filter(Boolean);
      console.log("[QZ] Lista de impressoras:", printers);
      setState(prev => ({ ...prev, printers, error: null }));
      return printers;
    } catch (err: any) {
      console.error("[QZ] Error getting printers:", err);
      setState(prev => ({
        ...prev,
        error: err.message || "Erro ao listar impressoras",
      }));
      return [];
    }
  }, []);

  const printHtml = useCallback(
    async (htmlContent: string, printerName: string): Promise<boolean> => {
      try {
        const qz = await getQZ();

        if (!qz.websocket.isActive()) {
          setState(prev => ({ ...prev, error: "QZ Tray não está conectado" }));
          return false;
        }

        if (!printerName) {
          setState(prev => ({ ...prev, error: "Nenhuma impressora selecionada" }));
          return false;
        }

        console.log("[QZ] Creating print config for:", printerName);
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

        console.log("[QZ] Sending print job...");
        await qz.print(config, data);
        console.log("[QZ] Print job sent successfully");
        setState(prev => ({ ...prev, error: null }));
        return true;
      } catch (err: any) {
        console.error("[QZ] Print error:", err);
        setState(prev => ({
          ...prev,
          error: err.message || "Erro ao imprimir",
        }));
        return false;
      }
    },
    []
  );

  // Do NOT disconnect on unmount - keep connection persistent between pages
  // The connection should be managed explicitly by the user

  // Computed values for backward compatibility
  const isConnected = state.connectionState === "connected";
  const isConnecting = state.connectionState === "connecting";

  return {
    connectionState: state.connectionState,
    isConnected,
    isConnecting,
    printers: state.printers,
    error: state.error,
    connect,
    disconnect,
    getPrinters,
    printHtml,
  };
}
