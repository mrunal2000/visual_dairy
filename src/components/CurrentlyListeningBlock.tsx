import type { EntryBlock } from "@/types";
import {
  musicPayloadHasContent,
  parseMusicBlockBody,
  spotifyUrlToEmbedSrc,
  stringifyMusicPayload,
  youtubeUrlToEmbedSrc,
} from "@/musicBlock";

type BlockActions = {
  onUpdateBlock: (blockId: string, body: string) => void;
  onRemoveBlock: (blockId: string) => void;
};

function MediaEmbeds({
  spotifyUrl,
  youtubeUrl,
  audioUrl,
  artworkUrl,
}: {
  spotifyUrl: string;
  youtubeUrl: string;
  audioUrl: string;
  artworkUrl: string;
}) {
  const spotifyEmbed = spotifyUrlToEmbedSrc(spotifyUrl);
  const youtubeEmbed = youtubeUrlToEmbedSrc(youtubeUrl);
  const hasAudio = audioUrl.trim().length > 0;
  const hasArtOnly =
    artworkUrl.trim().length > 0 &&
    !spotifyEmbed &&
    !youtubeEmbed &&
    !hasAudio;

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-4">
      {hasArtOnly ? (
        <img
          src={artworkUrl}
          alt=""
          className="max-h-64 w-full max-w-md rounded-md object-contain object-left"
        />
      ) : null}
      {youtubeUrl.trim() && !youtubeEmbed ? (
        <p className="text-xs leading-[18px] text-[#6B6B6B]">
          YouTube link not recognized. Paste a watch URL (youtube.com/watch?v=…),
          youtu.be/…, Shorts, or an embed link.
        </p>
      ) : null}
      {spotifyUrl.trim() && !spotifyEmbed ? (
        <p className="text-xs leading-[18px] text-[#6B6B6B]">
          Spotify link not recognized. Paste a track, album, playlist, or episode
          URL from open.spotify.com (or a spotify:… URI).
        </p>
      ) : null}
      {youtubeEmbed ? (
        <div className="aspect-video w-full max-w-full sm:max-w-2xl">
          <iframe
            title="YouTube"
            src={youtubeEmbed}
            className="h-full w-full rounded-md border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}
      {spotifyEmbed ? (
        <iframe
          title="Spotify"
          src={spotifyEmbed}
          className="h-[152px] w-full max-w-full rounded-md border-0 sm:max-w-md"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}
      {hasAudio ? (
        <audio
          controls
          src={audioUrl}
          preload="metadata"
          className="w-full max-w-md"
        />
      ) : null}
    </div>
  );
}

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

  const patch = (next: typeof data) => {
    if (!blockActions) return;
    blockActions.onUpdateBlock(block.id, stringifyMusicPayload(next));
  };

  if (editing && blockActions) {
    return (
      <div className="flex min-w-0 w-full max-w-full flex-col gap-3">
        <label className="block">
          <span className="sr-only">YouTube link</span>
          <input
            className="w-full rounded border border-black/10 bg-transparent px-2 py-1 text-sm text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]/60"
            value={data.youtubeUrl}
            onChange={(e) => patch({ ...data, youtubeUrl: e.target.value })}
            placeholder="YouTube — paste watch, youtu.be, or Shorts link"
          />
        </label>
        <label className="block">
          <span className="sr-only">Spotify link</span>
          <input
            className="w-full rounded border border-black/10 bg-transparent px-2 py-1 text-sm text-[#6B6B6B] outline-none placeholder:text-[#6B6B6B]/60"
            value={data.spotifyUrl}
            onChange={(e) => patch({ ...data, spotifyUrl: e.target.value })}
            placeholder="Spotify — paste open.spotify.com track / album / playlist link"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          {data.youtubeUrl ? (
            <button
              type="button"
              className="text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
              onClick={() => patch({ ...data, youtubeUrl: "" })}
            >
              Clear YouTube
            </button>
          ) : null}
          {data.spotifyUrl ? (
            <button
              type="button"
              className="text-xs text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-2 hover:text-black"
              onClick={() => patch({ ...data, spotifyUrl: "" })}
            >
              Clear Spotify
            </button>
          ) : null}
        </div>
        <MediaEmbeds
          spotifyUrl={data.spotifyUrl}
          youtubeUrl={data.youtubeUrl}
          audioUrl={data.audioUrl}
          artworkUrl={data.artworkUrl}
        />
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
      <MediaEmbeds
        spotifyUrl={data.spotifyUrl}
        youtubeUrl={data.youtubeUrl}
        audioUrl={data.audioUrl}
        artworkUrl={data.artworkUrl}
      />
    </div>
  );
}
