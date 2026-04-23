export type BlockKind = "quote" | "image" | "text" | "music";

export interface EntryBlock {
  id: string;
  kind: BlockKind;
  body: string;
}

export interface JournalEntry {
  id: string;
  dateLabel: string;
  title: string;
  description: string;
  blocks: EntryBlock[];
  createdAt: number;
}
