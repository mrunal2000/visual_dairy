/** JSON stored in `EntryBlock.body` when `kind === "music"`. */

export type MusicBlockPayload = {
  title: string;
  artist: string;
  artworkUrl: string;
};

const empty: MusicBlockPayload = {
  title: "",
  artist: "",
  artworkUrl: "",
};

export function defaultMusicBody(): string {
  return JSON.stringify(empty);
}

export function parseMusicBlockBody(body: string): MusicBlockPayload {
  if (!body.trim()) return { ...empty };
  try {
    const j = JSON.parse(body) as unknown;
    if (!j || typeof j !== "object") return { ...empty };
    const o = j as Record<string, unknown>;
    return {
      title: typeof o.title === "string" ? o.title : "",
      artist: typeof o.artist === "string" ? o.artist : "",
      artworkUrl: typeof o.artworkUrl === "string" ? o.artworkUrl : "",
    };
  } catch {
    return { ...empty };
  }
}

export function stringifyMusicPayload(p: MusicBlockPayload): string {
  return JSON.stringify({
    title: p.title,
    artist: p.artist,
    artworkUrl: p.artworkUrl,
  });
}

export function musicPayloadHasContent(body: string): boolean {
  const p = parseMusicBlockBody(body);
  return (
    p.title.trim().length > 0 ||
    p.artist.trim().length > 0 ||
    p.artworkUrl.trim().length > 0
  );
}
