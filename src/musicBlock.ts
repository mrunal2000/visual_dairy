/** JSON stored in `EntryBlock.body` when `kind === "music"`. */

export type MusicBlockPayload = {
  title: string;
  artist: string;
  /** Legacy album art URL; still parsed for old entries. */
  artworkUrl: string;
  /** Legacy: file or URL playback without embed. */
  audioUrl: string;
  /**
   * Spotify track / album / playlist / episode link (open.spotify.com or spotify: URI).
   * Rendered with Spotify’s official embed iframe — not a downloadable stream.
   */
  spotifyUrl: string;
  /** YouTube watch, youtu.be, Shorts, or embed URL — rendered as official embed iframe. */
  youtubeUrl: string;
};

const empty: MusicBlockPayload = {
  title: "",
  artist: "",
  artworkUrl: "",
  audioUrl: "",
  spotifyUrl: "",
  youtubeUrl: "",
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
      audioUrl: typeof o.audioUrl === "string" ? o.audioUrl : "",
      spotifyUrl: typeof o.spotifyUrl === "string" ? o.spotifyUrl : "",
      youtubeUrl: typeof o.youtubeUrl === "string" ? o.youtubeUrl : "",
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
    audioUrl: p.audioUrl,
    spotifyUrl: p.spotifyUrl,
    youtubeUrl: p.youtubeUrl,
  });
}

/**
 * Spotify does not expose a raw MP3 URL for `<audio>`. Use their embed player instead.
 * Accepts paste from “Share” (open.spotify.com/…) or spotify:track:… URIs.
 */
export function spotifyUrlToEmbedSrc(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const uri = /^spotify:(track|album|playlist|episode):([a-zA-Z0-9]+)$/i.exec(s);
  if (uri) {
    return `https://open.spotify.com/embed/${uri[1].toLowerCase()}/${uri[2]}`;
  }

  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "open.spotify.com" && host !== "spotify.com") return null;

    const parts = u.pathname.split("/").filter(Boolean);
    let i = 0;
    if (/^intl-[a-z]{2}$/i.test(parts[0] ?? "")) i = 1;

    const type = parts[i]?.toLowerCase();
    const id = parts[i + 1]?.split("?")[0];
    if (!type || !id) return null;
    if (!["track", "album", "playlist", "episode"].includes(type)) return null;

    return `https://open.spotify.com/embed/${type}/${id}`;
  } catch {
    return null;
  }
}

/** Accepts youtube.com, youtu.be, Shorts, music.youtube.com, and /embed/… URLs. */
export function youtubeUrlToEmbedSrc(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]?.split("?")[0];
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const embed = /^\/embed\/([^/?]+)/.exec(u.pathname);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;

      const shorts = /^\/shorts\/([^/?]+)/.exec(u.pathname);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;

      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function musicPayloadHasContent(body: string): boolean {
  const p = parseMusicBlockBody(body);
  return (
    p.title.trim().length > 0 ||
    p.artist.trim().length > 0 ||
    p.artworkUrl.trim().length > 0 ||
    p.audioUrl.trim().length > 0 ||
    p.spotifyUrl.trim().length > 0 ||
    p.youtubeUrl.trim().length > 0
  );
}
