import tavindoLogo from "@/assets/tavindodelivery.png";
import FoodPatternBackground from "@/components/login/FoodPatternBackground";
import LoginCard from "@/components/login/LoginCard";
import LoginFooter from "@/components/login/LoginFooter";

const Index = () => {
  return (
    <div 
      className="h-screen flex flex-col bg-primary relative overflow-hidden"
      data-testid="login-page"
      role="main"
      aria-label="Página de login"
    >
      <FoodPatternBackground />
      
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 lg:px-24 py-4 relative z-10 gap-8 md:gap-16 lg:gap-24">
        {/* Logo - Left side */}
        <div className="flex-1 flex items-center justify-center md:justify-end">
          <div className="bg-[#ea580c] rounded-2xl p-6 md:p-8 lg:p-10 shadow-lg">
            <img
              src={tavindoLogo}
              alt="TáVindo - Sistema de Delivery"
              className="h-20 md:h-32 lg:h-40 w-auto object-contain"
              data-testid="login-logo"
            />
          </div>
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
