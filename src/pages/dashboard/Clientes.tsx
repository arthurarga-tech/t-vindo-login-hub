import { useState } from "react";
import { Users, TrendingUp, ShoppingBag, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomers, useCustomerStats, CustomerWithStats } from "@/hooks/useCustomers";
import { CustomerTable } from "@/components/clientes/CustomerTable";
import { CustomerFilters, CustomerFiltersState, SortOption } from "@/components/clientes/CustomerFilters";
import { CustomerDetailModal } from "@/components/clientes/CustomerDetailModal";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Clientes() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [filters, setFilters] = useState<CustomerFiltersState>({
    search: "",
    neighborhood: "",
    sortBy: "recent",
  });

  const {
    pagination,
    totalPages,
    setPage,
    setPageSize,
    setTotalCount,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ initialPageSize: 50 });

  const { data: customersData, isLoading } = useCustomers(
    { search: filters.search, neighborhood: filters.neighborhood, sortBy: filters.sortBy },
    { page: pagination.page, pageSize: pagination.pageSize }
  );

  const { data: stats } = useCustomerStats({
    search: filters.search,
    neighborhood: filters.neighborhood,
  });

  // Update total count when data changes
  if (customersData && customersData.totalCount !== pagination.totalCount) {
    setTotalCount(customersData.totalCount);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => setPage(1)} data-testid="clientes-pagination-page-1">1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === pagination.page}
            onClick={() => setPage(i)}
            data-testid={`clientes-pagination-page-${i}`}
            aria-current={i === pagination.page ? "page" : undefined}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setPage(totalPages)} data-testid={`clientes-pagination-page-${totalPages}`}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="clientes-page-loading">
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

  const customers = customersData?.customers || [];
  const neighborhoods = customersData?.neighborhoods || [];
  const displayStats = stats || { total: 0, withOrders: 0, totalRevenue: 0, avgTicket: 0 };

  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalCount);

  return (
    <div className="space-y-6" data-testid="clientes-page">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="clientes-page-title">Clientes</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4" data-testid="clientes-stats">
        <Card data-testid="clientes-stat-total">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="clientes-stat-total-value">{displayStats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="clientes-stat-with-orders">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="clientes-stat-with-orders-value">{displayStats.withOrders}</p>
                <p className="text-sm text-muted-foreground">Com Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="clientes-stat-revenue">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="clientes-stat-revenue-value">{formatPrice(displayStats.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="clientes-stat-ticket">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <ShoppingBag className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="clientes-stat-ticket-value">{formatPrice(displayStats.avgTicket)}</p>
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
        onChange={(newFilters) => {
          setFilters(newFilters);
          setPage(1); // Reset to first page when filters change
        }}
      />

      {/* Customer Table */}
      <CustomerTable
        customers={customers}
        onCustomerClick={setSelectedCustomer}
      />

      {/* Pagination */}
      {pagination.totalCount > 0 && (
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
          data-testid="clientes-pagination"
        >
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span data-testid="clientes-pagination-info">
              Mostrando {startItem}-{endItem} de {pagination.totalCount} clientes
            </span>
            <div className="flex items-center gap-2">
              <span>Por página:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger 
                  className="w-[70px] h-8"
                  data-testid="clientes-pagination-page-size"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25" data-testid="clientes-pagination-page-size-25">25</SelectItem>
                  <SelectItem value="50" data-testid="clientes-pagination-page-size-50">50</SelectItem>
                  <SelectItem value="100" data-testid="clientes-pagination-page-size-100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination data-testid="clientes-pagination-nav" aria-label="Paginação de clientes">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => hasPrevPage && setPage(pagination.page - 1)}
                    className={!hasPrevPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    data-testid="clientes-pagination-prev"
                    aria-disabled={!hasPrevPage}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => hasNextPage && setPage(pagination.page + 1)}
                    className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    data-testid="clientes-pagination-next"
                    aria-disabled={!hasNextPage}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}