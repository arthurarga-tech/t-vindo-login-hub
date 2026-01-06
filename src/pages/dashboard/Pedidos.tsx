import { useState, useEffect, useRef, useMemo } from "react";
import { ClipboardList, LayoutGrid, List, Volume2, VolumeX, RefreshCw, Timer, Wifi, WifiOff, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Order, useOrders } from "@/hooks/useOrders";
import { OrderKanban } from "@/components/pedidos/OrderKanban";
import { OrderList } from "@/components/pedidos/OrderList";
import { OrderDetailModal } from "@/components/pedidos/OrderDetailModal";
import { OrderFilters, OrderFiltersState } from "@/components/pedidos/OrderFilters";
import { startOfDay, startOfWeek, subDays, isAfter } from "date-fns";
import { useEstablishment } from "@/hooks/useEstablishment";
import { usePrintOrder } from "@/hooks/usePrintOrder";
import { usePreparationTime } from "@/hooks/usePreparationTime";
import { useQZTrayContext } from "@/contexts/QZTrayContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

export default function Pedidos() {
  const { data: orders, isLoading, refetch } = useOrders();
  const { data: establishment } = useEstablishment();
  const { data: preparationTime } = usePreparationTime();
  const { printOrder } = usePrintOrder();
  const qzTray = useQZTrayContext();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousPendingCountRef = useRef<number | null>(null);
  const printedOrdersRef = useRef<Set<string>>(new Set());
  const [filters, setFilters] = useState<OrderFiltersState>({
    search: "",
    status: "all",
    dateRange: "all",
    showFinished: true,
    showScheduledOnly: false,
  });

  const pendingOrders = orders?.filter((o) => o.status === "pending") || [];
  const pendingCount = pendingOrders.length;
  
  // Unified print mode: none, browser_on_order, browser_on_confirm, qz_on_order, qz_on_confirm
  const printMode = ((establishment as any)?.print_mode || "none") as string;
  const isQzMode = printMode.startsWith("qz_");
  const isPrintOnOrder = printMode.includes("on_order");
  const isPrintOnConfirm = printMode.includes("on_confirm");
  
  // Debug: verificar valor do printMode carregado
  console.log("[Pedidos] printMode carregado:", printMode, { isQzMode, isPrintOnOrder, isPrintOnConfirm });
  
  const establishmentName = establishment?.name || "Estabelecimento";
  const logoUrl = establishment?.logo_url;
  const qzTrayPrinter = qzTray.savedPrinter || (establishment as any)?.qz_tray_printer || "";
  const printerAvailable = qzTray.isPrinterAvailable(qzTrayPrinter);
  const printFontSize = (establishment as any)?.print_font_size || 12;
  const printMarginLeft = (establishment as any)?.print_margin_left || 0;
  const printMarginRight = (establishment as any)?.print_margin_right || 0;
  const printFontBold = (establishment as any)?.print_font_bold !== false;
  const printLineHeight = (establishment as any)?.print_line_height || 1.4;
  const printContrastHigh = (establishment as any)?.print_contrast_high === true;
  
  // Print mode labels for badge
  const printModeLabels: Record<string, string> = {
    browser_on_order: "🖨️ Ao receber",
    browser_on_confirm: "🖨️ Ao confirmar",
    qz_on_order: "🖨️ Silencioso ao receber",
    qz_on_confirm: "🖨️ Silencioso ao confirmar",
  };
  // Play notification sound and auto-print when new pending orders arrive
  // Note: QZ Tray auto-connection is now handled by the global QZTrayProvider
  useEffect(() => {
    // Skip first load - don't print existing orders
    if (previousPendingCountRef.current === null) {
      previousPendingCountRef.current = pendingCount;
      // Mark existing pending orders as "already seen"
      if (orders) {
        orders.filter(o => o.status === "pending").forEach(o => {
          printedOrdersRef.current.add(o.id);
        });
      }
      return;
    }

    // Play sound for new orders
    if (pendingCount > previousPendingCountRef.current && soundEnabled) {
      playNotificationSound();
    }
    
    // Auto print on new order if configured (browser_on_order or qz_on_order)
    if (isPrintOnOrder && orders) {
      const newPendingOrders = orders.filter(
        (o) => o.status === "pending" && !printedOrdersRef.current.has(o.id)
      );
      
      if (newPendingOrders.length > 0) {
        console.log("[Pedidos] Novos pedidos para impressão automática:", newPendingOrders.map(o => o.order_number));
        
        // Check if QZ Tray should be used (only for qz_on_order mode)
        const shouldUseQZ = isQzMode && qzTrayPrinter && qzTray.isConnected;
        
        newPendingOrders.forEach(async (order) => {
          printedOrdersRef.current.add(order.id);
          
          console.log("[Pedidos] Imprimindo pedido #" + order.order_number, {
            useQZTray: shouldUseQZ,
            printer: qzTrayPrinter,
            qzConnected: qzTray.isConnected,
            printerAvailable
          });
          
          const result = await printOrder({
            order,
            establishmentName,
            logoUrl,
            useQZTray: shouldUseQZ,
            qzTrayPrinter,
            qzPrintFn: qzTray.printHtml,
            isPrinterAvailable: printerAvailable,
            printFontSize,
            printMarginLeft,
            printMarginRight,
            printFontBold,
            printLineHeight,
            printContrastHigh,
          });
          
          // Show toast notifications based on result
          if (result.printerUnavailable) {
            toast.error(`Impressora "${qzTrayPrinter}" não encontrada`, {
              description: "Verifique se está ligada ou configure outra em Configurações",
            });
          } else if (result.isMobile) {
            toast.info("Toque no botão verde para imprimir", {
              description: "Dispositivo móvel detectado - toque em 'Imprimir Pedido' na nova janela",
            });
          } else if (result.usedFallback) {
            toast.warning("Usando impressão do navegador", {
              description: "QZ Tray indisponível - confirme a impressão na janela do navegador",
            });
          }
        });
      }
    }
    
    previousPendingCountRef.current = pendingCount;
  }, [pendingCount, soundEnabled, orders, printMode, isPrintOnOrder, isQzMode, establishmentName, logoUrl, printOrder, qzTray.isConnected, qzTrayPrinter, qzTray.printHtml, printerAvailable]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);

      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(audioContext.currentTime + 0.3);
      }, 200);
    } catch (error) {
      console.log("Audio notification not supported");
    }
  };

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

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case "today":
          startDate = startOfDay(now);
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
          break;
        default:
          startDate = new Date(0);
      }

      if (filters.dateRange !== "yesterday") {
        result = result.filter((o) => isAfter(new Date(o.created_at), startDate));
      }
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
          {preparationTime && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Preparo: ~{preparationTime.averageMinutes} min
            </Badge>
          )}
          {/* Print Mode Badge */}
          {printMode !== "none" && printModeLabels[printMode] && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="flex items-center gap-1 cursor-help">
                  <Printer className="h-3 w-3" />
                  {printModeLabels[printMode]}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {isPrintOnOrder 
                  ? "Pedidos são impressos automaticamente ao serem recebidos"
                  : "Pedidos são impressos automaticamente ao serem confirmados"
                }
              </TooltipContent>
            </Tooltip>
          )}
          {/* QZ Tray Status Indicator */}
          {isQzMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={qzTray.isConnected ? "default" : "secondary"} 
                  className={`flex items-center gap-1 cursor-help ${qzTray.isConnected ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  {qzTray.isConnected ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  {qzTray.isConnected ? "Impressora" : "Offline"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {qzTray.isConnected 
                  ? `QZ Tray conectado - ${qzTrayPrinter || "Sem impressora selecionada"}`
                  : "QZ Tray desconectado - Vá em Configurações para conectar"
                }
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-2">
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
        />
      ) : (
        <OrderList 
          orders={filteredOrders} 
          onOrderClick={setSelectedOrder}
        />
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        establishmentName={establishmentName}
        logoUrl={logoUrl}
        printMode={printMode}
        isQzMode={isQzMode && qzTray.isConnected}
        qzTrayPrinter={qzTrayPrinter}
        qzPrintFn={qzTray.printHtml}
        isPrinterAvailable={printerAvailable}
        printFontSize={printFontSize}
        printMarginLeft={printMarginLeft}
        printMarginRight={printMarginRight}
        printFontBold={printFontBold}
        printLineHeight={printLineHeight}
        printContrastHigh={printContrastHigh}
      />
    </div>
  );
}
