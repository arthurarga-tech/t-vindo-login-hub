import { useQZTrayContext } from "../contexts/QZTrayContext";

export const useQZTray = () => {
  const { isConnected, printers, print } = useQZTrayContext();

  const printText = async (printer: string, text: string) => {
    await print(printer, [text]);
  };

  return {
    isConnected,
    printers,
    printText,
  };
};
