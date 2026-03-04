
// Desabilitar Supabase inicialmente - agora usando MySQL
const supabaseUrl = "";
const supabaseAnonKey = "";

export const isSupabaseConfigured = false; // Desabilitado para usar MySQL

// Client mock - não tenta conectar
let supabaseClient: any = null;

export const supabase = {
  from: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
  storage: {
    from: () => ({
      download: () => Promise.resolve({ data: null, error: null }),
    }),
  },
} as any;

export interface UserProfileSupabase {
  id: string;
  uid: string;
  email: string;
  full_name: string;
  role: "student" | "instructor" | "admin";
  status: string;
  avatar_url?: string;
  last_sync?: string;
}
