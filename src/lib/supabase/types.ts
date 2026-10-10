// Generated from the BeanMora public schema on 2026-10-09. Regenerate after schema changes.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bean_flavor_notes: {
        Row: {
          bean_id: string
          created_at: string
          flavor: string
          id: string
        }
        Insert: {
          bean_id: string
          created_at?: string
          flavor: string
          id?: string
        }
        Update: {
          bean_id?: string
          created_at?: string
          flavor?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bean_flavor_notes_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
        ]
      }
      bean_images: {
        Row: {
          bean_id: string
          created_at: string
          id: string
          image_is_official: boolean
          image_last_verified_at: string | null
          image_owner: string | null
          image_source_url: string | null
          image_usage_status: string
          position: number
          url: string
        }
        Insert: {
          bean_id: string
          created_at?: string
          id?: string
          image_is_official?: boolean
          image_last_verified_at?: string | null
          image_owner?: string | null
          image_source_url?: string | null
          image_usage_status?: string
          position?: number
          url: string
        }
        Update: {
          bean_id?: string
          created_at?: string
          id?: string
          image_is_official?: boolean
          image_last_verified_at?: string | null
          image_owner?: string | null
          image_source_url?: string | null
          image_usage_status?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "bean_images_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
        ]
      }
      bean_reviews: {
        Row: {
          acidity: number | null
          aftertaste: number | null
          aroma: number | null
          balance: number | null
          body: number | null
          brew_method_used: string | null
          clarity: number | null
          created_at: string
          flavors_perceived: string[]
          id: string
          overall_rating: number
          review_text: string | null
          roast_date: string | null
          roasted_product_id: string
          sweetness: number | null
          updated_at: string
          user_id: string
          value_for_money: number | null
          would_buy_again: boolean | null
        }
        Insert: {
          acidity?: number | null
          aftertaste?: number | null
          aroma?: number | null
          balance?: number | null
          body?: number | null
          brew_method_used?: string | null
          clarity?: number | null
          created_at?: string
          flavors_perceived?: string[]
          id?: string
          overall_rating: number
          review_text?: string | null
          roast_date?: string | null
          roasted_product_id: string
          sweetness?: number | null
          updated_at?: string
          user_id: string
          value_for_money?: number | null
          would_buy_again?: boolean | null
        }
        Update: {
          acidity?: number | null
          aftertaste?: number | null
          aroma?: number | null
          balance?: number | null
          body?: number | null
          brew_method_used?: string | null
          clarity?: number | null
          created_at?: string
          flavors_perceived?: string[]
          id?: string
          overall_rating?: number
          review_text?: string | null
          roast_date?: string | null
          roasted_product_id?: string
          sweetness?: number | null
          updated_at?: string
          user_id?: string
          value_for_money?: number | null
          would_buy_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bean_reviews_brew_method_used_fkey"
            columns: ["brew_method_used"]
            isOneToOne: false
            referencedRelation: "brew_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "bean_reviews_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "bean_reviews_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bean_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bean_saves: {
        Row: {
          bean_id: string
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          bean_id: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          bean_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bean_saves_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bean_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beans: {
        Row: {
          acidity_level: number | null
          altitude_meters: number | null
          bag_weight_grams: number | null
          body_level: number | null
          created_at: string
          created_by: string | null
          data_confidence: string
          description_ar: string | null
          description_en: string | null
          discovered_at: string
          discovery_run_id: string | null
          farm: string | null
          harvest_season: string | null
          id: string
          image_kind: string
          image_source_url: string | null
          image_url: string | null
          image_usage_status: string | null
          is_published: boolean
          last_verified_at: string | null
          name_ar: string
          name_en: string
          origin_country: string | null
          origin_region: string | null
          process: string | null
          requires_review: boolean
          roast_date: string | null
          roast_level: string | null
          roaster_id: string | null
          roaster_website_url: string | null
          sensory_profile: Json
          slug: string
          source_name: string | null
          source_type: string | null
          source_url: string | null
          suitable_for_espresso: boolean
          suitable_for_v60: boolean
          suitable_for_xbloom: boolean
          sweetness_level: number | null
          updated_at: string
          varietal: string | null
        }
        Insert: {
          acidity_level?: number | null
          altitude_meters?: number | null
          bag_weight_grams?: number | null
          body_level?: number | null
          created_at?: string
          created_by?: string | null
          data_confidence?: string
          description_ar?: string | null
          description_en?: string | null
          discovered_at?: string
          discovery_run_id?: string | null
          farm?: string | null
          harvest_season?: string | null
          id?: string
          image_kind?: string
          image_source_url?: string | null
          image_url?: string | null
          image_usage_status?: string | null
          is_published?: boolean
          last_verified_at?: string | null
          name_ar: string
          name_en: string
          origin_country?: string | null
          origin_region?: string | null
          process?: string | null
          requires_review?: boolean
          roast_date?: string | null
          roast_level?: string | null
          roaster_id?: string | null
          roaster_website_url?: string | null
          sensory_profile?: Json
          slug: string
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          suitable_for_espresso?: boolean
          suitable_for_v60?: boolean
          suitable_for_xbloom?: boolean
          sweetness_level?: number | null
          updated_at?: string
          varietal?: string | null
        }
        Update: {
          acidity_level?: number | null
          altitude_meters?: number | null
          bag_weight_grams?: number | null
          body_level?: number | null
          created_at?: string
          created_by?: string | null
          data_confidence?: string
          description_ar?: string | null
          description_en?: string | null
          discovered_at?: string
          discovery_run_id?: string | null
          farm?: string | null
          harvest_season?: string | null
          id?: string
          image_kind?: string
          image_source_url?: string | null
          image_url?: string | null
          image_usage_status?: string | null
          is_published?: boolean
          last_verified_at?: string | null
          name_ar?: string
          name_en?: string
          origin_country?: string | null
          origin_region?: string | null
          process?: string | null
          requires_review?: boolean
          roast_date?: string | null
          roast_level?: string | null
          roaster_id?: string | null
          roaster_website_url?: string | null
          sensory_profile?: Json
          slug?: string
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          suitable_for_espresso?: boolean
          suitable_for_v60?: boolean
          suitable_for_xbloom?: boolean
          sweetness_level?: number | null
          updated_at?: string
          varietal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beans_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_log_adjustments: {
        Row: {
          brew_log_id: string
          created_at: string
          field_changed: string
          id: string
          new_value: string | null
          previous_brew_log_id: string | null
          previous_value: string | null
          reason: string | null
        }
        Insert: {
          brew_log_id: string
          created_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          previous_brew_log_id?: string | null
          previous_value?: string | null
          reason?: string | null
        }
        Update: {
          brew_log_id?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          previous_brew_log_id?: string | null
          previous_value?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brew_log_adjustments_brew_log_id_fkey"
            columns: ["brew_log_id"]
            isOneToOne: false
            referencedRelation: "brew_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_log_adjustments_previous_brew_log_id_fkey"
            columns: ["previous_brew_log_id"]
            isOneToOne: false
            referencedRelation: "brew_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_log_taste_scores: {
        Row: {
          acidity: number | null
          balance: number | null
          bitterness: number | null
          body: string | null
          brew_log_id: string
          created_at: string
          id: string
          overall_rating: number | null
          sweetness: number | null
        }
        Insert: {
          acidity?: number | null
          balance?: number | null
          bitterness?: number | null
          body?: string | null
          brew_log_id: string
          created_at?: string
          id?: string
          overall_rating?: number | null
          sweetness?: number | null
        }
        Update: {
          acidity?: number | null
          balance?: number | null
          bitterness?: number | null
          body?: string | null
          brew_log_id?: string
          created_at?: string
          id?: string
          overall_rating?: number | null
          sweetness?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brew_log_taste_scores_brew_log_id_fkey"
            columns: ["brew_log_id"]
            isOneToOne: true
            referencedRelation: "brew_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_logs: {
        Row: {
          actual_time_seconds: number | null
          bean_id: string | null
          brew_method: string | null
          created_at: string
          dose_grams: number | null
          grind_setting: string | null
          grinder_context: Json
          id: string
          notes: string | null
          outcome_submission: Json | null
          recipe_id: string | null
          roast_profile_id: string | null
          taste_signal: string | null
          tasting_note: string | null
          user_id: string
          water_grams: number | null
          water_temp_c: number | null
        }
        Insert: {
          actual_time_seconds?: number | null
          bean_id?: string | null
          brew_method?: string | null
          created_at?: string
          dose_grams?: number | null
          grind_setting?: string | null
          grinder_context?: Json
          id?: string
          notes?: string | null
          outcome_submission?: Json | null
          recipe_id?: string | null
          roast_profile_id?: string | null
          taste_signal?: string | null
          tasting_note?: string | null
          user_id: string
          water_grams?: number | null
          water_temp_c?: number | null
        }
        Update: {
          actual_time_seconds?: number | null
          bean_id?: string | null
          brew_method?: string | null
          created_at?: string
          dose_grams?: number | null
          grind_setting?: string | null
          grinder_context?: Json
          id?: string
          notes?: string | null
          outcome_submission?: Json | null
          recipe_id?: string | null
          roast_profile_id?: string | null
          taste_signal?: string | null
          tasting_note?: string | null
          user_id?: string
          water_grams?: number | null
          water_temp_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brew_logs_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_logs_brew_method_fkey"
            columns: ["brew_method"]
            isOneToOne: false
            referencedRelation: "brew_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "brew_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_logs_roast_profile_id_fkey"
            columns: ["roast_profile_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "brew_logs_roast_profile_id_fkey"
            columns: ["roast_profile_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_methods: {
        Row: {
          code: string
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          code: string
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          code?: string
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      catalog_change_events: {
        Row: {
          current_value: Json
          detected_at: string
          event_type: string
          evidence_url: string | null
          id: string
          previous_value: Json | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          roasted_product_id: string
        }
        Insert: {
          current_value: Json
          detected_at?: string
          event_type: string
          evidence_url?: string | null
          id?: string
          previous_value?: Json | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          roasted_product_id: string
        }
        Update: {
          current_value?: Json
          detected_at?: string
          event_type?: string
          evidence_url?: string | null
          id?: string
          previous_value?: Json | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          roasted_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_change_events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_change_events_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "catalog_change_events_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_currency_rates: {
        Row: {
          currency: string
          kwd_per_unit: number
          observed_at: string
          source_url: string
        }
        Insert: {
          currency: string
          kwd_per_unit: number
          observed_at: string
          source_url: string
        }
        Update: {
          currency?: string
          kwd_per_unit?: number
          observed_at?: string
          source_url?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_assistant_usage: {
        Row: {
          day_requests: number
          day_started_at: string
          minute_requests: number
          minute_started_at: string
          user_id: string
        }
        Insert: {
          day_requests: number
          day_started_at: string
          minute_requests: number
          minute_started_at: string
          user_id: string
        }
        Update: {
          day_requests?: number
          day_started_at?: string
          minute_requests?: number
          minute_started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coffee_comments: {
        Row: {
          bean_id: string | null
          body: string
          created_at: string
          id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          bean_id?: string | null
          body: string
          created_at?: string
          id?: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          bean_id?: string | null
          body?: string
          created_at?: string
          id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_comments_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "coffee_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_lots: {
        Row: {
          altitude_max_meters: number | null
          altitude_min_meters: number | null
          created_at: string
          data_confidence: string
          farm: string | null
          harvest_season: string | null
          id: string
          last_verified_at: string | null
          notes: string | null
          origin_country: string
          origin_region: string | null
          process: string | null
          producer: string | null
          requires_review: boolean
          source_name: string | null
          source_type: string | null
          source_url: string | null
          updated_at: string
          varietal: string | null
          verified_by: string | null
        }
        Insert: {
          altitude_max_meters?: number | null
          altitude_min_meters?: number | null
          created_at?: string
          data_confidence?: string
          farm?: string | null
          harvest_season?: string | null
          id?: string
          last_verified_at?: string | null
          notes?: string | null
          origin_country: string
          origin_region?: string | null
          process?: string | null
          producer?: string | null
          requires_review?: boolean
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string
          varietal?: string | null
          verified_by?: string | null
        }
        Update: {
          altitude_max_meters?: number | null
          altitude_min_meters?: number | null
          created_at?: string
          data_confidence?: string
          farm?: string | null
          harvest_season?: string | null
          id?: string
          last_verified_at?: string | null
          notes?: string | null
          origin_country?: string
          origin_region?: string | null
          process?: string | null
          producer?: string | null
          requires_review?: boolean
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string
          varietal?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_lots_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_stories: {
        Row: {
          caption: string
          category: string
          created_at: string
          expires_at: string | null
          id: string
          media_path: string
          media_type: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rights_confirmed: boolean
          status: string
          user_id: string
        }
        Insert: {
          caption?: string
          category: string
          created_at?: string
          expires_at?: string | null
          id: string
          media_path: string
          media_type: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_confirmed: boolean
          status?: string
          user_id: string
        }
        Update: {
          caption?: string
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          media_path?: string
          media_type?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_confirmed?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_stories_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          content_language: string
          created_at: string
          id: string
          is_hidden: boolean
          parent_comment_id: string | null
          post_id: string | null
          recipe_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          content_language?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          parent_comment_id?: string | null
          post_id?: string | null
          recipe_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          content_language?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          parent_comment_id?: string | null
          post_id?: string | null
          recipe_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string | null
          id: string
          is_gcc: boolean
          name_ar: string
          name_en: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string | null
          id?: string
          is_gcc?: boolean
          name_ar: string
          name_en: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string | null
          id?: string
          is_gcc?: boolean
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      data_correction_requests: {
        Row: {
          created_at: string
          current_value: string | null
          entity_id: string
          entity_type: string
          field_name: string | null
          id: string
          reason: string | null
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_value: string | null
        }
        Insert: {
          created_at?: string
          current_value?: string | null
          entity_id: string
          entity_type: string
          field_name?: string | null
          id?: string
          reason?: string | null
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_value?: string | null
        }
        Update: {
          created_at?: string
          current_value?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string | null
          id?: string
          reason?: string | null
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_correction_requests_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_correction_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_jobs: {
        Row: {
          broken_link_rows: number
          completed_at: string | null
          conflict_rows: number
          created_at: string
          created_by: string
          duplicate_rows: number
          file_name: string | null
          id: string
          invalid_image_rows: number
          missing_field_rows: number
          new_rows: number
          source_type: string
          started_at: string | null
          status: string
          target_table: string
          total_rows: number
        }
        Insert: {
          broken_link_rows?: number
          completed_at?: string | null
          conflict_rows?: number
          created_at?: string
          created_by: string
          duplicate_rows?: number
          file_name?: string | null
          id?: string
          invalid_image_rows?: number
          missing_field_rows?: number
          new_rows?: number
          source_type: string
          started_at?: string | null
          status?: string
          target_table: string
          total_rows?: number
        }
        Update: {
          broken_link_rows?: number
          completed_at?: string | null
          conflict_rows?: number
          created_at?: string
          created_by?: string
          duplicate_rows?: number
          file_name?: string | null
          id?: string
          invalid_image_rows?: number
          missing_field_rows?: number
          new_rows?: number
          source_type?: string
          started_at?: string | null
          status?: string
          target_table?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_rows: {
        Row: {
          created_at: string
          id: string
          import_job_id: string
          issues: string[]
          matched_existing_id: string | null
          raw_data: Json
          row_number: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_job_id: string
          issues?: string[]
          matched_existing_id?: string | null
          raw_data: Json
          row_number: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          import_job_id?: string
          issues?: string[]
          matched_existing_id?: string | null
          raw_data?: Json
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_import_rows_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "data_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_preferences: {
        Row: {
          audience: string
          user_id: string
        }
        Insert: {
          audience?: string
          user_id: string
        }
        Update: {
          audience?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          audio_object_id: string | null
          audio_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          edited_at: string | null
          expires_at: string
          id: string
          kind: string
          post_id: string | null
          sender_id: string
        }
        Insert: {
          audio_object_id?: string | null
          audio_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          edited_at?: string | null
          expires_at?: string
          id: string
          kind: string
          post_id?: string | null
          sender_id: string
        }
        Update: {
          audio_object_id?: string | null
          audio_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          edited_at?: string | null
          expires_at?: string
          id?: string
          kind?: string
          post_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_candidates: {
        Row: {
          created_at: string
          entity_id_a: string
          entity_id_b: string
          entity_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number | null
          status: string
          suggested_action: string
        }
        Insert: {
          created_at?: string
          entity_id_a: string
          entity_id_b: string
          entity_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string
          suggested_action?: string
        }
        Update: {
          created_at?: string
          entity_id_a?: string
          entity_id_b?: string
          entity_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string
          suggested_action?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_candidates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      equipment_models: {
        Row: {
          brand_id: string | null
          category: string
          created_at: string
          data_confidence: string
          description: string | null
          discovered_at: string
          discovery_run_id: string | null
          grind_range: string | null
          id: string
          image_source_url: string | null
          image_url: string | null
          image_usage_status: string
          last_verified_at: string | null
          name: string
          notes: string | null
          official_url: string | null
          requires_review: boolean
          source_name: string | null
          source_type: string | null
          source_url: string | null
          specifications: Json
          suitable_brew_methods: string[]
        }
        Insert: {
          brand_id?: string | null
          category: string
          created_at?: string
          data_confidence?: string
          description?: string | null
          discovered_at?: string
          discovery_run_id?: string | null
          grind_range?: string | null
          id?: string
          image_source_url?: string | null
          image_url?: string | null
          image_usage_status?: string
          last_verified_at?: string | null
          name: string
          notes?: string | null
          official_url?: string | null
          requires_review?: boolean
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          specifications?: Json
          suitable_brew_methods?: string[]
        }
        Update: {
          brand_id?: string | null
          category?: string
          created_at?: string
          data_confidence?: string
          description?: string | null
          discovered_at?: string
          discovery_run_id?: string | null
          grind_range?: string | null
          id?: string
          image_source_url?: string | null
          image_url?: string | null
          image_usage_status?: string
          last_verified_at?: string | null
          name?: string
          notes?: string | null
          official_url?: string | null
          requires_review?: boolean
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          specifications?: Json
          suitable_brew_methods?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "equipment_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "equipment_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_reviews: {
        Row: {
          cons: string
          created_at: string
          equipment_model_id: string
          experience: string
          id: string
          pros: string
          rating: number
          review_text: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cons?: string
          created_at?: string
          equipment_model_id: string
          experience: string
          id?: string
          pros?: string
          rating: number
          review_text: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cons?: string
          created_at?: string
          equipment_model_id?: string
          experience?: string
          id?: string
          pros?: string
          rating?: number
          review_text?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_reviews_equipment_model_id_fkey"
            columns: ["equipment_model_id"]
            isOneToOne: false
            referencedRelation: "equipment_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_submissions: {
        Row: {
          approved_model_id: string | null
          brand_name: string
          category: string
          created_at: string
          id: string
          model_name: string
          official_url: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submitter_note: string | null
          updated_at: string
          user_equipment_id: string | null
          user_id: string
        }
        Insert: {
          approved_model_id?: string | null
          brand_name: string
          category: string
          created_at?: string
          id?: string
          model_name: string
          official_url?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitter_note?: string | null
          updated_at?: string
          user_equipment_id?: string | null
          user_id: string
        }
        Update: {
          approved_model_id?: string | null
          brand_name?: string
          category?: string
          created_at?: string
          id?: string
          model_name?: string
          official_url?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitter_note?: string | null
          updated_at?: string
          user_equipment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_submissions_approved_model_id_fkey"
            columns: ["approved_model_id"]
            isOneToOne: false
            referencedRelation: "equipment_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_submissions_user_equipment_id_fkey"
            columns: ["user_equipment_id"]
            isOneToOne: false
            referencedRelation: "user_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      green_coffees: {
        Row: {
          altitude_meters: number | null
          coffee_lot_id: string | null
          created_at: string
          density_g_l: number | null
          farm: string | null
          harvest_year: number | null
          id: string
          lot_number: string | null
          moisture_pct: number | null
          name: string
          notes: string | null
          origin_country: string | null
          origin_region: string | null
          process: string | null
          producer: string | null
          screen_size: string | null
          species: string | null
          supplier: string | null
          updated_at: string
          user_id: string
          varietal: string | null
          washing_station: string | null
          water_activity: number | null
        }
        Insert: {
          altitude_meters?: number | null
          coffee_lot_id?: string | null
          created_at?: string
          density_g_l?: number | null
          farm?: string | null
          harvest_year?: number | null
          id?: string
          lot_number?: string | null
          moisture_pct?: number | null
          name: string
          notes?: string | null
          origin_country?: string | null
          origin_region?: string | null
          process?: string | null
          producer?: string | null
          screen_size?: string | null
          species?: string | null
          supplier?: string | null
          updated_at?: string
          user_id: string
          varietal?: string | null
          washing_station?: string | null
          water_activity?: number | null
        }
        Update: {
          altitude_meters?: number | null
          coffee_lot_id?: string | null
          created_at?: string
          density_g_l?: number | null
          farm?: string | null
          harvest_year?: number | null
          id?: string
          lot_number?: string | null
          moisture_pct?: number | null
          name?: string
          notes?: string | null
          origin_country?: string | null
          origin_region?: string | null
          process?: string | null
          producer?: string | null
          screen_size?: string | null
          species?: string | null
          supplier?: string | null
          updated_at?: string
          user_id?: string
          varietal?: string | null
          washing_station?: string | null
          water_activity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "green_coffees_coffee_lot_id_fkey"
            columns: ["coffee_lot_id"]
            isOneToOne: false
            referencedRelation: "coffee_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "green_coffees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      green_inventory_transactions: {
        Row: {
          created_at: string
          currency: string | null
          green_coffee_id: string
          id: string
          notes: string | null
          occurred_on: string
          quantity_grams: number
          roast_id: string | null
          supplier: string | null
          transaction_type: string
          unit_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          green_coffee_id: string
          id?: string
          notes?: string | null
          occurred_on?: string
          quantity_grams: number
          roast_id?: string | null
          supplier?: string | null
          transaction_type: string
          unit_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          green_coffee_id?: string
          id?: string
          notes?: string | null
          occurred_on?: string
          quantity_grams?: number
          roast_id?: string | null
          supplier?: string | null
          transaction_type?: string
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "green_inventory_transactions_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "green_coffee_balances"
            referencedColumns: ["green_coffee_id"]
          },
          {
            foreignKeyName: "green_inventory_transactions_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "green_coffees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "green_inventory_transactions_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "green_inventory_transactions_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "green_inventory_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_extractions: {
        Row: {
          bean_name: string | null
          bloom_seconds: number | null
          brew_method: string | null
          brewer_name: string | null
          confidence: number
          created_at: string
          created_recipe_id: string | null
          dose_grams: number | null
          extracted_fields: string[]
          extraction_yield: number | null
          filter_type: string | null
          grind_setting: string | null
          grinder_name: string | null
          id: string
          item_id: string
          matched_bean_id: string | null
          matched_roaster_id: string | null
          origin_country: string | null
          origin_region: string | null
          pour_schedule: Json | null
          pressure_profile: Json | null
          process: string | null
          ratio: number | null
          roast_level: string | null
          roaster_name: string | null
          tds: number | null
          total_time_seconds: number | null
          updated_at: string
          varietal: string | null
          water_grams: number | null
          water_temp_c: number | null
          yield_grams: number | null
        }
        Insert: {
          bean_name?: string | null
          bloom_seconds?: number | null
          brew_method?: string | null
          brewer_name?: string | null
          confidence?: number
          created_at?: string
          created_recipe_id?: string | null
          dose_grams?: number | null
          extracted_fields?: string[]
          extraction_yield?: number | null
          filter_type?: string | null
          grind_setting?: string | null
          grinder_name?: string | null
          id?: string
          item_id: string
          matched_bean_id?: string | null
          matched_roaster_id?: string | null
          origin_country?: string | null
          origin_region?: string | null
          pour_schedule?: Json | null
          pressure_profile?: Json | null
          process?: string | null
          ratio?: number | null
          roast_level?: string | null
          roaster_name?: string | null
          tds?: number | null
          total_time_seconds?: number | null
          updated_at?: string
          varietal?: string | null
          water_grams?: number | null
          water_temp_c?: number | null
          yield_grams?: number | null
        }
        Update: {
          bean_name?: string | null
          bloom_seconds?: number | null
          brew_method?: string | null
          brewer_name?: string | null
          confidence?: number
          created_at?: string
          created_recipe_id?: string | null
          dose_grams?: number | null
          extracted_fields?: string[]
          extraction_yield?: number | null
          filter_type?: string | null
          grind_setting?: string | null
          grinder_name?: string | null
          id?: string
          item_id?: string
          matched_bean_id?: string | null
          matched_roaster_id?: string | null
          origin_country?: string | null
          origin_region?: string | null
          pour_schedule?: Json | null
          pressure_profile?: Json | null
          process?: string | null
          ratio?: number | null
          roast_level?: string | null
          roaster_name?: string | null
          tds?: number | null
          total_time_seconds?: number | null
          updated_at?: string
          varietal?: string | null
          water_grams?: number | null
          water_temp_c?: number | null
          yield_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_extractions_brew_method_fkey"
            columns: ["brew_method"]
            isOneToOne: false
            referencedRelation: "brew_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ingestion_extractions_created_recipe_id_fkey"
            columns: ["created_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_extractions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "ingestion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_extractions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "ingestion_review_queue"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ingestion_extractions_matched_bean_id_fkey"
            columns: ["matched_bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_extractions_matched_roaster_id_fkey"
            columns: ["matched_roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_items: {
        Row: {
          author_name: string | null
          author_url: string | null
          content_hash: string | null
          discovered_at: string
          external_id: string
          id: string
          published_at: string | null
          raw_excerpt: string | null
          run_id: string | null
          source_id: string
          source_image_url: string | null
          status: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          author_name?: string | null
          author_url?: string | null
          content_hash?: string | null
          discovered_at?: string
          external_id: string
          id?: string
          published_at?: string | null
          raw_excerpt?: string | null
          run_id?: string | null
          source_id: string
          source_image_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          author_name?: string | null
          author_url?: string | null
          content_hash?: string | null
          discovered_at?: string
          external_id?: string
          id?: string
          published_at?: string | null
          raw_excerpt?: string | null
          run_id?: string | null
          source_id?: string
          source_image_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_reviews: {
        Row: {
          created_at: string
          decision: string
          id: string
          item_id: string
          merged_into_recipe_id: string | null
          reason: string | null
          reviewer_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          item_id: string
          merged_into_recipe_id?: string | null
          reason?: string | null
          reviewer_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          item_id?: string
          merged_into_recipe_id?: string | null
          reason?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ingestion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ingestion_review_queue"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ingestion_reviews_merged_into_recipe_id_fkey"
            columns: ["merged_into_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          http_etag: string | null
          http_last_modified: string | null
          id: string
          items_duplicate: number
          items_extracted: number
          items_new: number
          items_seen: number
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          http_etag?: string | null
          http_last_modified?: string | null
          id?: string
          items_duplicate?: number
          items_extracted?: number
          items_new?: number
          items_seen?: number
          source_id: string
          started_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          http_etag?: string | null
          http_last_modified?: string | null
          id?: string
          items_duplicate?: number
          items_extracted?: number
          items_new?: number
          items_seen?: number
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_sources: {
        Row: {
          access_mode: string
          consecutive_failures: number
          country: string | null
          created_at: string
          endpoint: string
          id: string
          is_configured: boolean
          is_enabled: boolean
          language: string
          last_run_at: string | null
          last_success_at: string | null
          min_interval_seconds: number
          name: string
          notes: string | null
          publisher: string | null
          robots_allows: boolean | null
          robots_checked_at: string | null
          site_url: string | null
          slug: string
          trust_tier: string
          updated_at: string
        }
        Insert: {
          access_mode: string
          consecutive_failures?: number
          country?: string | null
          created_at?: string
          endpoint: string
          id?: string
          is_configured?: boolean
          is_enabled?: boolean
          language?: string
          last_run_at?: string | null
          last_success_at?: string | null
          min_interval_seconds?: number
          name: string
          notes?: string | null
          publisher?: string | null
          robots_allows?: boolean | null
          robots_checked_at?: string | null
          site_url?: string | null
          slug: string
          trust_tier?: string
          updated_at?: string
        }
        Update: {
          access_mode?: string
          consecutive_failures?: number
          country?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          is_configured?: boolean
          is_enabled?: boolean
          language?: string
          last_run_at?: string | null
          last_success_at?: string | null
          min_interval_seconds?: number
          name?: string
          notes?: string | null
          publisher?: string | null
          robots_allows?: boolean | null
          robots_checked_at?: string | null
          site_url?: string | null
          slug?: string
          trust_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_connections: {
        Row: {
          created_at: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          expires_at: string | null
          id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          position: number
          post_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          position?: number
          post_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          position?: number
          post_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          actual_time_seconds: number | null
          bean_id: string | null
          body: string | null
          brew_log_id: string | null
          brew_method: string | null
          content_language: string
          content_type: string
          created_at: string
          dose_grams: number | null
          id: string
          is_hidden: boolean
          outcome: string | null
          primary_media_path: string | null
          recipe_id: string | null
          roast_profile_id: string | null
          updated_at: string
          user_id: string
          visibility: string
          water_grams: number | null
        }
        Insert: {
          actual_time_seconds?: number | null
          bean_id?: string | null
          body?: string | null
          brew_log_id?: string | null
          brew_method?: string | null
          content_language?: string
          content_type?: string
          created_at?: string
          dose_grams?: number | null
          id?: string
          is_hidden?: boolean
          outcome?: string | null
          primary_media_path?: string | null
          recipe_id?: string | null
          roast_profile_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
          water_grams?: number | null
        }
        Update: {
          actual_time_seconds?: number | null
          bean_id?: string | null
          body?: string | null
          brew_log_id?: string | null
          brew_method?: string | null
          content_language?: string
          content_type?: string
          created_at?: string
          dose_grams?: number | null
          id?: string
          is_hidden?: boolean
          outcome?: string | null
          primary_media_path?: string | null
          recipe_id?: string | null
          roast_profile_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
          water_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_brew_log_id_fkey"
            columns: ["brew_log_id"]
            isOneToOne: false
            referencedRelation: "brew_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_brew_method_fkey"
            columns: ["brew_method"]
            isOneToOne: false
            referencedRelation: "brew_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "posts_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_roast_profile_id_fkey"
            columns: ["roast_profile_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "posts_roast_profile_id_fkey"
            columns: ["roast_profile_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_alert_deliveries: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notification_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notification_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notification_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_alert_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "catalog_change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_alert_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "my_product_alert_candidates"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "product_alert_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_alert_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_availability: {
        Row: {
          id: string
          note: string | null
          recorded_at: string
          roasted_product_id: string
          source_url: string | null
          status: string
        }
        Insert: {
          id?: string
          note?: string | null
          recorded_at?: string
          roasted_product_id: string
          source_url?: string | null
          status: string
        }
        Update: {
          id?: string
          note?: string | null
          recorded_at?: string
          roasted_product_id?: string
          source_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_availability_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "product_availability_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_is_official: boolean
          image_last_verified_at: string | null
          image_owner: string
          image_source_url: string
          image_usage_status: string
          is_primary: boolean
          position: number
          roasted_product_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_is_official?: boolean
          image_last_verified_at?: string | null
          image_owner: string
          image_source_url: string
          image_usage_status?: string
          is_primary?: boolean
          position?: number
          roasted_product_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_is_official?: boolean
          image_last_verified_at?: string | null
          image_owner?: string
          image_source_url?: string
          image_usage_status?: string
          is_primary?: boolean
          position?: number
          roasted_product_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "product_images_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          currency: string
          id: string
          price: number
          recorded_at: string
          roasted_product_id: string
          source_url: string | null
        }
        Insert: {
          currency: string
          id?: string
          price: number
          recorded_at?: string
          roasted_product_id: string
          source_url?: string | null
        }
        Update: {
          currency?: string
          id?: string
          price?: number
          recorded_at?: string
          roasted_product_id?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "product_prices_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sources: {
        Row: {
          fetched_at: string
          id: string
          roasted_product_id: string
          source_name: string | null
          source_type: string
          source_url: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          roasted_product_id: string
          source_name?: string | null
          source_type: string
          source_url: string
        }
        Update: {
          fetched_at?: string
          id?: string
          roasted_product_id?: string
          source_name?: string | null
          source_type?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sources_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "product_sources_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_watches: {
        Row: {
          alert_back_in_stock: boolean
          alert_price_drop: boolean
          alert_sold_out: boolean
          created_at: string
          id: string
          roasted_product_id: string
          user_id: string
        }
        Insert: {
          alert_back_in_stock?: boolean
          alert_price_drop?: boolean
          alert_sold_out?: boolean
          created_at?: string
          id?: string
          roasted_product_id: string
          user_id: string
        }
        Update: {
          alert_back_in_stock?: boolean
          alert_price_drop?: boolean
          alert_sold_out?: boolean
          created_at?: string
          id?: string
          roasted_product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_watches_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "product_watches_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          caption: string
          created_at: string
          id: string
          image_path: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id: string
          image_path: string
          kind: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          image_path?: string
          kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          experience_level: string | null
          id: string
          is_private: boolean
          is_verified: boolean
          language: string
          name: string
          share_collection: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          experience_level?: string | null
          id: string
          is_private?: boolean
          is_verified?: boolean
          language?: string
          name: string
          share_collection?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          experience_level?: string | null
          id?: string
          is_private?: boolean
          is_verified?: boolean
          language?: string
          name?: string
          share_collection?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recipe_attempts: {
        Row: {
          actual_time_seconds: number | null
          brew_log_id: string | null
          created_at: string
          equipment_used: string | null
          id: string
          outcome: string | null
          recipe_id: string
          settings_changed: boolean
          share_with_community: boolean
          status: string
          user_id: string
        }
        Insert: {
          actual_time_seconds?: number | null
          brew_log_id?: string | null
          created_at?: string
          equipment_used?: string | null
          id?: string
          outcome?: string | null
          recipe_id: string
          settings_changed?: boolean
          share_with_community?: boolean
          status: string
          user_id: string
        }
        Update: {
          actual_time_seconds?: number | null
          brew_log_id?: string | null
          created_at?: string
          equipment_used?: string | null
          id?: string
          outcome?: string | null
          recipe_id?: string
          settings_changed?: boolean
          share_with_community?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_attempts_brew_log_id_fkey"
            columns: ["brew_log_id"]
            isOneToOne: false
            referencedRelation: "brew_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_attempts_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          personal_notes: string | null
          recipe_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          personal_notes?: string | null
          recipe_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          personal_notes?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "recipe_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_collection_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_equipment: {
        Row: {
          category: string
          equipment_model_id: string | null
          id: string
          notes: string | null
          notes_ar: string | null
          recipe_id: string
        }
        Insert: {
          category: string
          equipment_model_id?: string | null
          id?: string
          notes?: string | null
          notes_ar?: string | null
          recipe_id: string
        }
        Update: {
          category?: string
          equipment_model_id?: string | null
          id?: string
          notes?: string | null
          notes_ar?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_equipment_equipment_model_id_fkey"
            columns: ["equipment_model_id"]
            isOneToOne: false
            referencedRelation: "equipment_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_equipment_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_images: {
        Row: {
          created_at: string
          id: string
          position: number
          recipe_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          recipe_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          recipe_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_images_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_pours: {
        Row: {
          created_at: string
          duration_seconds: number | null
          flow_rate_ml_per_s: number | null
          id: string
          is_bloom: boolean
          pause_after_seconds: number | null
          pour_number: number
          recipe_id: string
          start_at_seconds: number | null
          temperature_c: number | null
          water_grams: number
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          flow_rate_ml_per_s?: number | null
          id?: string
          is_bloom?: boolean
          pause_after_seconds?: number | null
          pour_number: number
          recipe_id: string
          start_at_seconds?: number | null
          temperature_c?: number | null
          water_grams: number
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          flow_rate_ml_per_s?: number | null
          id?: string
          is_bloom?: boolean
          pause_after_seconds?: number | null
          pour_number?: number
          recipe_id?: string
          start_at_seconds?: number | null
          temperature_c?: number | null
          water_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_pours_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ratings: {
        Row: {
          acidity: number | null
          balance: number | null
          bitterness: number | null
          body: string | null
          created_at: string
          id: string
          rating: number
          recipe_id: string
          review: string | null
          sweetness: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acidity?: number | null
          balance?: number | null
          bitterness?: number | null
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          recipe_id: string
          review?: string | null
          sweetness?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acidity?: number | null
          balance?: number | null
          bitterness?: number | null
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          recipe_id?: string
          review?: string | null
          sweetness?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_reviews: {
        Row: {
          attempt_id: string | null
          bean_compatibility: number | null
          created_at: string
          ease_of_execution: number | null
          equipment_compatibility: number | null
          id: string
          overall_rating: number
          recipe_id: string
          reproducibility: number | null
          review_text: string | null
          step_accuracy: number | null
          taste_quality: number
          time_required_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          bean_compatibility?: number | null
          created_at?: string
          ease_of_execution?: number | null
          equipment_compatibility?: number | null
          id?: string
          overall_rating: number
          recipe_id: string
          reproducibility?: number | null
          review_text?: string | null
          step_accuracy?: number | null
          taste_quality: number
          time_required_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          bean_compatibility?: number | null
          created_at?: string
          ease_of_execution?: number | null
          equipment_compatibility?: number | null
          id?: string
          overall_rating?: number
          recipe_id?: string
          reproducibility?: number | null
          review_text?: string | null
          step_accuracy?: number | null
          taste_quality?: number
          time_required_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_reviews_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "recipe_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_reviews_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_saves: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_saves_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_search_documents: {
        Row: {
          coffee_name: string | null
          coffee_origin: string | null
          coffee_type: string | null
          creator_country: string | null
          creator_name: string | null
          flavor_note: string | null
          recipe_country: string | null
          recipe_id: string
          recipe_name: string | null
          refreshed_at: string
          roaster_name: string | null
          search_text: string
          serving_style: string | null
          source_name: string | null
        }
        Insert: {
          coffee_name?: string | null
          coffee_origin?: string | null
          coffee_type?: string | null
          creator_country?: string | null
          creator_name?: string | null
          flavor_note?: string | null
          recipe_country?: string | null
          recipe_id: string
          recipe_name?: string | null
          refreshed_at?: string
          roaster_name?: string | null
          search_text: string
          serving_style?: string | null
          source_name?: string | null
        }
        Update: {
          coffee_name?: string | null
          coffee_origin?: string | null
          coffee_type?: string | null
          creator_country?: string | null
          creator_name?: string | null
          flavor_note?: string | null
          recipe_country?: string | null
          recipe_id?: string
          recipe_name?: string | null
          refreshed_at?: string
          roaster_name?: string | null
          search_text?: string
          serving_style?: string | null
          source_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_search_documents_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_sources: {
        Row: {
          created_at: string
          data_confidence: string
          id: string
          last_verified_at: string | null
          recipe_id: string
          source_name: string | null
          source_type: string
          source_url: string | null
        }
        Insert: {
          created_at?: string
          data_confidence?: string
          id?: string
          last_verified_at?: string | null
          recipe_id: string
          source_name?: string | null
          source_type: string
          source_url?: string | null
        }
        Update: {
          created_at?: string
          data_confidence?: string
          id?: string
          last_verified_at?: string | null
          recipe_id?: string
          source_name?: string | null
          source_type?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_sources_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          duration_seconds: number | null
          id: string
          pour_index: number | null
          recipe_id: string
          step_kind: string | null
          step_number: number
          title: string
          title_ar: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_seconds?: number | null
          id?: string
          pour_index?: number | null
          recipe_id: string
          step_kind?: string | null
          step_number: number
          title: string
          title_ar?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_seconds?: number | null
          id?: string
          pour_index?: number | null
          recipe_id?: string
          step_kind?: string | null
          step_number?: number
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_verifications: {
        Row: {
          claimed_recipe_type: string
          created_at: string
          id: string
          notes: string | null
          recipe_id: string
          verdict: string
          verified_by: string
        }
        Insert: {
          claimed_recipe_type: string
          created_at?: string
          id?: string
          notes?: string | null
          recipe_id: string
          verdict: string
          verified_by: string
        }
        Update: {
          claimed_recipe_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          recipe_id?: string
          verdict?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_verifications_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_versions: {
        Row: {
          created_at: string
          created_by: string
          forked_from_recipe_id: string | null
          id: string
          recipe_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          forked_from_recipe_id?: string | null
          id?: string
          recipe_id: string
          snapshot: Json
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          forked_from_recipe_id?: string | null
          id?: string
          recipe_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_versions_forked_from_recipe_id_fkey"
            columns: ["forked_from_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          bean_id: string | null
          brew_method: string
          content_language: string
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          difficulty: string | null
          dose_grams: number | null
          flavor_notes: string[]
          forked_from_recipe_id: string | null
          grinder_setting: string | null
          id: string
          is_incomplete_source: boolean
          notes: string | null
          notes_ar: string | null
          pour_style: string | null
          pour_sum_validated: boolean
          ratio: number | null
          recipe_type: string
          roasted_product_id: string | null
          serving_style: string
          slug: string | null
          source_author_name: string | null
          source_brew_parameters: Json
          source_coffee_name: string | null
          source_origin_country: string | null
          source_process: string | null
          source_roaster_name: string | null
          source_stated_ratio: number | null
          source_tasting_notes: string | null
          source_varietal: string | null
          title: string
          title_ar: string | null
          total_time_seconds: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          visibility: string
          water_grams: number | null
          water_temp_c: number | null
          water_temp_c_max: number | null
          water_temp_c_min: number | null
        }
        Insert: {
          bean_id?: string | null
          brew_method: string
          content_language?: string
          cover_image_path?: string | null
          cover_image_url?: string | null
          created_at?: string
          difficulty?: string | null
          dose_grams?: number | null
          flavor_notes?: string[]
          forked_from_recipe_id?: string | null
          grinder_setting?: string | null
          id?: string
          is_incomplete_source?: boolean
          notes?: string | null
          notes_ar?: string | null
          pour_style?: string | null
          pour_sum_validated?: boolean
          ratio?: number | null
          recipe_type?: string
          roasted_product_id?: string | null
          serving_style?: string
          slug?: string | null
          source_author_name?: string | null
          source_brew_parameters?: Json
          source_coffee_name?: string | null
          source_origin_country?: string | null
          source_process?: string | null
          source_roaster_name?: string | null
          source_stated_ratio?: number | null
          source_tasting_notes?: string | null
          source_varietal?: string | null
          title: string
          title_ar?: string | null
          total_time_seconds?: number | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          visibility?: string
          water_grams?: number | null
          water_temp_c?: number | null
          water_temp_c_max?: number | null
          water_temp_c_min?: number | null
        }
        Update: {
          bean_id?: string | null
          brew_method?: string
          content_language?: string
          cover_image_path?: string | null
          cover_image_url?: string | null
          created_at?: string
          difficulty?: string | null
          dose_grams?: number | null
          flavor_notes?: string[]
          forked_from_recipe_id?: string | null
          grinder_setting?: string | null
          id?: string
          is_incomplete_source?: boolean
          notes?: string | null
          notes_ar?: string | null
          pour_style?: string | null
          pour_sum_validated?: boolean
          ratio?: number | null
          recipe_type?: string
          roasted_product_id?: string | null
          serving_style?: string
          slug?: string | null
          source_author_name?: string | null
          source_brew_parameters?: Json
          source_coffee_name?: string | null
          source_origin_country?: string | null
          source_process?: string | null
          source_roaster_name?: string | null
          source_stated_ratio?: number | null
          source_tasting_notes?: string | null
          source_varietal?: string | null
          title?: string
          title_ar?: string | null
          total_time_seconds?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          visibility?: string
          water_grams?: number | null
          water_temp_c?: number | null
          water_temp_c_max?: number | null
          water_temp_c_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_brew_method_fkey"
            columns: ["brew_method"]
            isOneToOne: false
            referencedRelation: "brew_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "recipes_forked_from_recipe_id_fkey"
            columns: ["forked_from_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "recipes_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_jobs: {
        Row: {
          completed_at: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          errors_count: number
          id: string
          job_key: string
          notes: string | null
          pending_records: number
          products_found: number
          recipes_found: number
          roasters_found: number
          stage: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          errors_count?: number
          id?: string
          job_key: string
          notes?: string | null
          pending_records?: number
          products_found?: number
          recipes_found?: number
          roasters_found?: number
          stage?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          errors_count?: number
          id?: string
          job_key?: string
          notes?: string | null
          pending_records?: number
          products_found?: number
          recipes_found?: number
          roasters_found?: number
          stage?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_jobs_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "research_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          fetched_at: string
          http_status: number | null
          id: string
          notes: string | null
          research_job_id: string
          source_type: string
          url: string
        }
        Insert: {
          fetched_at?: string
          http_status?: number | null
          id?: string
          notes?: string | null
          research_job_id: string
          source_type: string
          url: string
        }
        Update: {
          fetched_at?: string
          http_status?: number | null
          id?: string
          notes?: string | null
          research_job_id?: string
          source_type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_research_job_id_fkey"
            columns: ["research_job_id"]
            isOneToOne: false
            referencedRelation: "research_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_control_events: {
        Row: {
          control_type: string
          created_at: string
          elapsed_seconds: number
          id: string
          notes: string | null
          roast_id: string
          unit: string | null
          value: number | null
        }
        Insert: {
          control_type: string
          created_at?: string
          elapsed_seconds: number
          id?: string
          notes?: string | null
          roast_id: string
          unit?: string | null
          value?: number | null
        }
        Update: {
          control_type?: string
          created_at?: string
          elapsed_seconds?: number
          id?: string
          notes?: string | null
          roast_id?: string
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roast_control_events_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "roast_control_events_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_curve_points: {
        Row: {
          bean_temp_c: number | null
          elapsed_seconds: number
          environment_temp_c: number | null
          id: string
          roast_id: string
          ror: number | null
        }
        Insert: {
          bean_temp_c?: number | null
          elapsed_seconds: number
          environment_temp_c?: number | null
          id?: string
          roast_id: string
          ror?: number | null
        }
        Update: {
          bean_temp_c?: number | null
          elapsed_seconds?: number
          environment_temp_c?: number | null
          id?: string
          roast_id?: string
          ror?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roast_curve_points_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "roast_curve_points_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_events: {
        Row: {
          bean_temp_c: number | null
          created_at: string
          elapsed_seconds: number
          environment_temp_c: number | null
          event_type: string
          id: string
          notes: string | null
          roast_id: string
        }
        Insert: {
          bean_temp_c?: number | null
          created_at?: string
          elapsed_seconds: number
          environment_temp_c?: number | null
          event_type: string
          id?: string
          notes?: string | null
          roast_id: string
        }
        Update: {
          bean_temp_c?: number | null
          created_at?: string
          elapsed_seconds?: number
          environment_temp_c?: number | null
          event_type?: string
          id?: string
          notes?: string | null
          roast_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roast_events_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "roast_events_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_profiles: {
        Row: {
          agtron_ground: number | null
          agtron_whole: number | null
          ambient_temp_c: number | null
          batch_number: number | null
          charge_temp_c: number | null
          created_at: string
          drop_temp_c: number | null
          green_coffee_id: string
          green_temp_c: number | null
          green_weight_g: number | null
          id: string
          notes: string | null
          parent_roast_id: string | null
          public_coffee: Json
          published_at: string | null
          roast_date: string
          roast_level: string | null
          roasted_weight_g: number | null
          roaster_equipment_id: string | null
          status: string
          target_roast_level: string | null
          title: string | null
          total_time_seconds: number | null
          updated_at: string
          user_id: string
          visibility: string
          weight_loss_g: number | null
          weight_loss_percent: number | null
        }
        Insert: {
          agtron_ground?: number | null
          agtron_whole?: number | null
          ambient_temp_c?: number | null
          batch_number?: number | null
          charge_temp_c?: number | null
          created_at?: string
          drop_temp_c?: number | null
          green_coffee_id: string
          green_temp_c?: number | null
          green_weight_g?: number | null
          id?: string
          notes?: string | null
          parent_roast_id?: string | null
          public_coffee?: Json
          published_at?: string | null
          roast_date?: string
          roast_level?: string | null
          roasted_weight_g?: number | null
          roaster_equipment_id?: string | null
          status?: string
          target_roast_level?: string | null
          title?: string | null
          total_time_seconds?: number | null
          updated_at?: string
          user_id: string
          visibility?: string
          weight_loss_g?: number | null
          weight_loss_percent?: number | null
        }
        Update: {
          agtron_ground?: number | null
          agtron_whole?: number | null
          ambient_temp_c?: number | null
          batch_number?: number | null
          charge_temp_c?: number | null
          created_at?: string
          drop_temp_c?: number | null
          green_coffee_id?: string
          green_temp_c?: number | null
          green_weight_g?: number | null
          id?: string
          notes?: string | null
          parent_roast_id?: string | null
          public_coffee?: Json
          published_at?: string | null
          roast_date?: string
          roast_level?: string | null
          roasted_weight_g?: number | null
          roaster_equipment_id?: string | null
          status?: string
          target_roast_level?: string | null
          title?: string | null
          total_time_seconds?: number | null
          updated_at?: string
          user_id?: string
          visibility?: string
          weight_loss_g?: number | null
          weight_loss_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roast_profiles_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "green_coffee_balances"
            referencedColumns: ["green_coffee_id"]
          },
          {
            foreignKeyName: "roast_profiles_green_coffee_id_fkey"
            columns: ["green_coffee_id"]
            isOneToOne: false
            referencedRelation: "green_coffees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_profiles_parent_roast_id_fkey"
            columns: ["parent_roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "roast_profiles_parent_roast_id_fkey"
            columns: ["parent_roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_profiles_roaster_equipment_id_fkey"
            columns: ["roaster_equipment_id"]
            isOneToOne: false
            referencedRelation: "user_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_tastings: {
        Row: {
          acidity: number | null
          aftertaste: number | null
          aroma: number | null
          bitterness: number | null
          body: number | null
          brew_log_id: string | null
          clarity: number | null
          created_at: string
          flavor_notes: string[]
          id: string
          notes: string | null
          observations: string[]
          overall_score: number | null
          recipe_id: string | null
          rest_days: number | null
          roast_id: string
          sweetness: number | null
          tasted_on: string | null
          updated_at: string
        }
        Insert: {
          acidity?: number | null
          aftertaste?: number | null
          aroma?: number | null
          bitterness?: number | null
          body?: number | null
          brew_log_id?: string | null
          clarity?: number | null
          created_at?: string
          flavor_notes?: string[]
          id?: string
          notes?: string | null
          observations?: string[]
          overall_score?: number | null
          recipe_id?: string | null
          rest_days?: number | null
          roast_id: string
          sweetness?: number | null
          tasted_on?: string | null
          updated_at?: string
        }
        Update: {
          acidity?: number | null
          aftertaste?: number | null
          aroma?: number | null
          bitterness?: number | null
          body?: number | null
          brew_log_id?: string | null
          clarity?: number | null
          created_at?: string
          flavor_notes?: string[]
          id?: string
          notes?: string | null
          observations?: string[]
          overall_score?: number | null
          recipe_id?: string | null
          rest_days?: number | null
          roast_id?: string
          sweetness?: number | null
          tasted_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roast_tastings_brew_log_id_fkey"
            columns: ["brew_log_id"]
            isOneToOne: false
            referencedRelation: "brew_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_tastings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_tastings_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profile_metrics"
            referencedColumns: ["roast_id"]
          },
          {
            foreignKeyName: "roast_tastings_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roast_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roasted_products: {
        Row: {
          coffee_lot_id: string | null
          created_at: string
          created_by: string | null
          data_confidence: string
          flavor_notes_on_bag: string[]
          id: string
          image_kind: string
          image_source_url: string | null
          image_url: string | null
          image_usage_status: string | null
          last_verified_at: string | null
          legacy_bean_id: string | null
          name_ar: string | null
          name_en: string | null
          origin_type: string | null
          original_language: string
          purchase_url: string | null
          requires_review: boolean
          roast_date: string | null
          roast_level: string | null
          roaster_id: string
          sensory_profile: Json
          short_description: string | null
          slug: string
          source_name: string | null
          source_type: string
          source_url: string
          status: string
          suitable_for_espresso: boolean
          suitable_for_filter: boolean
          suitable_for_milk: boolean
          suitable_for_v60: boolean
          suitable_for_xbloom: boolean
          updated_at: string
          verified_by: string | null
          weight_grams: number | null
        }
        Insert: {
          coffee_lot_id?: string | null
          created_at?: string
          created_by?: string | null
          data_confidence?: string
          flavor_notes_on_bag?: string[]
          id?: string
          image_kind?: string
          image_source_url?: string | null
          image_url?: string | null
          image_usage_status?: string | null
          last_verified_at?: string | null
          legacy_bean_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          origin_type?: string | null
          original_language?: string
          purchase_url?: string | null
          requires_review?: boolean
          roast_date?: string | null
          roast_level?: string | null
          roaster_id: string
          sensory_profile?: Json
          short_description?: string | null
          slug: string
          source_name?: string | null
          source_type: string
          source_url: string
          status?: string
          suitable_for_espresso?: boolean
          suitable_for_filter?: boolean
          suitable_for_milk?: boolean
          suitable_for_v60?: boolean
          suitable_for_xbloom?: boolean
          updated_at?: string
          verified_by?: string | null
          weight_grams?: number | null
        }
        Update: {
          coffee_lot_id?: string | null
          created_at?: string
          created_by?: string | null
          data_confidence?: string
          flavor_notes_on_bag?: string[]
          id?: string
          image_kind?: string
          image_source_url?: string | null
          image_url?: string | null
          image_usage_status?: string | null
          last_verified_at?: string | null
          legacy_bean_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          origin_type?: string | null
          original_language?: string
          purchase_url?: string | null
          requires_review?: boolean
          roast_date?: string | null
          roast_level?: string | null
          roaster_id?: string
          sensory_profile?: Json
          short_description?: string | null
          slug?: string
          source_name?: string | null
          source_type?: string
          source_url?: string
          status?: string
          suitable_for_espresso?: boolean
          suitable_for_filter?: boolean
          suitable_for_milk?: boolean
          suitable_for_v60?: boolean
          suitable_for_xbloom?: boolean
          updated_at?: string
          verified_by?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roasted_products_coffee_lot_id_fkey"
            columns: ["coffee_lot_id"]
            isOneToOne: false
            referencedRelation: "coffee_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasted_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasted_products_legacy_bean_id_fkey"
            columns: ["legacy_bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasted_products_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasted_products_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_claims: {
        Row: {
          claimed_by: string
          created_at: string
          evidence_url: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roaster_id: string
          status: string
        }
        Insert: {
          claimed_by: string
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roaster_id: string
          status?: string
        }
        Update: {
          claimed_by?: string
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roaster_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roaster_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roaster_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roaster_claims_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_locations: {
        Row: {
          address: string | null
          city_id: string | null
          created_at: string
          id: string
          is_physical_store: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          roaster_id: string
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          is_physical_store?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          roaster_id: string
        }
        Update: {
          address?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          is_physical_store?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          roaster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roaster_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roaster_locations_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_saves: {
        Row: {
          created_at: string
          id: string
          roaster_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          roaster_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          roaster_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roaster_saves_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roaster_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_shipping_countries: {
        Row: {
          country_id: string
          created_at: string
          id: string
          roaster_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          roaster_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          roaster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roaster_shipping_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roaster_shipping_countries_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roasters: {
        Row: {
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          data_confidence: string
          description_ar: string | null
          description_en: string | null
          discovered_at: string
          discovery_run_id: string | null
          has_physical_store: boolean | null
          id: string
          instagram_url: string | null
          is_verified: boolean
          last_verified_at: string | null
          logo_source_url: string | null
          logo_url: string | null
          logo_usage_status: string
          name_ar: string
          name_en: string
          owner_user_id: string | null
          requires_review: boolean
          ships_to_gcc: boolean | null
          slug: string
          source_name: string | null
          source_type: string | null
          source_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          verified_by: string | null
          website_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          data_confidence?: string
          description_ar?: string | null
          description_en?: string | null
          discovered_at?: string
          discovery_run_id?: string | null
          has_physical_store?: boolean | null
          id?: string
          instagram_url?: string | null
          is_verified?: boolean
          last_verified_at?: string | null
          logo_source_url?: string | null
          logo_url?: string | null
          logo_usage_status?: string
          name_ar: string
          name_en: string
          owner_user_id?: string | null
          requires_review?: boolean
          ships_to_gcc?: boolean | null
          slug: string
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          verified_by?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          data_confidence?: string
          description_ar?: string | null
          description_en?: string | null
          discovered_at?: string
          discovery_run_id?: string | null
          has_physical_store?: boolean | null
          id?: string
          instagram_url?: string | null
          is_verified?: boolean
          last_verified_at?: string | null
          logo_source_url?: string | null
          logo_url?: string | null
          logo_usage_status?: string
          name_ar?: string
          name_en?: string
          owner_user_id?: string | null
          requires_review?: boolean
          ships_to_gcc?: boolean | null
          slug?: string
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          verified_by?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roasters_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasters_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasters_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sanctions: {
        Row: {
          banned_at: string | null
          reason: string | null
          strikes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          reason?: string | null
          strikes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          reason?: string | null
          strikes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_sanctions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bean_inventory: {
        Row: {
          archived_at: string | null
          barcode: string | null
          brew_count: number
          created_at: string
          id: string
          last_grind_setting: string | null
          legacy_bean_id: string | null
          opened_at: string | null
          original_weight_grams: number | null
          preferred_recipe_id: string | null
          remaining_weight_grams: number | null
          roast_date: string | null
          roasted_product_id: string | null
          storage_location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          barcode?: string | null
          brew_count?: number
          created_at?: string
          id?: string
          last_grind_setting?: string | null
          legacy_bean_id?: string | null
          opened_at?: string | null
          original_weight_grams?: number | null
          preferred_recipe_id?: string | null
          remaining_weight_grams?: number | null
          roast_date?: string | null
          roasted_product_id?: string | null
          storage_location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          barcode?: string | null
          brew_count?: number
          created_at?: string
          id?: string
          last_grind_setting?: string | null
          legacy_bean_id?: string | null
          opened_at?: string | null
          original_weight_grams?: number | null
          preferred_recipe_id?: string | null
          remaining_weight_grams?: number | null
          roast_date?: string | null
          roasted_product_id?: string | null
          storage_location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bean_inventory_legacy_bean_id_fkey"
            columns: ["legacy_bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bean_inventory_preferred_recipe_id_fkey"
            columns: ["preferred_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bean_inventory_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "user_bean_inventory_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bean_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_equipment: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          custom_name: string | null
          equipment_model_id: string | null
          id: string
          is_default: boolean
          notes: string | null
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          custom_name?: string | null
          equipment_model_id?: string | null
          id?: string
          is_default?: boolean
          notes?: string | null
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          custom_name?: string | null
          equipment_model_id?: string | null
          id?: string
          is_default?: boolean
          notes?: string | null
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_equipment_equipment_model_id_fkey"
            columns: ["equipment_model_id"]
            isOneToOne: false
            referencedRelation: "equipment_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_equipment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          onboarding_completed: boolean
          preferred_brew_methods: string[]
          preferred_flavors: string[]
          preferred_roast_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          onboarding_completed?: boolean
          preferred_brew_methods?: string[]
          preferred_flavors?: string[]
          preferred_roast_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          onboarding_completed?: boolean
          preferred_brew_methods?: string[]
          preferred_flavors?: string[]
          preferred_roast_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xbloom_devices: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          model: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          model: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          model?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xbloom_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xbloom_recipe_profiles: {
        Row: {
          compatibility_status: string
          created_at: string
          device_model: string
          dose_grams: number
          grind_setting: string | null
          id: string
          pours: Json
          recipe_id: string
          updated_at: string
          water_grams: number
          water_temp_c: number | null
        }
        Insert: {
          compatibility_status?: string
          created_at?: string
          device_model: string
          dose_grams: number
          grind_setting?: string | null
          id?: string
          pours?: Json
          recipe_id: string
          updated_at?: string
          water_grams: number
          water_temp_c?: number | null
        }
        Update: {
          compatibility_status?: string
          created_at?: string
          device_model?: string
          dose_grams?: number
          grind_setting?: string | null
          id?: string
          pours?: Json
          recipe_id?: string
          updated_at?: string
          water_grams?: number
          water_temp_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xbloom_recipe_profiles_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      xbloom_sync_jobs: {
        Row: {
          attempted_at: string | null
          created_at: string
          error_message: string | null
          id: string
          recipe_id: string
          status: string
          user_id: string
        }
        Insert: {
          attempted_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipe_id: string
          status?: string
          user_id: string
        }
        Update: {
          attempted_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipe_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xbloom_sync_jobs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xbloom_sync_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assistant_public_documents: {
        Row: {
          category: string | null
          facts: Json | null
          id: string | null
          kind: string | null
          methods: string[] | null
          offers: Json | null
          search_text: string | null
          slug: string | null
          source_url: string | null
          summary_ar: string | null
          summary_en: string | null
          title_ar: string | null
          title_en: string | null
          verified_at: string | null
        }
        Relationships: []
      }
      green_coffee_balances: {
        Row: {
          green_coffee_id: string | null
          remaining_grams: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "green_coffees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_review_queue: {
        Row: {
          access_mode: string | null
          author_name: string | null
          author_url: string | null
          bean_name: string | null
          bloom_seconds: number | null
          brew_method: string | null
          brewer_name: string | null
          confidence: number | null
          discovered_at: string | null
          dose_grams: number | null
          extracted_fields: string[] | null
          extraction_id: string | null
          extraction_yield: number | null
          grind_setting: string | null
          grinder_name: string | null
          item_id: string | null
          matched_bean_id: string | null
          matched_roaster_id: string | null
          origin_country: string | null
          pour_schedule: Json | null
          pressure_profile: Json | null
          process: string | null
          published_at: string | null
          publisher: string | null
          ratio: number | null
          raw_excerpt: string | null
          roast_level: string | null
          roaster_name: string | null
          source_image_url: string | null
          source_name: string | null
          status: string | null
          tds: number | null
          title: string | null
          total_time_seconds: number | null
          trust_tier: string | null
          url: string | null
          varietal: string | null
          water_grams: number | null
          water_temp_c: number | null
          yield_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_extractions_brew_method_fkey"
            columns: ["brew_method"]
            isOneToOne: false
            referencedRelation: "brew_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ingestion_extractions_matched_bean_id_fkey"
            columns: ["matched_bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_extractions_matched_roaster_id_fkey"
            columns: ["matched_roaster_id"]
            isOneToOne: false
            referencedRelation: "roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      my_product_alert_candidates: {
        Row: {
          current_value: Json | null
          detected_at: string | null
          event_id: string | null
          event_type: string | null
          roasted_product_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_watches_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_product_freshness"
            referencedColumns: ["roasted_product_id"]
          },
          {
            foreignKeyName: "product_watches_roasted_product_id_fkey"
            columns: ["roasted_product_id"]
            isOneToOne: false
            referencedRelation: "roasted_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_profile_metrics: {
        Row: {
          charge_s: number | null
          development_ratio_percent: number | null
          development_seconds: number | null
          drop_s: number | null
          dry_end_s: number | null
          drying_seconds: number | null
          first_crack_s: number | null
          maillard_seconds: number | null
          roast_id: string | null
          total_time_seconds: number | null
          turning_point_s: number | null
          user_id: string | null
          weight_loss_g: number | null
          weight_loss_percent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roast_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roasted_product_freshness: {
        Row: {
          days_since_verification: number | null
          freshness_status: string | null
          last_verified_at: string | null
          needs_reverification: boolean | null
          roasted_product_id: string | null
        }
        Insert: {
          days_since_verification?: never
          freshness_status?: never
          last_verified_at?: string | null
          needs_reverification?: never
          roasted_product_id?: string | null
        }
        Update: {
          days_since_verification?: never
          freshness_status?: never
          last_verified_at?: string | null
          needs_reverification?: never
          roasted_product_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_owned_equipment: { Args: { p_model_id: string }; Returns: string }
      authorize_direct_cleanup: { Args: { p_token: string }; Returns: boolean }
      can_direct_message: { Args: { p_recipient: string }; Returns: boolean }
      can_review_coffee_stories: { Args: never; Returns: boolean }
      complete_direct_audio_cleanup: {
        Args: { p_paths: string[] }
        Returns: undefined
      }
      consume_coffee_assistant_quota: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      delete_own_account: { Args: never; Returns: undefined }
      direct_audio_object_identity: {
        Args: { p_owner: string; p_path: string }
        Returns: string
      }
      equipment_review_summary: {
        Args: { p_equipment_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      expired_direct_audio_for_owner: {
        Args: { p_owner: string }
        Returns: string[]
      }
      get_member_profile: { Args: { p_username: string }; Returns: Json }
      moderate_equipment_review: {
        Args: { p_hidden: boolean; p_reason: string; p_review_id: string }
        Returns: undefined
      }
      public_bean_origins: {
        Args: never
        Returns: {
          origin_country: string
        }[]
      }
      purge_expired_direct_messages: { Args: never; Returns: string[] }
      purge_reviewed_excerpts: { Args: never; Returns: undefined }
      recipe_discovery_normalize: { Args: { value: string }; Returns: string }
      recipe_discovery_search_text: {
        Args: { p_value: string }
        Returns: string
      }
      recipe_score: { Args: { p_recipe_id: string }; Returns: number }
      recipes_for_coffee: {
        Args: { p_bean_id?: string; p_product_id?: string }
        Returns: {
          bean_id: string | null
          brew_method: string
          content_language: string
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          difficulty: string | null
          dose_grams: number | null
          flavor_notes: string[]
          forked_from_recipe_id: string | null
          grinder_setting: string | null
          id: string
          is_incomplete_source: boolean
          notes: string | null
          notes_ar: string | null
          pour_style: string | null
          pour_sum_validated: boolean
          ratio: number | null
          recipe_type: string
          roasted_product_id: string | null
          serving_style: string
          slug: string | null
          source_author_name: string | null
          source_brew_parameters: Json
          source_coffee_name: string | null
          source_origin_country: string | null
          source_process: string | null
          source_roaster_name: string | null
          source_stated_ratio: number | null
          source_tasting_notes: string | null
          source_varietal: string | null
          title: string
          title_ar: string | null
          total_time_seconds: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          visibility: string
          water_grams: number | null
          water_temp_c: number | null
          water_temp_c_max: number | null
          water_temp_c_min: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recipes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_brew_outcome_v1: {
        Args: { p_payload: Json; p_request_id: string }
        Returns: string
      }
      record_configured_brew_v1: {
        Args: { p_context: Json; p_payload: Json; p_request_id: string }
        Returns: string
      }
      record_direct_voice_check:
        | {
            Args: {
              p_owner: string
              p_path: string
              p_seconds: number
              p_sha256: string
            }
            Returns: number
          }
        | {
            Args: {
              p_expected_object_id: string
              p_owner: string
              p_path: string
              p_seconds: number
              p_sha256: string
            }
            Returns: number
          }
      review_coffee_story: {
        Args: { p_approve: boolean; p_id: string; p_reason?: string }
        Returns: string
      }
      save_community_post: {
        Args: {
          p_body: string
          p_brew_id?: string
          p_id: string
          p_language: string
          p_media_path?: string
          p_media_type?: string
          p_replace_media?: boolean
        }
        Returns: string
      }
      save_green_coffee: { Args: { p_data: Json }; Returns: string }
      save_profile_photo: {
        Args: {
          p_caption?: string
          p_id: string
          p_kind: string
          p_path: string
        }
        Returns: string
      }
      save_roast_profile: { Args: { p_data: Json }; Returns: string }
      save_roast_tasting: {
        Args: { p_data: Json; p_roast_id: string }
        Returns: string
      }
      search_coffee_assistant: {
        Args: {
          p_category?: string
          p_kind?: string
          p_limit?: number
          p_methods?: string[]
          p_terms?: string[]
        }
        Returns: {
          category: string | null
          facts: Json | null
          id: string | null
          kind: string | null
          methods: string[] | null
          offers: Json | null
          search_text: string | null
          slug: string | null
          source_url: string | null
          summary_ar: string | null
          summary_en: string | null
          title_ar: string | null
          title_en: string | null
          verified_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "assistant_public_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_member_profiles: {
        Args: { p_offset?: number; p_query?: string }
        Returns: {
          avatar_url: string
          id: string
          is_private: boolean
          name: string
          username: string
        }[]
      }
      search_public_beans: {
        Args: { p_query?: string }
        Returns: {
          acidity_level: number | null
          altitude_meters: number | null
          bag_weight_grams: number | null
          body_level: number | null
          created_at: string
          created_by: string | null
          data_confidence: string
          description_ar: string | null
          description_en: string | null
          discovered_at: string
          discovery_run_id: string | null
          farm: string | null
          harvest_season: string | null
          id: string
          image_kind: string
          image_source_url: string | null
          image_url: string | null
          image_usage_status: string | null
          is_published: boolean
          last_verified_at: string | null
          name_ar: string
          name_en: string
          origin_country: string | null
          origin_region: string | null
          process: string | null
          requires_review: boolean
          roast_date: string | null
          roast_level: string | null
          roaster_id: string | null
          roaster_website_url: string | null
          sensory_profile: Json
          slug: string
          source_name: string | null
          source_type: string | null
          source_url: string | null
          suitable_for_espresso: boolean
          suitable_for_v60: boolean
          suitable_for_xbloom: boolean
          sweetness_level: number | null
          updated_at: string
          varietal: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "beans"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_public_recipes: {
        Args: {
          p_coffee_name?: string
          p_coffee_origin?: string
          p_coffee_type?: string
          p_creator_country?: string
          p_creator_name?: string
          p_flavor_family?: string
          p_flavor_note?: string
          p_method?: string
          p_model?: string
          p_query?: string
          p_recipe_country?: string
          p_recipe_name?: string
          p_roaster_name?: string
          p_serving_style?: string
          p_source?: string
          p_source_name?: string
        }
        Returns: {
          bean_id: string | null
          brew_method: string
          content_language: string
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          difficulty: string | null
          dose_grams: number | null
          flavor_notes: string[]
          forked_from_recipe_id: string | null
          grinder_setting: string | null
          id: string
          is_incomplete_source: boolean
          notes: string | null
          notes_ar: string | null
          pour_style: string | null
          pour_sum_validated: boolean
          ratio: number | null
          recipe_type: string
          roasted_product_id: string | null
          serving_style: string
          slug: string | null
          source_author_name: string | null
          source_brew_parameters: Json
          source_coffee_name: string | null
          source_origin_country: string | null
          source_process: string | null
          source_roaster_name: string | null
          source_stated_ratio: number | null
          source_tasting_notes: string | null
          source_varietal: string | null
          title: string
          title_ar: string | null
          total_time_seconds: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          visibility: string
          water_grams: number | null
          water_temp_c: number | null
          water_temp_c_max: number | null
          water_temp_c_min: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recipes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_public_recipes_v2: {
        Args: {
          p_bean_id?: string
          p_coffee_name?: string
          p_coffee_origin?: string
          p_coffee_type?: string
          p_creator_country?: string
          p_creator_name?: string
          p_flavor_family?: string
          p_flavor_note?: string
          p_method?: string
          p_model?: string
          p_product_id?: string
          p_query?: string
          p_recipe_country?: string
          p_recipe_name?: string
          p_roaster_name?: string
          p_serving_style?: string
          p_source?: string
          p_source_name?: string
        }
        Returns: {
          bean_id: string | null
          brew_method: string
          content_language: string
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          difficulty: string | null
          dose_grams: number | null
          flavor_notes: string[]
          forked_from_recipe_id: string | null
          grinder_setting: string | null
          id: string
          is_incomplete_source: boolean
          notes: string | null
          notes_ar: string | null
          pour_style: string | null
          pour_sum_validated: boolean
          ratio: number | null
          recipe_type: string
          roasted_product_id: string | null
          serving_style: string
          slug: string | null
          source_author_name: string | null
          source_brew_parameters: Json
          source_coffee_name: string | null
          source_origin_country: string | null
          source_process: string | null
          source_roaster_name: string | null
          source_stated_ratio: number | null
          source_tasting_notes: string | null
          source_varietal: string | null
          title: string
          title_ar: string | null
          total_time_seconds: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          visibility: string
          water_grams: number | null
          water_temp_c: number | null
          water_temp_c_max: number | null
          water_temp_c_min: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recipes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_direct_conversation: {
        Args: { p_recipient: string }
        Returns: string
      }
      submit_member_bean: {
        Args: { p_id: string; p_payload: Json }
        Returns: string
      }
      submit_member_recipe: {
        Args: { p_id: string; p_payload: Json }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
