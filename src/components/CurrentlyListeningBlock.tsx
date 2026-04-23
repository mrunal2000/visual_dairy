import { useRef } from "react";
import type { EntryBlock } from "@/types";
import { fileToCompressedDataUrl } from "@/imageCompress";
import {
  musicPayloadHasContent,
  parseMusicBlockBody,
  stringifyMusicPayload,
} from "@/musicBlock";
import { VinylArtworkStack } from "@/components/VinylArtworkStack";

type BlockActions = {
  onUpdateBlock: (blockId: string, body: string) => void;
  onRemoveBlock: (blockId: string) => void;
};

export function CurrentlyListeningBlock({
  block,
  editing,
  blockActions,
}: {
  block: EntryBlock;
  editing: boolean;
  blockActions?: BlockActions;
}) {
  const data = parseMusicBlockBody(block.body);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (next: typeof data) => {
    if (!blockActions) return;
    blockActions.onUpdateBlock(block.id, stringifyMusicPayload(next));
  };

  const onArtFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      if (!url) return;
      patch({ ...data, artworkUrl: url });
    } catch (err) {
      console.error("[visual-dairy] Could not load artwork", err);
    }
  };

  if (editing && blockActions) {
    return (
      <div className="flex min-w-0 w-full max-w-full flex-col gap-3">
        <label className="block">
          <span className="sr-only">Artwork URL</span>
          <input
            className="w-full rounded border border-black/10 bg-transparent px-2 py-1 text-sm text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]/60"
            value={data.artworkUrl.startsWith("data:") ? "" : data.artworkUrl}
            onChange={(e) => patch({ ...data, artworkUrl: e.target.value })}
            placeholder="Artwork image URL (optional)"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onArtFile}
          />
          <button
            type="button"
            className="text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
            onClick={() => fileRef.current?.click()}
          >
            Upload artwork
          </button>
          {data.artworkUrl ? (
            <button
              type="button"
              className="text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
              onClick={() => patch({ ...data, artworkUrl: "" })}
            >
              Clear artwork
            </button>
          ) : null}
        </div>
        <VinylArtworkStack artworkUrl={data.artworkUrl} />
        <button
          type="button"
          className="self-start text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
          onClick={() => blockActions.onRemoveBlock(block.id)}
        >
          Remove listening block
        </button>
      </div>
    );
  }

  if (!musicPayloadHasContent(block.body)) return null;

  const subtitle =
    [data.title, data.artist].filter((s) => s.trim().length > 0).join(" ~~ ") ||
    null;

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-4">
      {subtitle ? (
        <p className="text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
          {subtitle}
        </p>
      ) : null}
      <VinylArtworkStack artworkUrl={data.artworkUrl} />
    </div>
  );
}
