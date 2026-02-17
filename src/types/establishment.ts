import type { Tables } from "@/integrations/supabase/types";

export type Establishment = Tables<"establishments">;

/** Public-facing establishment data from the establishments_public view */
export interface PublicEstablishment {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  opening_hours: OpeningHours | null;
  delivery_info: string | null;
  min_order_value: number | null;
  delivery_fee: number | null;
  theme_primary_color: string | null;
  theme_secondary_color: string | null;
  service_delivery: boolean | null;
  service_pickup: boolean | null;
  service_dine_in: boolean | null;
  allow_scheduling: boolean | null;
  temporary_closed: boolean | null;
  payment_pix_enabled: boolean | null;
  payment_credit_enabled: boolean | null;
  payment_debit_enabled: boolean | null;
  payment_cash_enabled: boolean | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_holder_name: string | null;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}
