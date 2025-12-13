import { Store } from "lucide-react";
import { CartDrawer } from "./CartDrawer";

interface StoreHeaderProps {
  establishmentName: string;
}

export function StoreHeader({ establishmentName }: StoreHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground py-4 shadow-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-7 w-7" />
            <h1 className="text-xl font-bold">{establishmentName}</h1>
          </div>
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
