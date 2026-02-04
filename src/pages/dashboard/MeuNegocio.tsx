import { Building2, Link2, Check, Copy, Clock, MapPin, Phone, FileText, Truck, Package, Store, UtensilsCrossed, CalendarClock, CreditCard, Wallet, QrCode, Banknote, Armchair } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/catalogo/ImageUpload";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const defaultOpeningHours: OpeningHours = {
  monday: { open: "08:00", close: "22:00", closed: false },
  tuesday: { open: "08:00", close: "22:00", closed: false },
  wednesday: { open: "08:00", close: "22:00", closed: false },
  thursday: { open: "08:00", close: "22:00", closed: false },
  friday: { open: "08:00", close: "23:00", closed: false },
  saturday: { open: "10:00", close: "23:00", closed: false },
  sunday: { open: "10:00", close: "20:00", closed: true },
};

const dayLabels: Record<keyof OpeningHours, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

export default function MeuNegocio() {
  const { data: establishment, isLoading } = useEstablishment();
  const queryClient = useQueryClient();
  
  // Basic info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  
  // Contact info
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  
  // Delivery info
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  
  // Opening hours
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);
  
  // Service modalities
  const [serviceDelivery, setServiceDelivery] = useState(true);
  const [servicePickup, setServicePickup] = useState(false);
  const [serviceDineIn, setServiceDineIn] = useState(false);
  const [serviceTable, setServiceTable] = useState(false);
  
  // Scheduling
  const [allowScheduling, setAllowScheduling] = useState(false);
  
  // Location sharing
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  
  // Payment methods
  const [paymentPixEnabled, setPaymentPixEnabled] = useState(true);
  const [paymentCreditEnabled, setPaymentCreditEnabled] = useState(true);
  const [paymentDebitEnabled, setPaymentDebitEnabled] = useState(true);
  const [paymentCashEnabled, setPaymentCashEnabled] = useState(true);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixHolderName, setPixHolderName] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (establishment) {
      setName(establishment.name || "");
      setSlug(establishment.slug || "");
      setDescription((establishment as any).description || "");
      setLogoUrl((establishment as any).logo_url || "");
      setBannerUrl((establishment as any).banner_url || "");
      setPhone((establishment as any).phone || "");
      setAddress((establishment as any).address || "");
      setNeighborhood((establishment as any).neighborhood || "");
      setCity((establishment as any).city || "");
      setDeliveryInfo((establishment as any).delivery_info || "");
      setMinOrderValue((establishment as any).min_order_value?.toString() || "");
      setDeliveryFee((establishment as any).delivery_fee?.toString() || "");
      
      const hours = (establishment as any).opening_hours;
      if (hours && typeof hours === "object") {
        setOpeningHours({ ...defaultOpeningHours, ...hours });
      }
      
      // Service modalities
      setServiceDelivery((establishment as any).service_delivery ?? true);
      setServicePickup((establishment as any).service_pickup ?? false);
      setServiceDineIn((establishment as any).service_dine_in ?? false);
      setServiceTable((establishment as any).service_table ?? false);
      
      // Scheduling
      setAllowScheduling((establishment as any).allow_scheduling ?? false);
      
      // Location sharing
      setLocationSharingEnabled((establishment as any).location_sharing_enabled ?? true);
      
      // Payment methods
      setPaymentPixEnabled((establishment as any).payment_pix_enabled ?? true);
      setPaymentCreditEnabled((establishment as any).payment_credit_enabled ?? true);
      setPaymentDebitEnabled((establishment as any).payment_debit_enabled ?? true);
      setPaymentCashEnabled((establishment as any).payment_cash_enabled ?? true);
      setPixKey((establishment as any).pix_key || "");
      setPixKeyType((establishment as any).pix_key_type || "");
      setPixHolderName((establishment as any).pix_holder_name || "");
    }
  }, [establishment]);

  const formatSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(formatSlug(e.target.value));
  };

  const handleDayChange = (day: keyof OpeningHours, field: keyof DayHours, value: string | boolean) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!establishment?.id) return;

    if (!slug.trim()) {
      toast.error("O slug não pode estar vazio");
      return;
    }

    if (slug.length < 3) {
      toast.error("O slug deve ter pelo menos 3 caracteres");
      return;
    }

    // Validate at least one service modality is enabled
    if (!serviceDelivery && !servicePickup && !serviceDineIn) {
      toast.error("Habilite pelo menos uma modalidade de atendimento");
      return;
    }

    // Validate at least one payment method is enabled
    if (!paymentPixEnabled && !paymentCreditEnabled && !paymentDebitEnabled && !paymentCashEnabled) {
      toast.error("Habilite pelo menos uma forma de pagamento");
      return;
    }

    // Validate PIX key if PIX is enabled
    if (paymentPixEnabled && pixKey && !pixKeyType) {
      toast.error("Selecione o tipo da chave PIX");
      return;
    }

    setSaving(true);
    try {
      // Check if slug is already taken
      const { data: existing } = await supabase
        .from("establishments")
        .select("id")
        .eq("slug", slug)
        .neq("id", establishment.id)
        .maybeSingle();

      if (existing) {
        toast.error("Este slug já está em uso. Escolha outro.");
        return;
      }

      const { error } = await supabase
        .from("establishments")
        .update({
          name,
          slug,
          description,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          phone,
          address,
          neighborhood,
          city,
          delivery_info: deliveryInfo,
          min_order_value: minOrderValue ? parseFloat(minOrderValue) : 0,
          delivery_fee: deliveryFee ? parseFloat(deliveryFee) : 0,
          opening_hours: JSON.parse(JSON.stringify(openingHours)),
          service_delivery: serviceDelivery,
          service_pickup: servicePickup,
          service_dine_in: serviceDineIn,
          service_table: serviceTable,
          allow_scheduling: allowScheduling,
          location_sharing_enabled: locationSharingEnabled,
          payment_pix_enabled: paymentPixEnabled,
          payment_credit_enabled: paymentCreditEnabled,
          payment_debit_enabled: paymentDebitEnabled,
          payment_cash_enabled: paymentCashEnabled,
          pix_key: pixKey || null,
          pix_key_type: pixKeyType || null,
          pix_holder_name: pixHolderName || null,
        })
        .eq("id", establishment.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["establishment"] });
      toast.success("Informações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!slug) {
      toast.error("Configure o slug primeiro");
      return;
    }

    const storeUrl = `${window.location.origin}/loja/${slug}`;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const storeUrl = slug ? `${window.location.origin}/loja/${slug}` : null;

  if (isLoading) {
    return (
      <div 
        className="space-y-6"
        data-testid="meu-negocio-page-loading"
        aria-busy="true"
        aria-label="Carregando meu negócio"
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Meu Negócio</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6"
      data-testid="meu-negocio-page"
      role="main"
      aria-label="Página meu negócio"
    >
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="meu-negocio-title">
          Meu Negócio
        </h1>
      </div>
      
      {/* Card 1 - Informações Básicas */}
      <Card data-testid="meu-negocio-basic-info-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Informações Básicas</CardTitle>
          </div>
          <CardDescription>Nome, descrição e logo do seu estabelecimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Estabelecimento</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do seu estabelecimento"
                data-testid="meu-negocio-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Logo</Label>
              <ImageUpload
                value={logoUrl}
                onChange={(url) => setLogoUrl(url || "")}
                folder="logos"
                aspectRatio={1}
                data-testid="meu-negocio-logo-upload"
              />
              <p className="text-sm text-muted-foreground">
                Recomendado: imagem quadrada (1:1)
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu estabelecimento..."
              rows={3}
              data-testid="meu-negocio-description-input"
            />
          </div>

          <div className="space-y-2">
            <Label>Banner / Capa</Label>
            <ImageUpload
              value={bannerUrl}
              onChange={(url) => setBannerUrl(url || "")}
              folder="banners"
              aspectRatio={16 / 9}
              data-testid="meu-negocio-banner-upload"
            />
            <p className="text-sm text-muted-foreground">
              Imagem de capa exibida no topo da loja. Recomendado: formato 16:9
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - Contato e Endereço */}
      <Card data-testid="meu-negocio-contact-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Contato e Endereço</CardTitle>
          </div>
          <CardDescription>Informações de contato e localização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="pl-10"
                  data-testid="meu-negocio-phone-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sua cidade"
                data-testid="meu-negocio-city-input"
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número"
                data-testid="meu-negocio-address-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Bairro"
                data-testid="meu-negocio-neighborhood-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 - Horários de Funcionamento */}
      <Card data-testid="meu-negocio-hours-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Horários de Funcionamento</CardTitle>
          </div>
          <CardDescription>Configure os horários de abertura e fechamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 pb-4" data-testid="meu-negocio-hours-list">
            {(Object.keys(dayLabels) as Array<keyof OpeningHours>).map((day) => (
              <div
                key={day}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/50"
                data-testid={`meu-negocio-day-${day}`}
              >
                <div className="flex items-center justify-between sm:w-32">
                  <span className="font-medium text-sm">{dayLabels[day]}</span>
                  <div className="flex items-center gap-2 sm:hidden">
                    <span className="text-sm text-muted-foreground">
                      {openingHours[day].closed ? "Fechado" : "Aberto"}
                    </span>
                    <Switch
                      checked={!openingHours[day].closed}
                      onCheckedChange={(checked) => handleDayChange(day, "closed", !checked)}
                      data-testid={`meu-negocio-day-${day}-switch-mobile`}
                    />
                  </div>
                </div>
                
                <div className="hidden sm:flex items-center gap-2">
                  <Switch
                    checked={!openingHours[day].closed}
                    onCheckedChange={(checked) => handleDayChange(day, "closed", !checked)}
                    data-testid={`meu-negocio-day-${day}-switch`}
                  />
                  <span className="text-sm text-muted-foreground w-16">
                    {openingHours[day].closed ? "Fechado" : "Aberto"}
                  </span>
                </div>
                
                {!openingHours[day].closed && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-auto w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                      <span className="text-sm text-muted-foreground w-12 sm:hidden">Abre:</span>
                      <TimePicker
                        value={openingHours[day].open}
                        onChange={(value) => handleDayChange(day, "open", value)}
                        placeholder="Abre"
                        className="w-full sm:w-28"
                        data-testid={`meu-negocio-day-${day}-open`}
                      />
                    </div>
                    <span className="hidden sm:block text-muted-foreground">às</span>
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                      <span className="text-sm text-muted-foreground w-12 sm:hidden">Fecha:</span>
                      <TimePicker
                        value={openingHours[day].close}
                        onChange={(value) => handleDayChange(day, "close", value)}
                        placeholder="Fecha"
                        className="w-full sm:w-28"
                        data-testid={`meu-negocio-day-${day}-close`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card 4 - Service Modalities */}
      <Card data-testid="meu-negocio-services-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>Modalidades de Atendimento</CardTitle>
          </div>
          <CardDescription>Escolha como você atende seus clientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Entrega</p>
                  <p className="text-sm text-muted-foreground">Pedidos entregues no endereço do cliente</p>
                </div>
              </div>
              <Switch
                checked={serviceDelivery}
                onCheckedChange={setServiceDelivery}
                data-testid="meu-negocio-service-delivery-switch"
              />
            </div>
            
            {serviceDelivery && (
              <div className="flex items-center justify-between p-3 ml-6 rounded-lg bg-muted/30 border-l-2 border-primary/20">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Entrega por Localização</p>
                    <p className="text-sm text-muted-foreground">
                      Permite que clientes compartilhem localização via WhatsApp
                    </p>
                  </div>
                </div>
                <Switch
                  checked={locationSharingEnabled}
                  onCheckedChange={setLocationSharingEnabled}
                  data-testid="meu-negocio-location-sharing-switch"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Retirada no Local</p>
                  <p className="text-sm text-muted-foreground">Cliente retira o pedido no estabelecimento</p>
                </div>
              </div>
              <Switch
                checked={servicePickup}
                onCheckedChange={setServicePickup}
                data-testid="meu-negocio-service-pickup-switch"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Comer no Local</p>
                  <p className="text-sm text-muted-foreground">Cliente consome no estabelecimento</p>
                </div>
              </div>
              <Switch
                checked={serviceDineIn}
                onCheckedChange={setServiceDineIn}
                data-testid="meu-negocio-service-dinein-switch"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Armchair className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Atendimento em Mesa</p>
                  <p className="text-sm text-muted-foreground">Permite criar pedidos por mesa/comanda</p>
                </div>
              </div>
              <Switch
                checked={serviceTable}
                onCheckedChange={setServiceTable}
                data-testid="meu-negocio-service-table-switch"
              />
            </div>
          </div>
          
          {!serviceDelivery && !servicePickup && !serviceDineIn && (
            <p className="text-sm text-destructive">
              Selecione pelo menos uma modalidade de atendimento
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card - Order Scheduling */}
      <Card data-testid="meu-negocio-scheduling-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle>Agendamento de Pedidos</CardTitle>
          </div>
          <CardDescription>Permite que clientes agendem pedidos quando a loja está fechada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Permitir Agendamento</p>
                <p className="text-sm text-muted-foreground">
                  Clientes podem agendar pedidos para horários em que a loja estará aberta
                </p>
              </div>
            </div>
            <Switch
              checked={allowScheduling}
              onCheckedChange={setAllowScheduling}
              data-testid="meu-negocio-allow-scheduling-switch"
            />
          </div>
          {allowScheduling && (
            <p className="text-sm text-muted-foreground">
              Quando a loja estiver fechada, os clientes poderão agendar pedidos para o próximo horário disponível.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card - Payment Methods */}
      <Card data-testid="meu-negocio-payment-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Formas de Pagamento</CardTitle>
          </div>
          <CardDescription>Configure quais formas de pagamento você aceita</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* PIX */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Pix</p>
                    <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                  </div>
                </div>
                <Switch
                  checked={paymentPixEnabled}
                  onCheckedChange={setPaymentPixEnabled}
                  data-testid="meu-negocio-payment-pix-switch"
                />
              </div>
              
              {paymentPixEnabled && (
                <div className="ml-8 space-y-3 p-3 border rounded-lg bg-background" data-testid="meu-negocio-pix-config">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pixKeyType">Tipo da Chave</Label>
                      <Select value={pixKeyType} onValueChange={setPixKeyType}>
                        <SelectTrigger data-testid="meu-negocio-pix-type-select">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pixKey">Chave PIX</Label>
                      <Input
                        id="pixKey"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Sua chave PIX"
                        data-testid="meu-negocio-pix-key-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixHolderName">Nome do Titular</Label>
                    <Input
                      id="pixHolderName"
                      value={pixHolderName}
                      onChange={(e) => setPixHolderName(e.target.value)}
                      placeholder="Nome que aparece na transferência"
                      data-testid="meu-negocio-pix-holder-input"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure a chave PIX para que clientes possam pagar antecipadamente e enviar o comprovante.
                  </p>
                </div>
              )}
            </div>

            {/* Credit Card */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-sm text-muted-foreground">Pagamento na entrega/local</p>
                </div>
              </div>
              <Switch
                checked={paymentCreditEnabled}
                onCheckedChange={setPaymentCreditEnabled}
                data-testid="meu-negocio-payment-credit-switch"
              />
            </div>

            {/* Debit Card */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Cartão de Débito</p>
                  <p className="text-sm text-muted-foreground">Pagamento na entrega/local</p>
                </div>
              </div>
              <Switch
                checked={paymentDebitEnabled}
                onCheckedChange={setPaymentDebitEnabled}
                data-testid="meu-negocio-payment-debit-switch"
              />
            </div>

            {/* Cash */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Dinheiro</p>
                  <p className="text-sm text-muted-foreground">Pagamento na entrega/local</p>
                </div>
              </div>
              <Switch
                checked={paymentCashEnabled}
                onCheckedChange={setPaymentCashEnabled}
                data-testid="meu-negocio-payment-cash-switch"
              />
            </div>
          </div>
          
          {!paymentPixEnabled && !paymentCreditEnabled && !paymentDebitEnabled && !paymentCashEnabled && (
            <p className="text-sm text-destructive">
              Selecione pelo menos uma forma de pagamento
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 5 - Delivery Info */}
      <Card data-testid="meu-negocio-delivery-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle>Informações de Entrega</CardTitle>
          </div>
          <CardDescription>Configure informações sobre delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
              <Input
                id="deliveryFee"
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="0,00"
                data-testid="meu-negocio-delivery-fee-input"
              />
              <p className="text-xs text-muted-foreground">
                Taxa fixa cobrada em todos os pedidos de entrega
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderValue">Pedido Mínimo (R$)</Label>
              <Input
                id="minOrderValue"
                type="number"
                min="0"
                step="0.01"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                placeholder="0,00"
                data-testid="meu-negocio-min-order-input"
              />
              <p className="text-xs text-muted-foreground">
                Valor mínimo para aceitar pedidos
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deliveryInfo">Informações de Entrega</Label>
            <Textarea
              id="deliveryInfo"
              value={deliveryInfo}
              onChange={(e) => setDeliveryInfo(e.target.value)}
              placeholder="Ex: Entregamos em toda a cidade. Taxa de entrega a partir de R$ 5,00..."
              rows={3}
              data-testid="meu-negocio-delivery-info-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 6 - Link da Loja */}
      <Card data-testid="meu-negocio-link-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle>Link da Loja</CardTitle>
          </div>
          <CardDescription>Configure o link público da sua loja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug da Loja</Label>
            <Input
              id="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="minha-loja"
              className="lowercase"
              data-testid="meu-negocio-slug-input"
            />
            <p className="text-sm text-muted-foreground">
              Use apenas letras minúsculas, números e hífens.
            </p>
          </div>

          {storeUrl && (
            <div className="space-y-2">
              <Label>Link da sua loja</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md" data-testid="meu-negocio-store-url">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{storeUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                  data-testid="meu-negocio-copy-link-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          size="lg"
          data-testid="meu-negocio-save-button"
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
