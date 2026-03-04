import { createClient } from '@supabase/supabase-js';

// Credenciais do Projeto fornecidas
const supabaseUrl = 'https://lopqvgqmtsmnybznvhrz.supabase.co';
const supabaseAnonKey = 'sb_publishable_oXygDSGLuCdHU28l769NfA_NMNtcCrv';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfileSupabase {
  id: string;
  uid: string;
  email: string;
  full_name: string;
  role: 'student' | 'instructor' | 'admin';
  status: string;
  avatar_url?: string;
  last_sync?: string;
}
