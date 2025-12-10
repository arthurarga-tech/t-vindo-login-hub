import { UtensilsCrossed, Pizza, Coffee, ShoppingBag, ShoppingCart, Zap, Timer, Truck } from "lucide-react";

const FoodPatternBackground = () => {
  const icons = [
    { Icon: UtensilsCrossed, x: "5%", y: "10%", rotate: 15, size: 56 },
    { Icon: Pizza, x: "15%", y: "70%", rotate: -10, size: 64 },
    { Icon: Coffee, x: "85%", y: "15%", rotate: 20, size: 52 },
    { Icon: ShoppingBag, x: "90%", y: "75%", rotate: -15, size: 60 },
    { Icon: ShoppingCart, x: "25%", y: "25%", rotate: 5, size: 48 },
    { Icon: Zap, x: "75%", y: "35%", rotate: -5, size: 44 },
    { Icon: Timer, x: "10%", y: "45%", rotate: 10, size: 52 },
    { Icon: Truck, x: "80%", y: "55%", rotate: -20, size: 56 },
    { Icon: Pizza, x: "45%", y: "8%", rotate: 25, size: 48 },
    { Icon: Coffee, x: "55%", y: "85%", rotate: -8, size: 56 },
    { Icon: Zap, x: "30%", y: "80%", rotate: 12, size: 40 },
    { Icon: ShoppingBag, x: "70%", y: "90%", rotate: -12, size: 52 },
    { Icon: Timer, x: "92%", y: "40%", rotate: 8, size: 48 },
    { Icon: UtensilsCrossed, x: "3%", y: "85%", rotate: -25, size: 60 },
    { Icon: Truck, x: "50%", y: "5%", rotate: 0, size: 46 },
    { Icon: ShoppingCart, x: "60%", y: "65%", rotate: 15, size: 42 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, index) => (
        <div
          key={index}
          className="absolute text-primary/[0.12]"
          style={{
            left: item.x,
            top: item.y,
            transform: `rotate(${item.rotate}deg)`,
          }}
        >
          <item.Icon size={item.size} strokeWidth={1.5} />
        </div>
      ))}
      
      {/* Geometric shapes */}
      <div className="absolute top-[20%] left-[40%] w-24 h-24 border border-primary/[0.10] rounded-full" />
      <div className="absolute top-[60%] left-[20%] w-20 h-20 border border-primary/[0.10] rotate-45" />
      <div className="absolute top-[30%] right-[15%] w-28 h-28 border border-primary/[0.10] rounded-2xl rotate-12" />
      <div className="absolute bottom-[25%] right-[30%] w-16 h-16 border border-primary/[0.10] rounded-full" />
      <div className="absolute top-[75%] left-[60%] w-22 h-22 border border-primary/[0.10] rotate-[-20deg]" />
    </div>
  );
};

export default FoodPatternBackground;
