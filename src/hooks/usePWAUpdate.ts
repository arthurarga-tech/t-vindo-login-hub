import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Check for updates every 60 seconds
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast("Nova versão disponível!", {
        description: "Clique para atualizar o app",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);
}
