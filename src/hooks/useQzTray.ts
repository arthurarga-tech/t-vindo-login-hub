import { useState, useCallback, useEffect } from "react";
import * as qzService from "@/lib/qzTrayService";

const PRINTER_STORAGE_KEY = "qz_selected_printer";

export function useQzTray() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinterState] = useState<string>(
    () => localStorage.getItem(PRINTER_STORAGE_KEY) || ""
  );
  const [error, setError] = useState<string | null>(null);

  const setSelectedPrinter = useCallback((printer: string) => {
    setSelectedPrinterState(printer);
    localStorage.setItem(PRINTER_STORAGE_KEY, printer);
  }, []);

  const connectQz = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await qzService.connect();
      setIsConnected(true);
      const found = await qzService.getPrinters();
      setPrinters(found);
      // Auto-select stored printer if still available
      const stored = localStorage.getItem(PRINTER_STORAGE_KEY);
      if (stored && found.includes(stored)) {
        setSelectedPrinterState(stored);
      } else if (found.length > 0) {
        setSelectedPrinter(found[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível conectar ao QZ Tray");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [setSelectedPrinter]);

  const disconnectQz = useCallback(async () => {
    try {
      await qzService.disconnect();
    } catch {
      // ignore
    }
    setIsConnected(false);
    setPrinters([]);
  }, []);

  const printHtml = useCallback(
    async (htmlContent: string) => {
      if (!selectedPrinter) throw new Error("Nenhuma impressora selecionada");
      await qzService.printHtml(selectedPrinter, htmlContent);
    },
    [selectedPrinter]
  );

  // Check connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const active = qzService.isConnected();
      setIsConnected(active);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isConnecting,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    error,
    connectQz,
    disconnectQz,
    printHtml,
  };
}
