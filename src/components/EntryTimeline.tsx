import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { fileToCompressedDataUrl } from "@/imageCompress";
import type { EntryBlock, JournalEntry } from "@/types";
import { DocumentIcon, ImageIcon, QuoteIcon, TrashIcon } from "@/components/Icons";

type Props = {
  entries: JournalEntry[];
  onDelete: (id: string) => void;
  onUpdateEntry: (
    id: string,
    patch: Partial<
      Pick<JournalEntry, "dateLabel" | "title" | "description" | "blocks">
    >,
  ) => void;
};

/** Matches Paper `visual_dairy_1`: 607px column, 87px date + 50px gap + 470px body, image rows, quote + rail. */
export function EntryTimeline({ entries, onDelete, onUpdateEntry }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="min-w-0 w-full max-w-full">
      <h2 className="sr-only">Journal entries</h2>
      <ol className="flex min-w-0 w-full max-w-full flex-col gap-10">
        {entries.map((entry) => (
          <EntryListItem
            key={entry.id}
            entry={entry}
            onDelete={onDelete}
            onUpdateEntry={onUpdateEntry}
          />
        ))}
      </ol>
    </div>
  );
}

function EntryListItem({
  entry,
  onDelete,
  onUpdateEntry,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  onUpdateEntry: Props["onUpdateEntry"];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="min-w-0 w-full">
      <article className="flex w-full min-w-0 items-start gap-[50px]">
        <div className="w-[87px] max-w-[87px] shrink-0 text-right text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
          {editing ? (
            <label className="block">
              <span className="sr-only">Date</span>
              <input
                className="w-full bg-transparent text-right text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]"
                value={entry.dateLabel}
                onChange={(e) =>
                  onUpdateEntry(entry.id, { dateLabel: e.target.value })
                }
                placeholder="Date"
                aria-label="Date"
              />
            </label>
          ) : (
            <p>{entry.dateLabel}</p>
          )}
        </div>

        <EntryArticleColumn
          entry={entry}
          editing={editing}
          setEditing={setEditing}
          onDelete={onDelete}
          onUpdateEntry={onUpdateEntry}
        />
      </article>
    </li>
  );
}

function EntryArticleColumn({
  entry,
  editing,
  setEditing,
  onDelete,
  onUpdateEntry,
}: {
  entry: JournalEntry;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateEntry: Props["onUpdateEntry"];
}) {
  const addImageRef = useRef<HTMLInputElement>(null);

  const onUpdateBlock = (blockId: string, body: string) => {
    onUpdateEntry(entry.id, {
      blocks: entry.blocks.map((b) =>
        b.id === blockId ? { ...b, body } : b,
      ),
    });
  };

  const onRemoveBlock = (blockId: string) => {
    onUpdateEntry(entry.id, {
      blocks: entry.blocks.filter((b) => b.id !== blockId),
    });
  };

  const onAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      if (!url) return;
      const block: EntryBlock = {
        id: crypto.randomUUID(),
        kind: "image",
        body: url,
      };
      onUpdateEntry(entry.id, { blocks: [...entry.blocks, block] });
    } catch (err) {
      console.error("[visual-dairy] Could not add image", err);
    }
  };

  const blockActions = editing
    ? { onUpdateBlock, onRemoveBlock }
    : undefined;

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-4 [max-width:min(470px,100%)]">
        <div className="flex min-w-0 flex-col gap-1">
          {editing ? (
            <>
              <label className="sr-only" htmlFor={`title-${entry.id}`}>
                Title
              </label>
              <input
                id={`title-${entry.id}`}
                className="w-full bg-transparent text-base font-medium leading-5 tracking-[-0.02em] text-black outline-none placeholder:font-medium placeholder:text-black/40"
                value={entry.title}
                onChange={(e) =>
                  onUpdateEntry(entry.id, { title: e.target.value })
                }
                placeholder="Title"
              />
              <label className="sr-only" htmlFor={`desc-${entry.id}`}>
                Description
              </label>
              <textarea
                id={`desc-${entry.id}`}
                className="min-h-[48px] w-full resize-y bg-transparent text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]"
                value={entry.description}
                onChange={(e) =>
                  onUpdateEntry(entry.id, {
                    description: e.target.value,
                  })
                }
                placeholder="Description"
                rows={3}
              />
            </>
          ) : (
            <>
              {entry.title ? (
                <h3 className="max-w-full break-words text-base font-medium leading-5 tracking-[-0.02em] text-black">
                  {entry.title}
                </h3>
              ) : null}
              {entry.description ? (
                <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
                  {entry.description}
                </p>
              ) : null}
            </>
          )}
        </div>

        <EntryBlocks
          entry={entry}
          editing={editing}
          blockActions={blockActions}
        />

        {editing ? (
          <div className="flex items-start gap-2">
            <input
              ref={addImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAddImage}
            />
            <EditToolbarButton
              label="Add quote"
              onClick={() =>
                onUpdateEntry(entry.id, {
                  blocks: [
                    ...entry.blocks,
                    {
                      id: crypto.randomUUID(),
                      kind: "quote",
                      body: "",
                    },
                  ],
                })
              }
            >
              <QuoteIcon className="text-[#6B6B6B]" />
            </EditToolbarButton>
            <EditToolbarButton
              label="Add image"
              onClick={() => addImageRef.current?.click()}
            >
              <ImageIcon className="text-[#6B6B6B]" />
            </EditToolbarButton>
            <EditToolbarButton
              label="Add note"
              onClick={() =>
                onUpdateEntry(entry.id, {
                  blocks: [
                    ...entry.blocks,
                    {
                      id: crypto.randomUUID(),
                      kind: "text",
                      body: "",
                    },
                  ],
                })
              }
            >
              <DocumentIcon className="text-[#6B6B6B]" />
            </EditToolbarButton>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-[3px] transition hover:text-black hover:decoration-black/30"
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-[3px] transition hover:text-black hover:decoration-black/30"
            onClick={() => {
              if (confirm("Delete this entry?")) onDelete(entry.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>
  );
}

type BlockActions = {
  onUpdateBlock: (blockId: string, body: string) => void;
  onRemoveBlock: (blockId: string) => void;
};

function EntryBlocks({
  entry,
  editing,
  blockActions,
}: {
  entry: JournalEntry;
  editing: boolean;
  blockActions?: BlockActions;
}) {
  const nodes = walkEntryBlocks(entry.blocks, editing, blockActions);
  if (nodes.length === 0) return null;
  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-4">{nodes}</div>
  );
}

function walkEntryBlocks(
  blocks: EntryBlock[],
  editing = true,
  blockActions?: BlockActions,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];

    if (b.kind === "image" && !b.body) {
      i++;
      continue;
    }
    if (
      (b.kind === "quote" || b.kind === "text") &&
      !b.body &&
      !(editing && blockActions)
    ) {
      i++;
      continue;
    }

    if (b.kind === "image" && b.body) {
      const group: EntryBlock[] = [];
      while (i < blocks.length && blocks[i].kind === "image" && blocks[i].body) {
        group.push(blocks[i]);
        i++;
      }
      for (let j = 0; j < group.length; j += 2) {
        const pair = group.slice(j, j + 2);
        nodes.push(
          <ImageRow
            key={pair[0].id}
            images={pair}
            editing={editing}
            blockActions={blockActions}
          />,
        );
      }
      continue;
    }

    if (b.kind === "quote" && (b.body || (editing && blockActions))) {
      nodes.push(
        <QuoteBlock
          key={b.id}
          block={b}
          editing={editing}
          blockActions={blockActions}
        />,
      );
      i++;
      continue;
    }

    if (b.kind === "text" && (b.body || (editing && blockActions))) {
      nodes.push(
        <TextBlock
          key={b.id}
          block={b}
          editing={editing}
          blockActions={blockActions}
        />,
      );
      i++;
      continue;
    }

    i++;
  }

  return nodes;
}

function TextBlock({
  block,
  editing,
  blockActions,
}: {
  block: EntryBlock;
  editing: boolean;
  blockActions?: BlockActions;
}) {
  if (editing && blockActions) {
    return (
      <div className="flex min-w-0 w-full flex-col gap-1">
        <textarea
          className="min-h-[72px] w-full resize-y bg-transparent text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B] outline-none"
          value={block.body}
          onChange={(e) =>
            blockActions.onUpdateBlock(block.id, e.target.value)
          }
          aria-label="Text block"
        />
        <button
          type="button"
          className="self-start text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
          onClick={() => blockActions.onRemoveBlock(block.id)}
        >
          Remove paragraph
        </button>
      </div>
    );
  }
  return (
    <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
      {block.body}
    </p>
  );
}

function QuoteBlock({
  block,
  editing,
  blockActions,
}: {
  block: EntryBlock;
  editing: boolean;
  blockActions?: BlockActions;
}) {
  if (editing && blockActions) {
    return (
      <div className="flex min-w-0 w-full max-w-full items-stretch gap-3">
        <div className="w-0.5 shrink-0 self-stretch bg-[#A6A6A6]" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <textarea
            className="min-h-[72px] w-full resize-y bg-transparent font-[family-name:var(--font-display)] text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B] outline-none"
            value={block.body}
            onChange={(e) =>
              blockActions.onUpdateBlock(block.id, e.target.value)
            }
            aria-label="Quote"
          />
          <button
            type="button"
            className="self-start text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
            onClick={() => blockActions.onRemoveBlock(block.id)}
          >
            Remove quote
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 w-full max-w-full items-stretch gap-3">
      <div className="w-0.5 shrink-0 self-stretch bg-[#A6A6A6]" aria-hidden />
      <p className="min-w-0 flex-1 break-words font-[family-name:var(--font-display)] text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
        {block.body}
      </p>
    </div>
  );
}

function ImageRow({
  images,
  editing,
  blockActions,
}: {
  images: EntryBlock[];
  editing: boolean;
  blockActions?: BlockActions;
}) {
  if (images.length === 0) return null;

  /**
   * Paper `visual_dairy_1`: body 470px; each tile 230×161 with gap 10px (two-up fills the row).
   * A single image uses the same tile width as one slot in a pair — not full column width.
   */
  const tileClass =
    images.length === 1
      ? "h-[161px] w-[calc(50%-5px)] shrink-0"
      : "h-[161px] min-w-0 flex-1 basis-0";

  return (
    <div className="flex h-[161px] min-h-[161px] w-full min-w-0 max-w-full items-start gap-[10px] self-stretch">
      {images.map((img) => (
        <div
          key={img.id}
          className={`relative min-w-0 overflow-hidden rounded-sm shadow-[0_0_4px_rgba(0,0,0,0.2)] ${tileClass}`}
        >
          <img
            src={img.body}
            alt=""
            className="h-full w-full object-cover"
          />
          {editing && blockActions ? (
            <button
              type="button"
              aria-label="Remove image"
              title="Remove image"
              className="absolute right-1 top-1 z-[1] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
              onClick={() => blockActions.onRemoveBlock(img.id)}
            >
              <TrashIcon className="text-white" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EditToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-sm bg-[#F1F1F1] text-[#6B6B6B] transition hover:bg-[#e6e6e6]"
    >
      {children}
    </button>
  );
}
