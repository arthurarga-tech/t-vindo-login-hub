import { useQZTrayContext } from "../contexts/QZTrayContext";

export const useQZTray = () => {
  const { isConnected, printers, printHtml } = useQZTrayContext();

  const printText = async (printer: string, text: string) => {
    await printHtml(printer, text);
  };

  return {
    isConnected,
    printers,
    printText,
  };
};
