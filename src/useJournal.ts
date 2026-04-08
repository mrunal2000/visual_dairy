import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { processAllEntries } from "@/lib/uploadJournalImages";
import { parseMMDDYYYY } from "@/dateLabel";
import type { JournalEntry } from "./types";

const STORAGE_KEY = "visual-dairy-entries-v1";

/** Newest first (by parsed `dateLabel` when valid; otherwise by `createdAt`). */
function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    const ad = parseMMDDYYYY(a.dateLabel);
    const bd = parseMMDDYYYY(b.dateLabel);
    if (ad !== null && bd !== null && ad !== bd) return bd - ad;
    if (ad !== null && bd === null) return -1;
    if (ad === null && bd !== null) return 1;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
}

function loadLocal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortEntries(parsed as JournalEntry[]);
  } catch {
    return [];
  }
}

function saveLocal(entries: JournalEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error(
      "[visual-dairy] Could not save to localStorage (often quota with large photos).",
      err,
    );
    window.alert(
      "Could not save your journal — storage may be full. Try removing entries or using smaller images.",
    );
  }
}

type DbRow = {
  id: string;
  user_id: string;
  date_label: string;
  title: string;
  description: string;
  blocks: JournalEntry["blocks"];
  created_at: number | string;
};

function rowToEntry(row: DbRow): JournalEntry {
  const created =
    typeof row.created_at === "string"
      ? parseInt(row.created_at, 10)
      : Number(row.created_at);
  return {
    id: row.id,
    dateLabel: row.date_label,
    title: row.title,
    description: row.description,
    blocks: row.blocks,
    createdAt: Number.isFinite(created) ? created : Date.now(),
  };
}

function entryToRow(entry: JournalEntry, userId: string): DbRow {
  return {
    id: entry.id,
    user_id: userId,
    date_label: entry.dateLabel,
    title: entry.title,
    description: entry.description,
    blocks: entry.blocks,
    created_at: entry.createdAt,
  };
}

/**
 * @param userId - Authenticated user when using Supabase; `null` when local-only or signed out.
 */
export function useJournal(userId: string | null) {
  const cloud = isSupabaseConfigured();
  const supabase = getSupabase();
  const remote = Boolean(cloud && userId && supabase);

  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    cloud ? [] : loadLocal(),
  );
  const [remoteReady, setRemoteReady] = useState(!cloud);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSyncLogKey = useRef<string | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    console.info(
      "[visual-dairy]",
      cloud
        ? "Supabase env detected — entries sync after sign-in."
        : "No VITE_SUPABASE_* env — entries stay in this browser (localStorage) only.",
    );
  }, [cloud]);

  // Load: cloud + user → Supabase; no cloud → localStorage; cloud + no user → empty
  useEffect(() => {
    if (!cloud) {
      setEntries(loadLocal());
      setRemoteReady(true);
      return;
    }

    if (!userId || !supabase) {
      setEntries([]);
      setRemoteReady(true);
      return;
    }

    let cancelled = false;
    setRemoteReady(false);

    void (async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error(
          "[visual-dairy] Failed to load entries",
          error.message,
          error.code,
          error.details,
        );
        setEntries([]);
      } else {
        const rows = sortEntries((data as DbRow[]).map(rowToEntry));
        setEntries(rows);
        console.info(
          `[visual-dairy] Loaded ${rows.length} entr${rows.length === 1 ? "y" : "ies"} from Supabase`,
        );
      }
      if (!cancelled) setRemoteReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [cloud, userId, supabase]);

  // Persist locally when not using remote DB
  useEffect(() => {
    if (cloud) return;
    saveLocal(entries);
  }, [entries, cloud]);

  // Debounced sync to Supabase (uploads data-URL images, then upserts)
  useEffect(() => {
    if (!remote || !remoteReady || !supabase || !userId) {
      if (entries.length > 0) {
        const key = `${cloud}:${Boolean(userId)}:${remoteReady}`;
        if (skipSyncLogKey.current !== key) {
          skipSyncLogKey.current = key;
          if (!cloud) {
            console.info(
              "[visual-dairy] Not syncing: no Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. on Vercel), redeploy, then sign in.",
            );
          } else if (!userId) {
            console.warn("[visual-dairy] Not syncing: not signed in.");
          } else if (!remoteReady) {
            console.info(
              "[visual-dairy] Not syncing yet: still loading your data from Supabase…",
            );
          }
        }
      }
      return;
    }

    skipSyncLogKey.current = null;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      void (async () => {
        const current = entriesRef.current;
        try {
          const processed = await processAllEntries(current, userId, supabase);
          const changed =
            JSON.stringify(processed.map((e) => e.blocks)) !==
            JSON.stringify(current.map((e) => e.blocks));
          if (changed) {
            setEntries(sortEntries(processed));
          }
          const rows = processed.map((e) => entryToRow(e, userId));
          if (rows.length === 0) return;
          console.info(
            `[visual-dairy] Saving ${rows.length} entr${rows.length === 1 ? "y" : "ies"} to Supabase…`,
          );
          const { error } = await supabase.from("journal_entries").upsert(rows, {
            onConflict: "id",
          });
          if (error) {
            console.error(
              "[visual-dairy] Save failed",
              error.message,
              error.code,
              error.details,
              error.hint,
            );
          } else {
            console.info(
              `[visual-dairy] Synced ${rows.length} entr${rows.length === 1 ? "y" : "ies"} to Supabase (check Table Editor → journal_entries).`,
            );
          }
        } catch (e) {
          console.error("[visual-dairy] Save failed", e);
        }
      })();
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [entries, remote, remoteReady, supabase, userId, cloud]);

  const addEntry = useCallback((entry: Omit<JournalEntry, "id" | "createdAt">) => {
    const next: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setEntries((prev) => sortEntries([next, ...prev]));
  }, []);

  const removeEntry = useCallback(
    async (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (remote && supabase && userId) {
        const { error } = await supabase
          .from("journal_entries")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) console.error("[visual-dairy] Delete failed", error);
      }
    },
    [remote, supabase, userId],
  );

  const updateEntry = useCallback(
    (id: string, patch: Partial<JournalEntry>) => {
      setEntries((prev) =>
        sortEntries(
          prev.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
        ),
      );
    },
    [],
  );

  return {
    entries,
    remoteLoading: remote && !remoteReady,
    addEntry,
    removeEntry,
    updateEntry,
  };
}
