// Généré par tests/db/contract.test.ts depuis le catalogue de la base : ne pas modifier à la main.
// Après une migration : npm run gen:types.
// Insert et Update valent never : l’API n’écrit jamais dans une table, toute écriture passe par une fonction.
// Row ne contient que les colonnes lisibles par une personne connectée : une colonne fermée à l’API n’y figure pas.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          id: boolean
          launch_free_until: string | null
        }
        Insert: never
        Update: never
        Relationships: [
        ]
      }
      artisan_live_location: {
        Row: {
          artisan_id: string
          lat: number
          lng: number
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'artisan_live_location_artisan_id_fkey'; columns: ['artisan_id']; isOneToOne: true; referencedRelation: 'artisans'; referencedColumns: ['id'] },
        ]
      }
      artisans: {
        Row: {
          id: string
          display_name: string
          category: string
          skills: string[]
          bio: string
          hourly_rate: number | null
          wilaya_code: number
          commune: string
          lat: number | null
          lng: number | null
          radius_km: number
          avatar_path: string | null
          cover_path: string | null
          is_available: boolean
          published: boolean
          suspended: boolean
          phone_verified: boolean
          verified_at: string | null
          rating_avg: number
          rating_count: number
          jobs_done: number
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'artisans_category_fkey'; columns: ['category']; isOneToOne: false; referencedRelation: 'categories'; referencedColumns: ['slug'] },
          { foreignKeyName: 'artisans_id_fkey'; columns: ['id']; isOneToOne: true; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      audit_log: {
        Row: {
          id: number
          actor_id: string
          action: string
          target: string | null
          details: Json
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
        ]
      }
      booking_private: {
        Row: {
          booking_id: string
          address: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'booking_private_booking_id_fkey'; columns: ['booking_id']; isOneToOne: true; referencedRelation: 'bookings'; referencedColumns: ['id'] },
        ]
      }
      bookings: {
        Row: {
          id: string
          client_id: string | null
          artisan_id: string | null
          category: string
          description: string
          wilaya_code: number
          commune: string
          scheduled_for: string | null
          is_urgent: boolean
          status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'finished' | 'completed'
          quoted_price: number | null
          sharing_location: boolean
          cancelled_by: string | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
          accepted_at: string | null
          finished_at: string | null
          completed_at: string | null
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'bookings_artisan_id_fkey'; columns: ['artisan_id']; isOneToOne: false; referencedRelation: 'artisans'; referencedColumns: ['id'] },
          { foreignKeyName: 'bookings_category_fkey'; columns: ['category']; isOneToOne: false; referencedRelation: 'categories'; referencedColumns: ['slug'] },
          { foreignKeyName: 'bookings_client_id_fkey'; columns: ['client_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      categories: {
        Row: {
          slug: string
          sort: number
          is_urgent: boolean
          is_active: boolean
        }
        Insert: never
        Update: never
        Relationships: [
        ]
      }
      messages: {
        Row: {
          id: string
          booking_id: string
          sender_id: string | null
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'messages_booking_id_fkey'; columns: ['booking_id']; isOneToOne: false; referencedRelation: 'bookings'; referencedColumns: ['id'] },
          { foreignKeyName: 'messages_sender_id_fkey'; columns: ['sender_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'booking_new' | 'booking_accepted' | 'booking_declined' | 'booking_cancelled' | 'booking_finished' | 'booking_completed' | 'message_new' | 'review_new' | 'review_reply' | 'subscription_active' | 'subscription_rejected' | 'account_suspended' | 'account_restored'
          booking_id: string | null
          data: Json
          read_at: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'notifications_booking_id_fkey'; columns: ['booking_id']; isOneToOne: false; referencedRelation: 'bookings'; referencedColumns: ['id'] },
          { foreignKeyName: 'notifications_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      plans: {
        Row: {
          id: 'basic' | 'premium'
          monthly: number
          yearly: number
          max_portfolio_posts: number | null
        }
        Insert: never
        Update: never
        Relationships: [
        ]
      }
      portfolio_posts: {
        Row: {
          id: string
          artisan_id: string
          caption: string
          photos: string[]
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'portfolio_posts_artisan_id_fkey'; columns: ['artisan_id']; isOneToOne: false; referencedRelation: 'artisans'; referencedColumns: ['id'] },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: 'client' | 'artisan'
          full_name: string
          avatar_path: string | null
          wilaya_code: number | null
          commune: string | null
          lang: 'fr' | 'ar'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
        ]
      }
      report_notes: {
        Row: {
          report_id: string
          note: string
          updated_by: string | null
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'report_notes_report_id_fkey'; columns: ['report_id']; isOneToOne: true; referencedRelation: 'reports'; referencedColumns: ['id'] },
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          reported_user_id: string
          target_type: 'artisan' | 'client' | 'booking' | 'review' | 'message'
          target_id: string
          booking_id: string | null
          reason: 'fraude' | 'comportement' | 'travail_non_fait' | 'prix_different' | 'faux_profil' | 'harcelement' | 'autre'
          details: string | null
          status: 'open' | 'in_review' | 'resolved' | 'rejected'
          resolution: 'none' | 'warning' | 'suspension' | 'cash_dispute' | 'other'
          handled_by: string | null
          handled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'reports_reporter_id_fkey'; columns: ['reporter_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          artisan_id: string
          author_name: string
          rating: number
          comment: string
          photos: string[]
          reply: string | null
          replied_at: string | null
          is_visible: boolean
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'reviews_artisan_id_fkey'; columns: ['artisan_id']; isOneToOne: false; referencedRelation: 'artisans'; referencedColumns: ['id'] },
          { foreignKeyName: 'reviews_booking_id_fkey'; columns: ['booking_id']; isOneToOne: true; referencedRelation: 'bookings'; referencedColumns: ['id'] },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          artisan_id: string | null
          artisan_label: string
          plan: string
          cycle: 'monthly' | 'yearly'
          amount: number
          status: 'pending' | 'active' | 'rejected' | 'expired' | 'cancelled'
          payment_method: 'transfer' | 'ccp' | 'baridimob' | 'cash'
          payment_ref: string | null
          note: string | null
          started_at: string | null
          expires_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'subscriptions_artisan_id_fkey'; columns: ['artisan_id']; isOneToOne: false; referencedRelation: 'artisans'; referencedColumns: ['id'] },
          { foreignKeyName: 'subscriptions_plan_fkey'; columns: ['plan']; isOneToOne: false; referencedRelation: 'plans'; referencedColumns: ['id'] },
        ]
      }
      user_contacts: {
        Row: {
          user_id: string
          phone: string | null
          phone_verified: boolean
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'user_contacts_user_id_fkey'; columns: ['user_id']; isOneToOne: true; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      add_portfolio_post: { Args: { p_caption: string; p_photos: string[] }; Returns: string }
      admin_overview: { Args: never; Returns: Json }
      admin_review_subscription: { Args: { p_subscription_id: string; p_approve: boolean; p_note?: string }; Returns: undefined }
      admin_set_booking_status: { Args: { p_booking_id: string; p_status: string; p_reason?: string }; Returns: undefined }
      admin_set_launch_free_until: { Args: { p_until: string }; Returns: undefined }
      admin_set_listing: { Args: { p_artisan_id: string; p_published?: boolean; p_verified?: boolean; p_reason?: string }; Returns: undefined }
      admin_set_review_visibility: { Args: { p_review_id: string; p_visible: boolean; p_reason?: string }; Returns: undefined }
      admin_set_user_active: { Args: { p_user_id: string; p_active: boolean; p_reason?: string }; Returns: undefined }
      admin_update_report: { Args: { p_report_id: string; p_status: string; p_resolution?: string; p_note?: string }; Returns: undefined }
      become_artisan: { Args: never; Returns: undefined }
      booking_contact: { Args: { p_booking_id: string }; Returns: { phone: string | null; phone_verified: boolean | null }[] }
      cancel_booking: { Args: { p_booking_id: string; p_reason?: string }; Returns: undefined }
      cancel_subscription_request: { Args: { p_subscription_id: string }; Returns: undefined }
      clear_notifications: { Args: never; Returns: undefined }
      complete_booking: { Args: { p_booking_id: string }; Returns: undefined }
      create_booking: { Args: { p_artisan_id: string; p_description: string; p_wilaya_code: number; p_commune?: string; p_address?: string; p_scheduled_for?: string; p_is_urgent?: boolean }; Returns: string }
      create_report: { Args: { p_target_type: string; p_target_id: string; p_reason: string; p_details?: string; p_booking_id?: string }; Returns: string }
      delete_portfolio_post: { Args: { p_post_id: string }; Returns: undefined }
      finish_booking: { Args: { p_booking_id: string }; Returns: undefined }
      mark_messages_read: { Args: { p_booking_id: string }; Returns: undefined }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: undefined }
      my_access: { Args: never; Returns: Json }
      publish_listing: { Args: { p_published: boolean }; Returns: undefined }
      purge_user: { Args: { p_user_id: string }; Returns: undefined }
      push_location: { Args: { p_lat: number; p_lng: number }; Returns: undefined }
      reply_review: { Args: { p_review_id: string; p_reply: string }; Returns: undefined }
      request_subscription: { Args: { p_plan: string; p_cycle: string; p_payment_method?: string; p_payment_ref?: string }; Returns: string }
      respond_booking: { Args: { p_booking_id: string; p_accept: boolean; p_quoted_price?: number }; Returns: string }
      save_listing: { Args: { p_display_name: string; p_category: string; p_wilaya_code: number; p_commune?: string; p_bio?: string; p_skills?: string[]; p_hourly_rate?: number; p_lat?: number; p_lng?: number; p_radius_km?: number; p_avatar_path?: string; p_cover_path?: string }; Returns: undefined }
      save_profile: { Args: { p_full_name: string; p_wilaya_code?: number; p_commune?: string; p_lang?: string; p_avatar_path?: string }; Returns: undefined }
      search_artisans: { Args: { p_category?: string; p_wilaya_code?: number; p_q?: string; p_lat?: number; p_lng?: number; p_limit?: number; p_offset?: number }; Returns: { id: string | null; display_name: string | null; category: string | null; skills: string[] | null; bio: string | null; hourly_rate: number | null; wilaya_code: number | null; commune: string | null; lat: number | null; lng: number | null; avatar_path: string | null; cover_path: string | null; is_available: boolean | null; is_premium: boolean | null; phone_verified: boolean | null; verified: boolean | null; rating_avg: number | null; rating_count: number | null; jobs_done: number | null; distance_km: number | null }[] }
      send_message: { Args: { p_booking_id: string; p_body: string }; Returns: Database['public']['Tables']['messages']['Row'] }
      set_availability: { Args: { p_available: boolean }; Returns: undefined }
      set_phone: { Args: { p_phone: string }; Returns: undefined }
      set_sharing_location: { Args: { p_booking_id: string; p_on: boolean }; Returns: undefined }
      submit_review: { Args: { p_booking_id: string; p_rating: number; p_comment?: string; p_photos?: string[] }; Returns: string }
    }
  }
}
