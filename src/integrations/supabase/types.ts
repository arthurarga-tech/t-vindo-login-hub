export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addon_groups: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string
          establishment_id: string
          id: string
          max_selections: number
          min_selections: number
          name: string
          order_position: number | null
          required: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          establishment_id: string
          id?: string
          max_selections?: number
          min_selections?: number
          name: string
          order_position?: number | null
          required?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          establishment_id?: string
          id?: string
          max_selections?: number
          min_selections?: number
          name?: string
          order_position?: number | null
          required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_groups_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_groups_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          active: boolean | null
          addon_group_id: string
          created_at: string
          id: string
          name: string
          order_position: number | null
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          addon_group_id: string
          created_at?: string
          id?: string
          name: string
          order_position?: number | null
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          addon_group_id?: string
          created_at?: string
          id?: string
          name?: string
          order_position?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          establishment_id: string
          id: string
          image_url: string | null
          name: string
          order_position: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          establishment_id: string
          id?: string
          image_url?: string | null
          name: string
          order_position?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          establishment_id?: string
          id?: string
          image_url?: string | null
          name?: string
          order_position?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      category_addon_groups: {
        Row: {
          addon_group_id: string
          category_id: string
          created_at: string
          id: string
        }
        Insert: {
          addon_group_id: string
          category_id: string
          created_at?: string
          id?: string
        }
        Update: {
          addon_group_id?: string
          category_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_addon_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          city: string | null
          created_at: string
          establishment_id: string
          id: string
          name: string
          neighborhood: string | null
          order_origin: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          establishment_id: string
          id?: string
          name: string
          neighborhood?: string | null
          order_origin?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
          neighborhood?: string | null
          order_origin?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_members: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          role: Database["public"]["Enums"]["establishment_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          role?: Database["public"]["Enums"]["establishment_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          role?: Database["public"]["Enums"]["establishment_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_members_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_members_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          allow_scheduling: boolean | null
          banner_url: string | null
          card_credit_fee: number | null
          card_debit_fee: number | null
          city: string | null
          created_at: string
          delivery_fee: number | null
          delivery_info: string | null
          description: string | null
          id: string
          location_sharing_enabled: boolean | null
          logo_url: string | null
          manual_delivery_time: number | null
          manual_preparation_time: number | null
          min_order_value: number | null
          name: string
          neighborhood: string | null
          notification_sound_enabled: boolean | null
          opening_hours: Json | null
          owner_id: string
          payment_cash_enabled: boolean | null
          payment_credit_enabled: boolean | null
          payment_debit_enabled: boolean | null
          payment_pix_enabled: boolean | null
          phone: string | null
          pix_holder_name: string | null
          pix_key: string | null
          pix_key_type: string | null
          preparation_time_mode: string | null
          print_addon_prices: boolean | null
          print_contrast_high: boolean | null
          print_font_bold: boolean | null
          print_font_size: number | null
          print_line_height: number | null
          print_margin_left: number | null
          print_margin_right: number | null
          print_mode: string | null
          printer_name: string | null
          service_delivery: boolean
          service_dine_in: boolean
          service_pickup: boolean
          service_table: boolean | null
          slug: string | null
          temporary_closed: boolean | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string
          whatsapp_message_templates: Json | null
          whatsapp_notifications_enabled: boolean | null
        }
        Insert: {
          address?: string | null
          allow_scheduling?: boolean | null
          banner_url?: string | null
          card_credit_fee?: number | null
          card_debit_fee?: number | null
          city?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_info?: string | null
          description?: string | null
          id?: string
          location_sharing_enabled?: boolean | null
          logo_url?: string | null
          manual_delivery_time?: number | null
          manual_preparation_time?: number | null
          min_order_value?: number | null
          name: string
          neighborhood?: string | null
          notification_sound_enabled?: boolean | null
          opening_hours?: Json | null
          owner_id: string
          payment_cash_enabled?: boolean | null
          payment_credit_enabled?: boolean | null
          payment_debit_enabled?: boolean | null
          payment_pix_enabled?: boolean | null
          phone?: string | null
          pix_holder_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          preparation_time_mode?: string | null
          print_addon_prices?: boolean | null
          print_contrast_high?: boolean | null
          print_font_bold?: boolean | null
          print_font_size?: number | null
          print_line_height?: number | null
          print_margin_left?: number | null
          print_margin_right?: number | null
          print_mode?: string | null
          printer_name?: string | null
          service_delivery?: boolean
          service_dine_in?: boolean
          service_pickup?: boolean
          service_table?: boolean | null
          slug?: string | null
          temporary_closed?: boolean | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string
          whatsapp_message_templates?: Json | null
          whatsapp_notifications_enabled?: boolean | null
        }
        Update: {
          address?: string | null
          allow_scheduling?: boolean | null
          banner_url?: string | null
          card_credit_fee?: number | null
          card_debit_fee?: number | null
          city?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_info?: string | null
          description?: string | null
          id?: string
          location_sharing_enabled?: boolean | null
          logo_url?: string | null
          manual_delivery_time?: number | null
          manual_preparation_time?: number | null
          min_order_value?: number | null
          name?: string
          neighborhood?: string | null
          notification_sound_enabled?: boolean | null
          opening_hours?: Json | null
          owner_id?: string
          payment_cash_enabled?: boolean | null
          payment_credit_enabled?: boolean | null
          payment_debit_enabled?: boolean | null
          payment_pix_enabled?: boolean | null
          phone?: string | null
          pix_holder_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          preparation_time_mode?: string | null
          print_addon_prices?: boolean | null
          print_contrast_high?: boolean | null
          print_font_bold?: boolean | null
          print_font_size?: number | null
          print_line_height?: number | null
          print_margin_left?: number | null
          print_margin_right?: number | null
          print_mode?: string | null
          printer_name?: string | null
          service_delivery?: boolean
          service_dine_in?: boolean
          service_pickup?: boolean
          service_table?: boolean | null
          slug?: string | null
          temporary_closed?: boolean | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string
          whatsapp_message_templates?: Json | null
          whatsapp_notifications_enabled?: boolean | null
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          active: boolean | null
          created_at: string
          establishment_id: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          establishment_id: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          establishment_id?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          category_id: string
          created_at: string
          description: string
          establishment_id: string
          fee_amount: number | null
          gross_amount: number
          id: string
          net_amount: number
          order_id: string | null
          payment_method: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description: string
          establishment_id: string
          fee_amount?: number | null
          gross_amount: number
          id?: string
          net_amount: number
          order_id?: string | null
          payment_method?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string
          establishment_id?: string
          fee_amount?: number | null
          gross_amount?: number
          id?: string
          net_amount?: number
          order_id?: string | null
          payment_method?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_id: string
          addon_name: string
          addon_price: number
          created_at: string
          id: string
          order_item_id: string
          quantity: number
        }
        Insert: {
          addon_id: string
          addon_name: string
          addon_price: number
          created_at?: string
          id?: string
          order_item_id: string
          quantity?: number
        }
        Update: {
          addon_id?: string
          addon_name?: string
          addon_price?: number
          created_at?: string
          id?: string
          order_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_status: string
          observation: string | null
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_status?: string
          observation?: string | null
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_status?: string
          observation?: string | null
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          change_for: number | null
          created_at: string
          customer_display_name: string | null
          customer_id: string | null
          delivery_fee: number
          establishment_id: string
          id: string
          is_open_tab: boolean | null
          notes: string | null
          order_number: number
          order_subtype: string | null
          order_type: string
          payment_method: string
          scheduled_for: string | null
          status: string
          subtotal: number
          table_id: string | null
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          change_for?: number | null
          created_at?: string
          customer_display_name?: string | null
          customer_id?: string | null
          delivery_fee?: number
          establishment_id: string
          id?: string
          is_open_tab?: boolean | null
          notes?: string | null
          order_number?: number
          order_subtype?: string | null
          order_type?: string
          payment_method: string
          scheduled_for?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          change_for?: number | null
          created_at?: string
          customer_display_name?: string | null
          customer_id?: string | null
          delivery_fee?: number
          establishment_id?: string
          id?: string
          is_open_tab?: boolean | null
          notes?: string | null
          order_number?: number
          order_subtype?: string | null
          order_type?: string
          payment_method?: string
          scheduled_for?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_exclusions: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_exclusions_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_exclusions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_groups: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string
          description: string | null
          establishment_id: string
          id: string
          image_url: string | null
          name: string
          order_position: number | null
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          establishment_id: string
          id?: string
          image_url?: string | null
          name: string
          order_position?: number | null
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string
          id?: string
          image_url?: string | null
          name?: string
          order_position?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          establishment_id: string | null
          establishment_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          name: string
          price_annual: number
          price_monthly: number
          price_semiannual: number
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_semiannual: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          price_annual?: number
          price_monthly?: number
          price_semiannual?: number
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_semiannual?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          price_annual?: number
          price_monthly?: number
          price_semiannual?: number
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_semiannual?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          establishment_id: string
          grace_period_ends_at: string | null
          id: string
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          establishment_id: string
          grace_period_ends_at?: string | null
          id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          establishment_id?: string
          grace_period_ends_at?: string | null
          id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: true
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      table_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          table_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          table_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_payments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          closed_at: string | null
          created_at: string
          customer_display_name: string | null
          customer_id: string | null
          establishment_id: string
          id: string
          notes: string | null
          opened_at: string
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          customer_display_name?: string | null
          customer_id?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          opened_at?: string
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          customer_display_name?: string | null
          customer_id?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          opened_at?: string
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      establishments_public: {
        Row: {
          address: string | null
          allow_scheduling: boolean | null
          banner_url: string | null
          city: string | null
          created_at: string | null
          delivery_fee: number | null
          delivery_info: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          min_order_value: number | null
          name: string | null
          neighborhood: string | null
          opening_hours: Json | null
          payment_cash_enabled: boolean | null
          payment_credit_enabled: boolean | null
          payment_debit_enabled: boolean | null
          payment_pix_enabled: boolean | null
          phone: string | null
          pix_holder_name: string | null
          pix_key: string | null
          pix_key_type: string | null
          service_delivery: boolean | null
          service_dine_in: boolean | null
          service_pickup: boolean | null
          slug: string | null
          temporary_closed: boolean | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          allow_scheduling?: boolean | null
          banner_url?: string | null
          city?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_info?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          min_order_value?: number | null
          name?: string | null
          neighborhood?: string | null
          opening_hours?: Json | null
          payment_cash_enabled?: boolean | null
          payment_credit_enabled?: boolean | null
          payment_debit_enabled?: boolean | null
          payment_pix_enabled?: boolean | null
          phone?: string | null
          pix_holder_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          service_delivery?: boolean | null
          service_dine_in?: boolean | null
          service_pickup?: boolean | null
          slug?: string | null
          temporary_closed?: boolean | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          allow_scheduling?: boolean | null
          banner_url?: string | null
          city?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_info?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          min_order_value?: number | null
          name?: string | null
          neighborhood?: string | null
          opening_hours?: Json | null
          payment_cash_enabled?: boolean | null
          payment_credit_enabled?: boolean | null
          payment_debit_enabled?: boolean | null
          payment_pix_enabled?: boolean | null
          phone?: string | null
          pix_holder_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          service_delivery?: boolean | null
          service_dine_in?: boolean | null
          service_pickup?: boolean | null
          slug?: string | null
          temporary_closed?: boolean | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_finalize_old_orders: { Args: never; Returns: number }
      close_table: {
        Args: { p_payments: Json; p_table_id: string }
        Returns: undefined
      }
      create_default_financial_categories: {
        Args: { est_id: string }
        Returns: undefined
      }
      create_or_update_public_customer: {
        Args: {
          p_address?: string
          p_address_complement?: string
          p_address_number?: string
          p_city?: string
          p_establishment_id: string
          p_name: string
          p_neighborhood?: string
          p_phone: string
        }
        Returns: string
      }
      create_public_order:
        | {
            Args: {
              p_change_for?: number
              p_customer_id: string
              p_delivery_fee: number
              p_establishment_id: string
              p_notes?: string
              p_order_type: string
              p_payment_method: string
              p_scheduled_for?: string
              p_subtotal: number
              p_total: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_change_for?: number
              p_customer_display_name?: string
              p_customer_id: string
              p_delivery_fee: number
              p_establishment_id: string
              p_notes?: string
              p_order_type: string
              p_payment_method: string
              p_scheduled_for?: string
              p_subtotal: number
              p_total: number
            }
            Returns: Json
          }
      create_public_order_item_addons: {
        Args: { p_addons: Json }
        Returns: undefined
      }
      create_public_order_items: { Args: { p_items: Json }; Returns: Json }
      create_table_order: {
        Args: { p_items: Json; p_table_id: string }
        Returns: Json
      }
      delete_customer_cascade: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
      get_customer_delete_counts: {
        Args: { p_customer_id: string }
        Returns: {
          financial_transaction_count: number
          order_count: number
          order_item_count: number
        }[]
      }
      get_customer_stats_summary: {
        Args: {
          p_establishment_id: string
          p_neighborhood?: string
          p_search?: string
        }
        Returns: {
          customers_with_orders: number
          total_customers: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_customers_with_stats: {
        Args: {
          p_establishment_id: string
          p_limit?: number
          p_neighborhood?: string
          p_offset?: number
          p_search?: string
          p_sort_by?: string
        }
        Returns: {
          address: string
          address_complement: string
          address_number: string
          city: string
          created_at: string
          id: string
          last_order_at: string
          name: string
          neighborhood: string
          phone: string
          total_count: number
          total_orders: number
          total_spent: number
          updated_at: string
        }[]
      }
      get_public_order_by_id: { Args: { p_order_id: string }; Returns: Json }
      get_public_order_by_number: {
        Args: { p_establishment_id: string; p_order_number: number }
        Returns: Json
      }
      get_user_establishment_id: { Args: { _user_id: string }; Returns: string }
      is_establishment_member: {
        Args: { _establishment_id: string; _user_id: string }
        Returns: boolean
      }
      is_establishment_owner: {
        Args: { _establishment_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      billing_cycle: "monthly" | "semiannual" | "annual"
      establishment_role:
        | "owner"
        | "manager"
        | "employee"
        | "attendant"
        | "kitchen"
        | "waiter"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_cycle: ["monthly", "semiannual", "annual"],
      establishment_role: [
        "owner",
        "manager",
        "employee",
        "attendant",
        "kitchen",
        "waiter",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
    },
  },
} as const
