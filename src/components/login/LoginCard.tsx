import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import WhatsAppIcon from "./WhatsAppIcon";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  establishmentName: z.string().min(2, "Nome do estabelecimento deve ter no mínimo 2 caracteres"),
});

const LoginCard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = signupSchema.safeParse({ email, password, establishmentName });
        if (!result.success) {
          toast({
            title: "Erro de validação",
            description: result.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, establishmentName);
        if (error) {
          let message = "Erro ao criar conta";
          if (error.message.includes("already registered")) {
            message = "Este email já está cadastrado";
          }
          toast({
            title: "Erro",
            description: message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conta criada!",
            description: "Você foi logado automaticamente.",
          });
          navigate('/dashboard');
        }
      } else {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          toast({
            title: "Erro de validação",
            description: result.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          let message = "Erro ao fazer login";
          if (error.message.includes("Invalid login credentials")) {
            message = "Email ou senha incorretos";
          }
          toast({
            title: "Erro",
            description: message,
            variant: "destructive",
          });
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleWhatsAppLogin = () => {
    toast({
      title: "Em breve",
      description: "Login com WhatsApp será implementado em breve.",
    });
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/50 bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-3 text-center pt-6 pb-2">
        <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">
          {isSignUp ? "Criar Conta" : "Bem-vindo ao TáVindo"} – Painel do Estabelecimento
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm md:text-base">
          {isSignUp 
            ? "Cadastre seu estabelecimento para começar" 
            : "Gerencie seus pedidos de forma rápida, simples e organizada."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="establishmentName" className="text-foreground font-medium">
                Nome do Estabelecimento
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="establishmentName"
                  type="text"
                  placeholder="Meu Restaurante"
                  value={establishmentName}
                  onChange={(e) => setEstablishmentName(e.target.value)}
                  className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

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

          {!isSignUp && (
            <div className="text-right">
              <a
                href="#"
                className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>
          )}

          <Button type="submit" className="w-full font-medium" size="lg" disabled={isLoading}>
            {isLoading ? "Carregando..." : (isSignUp ? "Criar Conta" : "Entrar")}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
          >
            {isSignUp ? "Já tem uma conta? Faça login" : "Não tem conta? Cadastre-se"}
          </button>
        </div>

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
