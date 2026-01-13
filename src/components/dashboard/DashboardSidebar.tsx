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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useState } from "react";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import tavindoLogo from "@/assets/tavindo-logo.png";

const menuItems = [
  { title: "Gestão de Pedidos", url: "/dashboard/pedidos", icon: ClipboardList, testId: "pedidos" },
  { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign, testId: "financeiro" },
  { title: "Catálogo", url: "/dashboard/catalogo", icon: BookOpen, testId: "catalogo" },
  { title: "Meu Negócio", url: "/dashboard/meu-negocio", icon: Building2, testId: "meu-negocio" },
  { title: "Clientes", url: "/dashboard/clientes", icon: Users, testId: "clientes" },
  { title: "Usuários", url: "/dashboard/usuarios", icon: UserCog, testId: "usuarios" },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings, testId: "configuracoes" },
];

export function DashboardSidebar() {
  const { signOut } = useAuth();
  const { data: establishment } = useEstablishment();
  const [copied, setCopied] = useState(false);

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
        <div className="flex items-center gap-2">
          <img 
            src={tavindoLogo} 
            alt="TáVindo" 
            className="h-10 w-auto"
            data-testid="sidebar-logo"
          />
          <SidebarTrigger 
            className="ml-auto md:hidden"
            data-testid="sidebar-toggle"
            aria-label="Alternar menu"
          />
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

              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title} role="menuitem">
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/10 transition-colors text-foreground/80"
                      activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                      data-testid={`sidebar-nav-${item.testId}`}
                      aria-label={item.title}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
