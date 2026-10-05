import { supabase } from './supabase'

export type UserRole = 'student' | 'officer' | 'admin'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}
