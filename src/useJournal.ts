import { useCallback, useEffect, useState } from "react";
import type { JournalEntry } from "./types";

const STORAGE_KEY = "visual-dairy-entries-v1";

function load(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as JournalEntry[];
  } catch {
    return [];
  }
}

function save(entries: JournalEntry[]) {
  try {
    const payload = JSON.stringify(entries);
    localStorage.setItem(STORAGE_KEY, payload);
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

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(load);

  useEffect(() => {
    save(entries);
  }, [entries]);

  const addEntry = useCallback((entry: Omit<JournalEntry, "id" | "createdAt">) => {
    const next: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setEntries((prev) => [next, ...prev]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<JournalEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
    );
  }, []);

  return { entries, addEntry, removeEntry, updateEntry };
}
