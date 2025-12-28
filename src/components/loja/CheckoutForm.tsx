import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MapPin, ShoppingBag, Truck, Package, UtensilsCrossed, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { z } from "zod";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";

type PaymentMethod = "cash" | "credit" | "debit" | "pix";
type OrderType = "delivery" | "pickup" | "dine_in";

// Validation schema for checkout form
const checkoutSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo (máx. 100 caracteres)").trim(),
  phone: z.string().min(10, "Telefone inválido").max(20, "Telefone muito longo").regex(/^[0-9\s()+-]+$/, "Formato de telefone inválido"),
  address: z.string().max(200, "Endereço muito longo (máx. 200 caracteres)").trim().optional(),
  addressNumber: z.string().max(20, "Número muito longo").trim().optional(),
  addressComplement: z.string().max(100, "Complemento muito longo").trim().optional(),
  neighborhood: z.string().max(100, "Bairro muito longo").trim().optional(),
  city: z.string().max(100, "Cidade muito longa").trim().optional(),
  notes: z.string().max(500, "Observação muito longa (máx. 500 caracteres)").trim().optional(),
});

interface CustomerForm {
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
}

interface CheckoutFormProps {
  scheduledFor?: Date | null;
}

export function CheckoutForm({ scheduledFor }: CheckoutFormProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { data: establishment } = usePublicEstablishment(slug);

  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    phone: "",
    address: "",
    addressNumber: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [notes, setNotes] = useState("");
  const [shareLocationViaWhatsApp, setShareLocationViaWhatsApp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [changeFor, setChangeFor] = useState<string>("");

  // Calculate change
  const changeForValue = parseFloat(changeFor.replace(",", ".")) || 0;
  const changeAmount = changeForValue > totalPrice ? changeForValue - totalPrice : 0;
  const needsChange = paymentMethod === "cash" && changeForValue > 0;

  // Get available service modalities
  const serviceDelivery = (establishment as any)?.service_delivery ?? true;
  const servicePickup = (establishment as any)?.service_pickup ?? false;
  const serviceDineIn = (establishment as any)?.service_dine_in ?? false;

  // Set default order type based on available modalities
  useEffect(() => {
    if (establishment) {
      if (serviceDelivery) {
        setOrderType("delivery");
      } else if (servicePickup) {
        setOrderType("pickup");
      } else if (serviceDineIn) {
        setOrderType("dine_in");
      }
    }
  }, [establishment, serviceDelivery, servicePickup, serviceDineIn]);

  // Count enabled modalities
  const enabledModalitiesCount = [serviceDelivery, servicePickup, serviceDineIn].filter(Boolean).length;
  const showModalitySelector = enabledModalitiesCount > 1;
  const needsAddress = orderType === "delivery";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleInputChange = (field: keyof CustomerForm, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    // Build validation data
    const validationData = {
      name: customer.name,
      phone: customer.phone,
      address: needsAddress && !shareLocationViaWhatsApp ? customer.address : undefined,
      addressNumber: needsAddress ? customer.addressNumber : undefined,
      addressComplement: customer.addressComplement || undefined,
      neighborhood: needsAddress && !shareLocationViaWhatsApp ? customer.neighborhood : undefined,
      city: customer.city || undefined,
      notes: notes || undefined,
    };

    // Validate with zod schema
    const result = checkoutSchema.safeParse(validationData);
    
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return false;
    }

    // Additional business logic validations
    if (needsAddress) {
      if (!customer.addressNumber.trim()) {
        toast.error("Informe o número da casa ou s/n");
        return false;
      }
      if (!shareLocationViaWhatsApp) {
        if (!customer.address.trim()) {
          toast.error("Informe seu endereço");
          return false;
        }
        if (!customer.neighborhood.trim()) {
          toast.error("Informe o bairro");
          return false;
        }
      }
    }
    
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !establishment?.id) return;

    setSubmitting(true);
    try {
      // Prepare customer address based on order type
      const customerAddress = needsAddress
        ? shareLocationViaWhatsApp
          ? "Localização via WhatsApp"
          : customer.address
        : null;
      const customerNeighborhood = needsAddress
        ? shareLocationViaWhatsApp
          ? "Localização via WhatsApp"
          : customer.neighborhood
        : null;

      // Try to create customer, if exists use existing record
      // (Public users cannot update customer records for security)
      let customerId: string;
      
      // First, try to find existing customer
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("establishment_id", establishment.id)
        .eq("phone", customer.phone)
        .maybeSingle();
      
      if (existingCustomer) {
        // Use existing customer
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            establishment_id: establishment.id,
            name: customer.name,
            phone: customer.phone,
            address: customerAddress,
            address_number: needsAddress ? customer.addressNumber : null,
            address_complement: needsAddress ? customer.addressComplement || null : null,
            neighborhood: customerNeighborhood,
            city: needsAddress ? customer.city || null : null,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create order with order_type
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          establishment_id: establishment.id,
          customer_id: customerId,
          payment_method: paymentMethod,
          order_type: orderType,
          subtotal: totalPrice,
          delivery_fee: 0,
          total: totalPrice,
          notes: notes || null,
          status: "pending",
          change_for: paymentMethod === "cash" && changeForValue > 0 ? changeForValue : null,
          scheduled_for: scheduledFor?.toISOString() || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // SECURITY: Fetch fresh prices from database to prevent client-side manipulation
      const productIds = items.map(i => i.product.id);
      const { data: freshProducts, error: priceError } = await supabase
        .from('products')
        .select('id, price, name')
        .in('id', productIds);

      if (priceError) throw priceError;

      const productPriceMap = new Map(
        freshProducts?.map(p => [p.id, { price: Number(p.price), name: p.name }]) || []
      );

      // Fetch fresh addon prices
      const allAddonIds = items.flatMap(i => i.selectedAddons?.map(a => a.id) || []);
      let addonPriceMap = new Map<string, { price: number; name: string }>();
      
      if (allAddonIds.length > 0) {
        const { data: freshAddons, error: addonsError } = await supabase
          .from('addons')
          .select('id, price, name')
          .in('id', allAddonIds);

        if (addonsError) throw addonsError;

        addonPriceMap = new Map(
          freshAddons?.map(a => [a.id, { price: Number(a.price), name: a.name }]) || []
        );
      }

      // Create order items with validated prices
      const orderItems = items.map((item) => {
        const productData = productPriceMap.get(item.product.id);
        if (!productData) {
          throw new Error(`Produto não encontrado ou inativo: ${item.product.name}`);
        }

        const validatedAddonsTotal = item.selectedAddons?.reduce((sum, a) => {
          const addonData = addonPriceMap.get(a.id);
          if (!addonData) {
            throw new Error(`Adicional não encontrado ou inativo: ${a.name}`);
          }
          return sum + addonData.price * a.quantity;
        }, 0) ?? 0;

        return {
          order_id: orderData.id,
          product_id: item.product.id,
          product_name: productData.name,
          product_price: productData.price,
          quantity: item.quantity,
          total: (productData.price + validatedAddonsTotal) * item.quantity,
          observation: item.observation || null,
        };
      });

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select();

      if (itemsError) throw itemsError;

      // Create order item addons with validated prices
      const orderItemAddons: {
        order_item_id: string;
        addon_id: string;
        addon_name: string;
        addon_price: number;
        quantity: number;
      }[] = [];

      items.forEach((item, index) => {
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          const orderItemId = insertedItems[index].id;
          item.selectedAddons.forEach((addon) => {
            const addonData = addonPriceMap.get(addon.id);
            if (addonData) {
              orderItemAddons.push({
                order_item_id: orderItemId,
                addon_id: addon.id,
                addon_name: addonData.name,
                addon_price: addonData.price,
                quantity: addon.quantity,
              });
            }
          });
        }
      });

      if (orderItemAddons.length > 0) {
        const { error: addonsError } = await supabase
          .from("order_item_addons")
          .insert(orderItemAddons);

        if (addonsError) throw addonsError;
      }

      // Create initial status history
      await supabase.from("order_status_history").insert({
        order_id: orderData.id,
        status: "pending",
      });

      // Save last order to localStorage for quick tracking
      localStorage.setItem(`lastOrder_${slug}`, JSON.stringify({
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        timestamp: Date.now()
      }));

      clearCart();
      toast.success("Pedido enviado com sucesso!");
      navigate(`/loja/${slug}/pedido/${orderData.id}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Erro ao enviar pedido: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Carrinho vazio</h2>
            <p className="text-muted-foreground">
              Adicione produtos ao carrinho antes de finalizar o pedido.
            </p>
            <Button onClick={() => navigate(`/loja/${slug}`)}>
              Voltar para a loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-3 sm:py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/loja/${slug}`)}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold">Finalizar Pedido</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Scheduled Order Banner */}
        {scheduledFor && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-primary">Pedido Agendado</p>
                  <p className="text-sm text-muted-foreground">
                    Para {formatInSaoPaulo(scheduledFor, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {formatInSaoPaulo(scheduledFor, "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => {
              const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price * a.quantity, 0) ?? 0;
              const itemTotal = (item.product.price + addonsTotal) * item.quantity;

              return (
                <div key={`${item.product.id}-${index}`} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-medium">
                      {formatPrice(itemTotal)}
                    </span>
                  </div>
                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                    <div className="pl-4">
                      {item.selectedAddons.map((addon) => (
                        <p key={addon.id} className="text-xs text-muted-foreground">
                          + {addon.quantity}x {addon.name} ({formatPrice(addon.price * addon.quantity)})
                        </p>
                      ))}
                    </div>
                  )}
                  {item.observation && (
                    <p className="text-xs text-muted-foreground pl-4 italic">
                      Obs: {item.observation}
                    </p>
                  )}
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>{formatPrice(totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Type Selection */}
        {showModalitySelector && (
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Como deseja receber?</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={orderType}
                onValueChange={(value) => setOrderType(value as OrderType)}
                className="space-y-3"
              >
                {serviceDelivery && (
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex-1 cursor-pointer flex items-center gap-3">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-medium">Entrega</span>
                        <p className="text-sm text-muted-foreground">Receba no seu endereço</p>
                      </div>
                    </Label>
                  </div>
                )}
                {servicePickup && (
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer flex items-center gap-3">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-medium">Retirada</span>
                        <p className="text-sm text-muted-foreground">Retire no estabelecimento</p>
                      </div>
                    </Label>
                  </div>
                )}
                {serviceDineIn && (
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="dine_in" id="dine_in" />
                    <Label htmlFor="dine_in" className="flex-1 cursor-pointer flex items-center gap-3">
                      <UtensilsCrossed className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-medium">Comer no Local</span>
                        <p className="text-sm text-muted-foreground">Consuma no estabelecimento</p>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Info for pickup/dine-in */}
        {orderType === "pickup" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Retirada no Local</p>
                  <p className="text-sm text-muted-foreground">
                    Você poderá retirar seu pedido em: <br />
                    <span className="font-medium text-foreground">
                      {(establishment as any)?.address || "Endereço do estabelecimento"}
                      {(establishment as any)?.neighborhood && `, ${(establishment as any).neighborhood}`}
                      {(establishment as any)?.city && ` - ${(establishment as any).city}`}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {orderType === "dine_in" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <UtensilsCrossed className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Consumo no Local</p>
                  <p className="text-sm text-muted-foreground">
                    Seu pedido será preparado para consumo no estabelecimento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={customer.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={customer.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                maxLength={20}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address - only for delivery */}
        {needsAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endereço de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Share location option */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30">
                <Checkbox
                  id="shareLocation"
                  checked={shareLocationViaWhatsApp}
                  onCheckedChange={(checked) => setShareLocationViaWhatsApp(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="shareLocation" className="cursor-pointer flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">Compartilhar localização via WhatsApp</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Após o pedido, envie sua localização pelo WhatsApp. Informe apenas o número da casa.
                  </p>
                </div>
              </div>

              {!shareLocationViaWhatsApp && (
                <div className="space-y-2">
                  <Label htmlFor="address">Rua *</Label>
                  <Input
                    id="address"
                    placeholder="Nome da rua"
                    value={customer.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    maxLength={200}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número *</Label>
                  <Input
                    id="addressNumber"
                    placeholder="123 ou s/n"
                    value={customer.addressNumber}
                    onChange={(e) => handleInputChange("addressNumber", e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressComplement">Complemento</Label>
                  <Input
                    id="addressComplement"
                    placeholder="Apto, bloco..."
                    value={customer.addressComplement}
                    onChange={(e) => handleInputChange("addressComplement", e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              {!shareLocationViaWhatsApp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Seu bairro"
                      value={customer.neighborhood}
                      onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Sua cidade"
                      value={customer.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="flex-1 cursor-pointer">
                  <span className="font-medium">Pix</span>
                  <p className="text-sm text-muted-foreground">
                    {orderType === "delivery" ? "Pague na entrega" : "Pague no local"}
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit" className="flex-1 cursor-pointer">
                  <span className="font-medium">Cartão de Crédito</span>
                  <p className="text-sm text-muted-foreground">
                    {orderType === "delivery" ? "Pague na entrega" : "Pague no local"}
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="debit" id="debit" />
                <Label htmlFor="debit" className="flex-1 cursor-pointer">
                  <span className="font-medium">Cartão de Débito</span>
                  <p className="text-sm text-muted-foreground">
                    {orderType === "delivery" ? "Pague na entrega" : "Pague no local"}
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  <span className="font-medium">Dinheiro</span>
                  <p className="text-sm text-muted-foreground">
                    {orderType === "delivery" ? "Pague na entrega" : "Pague no local"}
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {/* Change calculation for cash */}
            {paymentMethod === "cash" && (
              <div className="mt-4 space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="changeFor">Troco para quanto?</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">R$</span>
                    <Input
                      id="changeFor"
                      placeholder="0,00"
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      className="max-w-32"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco se não precisar de troco
                  </p>
                </div>
                {needsChange && (
                <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Troco:</span>
                    <span className="text-lg font-bold" style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>
                      {formatPrice(changeAmount)}
                    </span>
                  </div>
                )}
                {changeForValue > 0 && changeForValue < totalPrice && (
                  <p className="text-sm text-destructive">
                    O valor deve ser maior que o total do pedido ({formatPrice(totalPrice)})
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Alguma observação sobre o pedido? (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {notes.length}/500 caracteres
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Enviando..." : `Enviar Pedido • ${formatPrice(totalPrice)}`}
        </Button>
      </main>
    </div>
  );
}