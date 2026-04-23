/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Supabase auth user UUID; same value as in RLS policy `journal_select_public_owner`. */
  readonly VITE_JOURNAL_PUBLIC_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
