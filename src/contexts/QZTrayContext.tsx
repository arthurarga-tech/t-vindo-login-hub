import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface QZTrayContextState {
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  printers: string[];
  error: string | null;
  savedPrinter: string | null;
  connect: () => Promise<{ success: boolean; printers: string[] }>;
  disconnect: () => Promise<void>;
  getPrinters: () => Promise<string[]>;
  printHtml: (htmlContent: string, printerName: string) => Promise<boolean>;
  setSavedPrinter: (printer: string | null) => void;
}

const QZTrayContext = createContext<QZTrayContextState | null>(null);

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
    console.log("[QZContext] Module loaded successfully");
    return qzModule;
  } catch (err) {
    console.error("[QZContext] Failed to load module:", err);
    throw new Error("Não foi possível carregar o módulo QZ Tray");
  }
};

// Configure security once - MUST be done before any connection attempt
let securityConfigured = false;
const configureSecurityOnce = (qz: any) => {
  if (securityConfigured) return;

  qz.security.setCertificatePromise(() => Promise.resolve(null));
  qz.security.setSignaturePromise(() => Promise.resolve(null));

  // QZ Tray v2.2.5 format for unsigned/demo mode
  // qz.security.setCertificatePromise(function(resolve: (cert: string) => void, reject: (err: Error) => void) {
  //   resolve(""); // Empty string for unsigned mode
  // });

  // qz.security.setSignaturePromise(function(toSign: string) {
  //   return function(resolve: (sig: string) => void, reject: (err: Error) => void) {
  //     resolve(""); // Empty string for unsigned mode
  //   };
  // });

  securityConfigured = true;
  console.log("[QZContext] Security configured for unsigned mode");
};

interface QZTrayProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  savedPrinterName?: string | null;
}

export function QZTrayProvider({ children, enabled = false, savedPrinterName = null }: QZTrayProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [printers, setPrinters] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedPrinter, setSavedPrinter] = useState<string | null>(savedPrinterName);

  const isOperating = useRef(false);
  const hasAutoConnected = useRef(false);

  // Update savedPrinter when prop changes
  useEffect(() => {
    setSavedPrinter(savedPrinterName);
  }, [savedPrinterName]);

  // Sync state with actual WebSocket status on mount
  useEffect(() => {
    const syncState = async () => {
      try {
        const qz = await getQZ();
        configureSecurityOnce(qz);

        if (qz.websocket.isActive()) {
          console.log("[QZContext] Already connected on mount, fetching printers...");
          setConnectionState("connected");
          setError(null);

          try {
            const printerList = await qz.printers.find();
            const foundPrinters = Array.isArray(printerList)
              ? printerList.filter((p: any) => p && typeof p === "string")
              : [printerList].filter(Boolean);
            console.log("[QZContext] Lista de impressoras:", foundPrinters);
            setPrinters(foundPrinters);
          } catch (err) {
            console.error("[QZContext] Error fetching printers on mount:", err);
          }
        }
      } catch {
        // Module not loaded yet, ignore
      }
    };
    syncState();
  }, []);

  // Auto-connect when enabled and not connected
  useEffect(() => {
    if (enabled && connectionState === "idle" && !hasAutoConnected.current) {
      hasAutoConnected.current = true;
      console.log("[QZContext] Auto-conectando porque enabled=true...");
      connect().then((result) => {
        if (result.success) {
          console.log("[QZContext] Auto-conexão bem-sucedida. Impressoras:", result.printers);
        } else {
          console.log("[QZContext] Auto-conexão falhou, resetando flag para tentar novamente");
          hasAutoConnected.current = false;
        }
      });
    }

    // Reset flag if disabled
    if (!enabled) {
      hasAutoConnected.current = false;
    }
  }, [enabled, connectionState]);

  const connect = useCallback(async (): Promise<{ success: boolean; printers: string[] }> => {
    if (isOperating.current) {
      console.log("[QZContext] Operation in progress, ignoring connect request");
      return { success: false, printers: [] };
    }

    try {
      isOperating.current = true;
      const qz = await getQZ();
      configureSecurityOnce(qz);

      // Already connected - just fetch printers and return
      if (qz.websocket.isActive()) {
        console.log("[QZContext] Already connected, fetching printers...");
        setConnectionState("connected");
        setError(null);

        const printerList = await qz.printers.find();
        const foundPrinters = Array.isArray(printerList)
          ? printerList.filter((p: any) => p && typeof p === "string")
          : [printerList].filter(Boolean);
        console.log("[QZContext] Lista de impressoras:", foundPrinters);
        setPrinters(foundPrinters);

        isOperating.current = false;
        return { success: true, printers: foundPrinters };
      }

      setConnectionState("connecting");
      setError(null);
      console.log("[QZContext] Starting connection...");

      const connectWithTimeout = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout: QZ Tray não respondeu em 15 segundos. Verifique se está instalado e rodando."));
        }, 15000);

        qz.websocket
          .connect()
          .then(() => {
            clearTimeout(timeout);
            console.log("[QZContext] qz.websocket.connect() resolved");
            resolve();
          })
          .catch((err: any) => {
            clearTimeout(timeout);
            console.error("[QZContext] qz.websocket.connect() rejected:", err);
            reject(err);
          });
      });

      await connectWithTimeout;

      const isActive = qz.websocket.isActive();
      console.log("[QZContext] Connection check - isActive:", isActive);

      if (!isActive) {
        throw new Error("Conexão estabelecida mas WebSocket não está ativo");
      }

      console.log("[QZContext] Connected successfully!");
      setConnectionState("connected");
      setError(null);

      console.log("[QZContext] Loading printers...");
      const printerList = await qz.printers.find();
      const foundPrinters = Array.isArray(printerList)
        ? printerList.filter((p: any) => p && typeof p === "string")
        : [printerList].filter(Boolean);
      console.log("[QZContext] Lista de impressoras:", foundPrinters);
      setPrinters(foundPrinters);

      isOperating.current = false;
      return { success: true, printers: foundPrinters };
    } catch (err: any) {
      console.error("[QZContext] Connection error:", err);

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

      setConnectionState("error");
      setPrinters([]);
      setError(errorMessage);

      isOperating.current = false;
      return { success: false, printers: [] };
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (isOperating.current) {
      console.log("[QZContext] Operation in progress, ignoring disconnect request");
      return;
    }

    try {
      isOperating.current = true;
      const qz = await getQZ();

      if (!qz.websocket.isActive()) {
        console.log("[QZContext] Already disconnected");
        setConnectionState("idle");
        setPrinters([]);
        setError(null);
        isOperating.current = false;
        return;
      }

      console.log("[QZContext] Disconnecting...");
      await qz.websocket.disconnect();
      console.log("[QZContext] Disconnected successfully");

      setConnectionState("idle");
      setPrinters([]);
      setError(null);
    } catch (err: any) {
      console.error("[QZContext] Disconnect error:", err);
      setConnectionState("idle");
      setPrinters([]);
      setError(null);
    } finally {
      isOperating.current = false;
    }
  }, []);

  const getPrinters = useCallback(async (): Promise<string[]> => {
    try {
      const qz = await getQZ();

      if (!qz.websocket.isActive()) {
        setError("QZ Tray não está conectado");
        return [];
      }

      console.log("[QZContext] Fetching printers...");
      const printerList = await qz.printers.find();
      const foundPrinters = Array.isArray(printerList)
        ? printerList.filter((p: any) => p && typeof p === "string")
        : [printerList].filter(Boolean);
      console.log("[QZContext] Lista de impressoras:", foundPrinters);
      setPrinters(foundPrinters);
      setError(null);
      return foundPrinters;
    } catch (err: any) {
      console.error("[QZContext] Error getting printers:", err);
      setError(err.message || "Erro ao listar impressoras");
      return [];
    }
  }, []);

  const printHtml = useCallback(
    async (htmlContent: string, printerName: string): Promise<boolean> => {
      try {
        const qz = await getQZ();

        if (!qz.websocket.isActive()) {
          // Try to reconnect before printing
          console.log("[QZContext] Not connected, attempting reconnect before print...");
          const result = await connect();
          if (!result.success) {
            setError("QZ Tray não está conectado");
            return false;
          }
        }

        if (!printerName) {
          setError("Nenhuma impressora selecionada");
          return false;
        }

        console.log("[QZContext] Creating print config for:", printerName);
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

        console.log("[QZContext] Sending print job...");
        await qz.print(config, data);
        console.log("[QZContext] Print job sent successfully");
        setError(null);
        return true;
      } catch (err: any) {
        console.error("[QZContext] Print error:", err);
        setError(err.message || "Erro ao imprimir");
        return false;
      }
    },
    [connect],
  );

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";

  const value: QZTrayContextState = {
    connectionState,
    isConnected,
    isConnecting,
    printers,
    error,
    savedPrinter,
    connect,
    disconnect,
    getPrinters,
    printHtml,
    setSavedPrinter,
  };

  return <QZTrayContext.Provider value={value}>{children}</QZTrayContext.Provider>;
}

export function useQZTrayContext() {
  const context = useContext(QZTrayContext);
  if (!context) {
    throw new Error("useQZTrayContext must be used within a QZTrayProvider");
  }
  return context;
}
