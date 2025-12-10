import tavindoLogo from "@/assets/tavindo-logo.png";
import FoodPatternBackground from "@/components/login/FoodPatternBackground";
import LoginCard from "@/components/login/LoginCard";
import LoginFooter from "@/components/login/LoginFooter";

const Index = () => {
  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      <FoodPatternBackground />
      
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 lg:px-24 py-4 relative z-10 gap-8 md:gap-16 lg:gap-24">
        {/* Logo - Left side */}
        <div className="flex-1 flex items-center justify-center md:justify-end">
          <img
            src={tavindoLogo}
            alt="TáVindo - Sistema de Delivery"
            className="h-28 md:h-40 lg:h-48 w-auto object-contain"
          />
        </div>

        {/* Login Card - Right side */}
        <div className="flex-1 flex items-center justify-center md:justify-start">
          <LoginCard />
        </div>
      </main>

      <LoginFooter />
    </div>
  );
};

export default Index;
