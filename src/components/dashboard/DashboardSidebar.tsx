import {
  ClipboardList,
  DollarSign,
  BookOpen,
  Building2,
  Users,
  UserCog,
  Settings,
  LogOut,
  Link2,
  Check,
  CreditCard,
  UtensilsCrossed,
  LockKeyhole,
} from "lucide-react";
import React, { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import tavindoLogo from "@/assets/tavindo-logo.png";

const menuItems = [
  { title: "Gestão de Pedidos", url: "/dashboard/pedidos", icon: ClipboardList, testId: "pedidos", permission: "pedidos" },
  { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign, testId: "financeiro", permission: "financeiro" },
  { title: "Catálogo", url: "/dashboard/catalogo", icon: BookOpen, testId: "catalogo", permission: "catalogo" },
  { title: "Meu Negócio", url: "/dashboard/meu-negocio", icon: Building2, testId: "meu-negocio", permission: "meu-negocio" },
  { title: "Clientes", url: "/dashboard/clientes", icon: Users, testId: "clientes", permission: "clientes" },
  { title: "Usuários", url: "/dashboard/usuarios", icon: UserCog, testId: "usuarios", permission: "usuarios" },
  { title: "Meu Perfil", url: "/dashboard/meu-plano", icon: CreditCard, testId: "meu-plano", permission: "meu-plano" },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings, testId: "configuracoes", permission: "configuracoes" },
];

export function DashboardSidebar() {
  const { signOut } = useAuth();
  const { data: establishment, isLoading: isLoadingEstablishment } = useEstablishment();
  const { canAccess } = useUserRole();
  const { setOpenMobile, isMobile } = useSidebar();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const isTableEnabled = establishment?.service_table ?? false;

  const filteredMenuItems = menuItems.filter((item) => canAccess(item.permission));

  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleCopyLink = async () => {
    if (!establishment?.slug) {
      toast.error("Configure o slug do seu estabelecimento primeiro");
      return;
    }

    const storeUrl = `${window.location.origin}/loja/${establishment.slug}`;
    
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  return (
    <Sidebar 
      className="border-r border-border"
      data-testid="dashboard-sidebar"
      role="navigation"
      aria-label="Menu principal"
    >
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {isLoadingEstablishment ? (
            // Skeleton while loading - prevents flash of TáVindo logo
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
          ) : establishment?.logo_url ? (
            <img 
              src={establishment.logo_url} 
              alt={establishment?.name || "Estabelecimento"} 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover bg-primary/10 border-2 border-primary/20 flex-shrink-0"
              data-testid="sidebar-logo-establishment"
            />
          ) : (
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
              <img 
                src={tavindoLogo} 
                alt="TáVindo" 
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                data-testid="sidebar-logo"
              />
            </div>
          )}
          <span className="font-semibold text-foreground truncate text-sm">
            {isLoadingEstablishment ? (
              <span className="inline-block h-4 w-24 bg-muted animate-pulse rounded" />
            ) : (
              establishment?.name || "TáVindo"
            )}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu data-testid="sidebar-menu" role="menu">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors w-full text-left text-primary font-medium"
                    data-testid="sidebar-copy-link-button"
                    aria-label={copied ? "Link copiado" : "Copiar link da loja"}
                  >
                    {copied ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Link2 className="h-5 w-5" />
                    )}
                    <span>Meu Link</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {filteredMenuItems.map((item, index) => (
                <React.Fragment key={item.title}>
                  <SidebarMenuItem role="menuitem">
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/10 transition-colors text-foreground/80"
                        activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                        data-testid={`sidebar-nav-${item.testId}`}
                        aria-label={item.title}
                        onClick={handleMenuItemClick}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {index === 0 && canAccess("mesas") && (
                    <SidebarMenuItem key="mesas" role="menuitem">
                      <SidebarMenuButton asChild>
                        {isTableEnabled ? (
                          <NavLink
                            to="/dashboard/mesas"
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/10 transition-colors text-foreground/80"
                            activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                            data-testid="sidebar-nav-mesas"
                            aria-label="Mesas/Comandas"
                            onClick={handleMenuItemClick}
                          >
                            <UtensilsCrossed className="h-5 w-5" />
                            <span>Mesas/Comandas</span>
                          </NavLink>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex items-center gap-3 px-3 py-2 rounded-md w-full text-left text-muted-foreground/50 cursor-not-allowed"
                                  data-testid="sidebar-nav-mesas-locked"
                                  aria-label="Mesas/Comandas (desativado)"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toast.info("Ative 'Atendimento em Mesa' em Meu Negócio → Modalidades de Atendimento");
                                  }}
                                >
                                  <LockKeyhole className="h-5 w-5" />
                                  <span>Mesas/Comandas</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                Ative em Meu Negócio → Modalidades de Atendimento
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => signOut()}
          data-testid="sidebar-logout-button"
          aria-label="Sair da conta"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
