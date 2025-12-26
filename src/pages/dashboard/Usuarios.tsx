import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Pencil, Trash2, Users, Loader2 } from "lucide-react";

type EstablishmentRole = "owner" | "manager" | "employee";

interface EstablishmentMember {
  id: string;
  user_id: string;
  role: EstablishmentRole;
  created_at: string;
  profile?: {
    establishment_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

interface Establishment {
  id: string;
  name: string;
  owner_id: string;
}

const roleLabels: Record<EstablishmentRole, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  employee: "Funcionário",
};

const roleBadgeVariants: Record<EstablishmentRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  manager: "secondary",
  employee: "outline",
};

export default function Usuarios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [members, setMembers] = useState<EstablishmentMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<EstablishmentMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<EstablishmentRole>("employee");
  const [editRole, setEditRole] = useState<EstablishmentRole>("employee");

  useEffect(() => {
    if (user) {
      fetchEstablishment();
    }
  }, [user]);

  const fetchEstablishment = async () => {
    if (!user) return;

    try {
      // First check if user owns an establishment
      const { data: ownedEstablishment, error: ownedError } = await supabase
        .from("establishments")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (ownedError) throw ownedError;

      if (ownedEstablishment) {
        setEstablishment(ownedEstablishment);
        await fetchMembers(ownedEstablishment.id);
      } else {
        // User doesn't have an establishment yet, create one based on their profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("establishment_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const establishmentName = profile?.establishment_name || "Meu Estabelecimento";

        const { data: newEstablishment, error: createError } = await supabase
          .from("establishments")
          .insert({
            name: establishmentName,
            owner_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add owner as a member
        await supabase.from("establishment_members").insert({
          establishment_id: newEstablishment.id,
          user_id: user.id,
          role: "owner" as EstablishmentRole,
        });

        // Update profile with establishment_id
        await supabase
          .from("profiles")
          .update({ establishment_id: newEstablishment.id })
          .eq("user_id", user.id);

        setEstablishment(newEstablishment);
        await fetchMembers(newEstablishment.id);
      }
    } catch (error) {
      console.error("Error fetching establishment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o estabelecimento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async (establishmentId: string) => {
    try {
      const { data, error } = await supabase
        .from("establishment_members")
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            establishment_name,
            phone,
            avatar_url
          )
        `)
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get emails from auth (owner can see member emails through their profile context)
      const membersWithProfile = (data || []).map((member: any) => ({
        ...member,
        profile: member.profiles,
      }));

      setMembers(membersWithProfile);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const handleAddMember = async () => {
    if (!establishment || !newUserEmail.trim()) return;

    setIsSubmitting(true);
    try {
      // For now, we'll create a placeholder - in production, you'd invite by email
      // This would typically send an invite email and create the member when they accept
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O convite por email será implementado em breve. Por enquanto, o usuário precisa se cadastrar primeiro.",
      });
      
      setIsAddDialogOpen(false);
      setNewUserEmail("");
      setNewUserRole("employee");
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember || !establishment) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("establishment_members")
        .update({ role: editRole })
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Função do usuário atualizada.",
      });

      await fetchMembers(establishment.id);
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error updating member:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!establishment) return;

    try {
      const { error } = await supabase
        .from("establishment_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário removido do estabelecimento.",
      });

      await fetchMembers(establishment.id);
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (member: EstablishmentMember) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do seu estabelecimento
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Usuário</DialogTitle>
              <DialogDescription>
                Convide um novo usuário para o seu estabelecimento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as EstablishmentRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="employee">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMember} disabled={isSubmitting || !newUserEmail.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Convidar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe
          </CardTitle>
          <CardDescription>
            {establishment?.name} • {members.length} {members.length === 1 ? "membro" : "membros"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado.</p>
              <p className="text-sm">Adicione usuários para gerenciar sua equipe.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {member.profile?.establishment_name || "Usuário"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.phone || "Sem telefone"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariants[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== "owner" && member.user_id !== user?.id && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O usuário perderá acesso ao estabelecimento.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Função</DialogTitle>
            <DialogDescription>
              Altere a função do usuário no estabelecimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as EstablishmentRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="employee">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMember} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
