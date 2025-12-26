import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { useEffect, useRef, useCallback } from "react";
import { getNowInSaoPaulo } from "@/lib/dateUtils";

export type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "preparing" 
  | "ready" 
  | "out_for_delivery" 
  | "delivered" 
  | "ready_for_pickup" 
  | "picked_up" 
  | "ready_to_serve" 
  | "served" 
  | "cancelled";

export type OrderType = "delivery" | "pickup" | "dine_in";

export interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  addons?: {
    id: string;
    addon_name: string;
    addon_price: number;
    quantity: number;
  }[];
}

export interface Order {
  id: string;
  order_number: number;
  status: OrderStatus;
  order_type: OrderType;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    city: string | null;
  };
  items: OrderItem[];
}

export const orderTypeLabels: Record<OrderType, { label: string; icon: string }> = {
  delivery: { label: "Entrega", icon: "🚚" },
  pickup: { label: "Retirada", icon: "📦" },
  dine_in: { label: "No Local", icon: "🍽️" },
};

export const statusFlowByOrderType: Record<OrderType, OrderStatus[]> = {
  delivery: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  pickup: ["pending", "confirmed", "preparing", "ready_for_pickup", "picked_up"],
  dine_in: ["pending", "confirmed", "preparing", "ready_to_serve", "served"],
};

export function getStatusFlow(orderType: OrderType): OrderStatus[] {
  return statusFlowByOrderType[orderType] || statusFlowByOrderType.delivery;
}

// Hook for playing notification sound
function useOrderNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Create pleasant notification chime
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      // Play a pleasant 3-note chime
      playNote(523, now, 0.15);        // C5
      playNote(659, now + 0.12, 0.15); // E5
      playNote(784, now + 0.24, 0.2);  // G5

    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  return playSound;
}

export function useOrders() {
  const { data: establishment } = useEstablishment();
  const queryClient = useQueryClient();
  const playNotificationSound = useOrderNotificationSound();
  const previousOrderCountRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);

  const query = useQuery({
    queryKey: ["orders", establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          items:order_items(
            *,
            addons:order_item_addons(*)
          )
        `)
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!establishment?.id,
  });

  // Set up realtime subscription with notification sound
  useEffect(() => {
    if (!establishment?.id) return;

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        (payload) => {
          console.log("New order received:", payload);
          // Check if notification sound is enabled
          const isSoundEnabled = (establishment as any).notification_sound_enabled !== false;
          if (isSoundEnabled) {
            playNotificationSound();
          }
          queryClient.invalidateQueries({ queryKey: ["orders", establishment.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders", establishment.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment?.id, queryClient, playNotificationSound, establishment]);

  return query;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status, updated_at: getNowInSaoPaulo().toISOString() })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Add to status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({ order_id: orderId, status });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
    },
  });
}
