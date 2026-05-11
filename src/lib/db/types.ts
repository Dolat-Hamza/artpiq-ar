export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
          owner_id: string | null
          price: number | null
          privacy: string
          purchase_url: string | null
          sold: boolean
          sqsp_sku: string | null
          status: Database["public"]["Enums"]["artwork_status"]
          tax_amount: number | null
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
        Insert: Partial<Database["public"]["Tables"]["artworks"]["Row"]> & { id?: string; title: string; width_cm: number; height_cm: number }
        Update: Partial<Database["public"]["Tables"]["artworks"]["Row"]>
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
      contacts: {
        Row: {
          artist_contact_ids: string[] | null
          category: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          interested_artwork_ids: string[] | null
          is_artist: boolean | null
          last_seen_at: string | null
          lifecycle_stage: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          phone: string | null
          role: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          lifecycle_stage?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          phone?: string | null
          role?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          lifecycle_stage?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          role?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      content_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artwork_ids: string[] | null
          assignee_id: string | null
          body_html: string | null
          body_md: string | null
          channels: string[] | null
          copy: string | null
          cover_url: string | null
          created_at: string
          cta: string | null
          cta_url: string | null
          event_date: string | null
          event_location: string | null
          hashtags: string[] | null
          hook: string | null
          id: string
          media_urls: string[] | null
          owner_id: string
          post_type: string | null
          published_at: string | null
          purpose: string | null
          reviewer_id: string | null
          scheduled_at: string | null
          status: string
          target_audience: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["content_items"]["Row"]> & { owner_id: string; type: string }
        Update: Partial<Database["public"]["Tables"]["content_items"]["Row"]>
        Relationships: []
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
        Insert: Partial<Database["public"]["Tables"]["deals"]["Row"]> & { owner_id: string; title: string }
        Update: Partial<Database["public"]["Tables"]["deals"]["Row"]>
        Relationships: []
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
          id: string
          owner_id: string
          title: string
          layout: string
          artwork_ids: string[] | null
          show_price: boolean | null
          rental_tiers: Json
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["presentations"]["Row"]> & { owner_id: string; title: string; layout: string }
        Update: Partial<Database["public"]["Tables"]["presentations"]["Row"]>
        Relationships: []
      }
      contact_presentations: {
        Row: {
          id: string
          contact_id: string
          presentation_id: string
          sent_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["contact_presentations"]["Row"]> & { contact_id: string; presentation_id: string }
        Update: Partial<Database["public"]["Tables"]["contact_presentations"]["Row"]>
        Relationships: []
      }
      crm_views: {
        Row: {
          id: string
          owner_id: string
          name: string
          filters: Json
          sort_by: string | null
          sort_dir: string | null
          visible_columns: string[] | null
          is_default: boolean | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["crm_views"]["Row"]> & { owner_id: string; name: string }
        Update: Partial<Database["public"]["Tables"]["crm_views"]["Row"]>
        Relationships: []
      }
      room_favorites: {
        Row: {
          created_at: string
          owner_id: string
          room_id: string
        }
        Insert: { created_at?: string; owner_id: string; room_id: string }
        Update: { created_at?: string; owner_id?: string; room_id?: string }
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
        Insert: Partial<Database["public"]["Tables"]["saved_designs"]["Row"]> & { owner_id: string; name: string; placed: Json }
        Update: Partial<Database["public"]["Tables"]["saved_designs"]["Row"]>
        Relationships: []
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
        Insert: Partial<Database["public"]["Tables"]["social_channels"]["Row"]> & { owner_id: string; handle: string; platform: string }
        Update: Partial<Database["public"]["Tables"]["social_channels"]["Row"]>
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
        Insert: Partial<Database["public"]["Tables"]["stock_rooms"]["Row"]> & { id: string; name: string; category: string; image_url: string; thumb_url: string; wall_quad: Json; wall_width_cm: number }
        Update: Partial<Database["public"]["Tables"]["stock_rooms"]["Row"]>
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
        Insert: Partial<Database["public"]["Tables"]["subscribers"]["Row"]> & { owner_id: string; email: string }
        Update: Partial<Database["public"]["Tables"]["subscribers"]["Row"]>
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
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & { owner_id: string; title: string }
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>
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
        Insert: Partial<Database["public"]["Tables"]["virtual_exhibitions"]["Row"]> & { owner_id: string; name: string }
        Update: Partial<Database["public"]["Tables"]["virtual_exhibitions"]["Row"]>
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
        Args: { p_email: string; p_name?: string; p_notes?: string; p_owner: string; p_source?: string }
        Returns: string
      }
      subscribe_newsletter: {
        Args: { p_email: string; p_name?: string; p_owner: string; p_source?: string }
        Returns: string
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

