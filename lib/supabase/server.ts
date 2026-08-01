import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

// Renvoie un client Supabase si les variables d'environnement sont configurées,
// sinon null. Toute la couche lib/data/*.ts bascule automatiquement sur le jeu
// de données de démonstration (lib/data/seed.ts) quand ce client est null —
// l'application est donc utilisable immédiatement, sans configuration.
export function getSupabaseServerClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseServerClient() !== null;
}
