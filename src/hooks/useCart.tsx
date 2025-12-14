import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { PublicProduct } from "@/hooks/usePublicStore";

export interface CartAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  product: PublicProduct;
  quantity: number;
  selectedAddons?: CartAddon[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: PublicProduct, selectedAddons?: CartAddon[], quantity?: number) => void;
  removeItem: (productId: string, itemIndex: number) => void;
  updateQuantity: (itemIndex: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "tavindo-cart";

export function CartProvider({ children, establishmentSlug }: { children: ReactNode; establishmentSlug: string }) {
  const storageKey = `${CART_STORAGE_KEY}-${establishmentSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [items, storageKey]);

  const addItem = (product: PublicProduct, selectedAddons?: CartAddon[], quantity: number = 1) => {
    setItems((prev) => {
      // Each item with addons is treated as unique
      return [...prev, { product, quantity, selectedAddons }];
    });
  };

  const removeItem = (productId: string, itemIndex: number) => {
    setItems((prev) => prev.filter((_, index) => index !== itemIndex));
  };

  const updateQuantity = (itemIndex: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((_, index) => index !== itemIndex));
      return;
    }
    setItems((prev) =>
      prev.map((item, index) =>
        index === itemIndex ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const addonsTotal = item.selectedAddons?.reduce((a, addon) => a + addon.price * addon.quantity, 0) ?? 0;
    return sum + (item.product.price + addonsTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
