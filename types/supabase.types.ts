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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string | null
          created_at: string | null
          delivery_instructions: string | null
          id: string
          is_default: boolean | null
          landmark: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          pincode: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bottle_returns: {
        Row: {
          collected_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          quantity: number | null
          return_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          collected_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          quantity?: number | null
          return_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          collected_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          quantity?: number | null
          return_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bottle_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_preferences: {
        Row: {
          created_at: string | null
          hand_delivery: boolean | null
          id: string
          leave_at_door: boolean | null
          preference_type: string | null
          preferred_delivery_time: string | null
          ring_doorbell: boolean | null
          special_instructions: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hand_delivery?: boolean | null
          id?: string
          leave_at_door?: boolean | null
          preference_type?: string | null
          preferred_delivery_time?: string | null
          ring_doorbell?: boolean | null
          special_instructions?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hand_delivery?: boolean | null
          id?: string
          leave_at_door?: boolean | null
          preference_type?: string | null
          preferred_delivery_time?: string | null
          ring_doorbell?: boolean | null
          special_instructions?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          language: string | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          reference_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          reference_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          reference_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          offer_type: string | null
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          offer_type?: string | null
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          offer_type?: string | null
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_id: string | null
          amount: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_date: string
          delivery_notes: string | null
          id: string
          order_number: string
          product_id: string | null
          quantity: number | null
          status: string | null
          subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_id?: string | null
          amount?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_date: string
          delivery_notes?: string | null
          id?: string
          order_number: string
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_id?: string | null
          amount?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_date?: string
          delivery_notes?: string | null
          id?: string
          order_number?: string
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
          volume?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referee_id: string | null
          referral_code: string
          referrer_id: string | null
          reward_amount: number | null
          rewarded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referee_id?: string | null
          referral_code: string
          referrer_id?: string | null
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referee_id?: string | null
          referral_code?: string
          referrer_id?: string | null
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_holds: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_holds_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          address_id: string | null
          created_at: string | null
          custom_quantities: Json | null
          delivery_time: string | null
          end_date: string | null
          frequency: string | null
          id: string
          interval_days: number | null
          product_id: string | null
          quantity: number | null
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_id?: string | null
          created_at?: string | null
          custom_quantities?: Json | null
          delivery_time?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          interval_days?: number | null
          product_id?: string | null
          quantity?: number | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_id?: string | null
          created_at?: string | null
          custom_quantities?: Json | null
          delivery_time?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          interval_days?: number | null
          product_id?: string | null
          quantity?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          payment_gateway_id: string | null
          payment_gateway_response: Json | null
          payment_method: string | null
          status: string | null
          transaction_id: string
          type: string
          updated_at: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_gateway_id?: string | null
          payment_gateway_response?: Json | null
          payment_method?: string | null
          status?: string | null
          transaction_id: string
          type: string
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_gateway_id?: string | null
          payment_gateway_response?: Json | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          auto_recharge_amount: number | null
          auto_recharge_enabled: boolean | null
          auto_recharge_trigger_amount: number | null
          balance: number | null
          created_at: string | null
          id: string
          low_balance_threshold: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_recharge_amount?: number | null
          auto_recharge_enabled?: boolean | null
          auto_recharge_trigger_amount?: number | null
          balance?: number | null
          created_at?: string | null
          id?: string
          low_balance_threshold?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_recharge_amount?: number | null
          auto_recharge_enabled?: boolean | null
          auto_recharge_trigger_amount?: number | null
          balance?: number | null
          created_at?: string | null
          id?: string
          low_balance_threshold?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
