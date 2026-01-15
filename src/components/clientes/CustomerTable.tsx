import { useState } from "react";
import { Phone, MapPin, ShoppingBag, TrendingUp, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CustomerWithStats, useDeleteCustomer } from "@/hooks/useCustomers";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInSaoPaulo, toSaoPauloTime } from "@/lib/dateUtils";

interface CustomerTableProps {
  customers: CustomerWithStats[];
  onCustomerClick: (customer: CustomerWithStats) => void;
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
  const [customerToDelete, setCustomerToDelete] = useState<CustomerWithStats | null>(null);
  const deleteCustomer = useDeleteCustomer();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleDelete = (e: React.MouseEvent, customer: CustomerWithStats) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer.mutate(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  if (customers.length === 0) {
    return (
      <div 
        className="text-center py-12"
        data-testid="customer-table-empty"
        role="status"
        aria-label="Nenhum cliente encontrado"
      >
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold mb-2">Nenhum cliente encontrado</h2>
        <p className="text-muted-foreground">
          Os clientes que fizerem pedidos aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg" data-testid="customer-table">
        <Table role="table" aria-label="Lista de clientes">
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
              <TableHead>Último Pedido</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow 
                key={customer.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onCustomerClick(customer)}
                data-testid={`customer-row-${customer.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalhes de ${customer.name}`}
                onKeyDown={(e) => e.key === 'Enter' && onCustomerClick(customer)}
              >
                <TableCell data-testid={`customer-name-${customer.id}`}>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Cliente desde {formatInSaoPaulo(customer.created_at, "dd/MM/yyyy")}
                  </div>
                </TableCell>
                <TableCell data-testid={`customer-phone-${customer.id}`}>
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    {customer.phone}
                  </div>
                </TableCell>
                <TableCell data-testid={`customer-location-${customer.id}`}>
                  {customer.address ? (
                    <div className="flex items-start gap-1 text-sm max-w-[200px]">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {customer.address === "Localização via WhatsApp" 
                          ? "📍 Via WhatsApp" 
                          : `${customer.neighborhood || customer.city || customer.address}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center" data-testid={`customer-orders-${customer.id}`}>
                  <Badge variant="secondary">
                    {customer.total_orders}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" data-testid={`customer-spent-${customer.id}`}>
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="h-3 w-3 text-primary" aria-hidden="true" />
                    <span className="font-medium text-primary">
                      {formatPrice(customer.total_spent)}
                    </span>
                  </div>
                </TableCell>
                <TableCell data-testid={`customer-last-order-${customer.id}`}>
                  {customer.last_order_at ? (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(toSaoPauloTime(customer.last_order_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(e, customer)}
                    disabled={deleteCustomer.isPending}
                    data-testid={`customer-delete-button-${customer.id}`}
                    aria-label={`Excluir cliente ${customer.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent data-testid="customer-delete-dialog" role="alertdialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="customer-delete-dialog-title">Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2" data-testid="customer-delete-dialog-description">
              <p>
                Tem certeza que deseja excluir <strong>{customerToDelete?.name}</strong>?
              </p>
              {customerToDelete && customerToDelete.total_orders > 0 && (
                <p className="text-amber-600 font-medium">
                  ⚠️ Este cliente possui {customerToDelete.total_orders} pedido(s) registrado(s). 
                  Os pedidos serão mantidos para histórico, mas não estarão mais vinculados a este cliente.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="customer-delete-cancel-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="customer-delete-confirm-button"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
