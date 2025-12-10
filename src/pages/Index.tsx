import tavindoLogo from "@/assets/tavindo-logo.png";
import FoodPatternBackground from "@/components/login/FoodPatternBackground";
import LoginCard from "@/components/login/LoginCard";
import LoginFooter from "@/components/login/LoginFooter";

const Index = () => {
  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      <FoodPatternBackground />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 relative z-10">
        {/* Logo */}
        <div className="mb-6">
          <img
            src={tavindoLogo}
            alt="TáVindo - Sistema de Delivery"
            className="h-24 md:h-32 w-auto object-contain"
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
