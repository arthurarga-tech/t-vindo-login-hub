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
  isPrinterAvailable: (printerName: string) => boolean;
}

const QZTrayContext = createContext<QZTrayContextState | null>(null);

/* =======================
   QZ MODULE SINGLETON
======================= */
let qzModule: any = null;
let moduleLoaded = false;

const getQZ = async () => {
  if (moduleLoaded && qzModule) return qzModule;

  const module = await import("qz-tray");
  qzModule = module.default;
  moduleLoaded = true;

  console.log("[QZContext] Module loaded successfully");
  return qzModule;
};

/* =======================
   SECURITY (UNSIGNED MODE)
======================= */
let securityConfigured = false;

const configureSecurityOnce = (qz: any): void => {
  if (securityConfigured) return;

  qz.security.setCertificatePromise(() => Promise.resolve(null));
  qz.security.setSignaturePromise(() => Promise.resolve(null));

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

  useEffect(() => {
    setSavedPrinter(savedPrinterName);
  }, [savedPrinterName]);

  useEffect(() => {
    const syncState = async () => {
      try {
        const qz = await getQZ();
        configureSecurityOnce(qz);

        if (qz.websocket.isActive()) {
          setConnectionState("connected");
          const list = await qz.printers.find();
          setPrinters(Array.isArray(list) ? list : [list]);
        }
      } catch {}
    };

    syncState();
  }, []);

  useEffect(() => {
    if (enabled && connectionState === "idle" && !hasAutoConnected.current) {
      hasAutoConnected.current = true;
      connect();
    }

    if (!enabled) {
      hasAutoConnected.current = false;
    }
  }, [enabled, connectionState]);

  const connect = useCallback(async () => {
    if (isOperating.current) {
      return { success: false, printers: [] };
    }

    try {
      isOperating.current = true;
      const qz = await getQZ();
      configureSecurityOnce(qz);

      if (!qz.websocket.isActive()) {
        setConnectionState("connecting");
        await qz.websocket.connect();
      }

      const list = await qz.printers.find();
      const printersList = Array.isArray(list) ? list : [list];

      setPrinters(printersList);
      setConnectionState("connected");
      setError(null);

      return { success: true, printers: printersList };
    } catch (err: any) {
      setConnectionState("error");
      setError(err?.message || "Erro ao conectar ao QZ Tray");
      return { success: false, printers: [] };
    } finally {
      isOperating.current = false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const qz = await getQZ();
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } finally {
      setConnectionState("idle");
      setPrinters([]);
      setError(null);
    }
  }, []);

  const getPrinters = useCallback(async () => {
    try {
      const qz = await getQZ();
      if (!qz.websocket.isActive()) return [];

      const list = await qz.printers.find();
      const printersList = Array.isArray(list) ? list : [list];
      setPrinters(printersList);
      return printersList;
    } catch {
      return [];
    }
  }, []);

  const printHtml = useCallback(
    async (htmlContent: string, printerName: string) => {
      try {
        const qz = await getQZ();

        if (!qz.websocket.isActive()) {
          const result = await connect();
          if (!result.success) return false;
        }

        const config = qz.configs.create(printerName, {
          units: "mm",
          size: { width: 58, height: null },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          rasterize: true,
        });

        await qz.print(config, [{ type: "html", format: "plain", data: htmlContent }]);

        return true;
      } catch {
        return false;
      }
    },
    [connect],
  );

  const value: QZTrayContextState = {
    connectionState,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
    printers,
    error,
    savedPrinter,
    connect,
    disconnect,
    getPrinters,
    printHtml,
    setSavedPrinter,
    isPrinterAvailable: (name) => printers.includes(name),
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
