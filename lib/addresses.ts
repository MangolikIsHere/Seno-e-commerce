import { createClient } from '@/utils/supabase/client'

export interface Address {
  id: string
  user_id: string
  recipient_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
  created_at: string
}

export type AddressInput = Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export async function fetchAddresses(userId: string): Promise<Address[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
    
  if (error || !data) return []
  return data
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address | null> {
  const supabase = createClient()
  
  if (input.is_default) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
    
  if (error || !data) return null
  return data
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput): Promise<Address | null> {
  const supabase = createClient()
  
  if (input.is_default) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .update(input)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select('*')
    .single()
    
  if (error || !data) return null
  return data
}

export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId)
    
  return !error
}
