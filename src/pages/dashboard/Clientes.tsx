import { useState, useMemo } from "react";
import { Users, TrendingUp, ShoppingBag, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomers, CustomerWithStats } from "@/hooks/useCustomers";
import { CustomerTable } from "@/components/clientes/CustomerTable";
import { CustomerFilters, CustomerFiltersState, SortOption } from "@/components/clientes/CustomerFilters";
import { CustomerDetailModal } from "@/components/clientes/CustomerDetailModal";

export default function Clientes() {
  const { data: customers, isLoading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [filters, setFilters] = useState<CustomerFiltersState>({
    search: "",
    neighborhood: "",
    sortBy: "recent",
  });

  // Get unique neighborhoods for filter
  const neighborhoods = useMemo(() => {
    if (!customers) return [];
    const unique = new Set(
      customers
        .map((c) => c.neighborhood)
        .filter((n): n is string => !!n && n !== "Localização via WhatsApp")
    );
    return Array.from(unique).sort();
  }, [customers]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    let result = [...customers];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.includes(filters.search)
      );
    }

    // Neighborhood filter
    if (filters.neighborhood) {
      result = result.filter((c) => c.neighborhood === filters.neighborhood);
    }

    // Sort
    switch (filters.sortBy) {
      case "orders":
        result.sort((a, b) => b.total_orders - a.total_orders);
        break;
      case "spent":
        result.sort((a, b) => b.total_spent - a.total_spent);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [customers, filters]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!customers || customers.length === 0) {
      return { total: 0, withOrders: 0, totalRevenue: 0, avgTicket: 0 };
    }

    const withOrders = customers.filter((c) => c.total_orders > 0);
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);

    return {
      total: customers.length,
      withOrders: withOrders.length,
      totalRevenue,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [customers]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withOrders}</p>
                <p className="text-sm text-muted-foreground">Com Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <ShoppingBag className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(stats.avgTicket)}</p>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <CustomerFilters 
        filters={filters}
        neighborhoods={neighborhoods}
        onChange={setFilters}
      />

      {/* Customer Table */}
      <CustomerTable 
        customers={filteredCustomers}
        onCustomerClick={setSelectedCustomer}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
