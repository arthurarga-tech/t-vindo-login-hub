import { useState } from "react";
import { User, Phone, MapPin, ShoppingBag, TrendingUp, Clock, MessageCircle, Trash2, Pencil, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerWithStats, useCustomerOrders, useDeleteCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInSaoPaulo } from "@/lib/dateUtils";

interface CustomerDetailModalProps {
  customer: CustomerWithStats | null;
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "destructive" },
  confirmed: { label: "Confirmado", variant: "default" },
  preparing: { label: "Preparando", variant: "secondary" },
  ready: { label: "Pronto", variant: "default" },
  out_for_delivery: { label: "Em Entrega", variant: "secondary" },
  delivered: { label: "Entregue", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
};

export function CustomerDetailModal({ customer, open, onClose }: CustomerDetailModalProps) {
  const { data: orders, isLoading } = useCustomerOrders(customer?.id || null);
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    address_number: "",
    address_complement: "",
    neighborhood: "",
    city: "",
  });

  if (!customer) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const ticketMedio = customer.total_orders > 0 
    ? customer.total_spent / customer.total_orders 
    : 0;

  const openWhatsApp = () => {
    const phone = customer.phone.replace(/\D/g, "");
    const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${phoneWithCountry}`, "_blank");
  };

  const startEditing = () => {
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || "",
      address_number: customer.address_number || "",
      address_complement: customer.address_complement || "",
      neighborhood: customer.neighborhood || "",
      city: customer.city || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = () => {
    updateCustomer.mutate(
      {
        id: customer.id,
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address || null,
        address_number: editForm.address_number || null,
        address_complement: editForm.address_complement || null,
        neighborhood: editForm.neighborhood || null,
        city: editForm.city || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          onClose();
        },
      }
    );
  };

  const confirmDelete = () => {
    deleteCustomer.mutate(customer.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onClose();
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          data-testid="customer-detail-modal"
          role="dialog"
          aria-labelledby="customer-detail-title"
        >
          <DialogHeader>
            <DialogTitle 
              id="customer-detail-title"
              className="flex items-center justify-between"
              data-testid="customer-detail-title"
            >
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {isEditing ? "Editar Cliente" : customer.name}
              </div>
              {!isEditing && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={startEditing}
                    data-testid="customer-detail-edit-button"
                    aria-label="Editar cliente"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="customer-detail-delete-button"
                    aria-label="Excluir cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4" data-testid="customer-detail-content">
            {isEditing ? (
              <div className="space-y-4" data-testid="customer-detail-edit-form">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      data-testid="customer-detail-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      data-testid="customer-detail-phone-input"
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium">Endereço</p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Rua</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      data-testid="customer-detail-address-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_number">Número</Label>
                    <Input
                      id="address_number"
                      value={editForm.address_number}
                      onChange={(e) => setEditForm({ ...editForm, address_number: e.target.value })}
                      data-testid="customer-detail-address-number-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_complement">Complemento</Label>
                    <Input
                      id="address_complement"
                      value={editForm.address_complement}
                      onChange={(e) => setEditForm({ ...editForm, address_complement: e.target.value })}
                      data-testid="customer-detail-complement-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={editForm.neighborhood}
                      onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                      data-testid="customer-detail-neighborhood-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      data-testid="customer-detail-city-input"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="customer-detail-info">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm" data-testid="customer-detail-phone">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={openWhatsApp}
                        data-testid="customer-detail-whatsapp-button"
                        aria-label="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                    
                    {customer.address && (
                      <div className="flex items-start gap-2 text-sm" data-testid="customer-detail-address">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          {customer.address === "Localização via WhatsApp" ? (
                            <span className="text-primary">📍 Localização via WhatsApp</span>
                          ) : (
                            <>
                              <p>{customer.address}, {customer.address_number}</p>
                              {customer.address_complement && (
                                <p className="text-muted-foreground">{customer.address_complement}</p>
                              )}
                              <p className="text-muted-foreground">
                                {customer.neighborhood}
                                {customer.city && `, ${customer.city}`}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="customer-detail-since">
                      <Clock className="h-4 w-4" />
                      <span>Cliente desde {formatInSaoPaulo(customer.created_at, "dd/MM/yyyy")}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2" data-testid="customer-detail-stats">
                    <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="customer-detail-stat-orders">
                      <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-bold">{customer.total_orders}</p>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="customer-detail-stat-spent">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <p className="text-lg font-bold">{formatPrice(customer.total_spent)}</p>
                      <p className="text-xs text-muted-foreground">Total Gasto</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center" data-testid="customer-detail-stat-ticket">
                      <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-lg font-bold">{formatPrice(ticketMedio)}</p>
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order History */}
                <div className="flex-1 overflow-hidden" data-testid="customer-order-history">
                  <h4 className="font-semibold mb-3 flex items-center gap-2" data-testid="customer-order-history-title">
                    <ShoppingBag className="h-4 w-4" />
                    Histórico de Pedidos
                  </h4>

                  {isLoading ? (
                    <div className="space-y-3" data-testid="customer-order-history-loading">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <ScrollArea className="h-[300px] pr-4" data-testid="customer-order-history-list">
                      <div className="space-y-3">
                        {orders.map((order) => {
                          const status = statusConfig[order.status] || statusConfig.pending;
                          return (
                            <div 
                              key={order.id} 
                              className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                              data-testid={`customer-order-${order.id}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold" data-testid={`customer-order-${order.id}-number`}>#{order.order_number}</span>
                                  <Badge variant={status.variant} data-testid={`customer-order-${order.id}-status`}>{status.label}</Badge>
                                </div>
                                <span className="font-bold text-primary" data-testid={`customer-order-${order.id}-total`}>{formatPrice(order.total)}</span>
                              </div>
                              
                              <div className="text-sm text-muted-foreground mb-2" data-testid={`customer-order-${order.id}-date`}>
                                {formatInSaoPaulo(order.created_at, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {" • "}
                                {paymentLabels[order.payment_method] || order.payment_method}
                              </div>
                              
                              <div className="text-sm" data-testid={`customer-order-${order.id}-items`}>
                                {order.items.slice(0, 3).map((item, index) => (
                                  <span key={item.id}>
                                    {item.quantity}x {item.product_name}
                                    {index < Math.min(order.items.length - 1, 2) && ", "}
                                  </span>
                                ))}
                                {order.items.length > 3 && (
                                  <span className="text-muted-foreground"> +{order.items.length - 3} mais</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p 
                      className="text-center text-muted-foreground py-8"
                      data-testid="customer-order-history-empty"
                    >
                      Nenhum pedido encontrado
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {isEditing && (
            <DialogFooter className="gap-2 sm:gap-0" data-testid="customer-detail-edit-footer">
              <Button 
                variant="outline" 
                onClick={cancelEditing}
                data-testid="customer-detail-cancel-button"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={saveChanges} 
                disabled={updateCustomer.isPending}
                data-testid="customer-detail-save-button"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="customer-delete-dialog" role="alertdialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="customer-delete-dialog-title">Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2" data-testid="customer-delete-dialog-description">
              <p>
                Tem certeza que deseja excluir <strong>{customer.name}</strong>?
              </p>
              {customer.total_orders > 0 && (
                <p className="text-amber-600 font-medium">
                  ⚠️ Este cliente possui {customer.total_orders} pedido(s) registrado(s). 
                  Os pedidos serão mantidos para histórico, mas não estarão mais vinculados a este cliente.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="customer-delete-dialog-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCustomer.isPending}
              data-testid="customer-delete-dialog-confirm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}