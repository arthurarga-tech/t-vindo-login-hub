import { useState, useCallback } from "react";
import { User, ShoppingCart, CreditCard, ChevronLeft, ChevronRight, Loader2, UtensilsCrossed, ShoppingBag, Armchair, Truck, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPrice, formatPhone, extractPhoneDigits } from "@/lib/formatters";
import { ProductSelector } from "./ProductSelector";
import { QuickOrderCart, QuickOrderCartItem } from "./QuickOrderCart";
import { QuickOrderEditItemModal } from "./QuickOrderEditItemModal";
import { useCreateQuickOrder } from "@/hooks/useQuickOrder";
import { toast } from "sonner";

function MobileProductsStep({
  establishmentId,
  cartItems,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
}: {
  establishmentId: string;
  cartItems: QuickOrderCartItem[];
  onAddItem: (item: any) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onEditItem: (item: QuickOrderCartItem) => void;
}) {
  const isMobile = useIsMobile();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isMobile) {
    return (
      <div className="grid grid-cols-2 gap-4" data-testid="quick-order-products-step">
        <ProductSelector establishmentId={establishmentId} onSelectProduct={onAddItem} />
        <QuickOrderCart items={cartItems} onUpdateQuantity={onUpdateQuantity} onRemoveItem={onRemoveItem} onEditItem={onEditItem} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="products" className="w-full" data-testid="quick-order-products-step">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="cart" className="gap-1.5">
          Carrinho
          {itemCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-xs">
              {itemCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductSelector establishmentId={establishmentId} onSelectProduct={onAddItem} />
      </TabsContent>
      <TabsContent value="cart">
        <QuickOrderCart items={cartItems} onUpdateQuantity={onUpdateQuantity} onRemoveItem={onRemoveItem} onEditItem={onEditItem} />
      </TabsContent>
    </Tabs>
  );
}

type OrderSubtype = "counter" | "table" | "delivery";
type Step = "type" | "customer" | "products" | "payment";
type PaymentMethod = "pix" | "credit" | "debit" | "cash";

interface QuickOrderModalProps {
  open: boolean;
  onClose: () => void;
  establishmentId: string;
  serviceTableEnabled?: boolean;
  serviceDeliveryEnabled?: boolean;
  paymentPixEnabled?: boolean;
  paymentCreditEnabled?: boolean;
  paymentDebitEnabled?: boolean;
  paymentCashEnabled?: boolean;
  defaultDeliveryFee?: number;
  /** Pre-select table mode (used from Mesas page) */
  defaultSubtype?: OrderSubtype;
}

export function QuickOrderModal({
  open,
  onClose,
  establishmentId,
  serviceTableEnabled = false,
  serviceDeliveryEnabled = true,
  paymentPixEnabled = true,
  paymentCreditEnabled = true,
  paymentDebitEnabled = true,
  paymentCashEnabled = true,
  defaultDeliveryFee = 0,
  defaultSubtype,
}: QuickOrderModalProps) {
  const hasMultipleTypes = serviceTableEnabled || serviceDeliveryEnabled;
  const [orderSubtype, setOrderSubtype] = useState<OrderSubtype>(defaultSubtype || "counter");
  const [step, setStep] = useState<Step>(hasMultipleTypes && !defaultSubtype ? "type" : "customer");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [cartItems, setCartItems] = useState<QuickOrderCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [editingItem, setEditingItem] = useState<QuickOrderCartItem | null>(null);

  // Delivery address fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressNumber, setDeliveryAddressNumber] = useState("");
  const [deliveryAddressComplement, setDeliveryAddressComplement] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(defaultDeliveryFee.toString());

  const createQuickOrder = useCreateQuickOrder();

  // Build steps dynamically based on subtype
  const getSteps = useCallback((): { key: Step; label: string; icon: typeof User }[] => {
    const steps: { key: Step; label: string; icon: typeof User }[] = [];
    if (hasMultipleTypes && !defaultSubtype) {
      steps.push({ key: "type", label: "Tipo", icon: UtensilsCrossed });
    }
    steps.push({ key: "customer", label: "Cliente", icon: User });
    steps.push({ key: "products", label: "Produtos", icon: ShoppingCart });
    // Payment step for counter and delivery (table pays at close)
    if (orderSubtype === "counter" || orderSubtype === "delivery") {
      steps.push({ key: "payment", label: "Pagamento", icon: CreditCard });
    }
    return steps;
  }, [orderSubtype, hasMultipleTypes, defaultSubtype]);

  const stepConfig = getSteps();

  const resetForm = useCallback(() => {
    setStep(hasMultipleTypes && !defaultSubtype ? "type" : "customer");
    setOrderSubtype(defaultSubtype || "counter");
    setCustomerName("");
    setCustomerPhone("");
    setTableNumber("");
    setCartItems([]);
    setPaymentMethod("");
    setChangeFor("");
    setNotes("");
    setEditingItem(null);
    setDeliveryAddress("");
    setDeliveryAddressNumber("");
    setDeliveryAddressComplement("");
    setDeliveryNeighborhood("");
    setDeliveryCity("");
    setDeliveryFee(defaultDeliveryFee.toString());
  }, [hasMultipleTypes, defaultSubtype, defaultDeliveryFee]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddItem = useCallback(
    (item: {
      productId: string;
      productName: string;
      productPrice: number;
      categoryId: string;
      quantity: number;
      observation?: string;
      addons: { id: string; name: string; price: number; quantity: number }[];
    }) => {
      const newItem: QuickOrderCartItem = {
        id: `${item.productId}-${Date.now()}`,
        ...item,
      };
      setCartItems((prev) => [...prev, newItem]);
      toast.success(`${item.productName} adicionado`, { duration: 1000 });
    },
    []
  );

  const handleSaveEditedItem = useCallback((updatedItem: QuickOrderCartItem) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setEditingItem(null);
    toast.success("Item atualizado", { duration: 1000 });
  }, []);

  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const addonsTotal = item.addons.reduce((a, addon) => a + addon.price * addon.quantity, 0);
      return sum + (item.productPrice + addonsTotal) * item.quantity;
    }, 0);
  };

  const parsedDeliveryFee = parseFloat(deliveryFee.replace(",", ".")) || 0;
  const subtotal = calculateSubtotal();
  const total = subtotal + (orderSubtype === "delivery" ? parsedDeliveryFee : 0);

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case "type":
        if (orderSubtype === "table" && !tableNumber.trim()) {
          toast.error("Informe o número da mesa");
          return false;
        }
        return true;
      case "customer":
        if (!customerName.trim()) {
          toast.error("Informe o nome do cliente");
          return false;
        }
        if (defaultSubtype === "table" && !tableNumber.trim()) {
          toast.error("Informe o número da mesa");
          return false;
        }
        // Delivery: require at least street address
        if (orderSubtype === "delivery" && !deliveryAddress.trim()) {
          toast.error("Informe o endereço de entrega");
          return false;
        }
        return true;
      case "products":
        if (cartItems.length === 0) {
          toast.error("Adicione ao menos um produto");
          return false;
        }
        return true;
      case "payment":
        if (!paymentMethod) {
          toast.error("Selecione a forma de pagamento");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    const currentIndex = stepConfig.findIndex((s) => s.key === step);
    if (currentIndex < stepConfig.length - 1) {
      setStep(stepConfig[currentIndex + 1].key);
    }
  };

  const handleBack = () => {
    const currentIndex = stepConfig.findIndex((s) => s.key === step);
    if (currentIndex > 0) {
      setStep(stepConfig[currentIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (orderSubtype === "counter" && !validateStep("payment")) return;
    if (orderSubtype === "delivery" && !validateStep("payment")) return;
    if (orderSubtype === "table" && !validateStep("products")) return;

    const changeForValue = paymentMethod === "cash" ? parseFloat(changeFor.replace(",", ".")) || 0 : 0;

    await createQuickOrder.mutateAsync({
      establishmentId,
      customer: {
        name: customerName.trim(),
        phone: customerPhone || "",
      },
      customerAddress: orderSubtype === "delivery" ? {
        address: deliveryAddress.trim() || undefined,
        addressNumber: deliveryAddressNumber.trim() || undefined,
        addressComplement: deliveryAddressComplement.trim() || undefined,
        neighborhood: deliveryNeighborhood.trim() || undefined,
        city: deliveryCity.trim() || undefined,
      } : undefined,
      items: cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        observation: item.observation,
        addons: item.addons,
      })),
      paymentMethod: orderSubtype === "table" ? "pending" : (paymentMethod as string),
      notes: notes.trim() || undefined,
      changeFor: changeForValue > 0 ? changeForValue : undefined,
      orderSubtype,
      tableNumber: orderSubtype === "table" ? tableNumber.trim() : undefined,
      deliveryFee: orderSubtype === "delivery" ? parsedDeliveryFee : undefined,
    });

    handleClose();
  };

  const currentStepIndex = stepConfig.findIndex((s) => s.key === step);
  const changeForValue = parseFloat(changeFor.replace(",", ".")) || 0;
  const changeAmount = changeForValue > total ? changeForValue - total : 0;
  const isLastStep = currentStepIndex === stepConfig.length - 1;

  // Set default payment method
  if (!paymentMethod && (orderSubtype === "counter" || orderSubtype === "delivery")) {
    if (paymentPixEnabled) setPaymentMethod("pix");
    else if (paymentCreditEnabled) setPaymentMethod("credit");
    else if (paymentDebitEnabled) setPaymentMethod("debit");
    else if (paymentCashEnabled) setPaymentMethod("cash");
  }

  const handleSelectSubtype = (subtype: OrderSubtype) => {
    setOrderSubtype(subtype);
    if (subtype !== "table") {
      setTableNumber("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="quick-order-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Novo Pedido
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 py-2" data-testid="quick-order-stepper">
          {stepConfig.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = i < currentStepIndex;

            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => {
                    if (i < currentStepIndex) setStep(s.key);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                  disabled={!isCompleted && !isActive}
                  data-testid={`quick-order-step-${s.key}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className={isActive ? "inline" : "hidden sm:inline"}>{s.label}</span>
                </button>
                {i < stepConfig.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {step === "type" && (
            <div className="max-w-md mx-auto space-y-4" data-testid="quick-order-type-step">
              <p className="text-sm text-muted-foreground text-center">Selecione o tipo de pedido</p>
              <div className={`grid gap-4 ${serviceTableEnabled && serviceDeliveryEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
                <button
                  onClick={() => handleSelectSubtype("counter")}
                  className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                    orderSubtype === "counter"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid="quick-order-type-counter"
                >
                  <ShoppingBag className="h-10 w-10 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold">Balcão</p>
                    <p className="text-xs text-muted-foreground mt-1">Paga no ato</p>
                  </div>
                </button>

                {serviceDeliveryEnabled && (
                  <button
                    onClick={() => handleSelectSubtype("delivery")}
                    className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                      orderSubtype === "delivery"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="quick-order-type-delivery"
                  >
                    <Truck className="h-10 w-10 text-primary" />
                    <div className="text-center">
                      <p className="font-semibold">Entrega</p>
                      <p className="text-xs text-muted-foreground mt-1">Paga no ato</p>
                    </div>
                  </button>
                )}

                {serviceTableEnabled && (
                  <button
                    onClick={() => handleSelectSubtype("table")}
                    className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                      orderSubtype === "table"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="quick-order-type-table"
                  >
                    <Armchair className="h-10 w-10 text-primary" />
                    <div className="text-center">
                      <p className="font-semibold">Mesa</p>
                      <p className="text-xs text-muted-foreground mt-1">Paga no final</p>
                    </div>
                  </button>
                )}
              </div>

              {orderSubtype === "table" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="table-number">Número da Mesa *</Label>
                  <Input
                    id="table-number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ex: 1, 2, 3..."
                    autoFocus
                    data-testid="quick-order-table-number"
                  />
                </div>
              )}
            </div>
          )}

          {step === "customer" && (
            <div className="space-y-4 max-w-md mx-auto" data-testid="quick-order-customer-step">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nome do Cliente *</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  autoFocus
                  data-testid="quick-order-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Telefone (opcional)</Label>
                <Input
                  id="customer-phone"
                  value={formatPhone(customerPhone)}
                  onChange={(e) => setCustomerPhone(extractPhoneDigits(e.target.value))}
                  placeholder="(00) 00000-0000"
                  data-testid="quick-order-customer-phone"
                />
              </div>

              {defaultSubtype === "table" && (
                <div className="space-y-2">
                  <Label htmlFor="table-number-customer">Número da Mesa *</Label>
                  <Input
                    id="table-number-customer"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ex: 1, 2, 3..."
                    data-testid="quick-order-table-number-customer"
                  />
                </div>
              )}

              {/* Delivery address fields */}
              {orderSubtype === "delivery" && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    Endereço de Entrega
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label htmlFor="delivery-address">Rua / Avenida *</Label>
                      <Input
                        id="delivery-address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Nome da rua"
                        data-testid="quick-order-delivery-address"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="delivery-number">Número</Label>
                      <Input
                        id="delivery-number"
                        value={deliveryAddressNumber}
                        onChange={(e) => setDeliveryAddressNumber(e.target.value)}
                        placeholder="Nº"
                        data-testid="quick-order-delivery-number"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="delivery-complement">Complemento</Label>
                    <Input
                      id="delivery-complement"
                      value={deliveryAddressComplement}
                      onChange={(e) => setDeliveryAddressComplement(e.target.value)}
                      placeholder="Apto, bloco, referência..."
                      data-testid="quick-order-delivery-complement"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="delivery-neighborhood">Bairro</Label>
                      <Input
                        id="delivery-neighborhood"
                        value={deliveryNeighborhood}
                        onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        data-testid="quick-order-delivery-neighborhood"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="delivery-city">Cidade</Label>
                      <Input
                        id="delivery-city"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        placeholder="Cidade"
                        data-testid="quick-order-delivery-city"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === "products" && (
            <MobileProductsStep
              establishmentId={establishmentId}
              cartItems={cartItems}
              onAddItem={handleAddItem}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onEditItem={setEditingItem}
            />
          )}

          {step === "payment" && (
            <div className="space-y-6 max-w-md mx-auto" data-testid="quick-order-payment-step">
              {/* Delivery fee field */}
              {orderSubtype === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="delivery-fee">Taxa de Entrega (R$)</Label>
                  <Input
                    id="delivery-fee"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="0,00"
                    data-testid="quick-order-delivery-fee"
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label>Forma de Pagamento *</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="grid grid-cols-2 gap-2"
                >
                  {paymentPixEnabled && (
                    <div>
                      <RadioGroupItem value="pix" id="pix" className="peer sr-only" data-testid="quick-order-payment-pix" />
                      <Label htmlFor="pix" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                        Pix
                      </Label>
                    </div>
                  )}
                  {paymentCreditEnabled && (
                    <div>
                      <RadioGroupItem value="credit" id="credit" className="peer sr-only" data-testid="quick-order-payment-credit" />
                      <Label htmlFor="credit" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                        Crédito
                      </Label>
                    </div>
                  )}
                  {paymentDebitEnabled && (
                    <div>
                      <RadioGroupItem value="debit" id="debit" className="peer sr-only" data-testid="quick-order-payment-debit" />
                      <Label htmlFor="debit" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                        Débito
                      </Label>
                    </div>
                  )}
                  {paymentCashEnabled && (
                    <div>
                      <RadioGroupItem value="cash" id="cash" className="peer sr-only" data-testid="quick-order-payment-cash" />
                      <Label htmlFor="cash" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                        Dinheiro
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <Label htmlFor="change-for">Troco para</Label>
                  <Input
                    id="change-for"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    placeholder="Ex: 50,00"
                    data-testid="quick-order-change-for"
                  />
                  {changeAmount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Troco: {formatPrice(changeAmount)}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações gerais do pedido..."
                  rows={2}
                  data-testid="quick-order-notes"
                />
              </div>

              <Separator />

              {orderSubtype === "delivery" && parsedDeliveryFee > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              )}
              {orderSubtype === "delivery" && (
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Taxa de entrega:</span>
                  <span>{formatPrice(parsedDeliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary" data-testid="quick-order-total">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Show total in products step for table orders (since there's no payment step) */}
        {step === "products" && orderSubtype === "table" && cartItems.length > 0 && (
          <div className="flex justify-between items-center px-1 pb-2 text-lg font-semibold">
            <span>Total:</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            onClick={currentStepIndex === 0 ? handleClose : handleBack}
            data-testid="quick-order-back-button"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStepIndex === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={createQuickOrder.isPending || cartItems.length === 0}
              data-testid="quick-order-submit-button"
            >
              {createQuickOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {orderSubtype === "table" ? "Abrindo..." : "Criando..."}
                </>
              ) : orderSubtype === "table" ? (
                "Abrir Comanda"
              ) : (
                "Criar Pedido"
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} data-testid="quick-order-next-button">
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>

      <QuickOrderEditItemModal
        item={editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedItem}
      />
    </Dialog>
  );
}
