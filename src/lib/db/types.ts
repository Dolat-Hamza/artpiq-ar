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
          created_at: string
          currency: string | null
          depth_cm: number | null
          description: string | null
          height_cm: number
          id: string
          image_url: string | null
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
          location_address: string | null
          location_country: string | null
          commission_pct: number | null
          tax_amount: number | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
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
      stock_rooms: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          thumb_url: string
          wall_quad: Json
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
