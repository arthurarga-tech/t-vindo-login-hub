import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * iOS-safe clipboard copy with legacy fallback.
 * navigator.clipboard may fail on older iOS or non-HTTPS contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}

/**
 * iOS-safe WhatsApp open. Uses window.location.href as fallback
 * since window.open is blocked after async operations on iOS Safari.
 */
export function openWhatsAppSafe(url: string): void {
  // Try window.open first (works on desktop and Android)
  const win = window.open(url, "_blank");
  if (!win) {
    // Fallback for iOS: navigate in same tab
    window.location.href = url;
  }
}
