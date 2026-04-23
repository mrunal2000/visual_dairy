import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntryBlock, JournalEntry } from "@/types";
import {
  parseMusicBlockBody,
  stringifyMusicPayload,
} from "@/musicBlock";
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

function storageExtension(blob: Blob): string {
  const t = blob.type || "";
  if (t.includes("mpeg")) return "mp3";
  if (t.includes("wav")) return "wav";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("mp4") || t.includes("aac") || t.includes("m4a")) return "m4a";
  if (t.includes("png")) return "png";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  return "bin";
}

async function uploadDataUrl(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = storageExtension(blob);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(JOURNAL_IMAGES_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
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
      if (b.kind === "image" && b.body.startsWith("data:")) {
        try {
          const url = await uploadDataUrl(supabase, userId, b.body);
          return { ...b, body: url };
        } catch (e) {
          console.error("[visual-dairy] Image upload failed", e);
          return b;
        }
      }
      if (b.kind === "music" && b.body) {
        let p = parseMusicBlockBody(b.body);
        if (!p.artworkUrl.startsWith("data:") && !p.audioUrl.startsWith("data:"))
          return b;
        try {
          if (p.artworkUrl.startsWith("data:")) {
            p = {
              ...p,
              artworkUrl: await uploadDataUrl(supabase, userId, p.artworkUrl),
            };
          }
          if (p.audioUrl.startsWith("data:")) {
            p = {
              ...p,
              audioUrl: await uploadDataUrl(supabase, userId, p.audioUrl),
            };
          }
          return { ...b, body: stringifyMusicPayload(p) };
        } catch (e) {
          console.error("[visual-dairy] Music media upload failed", e);
          return b;
        }
      }
      return b;
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
