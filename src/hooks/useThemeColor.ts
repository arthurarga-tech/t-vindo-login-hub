import { useEffect } from "react";

/**
 * Hook to dynamically update the browser's theme-color meta tag
 * This affects the browser's address bar color on mobile devices
 */
export function useThemeColor(color: string | null | undefined) {
  useEffect(() => {
    const themeColor = color || "#ea580c"; // fallback to default orange
    
    // Find or create the theme-color meta tag
    let metaTag = document.querySelector('meta[name="theme-color"]');
    
    if (metaTag) {
      metaTag.setAttribute("content", themeColor);
    } else {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "theme-color");
      metaTag.setAttribute("content", themeColor);
      document.head.appendChild(metaTag);
    }

    // Cleanup: restore default color when unmounting
    return () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", "#ea580c");
      }
    };
  }, [color]);
}
