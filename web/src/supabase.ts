import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// supabase-js persiste la sesión (access token + refresh token) sola en
// localStorage y la refresca antes de que expire — reemplaza por completo el
// candado/token manual que había antes (gate.ts, config.ts getToken/setToken).
export const supabase = createClient(url, anonKey);
