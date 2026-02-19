import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { ClipboardList, LayoutGrid, List, Volume2, VolumeX, RefreshCw, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Order, useOrders } from "@/hooks/useOrders";
import { OrderKanban } from "@/components/pedidos/OrderKanban";
import { OrderList } from "@/components/pedidos/OrderList";
import { OrderDetailModal } from "@/components/pedidos/OrderDetailModal";
import { OrderFilters, OrderFiltersState } from "@/components/pedidos/OrderFilters";
import { startOfDay, startOfWeek, startOfMonth, subDays, isAfter } from "date-fns";
import { getNowInSaoPaulo } from "@/lib/dateUtils";
import { useEstablishment } from "@/hooks/useEstablishment";
import { usePrintOrder } from "@/hooks/usePrintOrder";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { useOrderNotification } from "@/hooks/useOrderNotification";
import { PreparationTimeConfig } from "@/components/pedidos/PreparationTimeConfig";
import { StoreQuickClose } from "@/components/pedidos/StoreQuickClose";
import { QuickOrderModal } from "@/components/pedidos/QuickOrderModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Pedidos() {
  const { data: orders, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useOrders();
  const { data: establishment } = useEstablishment();
  const { role } = useUserRole();
  const { printOrder, printInWindow, printViaRawbt } = usePrintOrder();
  const { printFontSize, printMarginLeft, printMarginRight, printFontBold, printLineHeight, printContrastHigh, printMode, isPrintOnOrder, isPrintOnConfirm, isRawbtOnOrder, isRawbtOnConfirm, printAddonPrices } = usePrintSettings();
  const { playNotificationSound } = useOrderNotification();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousPendingCountRef = useRef<number | null>(null);
  const printQueueRef = useRef<boolean>(false); // is queue processing
  const [filters, setFilters] = useState<OrderFiltersState>({
    search: "",
    status: "all",
    dateRange: "today",
    showFinished: true,
    showScheduledOnly: false,
  });
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);

  const pendingOrders = orders?.filter((o) => o.status === "pending") || [];
  const pendingCount = pendingOrders.length;
  
  const establishmentName = establishment?.name || "Estabelecimento";
  const logoUrl = establishment?.logo_url;
  
  // Temporary closed state
  const isTemporaryClosed = establishment?.temporary_closed ?? false;
  
  // Payment method settings for quick order
  const paymentPixEnabled = establishment?.payment_pix_enabled ?? true;
  const paymentCreditEnabled = establishment?.payment_credit_enabled ?? true;
  const paymentDebitEnabled = establishment?.payment_debit_enabled ?? true;
  const paymentCashEnabled = establishment?.payment_cash_enabled ?? true;

  // --- localStorage-based anti-duplicate tracking ---
  const getAutoPrintedIds = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem("auto_printed_orders");
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      // Clean entries older than 24h
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const cleaned: Record<string, number> = {};
      for (const [id, ts] of Object.entries(parsed)) {
        if (ts > cutoff) cleaned[id] = ts;
      }
      if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
        localStorage.setItem("auto_printed_orders", JSON.stringify(cleaned));
      }
      return cleaned;
    } catch { return {}; }
  };

  const markAsPrinted = (orderId: string) => {
    const current = getAutoPrintedIds();
    current[orderId] = Date.now();
    localStorage.setItem("auto_printed_orders", JSON.stringify(current));
  };

  // --- Sequential print queue ---
  const processQueue = useCallback(async (orderIds: string[]) => {
    if (printQueueRef.current) return;
    printQueueRef.current = true;

    for (const orderId of orderIds) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const fetchOrderWithAddons = async (retries = 2): Promise<any> => {
          const { data: freshOrder, error } = await supabase
            .from("orders")
            .select(`
              *,
              customer:customers(*),
              items:order_items(*, addons:order_item_addons(*))
            `)
            .eq("id", orderId)
            .single();

          if (error || !freshOrder) return null;

          const hasItems = freshOrder.items && freshOrder.items.length > 0;
          const hasAnyAddons = freshOrder.items?.some((i: any) => i.addons && i.addons.length > 0);
          
          if (hasItems && !hasAnyAddons && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchOrderWithAddons(retries - 1);
          }

          return freshOrder;
        };

        const freshOrder = await fetchOrderWithAddons();
        
        if (!freshOrder) {
          toast.error("Erro ao buscar pedido para impressão");
          continue;
        }
        
        const printOpts = {
          order: freshOrder as Order,
          establishmentName,
          logoUrl,
          printFontSize,
          printMarginLeft,
          printMarginRight,
          printFontBold,
          printLineHeight,
          printContrastHigh,
          printAddonPrices,
        };

        if (isRawbtOnOrder) {
          printViaRawbt({ ...printOpts, silent: true });
          // Small delay between RawBT intents to avoid conflicts
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          printOrder(printOpts);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch {
        toast.error("Erro ao imprimir pedido automaticamente");
      }
    }

    printQueueRef.current = false;
  }, [establishmentName, logoUrl, printFontSize, printMarginLeft, printMarginRight, printFontBold, printLineHeight, printContrastHigh, printAddonPrices, isRawbtOnOrder, printOrder, printViaRawbt]);

  // Play notification sound and auto-print when new pending orders arrive
  useEffect(() => {
    // Skip first load — mark all current pending as already printed
    if (previousPendingCountRef.current === null) {
      previousPendingCountRef.current = pendingCount;
      if (orders) {
        orders.filter(o => o.status === "pending").forEach(o => markAsPrinted(o.id));
      }
      return;
    }

    // Play sound for new orders
    if (pendingCount > previousPendingCountRef.current && soundEnabled) {
      playNotificationSound();
    }
    
    // Auto print on new order
    if ((isPrintOnOrder || isRawbtOnOrder) && orders) {
      const printedIds = getAutoPrintedIds();
      const newPendingOrders = orders
        .filter((o) => o.status === "pending" && !printedIds[o.id])
        .sort((a, b) => a.order_number - b.order_number);
      
      if (newPendingOrders.length > 0) {
        // Mark all as printed immediately to avoid duplicates from re-renders
        newPendingOrders.forEach(o => markAsPrinted(o.id));
        // Process sequentially
        processQueue(newPendingOrders.map(o => o.id));
      }
    }
    
    previousPendingCountRef.current = pendingCount;
  }, [pendingCount, soundEnabled, orders, isPrintOnOrder, isRawbtOnOrder, processQueue, playNotificationSound]);

  // Function to print an order from the card (direct user click)
  const handlePrintOrder = (order: Order) => {
    printOrder({
      order,
      establishmentName,
      logoUrl,
      printFontSize,
      printMarginLeft,
      printMarginRight,
      printFontBold,
      printLineHeight,
      printContrastHigh,
      printAddonPrices,
    });
  };

  // Function to print on quick confirm using pre-opened window or RawBT
  const handleQuickConfirmPrint = useCallback((preOpenedWindow: Window | null, order: Order) => {
    if (isRawbtOnConfirm) {
      try { preOpenedWindow?.close(); } catch { /* ignore */ }
      printViaRawbt({
        order,
        establishmentName,
        logoUrl,
        printFontSize,
        printMarginLeft,
        printMarginRight,
        printFontBold,
        printLineHeight,
        printContrastHigh,
        printAddonPrices,
      });
      return;
    }

    if (!isPrintOnConfirm) {
      try { preOpenedWindow?.close(); } catch { /* ignore */ }
      return;
    }
    
    printInWindow(preOpenedWindow, {
      order,
      establishmentName,
      logoUrl,
      printFontSize,
      printMarginLeft,
      printMarginRight,
      printFontBold,
      printLineHeight,
      printContrastHigh,
      printAddonPrices,
    });
  }, [isPrintOnConfirm, isRawbtOnConfirm, printInWindow, printViaRawbt, establishmentName, logoUrl, printFontSize, printMarginLeft, printMarginRight, printFontBold, printLineHeight, printContrastHigh, printAddonPrices]);

  // Infinite scroll handler
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    let result = [...orders];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customer?.name?.toLowerCase().includes(search) ||
          o.customer?.phone?.includes(filters.search) ||
          o.order_number.toString().includes(filters.search)
      );
    }

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((o) => o.status === filters.status);
    }

    // Date range filter - use São Paulo timezone
    const now = getNowInSaoPaulo();
    let startDate: Date;

    switch (filters.dateRange) {
      case "today":
        startDate = startOfDay(now);
        result = result.filter((o) => isAfter(new Date(o.created_at), startDate));
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        result = result.filter((o) => {
          const orderDate = new Date(o.created_at);
          return orderDate >= startDate && orderDate < startOfDay(now);
        });
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 0 });
        result = result.filter((o) => isAfter(new Date(o.created_at), startDate));
        break;
      case "month":
        startDate = startOfMonth(now);
        result = result.filter((o) => isAfter(new Date(o.created_at), startDate));
        break;
    }

    // Hide finished orders (delivered/cancelled)
    if (!filters.showFinished) {
      result = result.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "picked_up" && o.status !== "served");
    }

    // Show only scheduled orders
    if (filters.showScheduledOnly) {
      result = result.filter((o) => !!(o as any).scheduled_for);
    }

    return result;
  }, [orders, filters]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96 w-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingCount} novo{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
          {establishment && (
            <>
              <PreparationTimeConfig establishmentId={establishment.id} />
              <StoreQuickClose 
                establishmentId={establishment.id}
                isTemporaryClosed={isTemporaryClosed}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowQuickOrderModal(true)}
            className="gap-2"
            data-testid="quick-order-button"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "list")}>
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-1" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-1" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters */}
      <OrderFilters filters={filters} onChange={setFilters} />

      {orders && orders.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum pedido ainda</h2>
          <p className="text-muted-foreground">
            Quando seus clientes fizerem pedidos, eles aparecerão aqui em tempo real.
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <OrderKanban 
          orders={filteredOrders} 
          onOrderClick={setSelectedOrder}
          onPrint={handlePrintOrder}
          onQuickConfirmPrint={handleQuickConfirmPrint}
          hideValues={role === "kitchen"}
          silentPrintOnConfirm={isRawbtOnConfirm}
        />
      ) : (
        <OrderList 
          orders={filteredOrders} 
          onOrderClick={setSelectedOrder}
          onPrint={handlePrintOrder}
          onQuickConfirmPrint={handleQuickConfirmPrint}
          hideValues={role === "kitchen"}
          silentPrintOnConfirm={isRawbtOnConfirm}
        />
      )}

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando mais pedidos...</span>
            </div>
          ) : (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Carregar mais pedidos
            </Button>
          )}
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        establishmentName={establishmentName}
        logoUrl={logoUrl}
        printMode={printMode}
        printFontSize={printFontSize}
        printMarginLeft={printMarginLeft}
        printMarginRight={printMarginRight}
        printFontBold={printFontBold}
        printLineHeight={printLineHeight}
        printContrastHigh={printContrastHigh}
        printAddonPrices={printAddonPrices}
      />

      {establishment && (
        <QuickOrderModal
          open={showQuickOrderModal}
          onClose={() => setShowQuickOrderModal(false)}
          establishmentId={establishment.id}
          serviceTableEnabled={false}
          defaultSubtype="counter"
          paymentPixEnabled={paymentPixEnabled}
          paymentCreditEnabled={paymentCreditEnabled}
          paymentDebitEnabled={paymentDebitEnabled}
          paymentCashEnabled={paymentCashEnabled}
        />
      )}
    </div>
  );
}
