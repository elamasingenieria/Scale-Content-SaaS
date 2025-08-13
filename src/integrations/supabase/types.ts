export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      branding_assets: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          storage_path: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          storage_path: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          storage_path?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credits_ledger: {
        Row: {
          amount: number
          created_at: string
          event_id: string | null
          id: string
          note: string | null
          payment_id: string | null
          source: Database["public"]["Enums"]["credit_source_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_id?: string | null
          id?: string
          note?: string | null
          payment_id?: string | null
          source: Database["public"]["Enums"]["credit_source_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_id?: string | null
          id?: string
          note?: string | null
          payment_id?: string | null
          source?: Database["public"]["Enums"]["credit_source_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          credits_granted: number
          currency: string
          id: string
          metadata: Json | null
          payment_kind: Database["public"]["Enums"]["payment_kind_enum"]
          status: string
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_object: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          credits_granted?: number
          currency?: string
          id?: string
          metadata?: Json | null
          payment_kind: Database["public"]["Enums"]["payment_kind_enum"]
          status: string
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_object: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          credits_granted?: number
          currency?: string
          id?: string
          metadata?: Json | null
          payment_kind?: Database["public"]["Enums"]["payment_kind_enum"]
          status?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_object?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ugc_script_forms: {
        Row: {
          additional_details: string | null
          app_display_method: string | null
          app_parts_to_show: string | null
          brand_pronunciation_guide: string | null
          brand_values: string | null
          call_to_action: string | null
          cantidad_creadores: number | null
          client_name: string
          competitive_differentiators: string | null
          created_at: string
          creator_activity_while_talking: string | null
          creator_appearance_style: string | null
          creator_appearance_style_other: string | null
          creator_clothing: string | null
          creator_clothing_other: string | null
          creator_speech_style: string | null
          creators_and_videos_count: string
          delivery_deadline: string | null
          especificaciones_creadores: string | null
          existing_script_links: string | null
          id: string
          key_features_benefits: string | null
          key_message: string | null
          main_objective: string | null
          product_display_timing: string | null
          product_or_service: string | null
          recording_formats: string[] | null
          recording_formats_other: string | null
          recording_locations: string | null
          reference_ugc_videos: string | null
          script_adherence: string | null
          target_audience: string | null
          technical_details: string | null
          updated_at: string
          user_id: string
          video_duration: string
          video_duration_other: string | null
          video_tone: string | null
        }
        Insert: {
          additional_details?: string | null
          app_display_method?: string | null
          app_parts_to_show?: string | null
          brand_pronunciation_guide?: string | null
          brand_values?: string | null
          call_to_action?: string | null
          cantidad_creadores?: number | null
          client_name: string
          competitive_differentiators?: string | null
          created_at?: string
          creator_activity_while_talking?: string | null
          creator_appearance_style?: string | null
          creator_appearance_style_other?: string | null
          creator_clothing?: string | null
          creator_clothing_other?: string | null
          creator_speech_style?: string | null
          creators_and_videos_count: string
          delivery_deadline?: string | null
          especificaciones_creadores?: string | null
          existing_script_links?: string | null
          id?: string
          key_features_benefits?: string | null
          key_message?: string | null
          main_objective?: string | null
          product_display_timing?: string | null
          product_or_service?: string | null
          recording_formats?: string[] | null
          recording_formats_other?: string | null
          recording_locations?: string | null
          reference_ugc_videos?: string | null
          script_adherence?: string | null
          target_audience?: string | null
          technical_details?: string | null
          updated_at?: string
          user_id: string
          video_duration: string
          video_duration_other?: string | null
          video_tone?: string | null
        }
        Update: {
          additional_details?: string | null
          app_display_method?: string | null
          app_parts_to_show?: string | null
          brand_pronunciation_guide?: string | null
          brand_values?: string | null
          call_to_action?: string | null
          cantidad_creadores?: number | null
          client_name?: string
          competitive_differentiators?: string | null
          created_at?: string
          creator_activity_while_talking?: string | null
          creator_appearance_style?: string | null
          creator_appearance_style_other?: string | null
          creator_clothing?: string | null
          creator_clothing_other?: string | null
          creator_speech_style?: string | null
          creators_and_videos_count?: string
          delivery_deadline?: string | null
          especificaciones_creadores?: string | null
          existing_script_links?: string | null
          id?: string
          key_features_benefits?: string | null
          key_message?: string | null
          main_objective?: string | null
          product_display_timing?: string | null
          product_or_service?: string | null
          recording_formats?: string[] | null
          recording_formats_other?: string | null
          recording_locations?: string | null
          reference_ugc_videos?: string | null
          script_adherence?: string | null
          target_audience?: string | null
          technical_details?: string | null
          updated_at?: string
          user_id?: string
          video_duration?: string
          video_duration_other?: string | null
          video_tone?: string | null
        }
        Relationships: []
      }
      user_intake: {
        Row: {
          completed_at: string | null
          created_at: string
          is_completed: boolean | null
          metrics_scraped_at: string | null
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          is_completed?: boolean | null
          metrics_scraped_at?: string | null
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          is_completed?: boolean | null
          metrics_scraped_at?: string | null
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_metrics: {
        Row: {
          avg_comments: number | null
          avg_likes: number | null
          created_at: string
          engagement_rate: number | null
          followers_count: number | null
          handle: string
          id: string
          last_post_date: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_comments?: number | null
          avg_likes?: number | null
          created_at?: string
          engagement_rate?: number | null
          followers_count?: number | null
          handle: string
          id?: string
          last_post_date?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_comments?: number | null
          avg_likes?: number | null
          created_at?: string
          engagement_rate?: number | null
          followers_count?: number | null
          handle?: string
          id?: string
          last_post_date?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          posts_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_social_links: {
        Row: {
          created_at: string
          id: string
          instagram_url: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      video_request_assets: {
        Row: {
          created_at: string
          id: string
          is_private: boolean
          kind: Database["public"]["Enums"]["asset_kind_enum"]
          metadata: Json | null
          path: string
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_private?: boolean
          kind: Database["public"]["Enums"]["asset_kind_enum"]
          metadata?: Json | null
          path: string
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_private?: boolean
          kind?: Database["public"]["Enums"]["asset_kind_enum"]
          metadata?: Json | null
          path?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_request_assets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "video_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      video_requests: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["video_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["video_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["video_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          event_type: string | null
          id: string
          idempotency_key: string | null
          payload: Json | null
          provider: string | null
          request_id: string | null
          response_data: Json | null
          status: number | null
          user_id: string | null
          webhook_type: Database["public"]["Enums"]["webhook_type"] | null
        }
        Insert: {
          created_at?: string
          direction: string
          error?: string | null
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json | null
          provider?: string | null
          request_id?: string | null
          response_data?: Json | null
          status?: number | null
          user_id?: string | null
          webhook_type?: Database["public"]["Enums"]["webhook_type"] | null
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json | null
          provider?: string | null
          request_id?: string | null
          response_data?: Json | null
          status?: number | null
          user_id?: string | null
          webhook_type?: Database["public"]["Enums"]["webhook_type"] | null
        }
        Relationships: []
      }
    }
    Views: {
      v_credit_balances: {
        Row: {
          balance: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_user_metrics_summary: {
        Row: {
          last_updated: string | null
          platforms_count: number | null
          platforms_data: Json | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      rpc_add_video_asset: {
        Args: {
          p_request_id: string
          p_kind: Database["public"]["Enums"]["asset_kind_enum"]
          p_path: string
          p_metadata?: Json
        }
        Returns: string
      }
      rpc_consume_credit_for_request: {
        Args: { p_user_id: string; p_request_id: string; p_note?: string }
        Returns: string
      }
      rpc_create_video_request: {
        Args: { p_user_id?: string }
        Returns: string
      }
      rpc_get_credit_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      rpc_grant_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_source: Database["public"]["Enums"]["credit_source_enum"]
          p_event_id: string
          p_note?: string
        }
        Returns: string
      }
      rpc_mark_intake_completed: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      rpc_record_user_metrics: {
        Args: {
          p_user_id: string
          p_platform: Database["public"]["Enums"]["social_platform"]
          p_handle: string
          p_followers_count?: number
          p_engagement_rate?: number
          p_avg_likes?: number
          p_avg_comments?: number
          p_posts_count?: number
          p_last_post_date?: string
        }
        Returns: string
      }
      rpc_register_branding_asset: {
        Args: { p_type: string; p_storage_path: string; p_metadata?: Json }
        Returns: string
      }
      rpc_upsert_ugc_script_form: {
        Args: { p_payload: Json }
        Returns: string
      }
      rpc_upsert_user_intake: {
        Args: { p_payload: Json }
        Returns: string
      }
      rpc_upsert_user_social_links: {
        Args: {
          p_instagram_url?: string
          p_tiktok_url?: string
          p_youtube_url?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "collab"
      asset_kind_enum:
        | "branding_logo"
        | "branding_palette"
        | "broll"
        | "script"
        | "edited_video"
        | "thumbnail"
        | "other"
      credit_source: "subscription" | "purchase"
      credit_source_enum:
        | "stripe_subscription"
        | "stripe_topup"
        | "refund"
        | "manual_adjustment"
        | "admin_grant"
      payment_kind: "subscription" | "purchase"
      payment_kind_enum: "subscription" | "one_off"
      social_platform:
        | "instagram"
        | "youtube"
        | "tiktok"
        | "facebook"
        | "twitter"
      video_request_status:
        | "QUEUED"
        | "IDEATION"
        | "PRE_REVIEW_PENDING"
        | "PRE_APPROVED"
        | "GENERATING"
        | "EDITING"
        | "POST_REVIEW_PENDING"
        | "POST_APPROVED"
        | "READY"
        | "EXPORTED"
        | "FAILED"
      webhook_type:
        | "metrics_scraping"
        | "video_processing"
        | "stripe_payment"
        | "n8n_callback"
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
      app_role: ["admin", "user", "collab"],
      asset_kind_enum: [
        "branding_logo",
        "branding_palette",
        "broll",
        "script",
        "edited_video",
        "thumbnail",
        "other",
      ],
      credit_source: ["subscription", "purchase"],
      credit_source_enum: [
        "stripe_subscription",
        "stripe_topup",
        "refund",
        "manual_adjustment",
        "admin_grant",
      ],
      payment_kind: ["subscription", "purchase"],
      payment_kind_enum: ["subscription", "one_off"],
      social_platform: [
        "instagram",
        "youtube",
        "tiktok",
        "facebook",
        "twitter",
      ],
      video_request_status: [
        "QUEUED",
        "IDEATION",
        "PRE_REVIEW_PENDING",
        "PRE_APPROVED",
        "GENERATING",
        "EDITING",
        "POST_REVIEW_PENDING",
        "POST_APPROVED",
        "READY",
        "EXPORTED",
        "FAILED",
      ],
      webhook_type: [
        "metrics_scraping",
        "video_processing",
        "stripe_payment",
        "n8n_callback",
      ],
    },
  },
} as const
