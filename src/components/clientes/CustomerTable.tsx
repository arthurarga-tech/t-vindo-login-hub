import { Phone, MapPin, ShoppingBag, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CustomerWithStats } from "@/hooks/useCustomers";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerTableProps {
  customers: CustomerWithStats[];
  onCustomerClick: (customer: CustomerWithStats) => void;
}

export function CustomerTable({ customers, onCustomerClick }: CustomerTableProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nenhum cliente encontrado</h2>
        <p className="text-muted-foreground">
          Os clientes que fizerem pedidos aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="text-center">Pedidos</TableHead>
            <TableHead className="text-right">Total Gasto</TableHead>
            <TableHead>Último Pedido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow 
              key={customer.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onCustomerClick(customer)}
            >
              <TableCell>
                <div className="font-medium">{customer.name}</div>
                <div className="text-xs text-muted-foreground">
                  Cliente desde {format(new Date(customer.created_at), "dd/MM/yyyy")}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {customer.phone}
                </div>
              </TableCell>
              <TableCell>
                {customer.address ? (
                  <div className="flex items-start gap-1 text-sm max-w-[200px]">
                    <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
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
              <TableCell className="text-center">
                <Badge variant="secondary">
                  {customer.total_orders}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary">
                    {formatPrice(customer.total_spent)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {customer.last_order_at ? (
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(customer.last_order_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
