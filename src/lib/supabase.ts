import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anon);
}

export function getSupabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!client) {
    client = createClient(url, anon);
  }
  return client;
}

export const JOURNAL_IMAGES_BUCKET = "journal-images";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * When set (and valid), anonymous visitors can load this user's journal (read-only).
 * Must match the UUID used in Supabase RLS policy `journal_select_public_owner`.
 */
export function getPublicJournalUserId(): string | null {
  const raw = import.meta.env.VITE_JOURNAL_PUBLIC_USER_ID;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || !UUID_RE.test(s)) return null;
  return s;
}

/** Local / private Supabase mode: any signed-in user may write. */
export function canWriteJournal(
  cloud: boolean,
  userId: string | null,
  publicOwnerId: string | null,
): boolean {
  if (!cloud) return true;
  if (!userId) return false;
  if (!publicOwnerId) return true;
  return userId === publicOwnerId;
}

/** Public journal mode: visitors and non-owner accounts are read-only. */
export function isJournalTimelineReadOnly(
  cloud: boolean,
  userId: string | null,
  publicOwnerId: string | null,
): boolean {
  if (!cloud) return false;
  if (!userId) return true;
  if (!publicOwnerId) return false;
  return userId !== publicOwnerId;
}
