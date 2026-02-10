import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha deve ter no mínimo 6 caracteres"),
  establishmentName: z.string().min(2, "Nome do estabelecimento deve ter no mínimo 2 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const LoginCard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  
  const { toast } = useToast();
  const { signIn, signUp, user, loading, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Redirect is now handled by Index.tsx - no useEffect needed here

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setEstablishmentName("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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
        setIsLoading(false);
      }
      // Navigation happens automatically via auth state change in Index.tsx
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = signupSchema.safeParse({ email, password, confirmPassword, establishmentName });
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
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailValidation = z.string().email("Email inválido").safeParse(resetEmail);
      if (!emailValidation.success) {
        toast({
          title: "Erro de validação",
          description: emailValidation.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await resetPassword(resetEmail);
      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível enviar o email de recuperação",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setShowForgotPassword(false);
        setResetEmail("");
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

  if (showForgotPassword) {
    return (
      <Card 
        className="w-full max-w-md shadow-lg border-border/50 bg-card/95 backdrop-blur-sm"
        data-testid="forgot-password-card"
      >
        <CardHeader className="space-y-3 text-center pt-6 pb-2">
          <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm md:text-base">
            Digite seu email para receber um link de recuperação de senha.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 px-6 pb-6">
          <form 
            onSubmit={handleForgotPassword} 
            className="space-y-4"
            data-testid="forgot-password-form"
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-foreground font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                  required
                  data-testid="forgot-password-email-input"
                  aria-label="Email para recuperação"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full font-medium" 
              size="lg" 
              disabled={isLoading}
              data-testid="forgot-password-submit-button"
            >
              {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full font-medium"
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail("");
              }}
              data-testid="forgot-password-back-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="w-full max-w-md shadow-lg border-border/50 bg-card/95 backdrop-blur-sm"
      data-testid="login-card"
    >
      <CardHeader className="space-y-3 text-center pt-6 pb-2">
        <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">
          Bem-vindo ao TáVindo – Painel do Estabelecimento
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm md:text-base">
          Gerencie seus pedidos de forma rápida, simples e organizada.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => { setActiveTab(value); resetForm(); }}
          data-testid="auth-tabs"
        >
          <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs-list">
            <TabsTrigger value="login" data-testid="auth-tab-login">Entrar</TabsTrigger>
            <TabsTrigger value="signup" data-testid="auth-tab-signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <form 
              onSubmit={handleLogin} 
              className="space-y-4"
              data-testid="login-form"
            >
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                    required
                    data-testid="login-email-input"
                    aria-label="Email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-foreground font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                    required
                    data-testid="login-password-input"
                    aria-label="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    data-testid="login-password-toggle"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
                  data-testid="forgot-password-link"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full font-medium" 
                size="lg" 
                disabled={isLoading}
                data-testid="login-submit-button"
              >
                {isLoading ? "Carregando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <form 
              onSubmit={handleSignup} 
              className="space-y-4"
              data-testid="signup-form"
            >
              <div className="space-y-2">
                <Label htmlFor="establishment-name" className="text-foreground font-medium">
                  Nome do Estabelecimento
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="establishment-name"
                    type="text"
                    placeholder="Meu Restaurante"
                    value={establishmentName}
                    onChange={(e) => setEstablishmentName(e.target.value)}
                    className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                    required
                    data-testid="signup-establishment-input"
                    aria-label="Nome do estabelecimento"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                    required
                    data-testid="signup-email-input"
                    aria-label="Email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-foreground font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                    required
                    data-testid="signup-password-input"
                    aria-label="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    data-testid="signup-password-toggle"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-foreground font-medium">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-input focus:ring-2 focus:ring-primary/20"
                    required
                    data-testid="signup-confirm-password-input"
                    aria-label="Confirmar senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    data-testid="signup-confirm-password-toggle"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full font-medium" 
                size="lg" 
                disabled={isLoading}
                data-testid="signup-submit-button"
              >
                {isLoading ? "Carregando..." : "Criar Conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LoginCard;
