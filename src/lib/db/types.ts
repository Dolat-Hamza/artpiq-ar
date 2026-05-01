export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
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
          status: string
          sqsp_sku: string | null
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
        Insert: Partial<Database['public']['Tables']['artworks']['Row']> & {
          title: string
          width_cm: number
          height_cm: number
        }
        Update: Partial<Database['public']['Tables']['artworks']['Row']>
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          cover_url: string | null
          privacy: string
          slug: string | null
          viewing_room_status: string | null
          viewing_room_password: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['collections']['Row']> & {
          name: string
          owner_id: string
        }
        Update: Partial<Database['public']['Tables']['collections']['Row']>
        Relationships: []
      }
      artwork_collections: {
        Row: {
          artwork_id: string
          collection_id: string
          position: number
          added_at: string
        }
        Insert: Database['public']['Tables']['artwork_collections']['Row']
        Update: Partial<Database['public']['Tables']['artwork_collections']['Row']>
        Relationships: []
      }
      design_folders: {
        Row: {
          id: string
          owner_id: string
          name: string
          created_at: string
        }
        Insert: { name: string; owner_id: string; id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['design_folders']['Row']>
        Relationships: []
      }
      saved_designs: {
        Row: {
          id: string
          owner_id: string
          name: string
          room_id: string | null
          my_wall_bg_url: string | null
          placed: Json
          lighting: Json
          wall_color: string | null
          customize: Json
          thumb_url: string | null
          folder_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['saved_designs']['Row']> & {
          name: string
          owner_id: string
          placed: Json
        }
        Update: Partial<Database['public']['Tables']['saved_designs']['Row']>
        Relationships: []
      }
      room_favorites: {
        Row: {
          owner_id: string
          room_id: string
          created_at: string
        }
        Insert: { owner_id: string; room_id: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['room_favorites']['Row']>
        Relationships: []
      }
      discover_profiles: {
        Row: {
          owner_id: string
          slug: string
          display_name: string
          bio: string | null
          hero_image_url: string | null
          contact_email: string | null
          social: Json
          theme: Json
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['discover_profiles']['Row']> & {
          owner_id: string
          slug: string
          display_name: string
        }
        Update: Partial<Database['public']['Tables']['discover_profiles']['Row']>
        Relationships: []
      }
      art_shows: {
        Row: {
          id: string
          owner_id: string
          name: string
          venue_name: string | null
          floor_plan_url: string | null
          wall_segments: Json
          placements: Json
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['art_shows']['Row']> & {
          owner_id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['art_shows']['Row']>
        Relationships: []
      }
      virtual_exhibitions: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string | null
          room_template: string
          wall_artworks: Json
          wall_color: string | null
          lighting: Json
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['virtual_exhibitions']['Row']> & {
          owner_id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['virtual_exhibitions']['Row']>
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          owner_id: string
          name: string | null
          email: string | null
          phone: string | null
          country: string | null
          category: string | null
          tags: string[] | null
          source: string | null
          notes: string | null
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['contacts']['Row']> & { owner_id: string }
        Update: Partial<Database['public']['Tables']['contacts']['Row']>
        Relationships: []
      }
      subscribers: {
        Row: {
          id: string
          owner_id: string
          email: string
          name: string | null
          source: string | null
          opted_in_at: string
          opted_out_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['subscribers']['Row']> & {
          owner_id: string
          email: string
        }
        Update: Partial<Database['public']['Tables']['subscribers']['Row']>
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
        Insert: Database['public']['Tables']['stock_rooms']['Row']
        Update: Partial<Database['public']['Tables']['stock_rooms']['Row']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
