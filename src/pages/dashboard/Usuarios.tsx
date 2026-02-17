import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
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
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2, Users, Loader2, Eye, EyeOff } from "lucide-react";

type MemberRole = AppRole;

interface EstablishmentMember {
  id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profile?: {
    establishment_name: string | null;
    phone: string | null;
  };
}

const roleLabels: Record<MemberRole, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  attendant: "Atendente",
  kitchen: "Cozinha",
  waiter: "Garçom",
  employee: "Funcionário",
};

const roleBadgeVariants: Record<MemberRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  manager: "secondary",
  attendant: "outline",
  kitchen: "outline",
  waiter: "outline",
  employee: "outline",
};

const assignableRoles: { value: MemberRole; label: string }[] = [
  { value: "manager", label: "Gerente" },
  { value: "attendant", label: "Atendente" },
  { value: "kitchen", label: "Cozinha" },
  { value: "waiter", label: "Garçom" },
];

export default function Usuarios() {
  const { user } = useAuth();
  const { data: establishment } = useEstablishment();
  const { isOwner } = useUserRole();
  const [members, setMembers] = useState<EstablishmentMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<EstablishmentMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<MemberRole>("attendant");
  const [showPassword, setShowPassword] = useState(false);

  // Edit form state
  const [editRole, setEditRole] = useState<MemberRole>("attendant");

  useEffect(() => {
    if (establishment?.id) {
      fetchMembers(establishment.id);
    }
  }, [establishment?.id]);

  const fetchMembers = async (establishmentId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("establishment_members")
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            establishment_name,
            phone
          )
        `)
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const membersWithProfile = (data || []).map((member: any) => ({
        ...member,
        profile: member.profiles,
      }));

      setMembers(membersWithProfile);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Erro ao carregar membros da equipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!establishment?.id || !newEmail.trim() || !newPassword.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          establishment_id: establishment.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Membro adicionado com sucesso!");
      setIsAddDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("attendant");
      await fetchMembers(establishment.id);
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Erro ao adicionar membro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember || !establishment?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("establishment_members")
        .update({ role: editRole })
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast.success("Função atualizada com sucesso!");
      await fetchMembers(establishment.id);
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error("Error updating member:", error);
      toast.error("Erro ao atualizar função");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!establishment?.id) return;

    try {
      const { error } = await supabase
        .from("establishment_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Membro removido com sucesso!");
      await fetchMembers(establishment.id);
    } catch (error: any) {
      console.error("Error deleting member:", error);
      toast.error("Erro ao remover membro");
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
            Gerencie a equipe do seu estabelecimento
          </p>
        </div>

        {isOwner && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
                <DialogDescription>
                  Crie um acesso para um novo membro da equipe com email e senha temporária.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="membro@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-password">Senha temporária</Label>
                  <div className="relative">
                    <Input
                      id="add-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-role">Função</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as MemberRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={isSubmitting || !newEmail.trim() || newPassword.length < 6}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Criar Acesso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
              <p>Nenhum membro encontrado.</p>
              <p className="text-sm">Adicione membros para gerenciar sua equipe.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Desde</TableHead>
                  {isOwner && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {member.profile?.establishment_name || "Usuário"}
                          {member.user_id === user?.id && (
                            <span className="text-xs text-muted-foreground ml-2">(você)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.phone || "Sem telefone"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariants[member.role] || "outline"}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        {member.role !== "owner" && member.user_id !== user?.id && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(member)}
                              aria-label="Editar função"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Remover membro">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O membro perderá acesso ao estabelecimento.
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
                    )}
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
              Altere a função do membro no estabelecimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMember} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
