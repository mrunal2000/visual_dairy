import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntryBlock, JournalEntry } from "@/types";
import { JOURNAL_IMAGES_BUCKET } from "@/lib/supabase";

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid data URL");
  const header = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;]+)/.exec(header);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uploadDataUrl(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(JOURNAL_IMAGES_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage
    .from(JOURNAL_IMAGES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

async function processBlocks(
  blocks: EntryBlock[],
  userId: string,
  supabase: SupabaseClient,
): Promise<EntryBlock[]> {
  return Promise.all(
    blocks.map(async (b) => {
      if (b.kind !== "image" || !b.body.startsWith("data:")) return b;
      try {
        const url = await uploadDataUrl(supabase, userId, b.body);
        return { ...b, body: url };
      } catch (e) {
        console.error("[visual-dairy] Image upload failed", e);
        return b;
      }
    }),
  );
}

/** Replace data-URL image bodies with Storage public URLs. */
export async function processEntryImages(
  entry: JournalEntry,
  userId: string,
  supabase: SupabaseClient,
): Promise<JournalEntry> {
  const blocks = await processBlocks(entry.blocks, userId, supabase);
  return { ...entry, blocks };
}

export async function processAllEntries(
  entries: JournalEntry[],
  userId: string,
  supabase: SupabaseClient,
): Promise<JournalEntry[]> {
  return Promise.all(
    entries.map((e) => processEntryImages(e, userId, supabase)),
  );
}
