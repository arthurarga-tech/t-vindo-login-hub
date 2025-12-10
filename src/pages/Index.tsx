import tavindoLogo from "@/assets/tavindo-logo.png";
import FoodPatternBackground from "@/components/login/FoodPatternBackground";
import LoginCard from "@/components/login/LoginCard";
import LoginFooter from "@/components/login/LoginFooter";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <FoodPatternBackground />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        {/* Logo */}
        <div className="mb-4">
          <img
            src={tavindoLogo}
            alt="TáVindo - Sistema de Delivery"
            className="h-28 md:h-40 w-auto object-contain"
          />
        </div>

        {/* Login Card */}
        <LoginCard />
      </main>

      <LoginFooter />
    </div>
  );
};

export default Index;
