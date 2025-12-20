import { useRef, useCallback } from "react";
import { toast } from "sonner";

export function useOrderNotification() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create AudioContext on first use (needs user interaction first in some browsers)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Create a pleasant notification sound using oscillators
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound - pleasant chime
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
      
      oscillator.type = "sine";
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.25);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Show toast notification
      toast.info("🔔 Novo pedido recebido!", {
        duration: 5000,
        position: "top-right",
      });

    } catch (error) {
      console.error("Error playing notification sound:", error);
      // Fallback to just toast
      toast.info("🔔 Novo pedido recebido!", {
        duration: 5000,
        position: "top-right",
      });
    }
  }, []);

  return { playNotificationSound };
}
