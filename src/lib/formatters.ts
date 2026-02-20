/**
 * Utility functions for formatting values
 * Centralized to avoid duplication across components
 */

/**
 * Convert hex color to HSL format for CSS variables
 * @param hex - Hex color string (e.g., "#ea580c" or "ea580c")
 * @returns HSL values as string (e.g., "24 95% 47%")
 */
export function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Format a number as Brazilian currency (BRL)
 * @param price - The price value to format
 * @returns Formatted currency string (e.g., "R$ 29,90")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

/**
 * Format phone number with Brazilian mask
 * @param value - Phone number string (with or without formatting)
 * @returns Formatted phone string (e.g., "(11) 99999-9999")
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Extract only digits from a phone number
 * @param value - Phone number string (with or without formatting)
 * @returns Only digits (max 11 characters)
 */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Build a complete theme style object with all CSS variables needed
 * for consistent theming across the dashboard and public store.
 *
 * By overriding --primary and --ring (in addition to --store-primary),
 * all Radix UI components (RadioGroup, Checkbox, Switch, etc.) and
 * Tailwind utility classes automatically inherit the establishment color.
 *
 * @param primaryColor - Hex color string for the primary/brand color
 * @param secondaryColor - Hex color string for the secondary color
 * @returns React.CSSProperties object with all CSS custom properties set
 */
export function buildThemeStyles(
  primaryColor?: string | null,
  secondaryColor?: string | null,
): React.CSSProperties & Record<string, string> {
  const primary = primaryColor || "#ea580c";
  const secondary = secondaryColor || "#1e293b";

  const primaryHSL = hexToHSL(primary);
  const secondaryHSL = hexToHSL(secondary);

  return {
    // Unified --primary: used by Tailwind bg-primary, text-primary AND all Radix UI components
    "--primary": primaryHSL,
    // Ring for focus states on inputs / interactive elements
    "--ring": primaryHSL,
    // Secondary for accents and sidebar
    "--secondary": secondaryHSL,
    "--sidebar-primary": primaryHSL,
    "--sidebar-accent": secondaryHSL,
    // Legacy store-specific vars kept for backwards compatibility
    "--store-primary": primaryHSL,
    "--store-secondary": secondaryHSL,
  };
}
