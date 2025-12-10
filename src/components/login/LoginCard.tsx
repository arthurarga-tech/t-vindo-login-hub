import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WhatsAppIcon from "./WhatsAppIcon";

const LoginCard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement authentication
    console.log("Login attempt with:", { email });
  };

  const handleWhatsAppLogin = () => {
    // TODO: Implement WhatsApp authentication
    console.log("WhatsApp login initiated");
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/50 bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-3 text-center pt-6 pb-2">
        <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">
          Bem-vindo ao TáVindo – Painel do Estabelecimento
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm md:text-base">
          Gerencie seus pedidos de forma rápida, simples e organizada.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <a
              href="#"
              className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
            >
              Esqueci minha senha
            </a>
          </div>

          <Button type="submit" className="w-full font-medium" size="lg">
            Entrar
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full font-medium gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
          size="lg"
          onClick={handleWhatsAppLogin}
        >
          <WhatsAppIcon className="h-5 w-5" />
          Entrar com WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
};

export default LoginCard;
