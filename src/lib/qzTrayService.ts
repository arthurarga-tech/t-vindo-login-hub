import qz from "qz-tray";

let connected = false;

/**
 * QZ Tray Service - manages connection and printing via QZ Tray
 * Initially works as "Untrusted" (user clicks Allow + Remember).
 * Certificate/signature can be configured later for silent trust.
 */

// Setup certificate and signature (initially returns null = untrusted)
export function setupSecurity(certificate?: string, privateKey?: string) {
  qz.security.setCertificatePromise((resolve) => {
    resolve(certificate || null);
  });

  qz.security.setSignatureAlgorithm("SHA512");

  qz.security.setSignaturePromise(() => (resolve, reject) => {
    if (privateKey) {
      // Future: implement signing with privateKey via SubtleCrypto or backend
      reject(new Error("Client-side signing not yet implemented"));
    } else {
      // Untrusted mode - QZ Tray will show "Allow" popup
      resolve(null);
    }
  });
}

export async function connect(): Promise<void> {
  if (qz.websocket.isActive()) {
    connected = true;
    return;
  }

  setupSecurity();

  try {
    await qz.websocket.connect();
    connected = true;
  } catch (err: any) {
    connected = false;
    // If already connected, that's fine
    if (err?.message?.includes("An open connection")) {
      connected = true;
      return;
    }
    throw err;
  }
}

export async function disconnect(): Promise<void> {
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
  connected = false;
}

export function isConnected(): boolean {
  return qz.websocket.isActive();
}

export async function getPrinters(): Promise<string[]> {
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray não está conectado");
  }
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

export async function printHtml(
  printerName: string,
  htmlContent: string
): Promise<void> {
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray não está conectado");
  }

  const config = qz.configs.create(printerName, {
    size: { width: 58, height: null },
    units: "mm",
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    scaleContent: true,
  });

  const data = [
    {
      type: "html",
      format: "plain",
      data: htmlContent,
    },
  ];

  await qz.print(config, data);
}

export default {
  connect,
  disconnect,
  isConnected,
  getPrinters,
  printHtml,
  setupSecurity,
};
