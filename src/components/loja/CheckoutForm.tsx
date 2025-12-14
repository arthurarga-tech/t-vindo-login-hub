import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePublicEstablishment } from "@/hooks/usePublicStore";

type PaymentMethod = "cash" | "card" | "pix";

interface CustomerForm {
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
}

export function CheckoutForm() {
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
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!customer.name.trim()) {
      toast.error("Informe seu nome");
      return false;
    }
    if (!customer.phone.trim()) {
      toast.error("Informe seu telefone");
      return false;
    }
    if (!customer.address.trim()) {
      toast.error("Informe seu endereço");
      return false;
    }
    if (!customer.addressNumber.trim()) {
      toast.error("Informe o número do endereço");
      return false;
    }
    if (!customer.neighborhood.trim()) {
      toast.error("Informe o bairro");
      return false;
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
      // Create customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert({
          establishment_id: establishment.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          address_number: customer.addressNumber,
          address_complement: customer.addressComplement || null,
          neighborhood: customer.neighborhood,
          city: customer.city || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          establishment_id: establishment.id,
          customer_id: customerData.id,
          payment_method: paymentMethod,
          subtotal: totalPrice,
          delivery_fee: 0,
          total: totalPrice,
          notes: notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => {
        const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price * a.quantity, 0) ?? 0;
        return {
          order_id: orderData.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          quantity: item.quantity,
          total: (item.product.price + addonsTotal) * item.quantity,
        };
      });

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select();

      if (itemsError) throw itemsError;

      // Create order item addons
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
            orderItemAddons.push({
              order_item_id: orderItemId,
              addon_id: addon.id,
              addon_name: addon.name,
              addon_price: addon.price,
              quantity: addon.quantity,
            });
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
      <header className="bg-primary text-primary-foreground py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/loja/${slug}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Finalizar Pedido</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
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
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={customer.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereço de Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Rua *</Label>
              <Input
                id="address"
                placeholder="Nome da rua"
                value={customer.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número *</Label>
                <Input
                  id="addressNumber"
                  placeholder="123"
                  value={customer.addressNumber}
                  onChange={(e) => handleInputChange("addressNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressComplement">Complemento</Label>
                <Input
                  id="addressComplement"
                  placeholder="Apto, bloco..."
                  value={customer.addressComplement}
                  onChange={(e) => handleInputChange("addressComplement", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  placeholder="Seu bairro"
                  value={customer.neighborhood}
                  onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Sua cidade"
                  value={customer.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <p className="text-sm text-muted-foreground">Pague na entrega</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex-1 cursor-pointer">
                  <span className="font-medium">Cartão</span>
                  <p className="text-sm text-muted-foreground">Débito ou crédito na entrega</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  <span className="font-medium">Dinheiro</span>
                  <p className="text-sm text-muted-foreground">Pague na entrega</p>
                </Label>
              </div>
            </RadioGroup>
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
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Enviando..." : `Enviar Pedido • ${formatPrice(totalPrice)}`}
        </Button>
      </main>
    </div>
  );
}
