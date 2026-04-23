import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EntryBlock, BlockKind } from "@/types";
import { fileToCompressedDataUrl } from "@/imageCompress";
import { formatDateLabelInput, normalizeMMDDYYYY, parseMMDDYYYY } from "@/dateLabel";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CurrentlyListeningBlock } from "@/components/CurrentlyListeningBlock";
import { defaultMusicBody, musicPayloadHasContent } from "@/musicBlock";
import { DocumentIcon, ImageIcon, MusicIcon, QuoteIcon } from "./Icons";

export interface Draft {
  dateLabel: string;
  title: string;
  description: string;
  blocks: EntryBlock[];
}

type Props = {
  draft: Draft;
  onChange: (next: Draft) => void;
  onSave: () => void;
  /** Empty layout: top-aligned with 40px inset like Paper `visual_dairy_empty`. */
  layout: "empty" | "footer";
};

function newBlock(kind: BlockKind): EntryBlock {
  const id = crypto.randomUUID();
  if (kind === "music") {
    return { id, kind: "music", body: defaultMusicBody() };
  }
  return { id, kind, body: "" };
}

const DESCRIPTION_MIN_PX = 32;

export function EntryComposer({ draft, onChange, onSave, layout }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [toolbarValue, setToolbarValue] = useState("");
  /** Latest draft for async image import — avoids stale closure when FileReader finishes. */
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useLayoutEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    const syncHeight = () => {
      el.style.height = "0px";
      el.style.height = `${Math.max(DESCRIPTION_MIN_PX, el.scrollHeight)}px`;
    };
    syncHeight();
    window.addEventListener("resize", syncHeight);
    return () => window.removeEventListener("resize", syncHeight);
  }, [draft.description]);

  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  const updateBlock = (id: string, body: string) => {
    onChange({
      ...draft,
      blocks: draft.blocks.map((b) => (b.id === id ? { ...b, body } : b)),
    });
  };

  const removeBlock = (id: string) => {
    onChange({ ...draft, blocks: draft.blocks.filter((b) => b.id !== id) });
  };

  const addKind = (kind: BlockKind) => {
    onChange({ ...draft, blocks: [...draft.blocks, newBlock(kind)] });
  };

  const onPickImage = () => fileRef.current?.click();

  const onFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const url = await fileToCompressedDataUrl(file);
      if (!url) return;
      const block = newBlock("image");
      block.body = url;
      const cur = draftRef.current;
      onChange({ ...cur, blocks: [...cur.blocks, block] });
    } catch (err) {
      console.error("[visual-dairy] Could not load image", err);
    }
  };

  const hasBody =
    draft.title.trim().length > 0 ||
    draft.description.trim().length > 0 ||
    draft.blocks.some((b) =>
      b.kind === "music"
        ? musicPayloadHasContent(b.body)
        : b.body.trim().length > 0,
    );

  const canSave = parseMMDDYYYY(draft.dateLabel) !== null && hasBody;

  const shell =
    layout === "empty"
      ? "flex min-h-[calc(100vh-2rem)] w-full flex-col items-center justify-start pt-10 px-6 pb-16"
      : "px-6 py-12";

  return (
    <section className={shell}>
      <div
        className={
          layout === "empty"
            ? "flex w-full max-w-[607px] flex-col items-center gap-[59px]"
            : "mx-auto flex w-full max-w-[607px] flex-col gap-10"
        }
      >
        {layout === "empty" && (
          <h1 className="font-[family-name:var(--font-display)] text-lg leading-[22px] text-black">
            My Visual Journal
          </h1>
        )}

        <div className="flex w-full flex-col items-end gap-10">
          <div className="flex w-full items-start gap-12">
            <label className="w-[87px] shrink-0 pt-0.5 text-right text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
              <span className="sr-only">Date</span>
              <input
                className="w-full bg-transparent text-right text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]"
                value={draft.dateLabel}
                onChange={(e) =>
                  set({ dateLabel: formatDateLabelInput(e.target.value) })
                }
                onBlur={(e) => {
                  const normalized = normalizeMMDDYYYY(e.target.value);
                  if (normalized && normalized !== draft.dateLabel) {
                    set({ dateLabel: normalized });
                  }
                }}
                placeholder="MM/DD/YYYY"
                inputMode="numeric"
                pattern="\\d{2}/\\d{2}/\\d{4}"
                aria-label="Date"
              />
            </label>

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <input
                  className="w-full bg-transparent text-base font-medium leading-5 tracking-[-0.02em] text-black outline-none placeholder:font-medium placeholder:text-black"
                  value={draft.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Title"
                  aria-label="Title"
                />
                <textarea
                  ref={descriptionRef}
                  rows={1}
                  className="min-h-[32px] w-full resize-none overflow-hidden bg-transparent py-0 text-start text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]"
                  value={draft.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Description...."
                  aria-label="Description"
                />
              </div>

              {draft.blocks.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {draft.blocks.map((b) =>
                    b.kind === "image" ? (
                      <li key={b.id} className="min-w-0 w-full max-w-full">
                        {b.body ? (
                          <>
                            {/* Same tile treatment as EntryTimeline ImageRow (single image) */}
                            <div className="flex min-w-0 w-full max-w-full items-start gap-[10px] self-stretch">
                              <div className="min-w-0 overflow-hidden rounded-sm shadow-[0_0_4px_rgba(0,0,0,0.2)] h-[161px] w-1/2 shrink-0">
                                <img src={b.body} alt="" className="h-full w-full object-cover" />
                              </div>
                            </div>
                            <button
                              type="button"
                              className="mt-2 text-xs text-[#6B6B6B] underline decoration-black/20 underline-offset-2 hover:text-black"
                              onClick={() => removeBlock(b.id)}
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              className="w-full rounded border border-black/10 bg-transparent px-2 py-1 text-sm text-[#6B6B6B] outline-none"
                              value={b.body}
                              onChange={(e) => updateBlock(b.id, e.target.value)}
                              placeholder="Paste an image URL"
                              aria-label="Image URL"
                            />
                            <button
                              type="button"
                              className="mt-2 text-xs text-[#6B6B6B] underline decoration-black/20 underline-offset-2 hover:text-black"
                              onClick={() => removeBlock(b.id)}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </li>
                    ) : b.kind === "music" ? (
                      <li key={b.id} className="min-w-0 w-full max-w-full">
                        <CurrentlyListeningBlock
                          block={b}
                          editing
                          blockActions={{
                            onUpdateBlock: updateBlock,
                            onRemoveBlock: removeBlock,
                          }}
                        />
                      </li>
                    ) : (
                      <li key={b.id} className="rounded-md border border-black/[0.06] bg-white/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-[#6B6B6B]">
                            {b.kind === "quote" && "Quote"}
                            {b.kind === "text" && "Note"}
                          </span>
                          <button
                            type="button"
                            className="text-xs text-[#6B6B6B] underline decoration-black/20 underline-offset-2 hover:text-black"
                            onClick={() => removeBlock(b.id)}
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          className="min-h-[4rem] w-full resize-y bg-transparent font-[family-name:var(--font-display)] text-sm leading-relaxed text-[#2a2a2a] outline-none placeholder:text-[#6B6B6B]"
                          value={b.body}
                          onChange={(e) => updateBlock(b.id, e.target.value)}
                          placeholder={
                            b.kind === "quote"
                              ? "A line you loved…"
                              : "Extra notes from the trip…"
                          }
                          aria-label={b.kind === "quote" ? "Quote" : "Note"}
                        />
                      </li>
                    ),
                  )}
                </ul>
              )}

              <div className="flex items-start">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFile}
                />
                <ToggleGroup
                  type="single"
                  value={toolbarValue}
                  onValueChange={(v) => {
                    if (!v) return;
                    if (v === "quote") addKind("quote");
                    if (v === "image") onPickImage();
                    if (v === "note") addKind("text");
                    if (v === "music") addKind("music");
                    // These are action buttons, not persistent toggles.
                    setToolbarValue("");
                  }}
                  aria-label="Add content"
                >
                  <ToggleGroupItem
                    value="quote"
                    aria-label="Add quote"
                    title="Add quote"
                  >
                    <QuoteIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="image"
                    aria-label="Add image"
                    title="Add image"
                  >
                    <ImageIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="note"
                    aria-label="Add note"
                    title="Add note"
                  >
                    <DocumentIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="music"
                    aria-label="Add currently listening"
                    title="Add currently listening"
                  >
                    <MusicIcon />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="button" disabled={!canSave} onClick={onSave}>
                  Save entry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
