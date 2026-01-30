import { useState, useCallback } from "react";
import { User, ShoppingCart, CreditCard, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatPhone, extractPhoneDigits } from "@/lib/formatters";
import { QuickOrderProductList } from "./QuickOrderProductList";
import { QuickOrderCart, QuickOrderCartItem } from "./QuickOrderCart";
import { QuickOrderEditItemModal } from "./QuickOrderEditItemModal";
import { useCreateQuickOrder } from "@/hooks/useQuickOrder";
import { toast } from "sonner";

type Step = "customer" | "products" | "payment";
type PaymentMethod = "pix" | "credit" | "debit" | "cash";

interface QuickOrderModalProps {
  open: boolean;
  onClose: () => void;
  establishmentId: string;
  paymentPixEnabled?: boolean;
  paymentCreditEnabled?: boolean;
  paymentDebitEnabled?: boolean;
  paymentCashEnabled?: boolean;
}

const stepConfig: { key: Step; label: string; icon: typeof User }[] = [
  { key: "customer", label: "Cliente", icon: User },
  { key: "products", label: "Produtos", icon: ShoppingCart },
  { key: "payment", label: "Pagamento", icon: CreditCard },
];

export function QuickOrderModal({
  open,
  onClose,
  establishmentId,
  paymentPixEnabled = true,
  paymentCreditEnabled = true,
  paymentDebitEnabled = true,
  paymentCashEnabled = true,
}: QuickOrderModalProps) {
  const [step, setStep] = useState<Step>("customer");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cartItems, setCartItems] = useState<QuickOrderCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [editingItem, setEditingItem] = useState<QuickOrderCartItem | null>(null);

  const createQuickOrder = useCreateQuickOrder();

  const resetForm = useCallback(() => {
    setStep("customer");
    setCustomerName("");
    setCustomerPhone("");
    setCartItems([]);
    setPaymentMethod("");
    setChangeFor("");
    setNotes("");
    setEditingItem(null);
  }, []);

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

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const addonsTotal = item.addons.reduce((a, addon) => a + addon.price * addon.quantity, 0);
      return sum + (item.productPrice + addonsTotal) * item.quantity;
    }, 0);
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case "customer":
        if (!customerName.trim()) {
          toast.error("Informe o nome do cliente");
          return false;
        }
        if (customerPhone.length < 10) {
          toast.error("Telefone inválido");
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
    if (!validateStep("payment")) return;

    const changeForValue = paymentMethod === "cash" ? parseFloat(changeFor.replace(",", ".")) || 0 : 0;

    await createQuickOrder.mutateAsync({
      establishmentId,
      customer: {
        name: customerName.trim(),
        phone: customerPhone,
      },
      items: cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        observation: item.observation,
        addons: item.addons,
      })),
      paymentMethod,
      notes: notes.trim() || undefined,
      changeFor: changeForValue > 0 ? changeForValue : undefined,
    });

    handleClose();
  };

  const currentStepIndex = stepConfig.findIndex((s) => s.key === step);
  const total = calculateTotal();
  const changeForValue = parseFloat(changeFor.replace(",", ".")) || 0;
  const changeAmount = changeForValue > total ? changeForValue - total : 0;

  // Set default payment method
  if (!paymentMethod) {
    if (paymentPixEnabled) setPaymentMethod("pix");
    else if (paymentCreditEnabled) setPaymentMethod("credit");
    else if (paymentDebitEnabled) setPaymentMethod("debit");
    else if (paymentCashEnabled) setPaymentMethod("cash");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="quick-order-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Novo Pedido - Balcão
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
                  <span className="hidden sm:inline">{s.label}</span>
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
                <Label htmlFor="customer-phone">Telefone *</Label>
                <Input
                  id="customer-phone"
                  value={formatPhone(customerPhone)}
                  onChange={(e) => setCustomerPhone(extractPhoneDigits(e.target.value))}
                  placeholder="(00) 00000-0000"
                  data-testid="quick-order-customer-phone"
                />
              </div>
            </div>
          )}

          {step === "products" && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              data-testid="quick-order-products-step"
            >
              <QuickOrderProductList establishmentId={establishmentId} onAddItem={handleAddItem} />
              <QuickOrderCart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onEditItem={setEditingItem}
              />
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-6 max-w-md mx-auto" data-testid="quick-order-payment-step">
              <div className="space-y-3">
                <Label>Forma de Pagamento *</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="grid grid-cols-2 gap-2"
                >
                  {paymentPixEnabled && (
                    <div>
                      <RadioGroupItem
                        value="pix"
                        id="pix"
                        className="peer sr-only"
                        data-testid="quick-order-payment-pix"
                      />
                      <Label
                        htmlFor="pix"
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        Pix
                      </Label>
                    </div>
                  )}
                  {paymentCreditEnabled && (
                    <div>
                      <RadioGroupItem
                        value="credit"
                        id="credit"
                        className="peer sr-only"
                        data-testid="quick-order-payment-credit"
                      />
                      <Label
                        htmlFor="credit"
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        Crédito
                      </Label>
                    </div>
                  )}
                  {paymentDebitEnabled && (
                    <div>
                      <RadioGroupItem
                        value="debit"
                        id="debit"
                        className="peer sr-only"
                        data-testid="quick-order-payment-debit"
                      />
                      <Label
                        htmlFor="debit"
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        Débito
                      </Label>
                    </div>
                  )}
                  {paymentCashEnabled && (
                    <div>
                      <RadioGroupItem
                        value="cash"
                        id="cash"
                        className="peer sr-only"
                        data-testid="quick-order-payment-cash"
                      />
                      <Label
                        htmlFor="cash"
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
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

          {step === "payment" ? (
            <Button
              onClick={handleSubmit}
              disabled={createQuickOrder.isPending || cartItems.length === 0}
              data-testid="quick-order-submit-button"
            >
              {createQuickOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
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
