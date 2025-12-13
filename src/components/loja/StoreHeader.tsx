import { Store } from "lucide-react";

interface StoreHeaderProps {
  establishmentName: string;
}

export function StoreHeader({ establishmentName }: StoreHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground py-6 shadow-md">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-center gap-3">
          <Store className="h-8 w-8" />
          <h1 className="text-2xl font-bold">{establishmentName}</h1>
        </div>
      </div>
    </header>
  );
}
