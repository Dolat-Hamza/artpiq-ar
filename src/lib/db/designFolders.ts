import { DesignFolder } from '@/types'
import { Database } from './types'
import { supabase } from './client'

type Row = Database['public']['Tables']['design_folders']['Row']

function rowToFolder(r: Row): DesignFolder {
  return { id: r.id, ownerId: r.owner_id, name: r.name, createdAt: r.created_at }
}

export async function listFolders(ownerId: string): Promise<DesignFolder[]> {
  const { data, error } = await supabase()
    .from('design_folders')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToFolder)
}

export async function createFolder(ownerId: string, name: string): Promise<DesignFolder> {
  const { data, error } = await supabase()
    .from('design_folders')
    .insert({ owner_id: ownerId, name })
    .select('*')
    .single()
  if (error) throw error
  return rowToFolder(data)
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase().from('design_folders').delete().eq('id', id)
  if (error) throw error
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase().from('design_folders').update({ name }).eq('id', id)
  if (error) throw error
}
