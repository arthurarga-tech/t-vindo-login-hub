import { useEstablishment } from "./useEstablishment";

export interface PrintSettings {
  printFontSize: number;
  printMarginLeft: number;
  printMarginRight: number;
  printFontBold: boolean;
  printLineHeight: number;
  printContrastHigh: boolean;
  printMode: string;
  isPrintOnOrder: boolean;
  isPrintOnConfirm: boolean;
  isRawbtOnOrder: boolean;
  isRawbtOnConfirm: boolean;
  printAddonPrices: boolean;
}

export function usePrintSettings(): PrintSettings {
  const { data: establishment } = useEstablishment();

  const printMode = establishment?.print_mode || "none";

  return {
    printFontSize: establishment?.print_font_size ?? 12,
    printMarginLeft: establishment?.print_margin_left ?? 0,
    printMarginRight: establishment?.print_margin_right ?? 0,
    printFontBold: establishment?.print_font_bold !== false,
    printLineHeight: establishment?.print_line_height ?? 1.4,
    printContrastHigh: establishment?.print_contrast_high === true,
    printMode,
    isPrintOnOrder: printMode === "browser_on_order",
    isPrintOnConfirm: printMode === "browser_on_confirm",
    isRawbtOnOrder: printMode === "rawbt_on_order",
    isRawbtOnConfirm: printMode === "rawbt_on_confirm",
    printAddonPrices: (establishment as any)?.print_addon_prices ?? true,
  };
}
