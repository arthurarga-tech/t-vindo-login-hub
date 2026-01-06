import { useQZTrayContext } from "../contexts/QZTrayContext";

export const useQZTray = () => {
  const { isConnected, printers, printHtml } = useQZTrayContext();

  const printText = async (printer: string, text: string) => {
    // Convert text to HTML for printing
    const htmlContent = `<pre style="font-family: 'Courier New', monospace; white-space: pre-wrap;">${text}</pre>`;
    await printHtml(htmlContent, printer);
  };

  return {
    isConnected,
    printers,
    printText,
  };
};
