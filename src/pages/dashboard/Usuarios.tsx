import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useUserRole, AppRole, roleLabels } from "@/hooks/useUserRole";
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

interface EstablishmentMember {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email?: string;
  profile?: {
    establishment_name: string | null;
    phone: string | null;
  };
}

const roleBadgeVariants: Record<AppRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  manager: "secondary",
  attendant: "outline",
  kitchen: "outline",
  waiter: "outline",
  employee: "outline",
};

const assignableRoles: { value: AppRole; label: string }[] = [
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
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("attendant");
  const [showPassword, setShowPassword] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("attendant");
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    if (establishment?.id) {
      fetchMembers(establishment.id);
    }
  }, [establishment?.id]);

  const fetchMembers = async (establishmentId: string) => {
    try {
      setIsLoading(true);
      const { data: membersData, error: membersError } = await supabase
        .from("establishment_members")
        .select("id, user_id, role, created_at")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      const userIds = membersData.map((m) => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, establishment_name, phone")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profilesData || []).map((p) => [p.user_id, p])
      );

      // Fetch emails via edge function (only for owners)
      let emailMap: Record<string, string> = {};
      if (isOwner) {
        try {
          const { data: emailData } = await supabase.functions.invoke("get-team-emails", {
            body: { establishment_id: establishmentId, user_ids: userIds },
          });
          if (emailData?.emails) emailMap = emailData.emails;
        } catch {
          // non-critical, continue without emails
        }
      }

      const membersWithProfile = membersData.map((member) => ({
        ...member,
        email: emailMap[member.user_id] || undefined,
        profile: profileMap.get(member.user_id) || null,
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
    if (!establishment?.id || !newEmail.trim() || !newPassword.trim() || !newName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          establishment_id: establishment.id,
          name: newName.trim(),
          phone: newPhone.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Membro adicionado com sucesso!");
      setIsAddDialogOpen(false);
      setNewName("");
      setNewPhone("");
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
    if (!selectedMember || !establishment?.id || !editName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-team-member", {
        body: {
          member_id: selectedMember.id,
          user_id: selectedMember.user_id,
          establishment_id: establishment.id,
          name: editName.trim(),
          phone: editPhone.trim() || null,
          role: editRole,
          email: editEmail.trim() || undefined,
          password: editPassword || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Membro atualizado com sucesso!");
      await fetchMembers(establishment.id);
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error("Error updating member:", error);
      toast.error(error.message || "Erro ao atualizar membro");
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
    setEditName(member.profile?.establishment_name || "");
    setEditPhone(member.profile?.phone || "");
    setEditEmail(member.email || "");
    setEditPassword("");
    setEditRole(member.role);
    setShowEditPassword(false);
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
                  <Label htmlFor="add-name">Nome</Label>
                  <Input
                    id="add-name"
                    type="text"
                    placeholder="Nome do membro"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">Telefone</Label>
                  <Input
                    id="add-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
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
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
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
                  disabled={isSubmitting || !newName.trim() || !newEmail.trim() || newPassword.length < 6}
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
                        {member.email && (
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        )}
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

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Altere os dados do membro da equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                type="text"
                placeholder="Nome do membro"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="membro@email.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova senha (deixe vazio para manter)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
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
            <Button
              onClick={handleEditMember}
              disabled={isSubmitting || !editName.trim() || (editPassword.length > 0 && editPassword.length < 6)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
