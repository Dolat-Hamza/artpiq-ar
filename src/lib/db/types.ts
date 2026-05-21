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
      activities: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          occurred_at: string
          owner_id: string
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          occurred_at?: string
          owner_id: string
          subject?: string | null
          type?: string
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          occurred_at?: string
          owner_id?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      app_admins: {
        Row: {
          created_at: string
          email: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          role?: string
        }
        Relationships: []
      }
      art_shows: {
        Row: {
          created_at: string
          floor_plan_url: string | null
          id: string
          name: string
          owner_id: string
          placements: Json
          updated_at: string
          venue_name: string | null
          wall_segments: Json
        }
        Insert: {
          created_at?: string
          floor_plan_url?: string | null
          id?: string
          name: string
          owner_id: string
          placements?: Json
          updated_at?: string
          venue_name?: string | null
          wall_segments?: Json
        }
        Update: {
          created_at?: string
          floor_plan_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          placements?: Json
          updated_at?: string
          venue_name?: string | null
          wall_segments?: Json
        }
        Relationships: []
      }
      artwork_collections: {
        Row: {
          added_at: string
          artwork_id: string
          collection_id: string
          notes: string | null
          position: number
          rent_12mo: number | null
          rent_24mo: number | null
          rent_36mo: number | null
          sale_mode: string
          show_price: boolean
        }
        Insert: {
          added_at?: string
          artwork_id: string
          collection_id: string
          notes?: string | null
          position?: number
          rent_12mo?: number | null
          rent_24mo?: number | null
          rent_36mo?: number | null
          sale_mode?: string
          show_price?: boolean
        }
        Update: {
          added_at?: string
          artwork_id?: string
          collection_id?: string
          notes?: string | null
          position?: number
          rent_12mo?: number | null
          rent_24mo?: number | null
          rent_36mo?: number | null
          sale_mode?: string
          show_price?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "artwork_collections_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artwork_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_images: {
        Row: {
          artwork_id: string
          caption: string | null
          created_at: string
          id: string
          position: number
          thumb_url: string | null
          url: string
        }
        Insert: {
          artwork_id: string
          caption?: string | null
          created_at?: string
          id?: string
          position?: number
          thumb_url?: string | null
          url: string
        }
        Update: {
          artwork_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          position?: number
          thumb_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_images_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artworks: {
        Row: {
          artist: string | null
          collection: string | null
          colors: string[] | null
          commission_pct: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cost_basis: number | null
          created_at: string
          currency: string | null
          depth_cm: number | null
          description: string | null
          height_cm: number
          id: string
          image_url: string | null
          location_address: string | null
          location_country: string | null
          material: string | null
          medium: string | null
          nft_url: string | null
          orientation: string | null
          owner_contact_id: string | null
          owner_id: string | null
          ownership_status: string | null
          price: number | null
          privacy: string
          purchase_date: string | null
          purchase_url: string | null
          sales_commission_pct: number | null
          sold: boolean
          sold_price: number | null
          sqsp_sku: string | null
          status: Database["public"]["Enums"]["artwork_status"]
          tax_amount: number | null
          tax_pct: number | null
          thumb_url: string | null
          title: string
          transparent: boolean
          type: string
          updated_at: string
          view_more_url: string | null
          width_cm: number
          wiki_title: string | null
          year: string | null
        }
        Insert: {
          artist?: string | null
          collection?: string | null
          colors?: string[] | null
          commission_pct?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_basis?: number | null
          created_at?: string
          currency?: string | null
          depth_cm?: number | null
          description?: string | null
          height_cm: number
          id?: string
          image_url?: string | null
          location_address?: string | null
          location_country?: string | null
          material?: string | null
          medium?: string | null
          nft_url?: string | null
          orientation?: string | null
          owner_contact_id?: string | null
          owner_id?: string | null
          ownership_status?: string | null
          price?: number | null
          privacy?: string
          purchase_date?: string | null
          purchase_url?: string | null
          sales_commission_pct?: number | null
          sold?: boolean
          sold_price?: number | null
          sqsp_sku?: string | null
          status?: Database["public"]["Enums"]["artwork_status"]
          tax_amount?: number | null
          tax_pct?: number | null
          thumb_url?: string | null
          title: string
          transparent?: boolean
          type?: string
          updated_at?: string
          view_more_url?: string | null
          width_cm: number
          wiki_title?: string | null
          year?: string | null
        }
        Update: {
          artist?: string | null
          collection?: string | null
          colors?: string[] | null
          commission_pct?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_basis?: number | null
          created_at?: string
          currency?: string | null
          depth_cm?: number | null
          description?: string | null
          height_cm?: number
          id?: string
          image_url?: string | null
          location_address?: string | null
          location_country?: string | null
          material?: string | null
          medium?: string | null
          nft_url?: string | null
          orientation?: string | null
          owner_contact_id?: string | null
          owner_id?: string | null
          ownership_status?: string | null
          price?: number | null
          privacy?: string
          purchase_date?: string | null
          purchase_url?: string | null
          sales_commission_pct?: number | null
          sold?: boolean
          sold_price?: number | null
          sqsp_sku?: string | null
          status?: Database["public"]["Enums"]["artwork_status"]
          tax_amount?: number | null
          tax_pct?: number | null
          thumb_url?: string | null
          title?: string
          transparent?: boolean
          type?: string
          updated_at?: string
          view_more_url?: string | null
          width_cm?: number
          wiki_title?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          colour: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          privacy: string
          slug: string | null
          updated_at: string
          viewing_room_password: string | null
          viewing_room_status: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          privacy?: string
          slug?: string | null
          updated_at?: string
          viewing_room_password?: string | null
          viewing_room_status?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          privacy?: string
          slug?: string | null
          updated_at?: string
          viewing_room_password?: string | null
          viewing_room_status?: string | null
        }
        Relationships: []
      }
      contact_presentations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          presentation_id: string
          sent_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          presentation_id: string
          sent_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          presentation_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_presentations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_presentations_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          artist_contact_ids: string[] | null
          budget_max_eur: number | null
          budget_min_eur: number | null
          category: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          interested_artwork_ids: string[] | null
          interests_artists: string[]
          interests_mediums: string[]
          interests_styles: string[]
          is_artist: boolean | null
          last_seen_at: string | null
          lifecycle_stage: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          phone: string | null
          preferred_currency: string
          role: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          artist_contact_ids?: string[] | null
          budget_max_eur?: number | null
          budget_min_eur?: number | null
          category?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interested_artwork_ids?: string[] | null
          interests_artists?: string[]
          interests_mediums?: string[]
          interests_styles?: string[]
          is_artist?: boolean | null
          last_seen_at?: string | null
          lifecycle_stage?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          phone?: string | null
          preferred_currency?: string
          role?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          artist_contact_ids?: string[] | null
          budget_max_eur?: number | null
          budget_min_eur?: number | null
          category?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interested_artwork_ids?: string[] | null
          interests_artists?: string[]
          interests_mediums?: string[]
          interests_styles?: string[]
          is_artist?: boolean | null
          last_seen_at?: string | null
          lifecycle_stage?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          preferred_currency?: string
          role?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          id: string
          owner_id: string
          resolved: boolean
        }
        Insert: {
          author_id: string
          body: string
          content_id: string
          created_at?: string
          id?: string
          owner_id: string
          resolved?: boolean
        }
        Update: {
          author_id?: string
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artwork_ids: string[] | null
          assignee_id: string | null
          audience_segment: string | null
          body_html: string | null
          body_md: string | null
          campaign_id: string | null
          channels: string[] | null
          copy: string | null
          cover_url: string | null
          created_at: string
          cta: string | null
          cta_url: string | null
          event_date: string | null
          event_location: string | null
          format: string | null
          funnel_stage: string | null
          hashtags: string[] | null
          hook: string | null
          id: string
          kpi: string | null
          media_urls: string[] | null
          month_key: string | null
          owner_id: string
          pillar: string | null
          platform: string | null
          post_type: string | null
          preview_text: string | null
          published_at: string | null
          published_url: string | null
          purpose: string | null
          reviewer_id: string | null
          scheduled_at: string | null
          slug: string | null
          status: string
          subject_line: string | null
          tags: string[] | null
          target_audience: string | null
          title: string | null
          type: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artwork_ids?: string[] | null
          assignee_id?: string | null
          audience_segment?: string | null
          body_html?: string | null
          body_md?: string | null
          campaign_id?: string | null
          channels?: string[] | null
          copy?: string | null
          cover_url?: string | null
          created_at?: string
          cta?: string | null
          cta_url?: string | null
          event_date?: string | null
          event_location?: string | null
          format?: string | null
          funnel_stage?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          kpi?: string | null
          media_urls?: string[] | null
          month_key?: string | null
          owner_id: string
          pillar?: string | null
          platform?: string | null
          post_type?: string | null
          preview_text?: string | null
          published_at?: string | null
          published_url?: string | null
          purpose?: string | null
          reviewer_id?: string | null
          scheduled_at?: string | null
          slug?: string | null
          status?: string
          subject_line?: string | null
          tags?: string[] | null
          target_audience?: string | null
          title?: string | null
          type: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artwork_ids?: string[] | null
          assignee_id?: string | null
          audience_segment?: string | null
          body_html?: string | null
          body_md?: string | null
          campaign_id?: string | null
          channels?: string[] | null
          copy?: string | null
          cover_url?: string | null
          created_at?: string
          cta?: string | null
          cta_url?: string | null
          event_date?: string | null
          event_location?: string | null
          format?: string | null
          funnel_stage?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          kpi?: string | null
          media_urls?: string[] | null
          month_key?: string | null
          owner_id?: string
          pillar?: string | null
          platform?: string | null
          post_type?: string | null
          preview_text?: string | null
          published_at?: string | null
          published_url?: string | null
          purpose?: string | null
          reviewer_id?: string | null
          scheduled_at?: string | null
          slug?: string | null
          status?: string
          subject_line?: string | null
          tags?: string[] | null
          target_audience?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_views: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          is_default: boolean | null
          name: string
          owner_id: string
          sort_by: string | null
          sort_dir: string | null
          visible_columns: string[] | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          owner_id: string
          sort_by?: string | null
          sort_dir?: string | null
          visible_columns?: string[] | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          owner_id?: string
          sort_by?: string | null
          sort_dir?: string | null
          visible_columns?: string[] | null
        }
        Relationships: []
      }
      deal_artworks: {
        Row: {
          agreed_price: number | null
          artwork_id: string
          commission_pct: number | null
          counter_offer: number | null
          created_at: string
          deal_id: string
          direction: string
          id: string
          line_status: string
          list_price: number | null
          mode: string
          notes: string | null
          offer_price: number | null
          offer_rounds: Json
          position: number
          rent_monthly: number | null
          rent_term_months: number | null
          swap_value: number | null
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          artwork_id: string
          commission_pct?: number | null
          counter_offer?: number | null
          created_at?: string
          deal_id: string
          direction?: string
          id?: string
          line_status?: string
          list_price?: number | null
          mode?: string
          notes?: string | null
          offer_price?: number | null
          offer_rounds?: Json
          position?: number
          rent_monthly?: number | null
          rent_term_months?: number | null
          swap_value?: number | null
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          artwork_id?: string
          commission_pct?: number | null
          counter_offer?: number | null
          created_at?: string
          deal_id?: string
          direction?: string
          id?: string
          line_status?: string
          list_price?: number | null
          mode?: string
          notes?: string | null
          offer_price?: number | null
          offer_rounds?: Json
          position?: number
          rent_monthly?: number | null
          rent_term_months?: number | null
          swap_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_artworks_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_artworks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          artwork_id: string | null
          artwork_ids: string[] | null
          contact_id: string | null
          created_at: string
          currency: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          organization_id: string | null
          owner_id: string
          probability: number | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          artwork_id?: string | null
          artwork_ids?: string[] | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          probability?: number | null
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          artwork_id?: string | null
          artwork_ids?: string[] | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          probability?: number | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      design_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      discover_profiles: {
        Row: {
          bio: string | null
          contact_email: string | null
          created_at: string
          display_name: string
          hero_image_url: string | null
          owner_id: string
          published: boolean
          slug: string
          social: Json
          theme: Json
          updated_at: string
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          display_name: string
          hero_image_url?: string | null
          owner_id: string
          published?: boolean
          slug: string
          social?: Json
          theme?: Json
          updated_at?: string
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          display_name?: string
          hero_image_url?: string | null
          owner_id?: string
          published?: boolean
          slug?: string
          social?: Json
          theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          country: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      presentations: {
        Row: {
          artwork_ids: string[] | null
          created_at: string
          id: string
          layout: string
          owner_id: string
          pdf_url: string | null
          rental_tiers: Json | null
          show_price: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          artwork_ids?: string[] | null
          created_at?: string
          id?: string
          layout: string
          owner_id: string
          pdf_url?: string | null
          rental_tiers?: Json | null
          show_price?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          artwork_ids?: string[] | null
          created_at?: string
          id?: string
          layout?: string
          owner_id?: string
          pdf_url?: string | null
          rental_tiers?: Json | null
          show_price?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_favorites: {
        Row: {
          created_at: string
          owner_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          room_id?: string
        }
        Relationships: []
      }
      saved_designs: {
        Row: {
          created_at: string
          customize: Json
          folder_id: string | null
          id: string
          lighting: Json
          my_wall_bg_url: string | null
          name: string
          owner_id: string
          placed: Json
          room_id: string | null
          thumb_url: string | null
          updated_at: string
          wall_color: string | null
        }
        Insert: {
          created_at?: string
          customize?: Json
          folder_id?: string | null
          id?: string
          lighting?: Json
          my_wall_bg_url?: string | null
          name: string
          owner_id: string
          placed: Json
          room_id?: string | null
          thumb_url?: string | null
          updated_at?: string
          wall_color?: string | null
        }
        Update: {
          created_at?: string
          customize?: Json
          folder_id?: string | null
          id?: string
          lighting?: Json
          my_wall_bg_url?: string | null
          name?: string
          owner_id?: string
          placed?: Json
          room_id?: string | null
          thumb_url?: string | null
          updated_at?: string
          wall_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_designs_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "design_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channels: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          display_name: string | null
          handle: string
          id: string
          owner_id: string
          platform: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          handle: string
          id?: string
          owner_id: string
          platform: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string
          id?: string
          owner_id?: string
          platform?: string
        }
        Relationships: []
      }
      stock_rooms: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          orientation: string | null
          perspective: string | null
          smart: boolean | null
          thumb_url: string
          wall_quad: Json
          wall_size: string | null
          wall_width_cm: number
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          image_url: string
          name: string
          orientation?: string | null
          perspective?: string | null
          smart?: boolean | null
          thumb_url: string
          wall_quad: Json
          wall_size?: string | null
          wall_width_cm: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          orientation?: string | null
          perspective?: string | null
          smart?: boolean | null
          thumb_url?: string
          wall_quad?: Json
          wall_size?: string | null
          wall_width_cm?: number
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          opted_in_at: string
          opted_out_at: string | null
          owner_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          opted_in_at?: string
          opted_out_at?: string | null
          owner_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          opted_in_at?: string
          opted_out_at?: string | null
          owner_id?: string
          source?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          contact_id: string | null
          created_at: string
          deal_id: string | null
          done_at: string | null
          due_at: string | null
          id: string
          owner_id: string
          priority: string | null
          title: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          owner_id: string
          priority?: string | null
          title: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          owner_id?: string
          priority?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_features: {
        Row: {
          features: string[]
          notes: string | null
          owner_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          features?: string[]
          notes?: string | null
          owner_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          features?: string[]
          notes?: string | null
          owner_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      virtual_exhibitions: {
        Row: {
          created_at: string
          id: string
          lighting: Json
          name: string
          owner_id: string
          published: boolean
          room_template: string
          slug: string | null
          updated_at: string
          wall_artworks: Json
          wall_color: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lighting?: Json
          name: string
          owner_id: string
          published?: boolean
          room_template?: string
          slug?: string | null
          updated_at?: string
          wall_artworks?: Json
          wall_color?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lighting?: Json
          name?: string
          owner_id?: string
          published?: boolean
          room_template?: string
          slug?: string | null
          updated_at?: string
          wall_artworks?: Json
          wall_color?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_ingest_artworks: {
        Args: { owner: string; payload: Json }
        Returns: number
      }
      capture_lead: {
        Args: {
          p_email: string
          p_name?: string
          p_notes?: string
          p_owner: string
          p_source?: string
        }
        Returns: string
      }
      is_super_admin: { Args: never; Returns: boolean }
      subscribe_newsletter: {
        Args: {
          p_email: string
          p_name?: string
          p_owner: string
          p_source?: string
        }
        Returns: string
      }
      superadmin_bulk_add_stock_rooms: {
        Args: { p_rooms: Json }
        Returns: number
      }
      superadmin_delete_admin: { Args: { p_email: string }; Returns: undefined }
      superadmin_delete_stock_room: {
        Args: { p_id: string }
        Returns: undefined
      }
      superadmin_list_admins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          role: string
        }[]
      }
      superadmin_list_stock_rooms: {
        Args: never
        Returns: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          orientation: string | null
          perspective: string | null
          smart: boolean | null
          thumb_url: string
          wall_quad: Json
          wall_size: string | null
          wall_width_cm: number
        }[]
        SetofOptions: {
          from: "*"
          to: "stock_rooms"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      superadmin_list_users: {
        Args: never
        Returns: {
          c_artworks: number
          c_contacts: number
          c_content: number
          c_deals: number
          c_pres: number
          created_at: string
          email: string
          features: string[]
          id: string
          last_sign_in_at: string
          notes: string
          plan: string
        }[]
      }
      superadmin_seed_demo_content: {
        Args: { target_owner: string }
        Returns: number
      }
      superadmin_wipe_demo_content: {
        Args: { target_owner: string }
        Returns: number
      }
      superadmin_set_user_features: {
        Args: {
          p_features: string[]
          p_notes: string
          p_owner: string
          p_plan: string
        }
        Returns: undefined
      }
      superadmin_update_stock_room_quad: {
        Args: { p_id: string; p_quad: Json }
        Returns: undefined
      }
      superadmin_upsert_admin: {
        Args: { p_email: string; p_role: string }
        Returns: undefined
      }
    }
    Enums: {
      artwork_status:
        | "for_sale"
        | "sold"
        | "rented"
        | "reserved"
        | "not_for_sale"
        | "sale_pending"
        | "for_rent"
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
      artwork_status: [
        "for_sale",
        "sold",
        "rented",
        "reserved",
        "not_for_sale",
        "sale_pending",
        "for_rent",
      ],
    },
  },
} as const
