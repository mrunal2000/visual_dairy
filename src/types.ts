export type BlockKind = "quote" | "image" | "text";

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
  /** When set, that image block uses @chenglou/pretext float layout (survives reload if persisted). */
  pretextHeroBlockId?: string | null;
}
