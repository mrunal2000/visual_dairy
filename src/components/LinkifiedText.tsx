import type { ReactNode } from "react";

/** Detects `http(s)://` and `www.` URLs; trailing punctuation is peeled off in `hrefFromMatch`. */
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s]+)/gi;

/** 11-char YouTube video ids (alphanumeric, dash, underscore). */
const YT_ID = /^[\w-]{11}$/;

function youtubeVideoIdFromUrl(href: string): string | null {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return YT_ID.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const v = u.searchParams.get("v");
      if (v && YT_ID.test(v)) return v;
      const embed = u.pathname.match(/^\/embed\/([\w-]{11})/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];
      const live = u.pathname.match(/^\/live\/([\w-]{11})/);
      if (live) return live[1];
    }
  } catch {
    return null;
  }
  return null;
}

function YouTubeEmbed({ videoId, url }: { videoId: string; url: string }) {
  return (
    <span className="my-3 block w-full min-w-0 max-w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-black shadow-[0_0_4px_rgba(0,0,0,0.15)]">
        <iframe
          className="absolute inset-0 h-full w-full border-0"
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
          title="YouTube video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs leading-[18px] text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-[2px] hover:text-black"
      >
        Open on YouTube
      </a>
    </span>
  );
}

function hrefFromMatch(raw: string): { href: string; label: string; rest: string } | null {
  let core = raw;
  let rest = "";
  while (core.length > 0 && /[.,;:!?)]$/.test(core)) {
    const ch = core.slice(-1);
    core = core.slice(0, -1);
    rest = ch + rest;
  }
  if (core.length < 4) return null;
  const withScheme =
    core.startsWith("http://") || core.startsWith("https://")
      ? core
      : `https://${core}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { href: u.href, label: core, rest };
  } catch {
    return null;
  }
}

/**
 * Renders plain text with URLs linkified. YouTube watch / youtu.be / shorts links show an embedded player.
 */
export function LinkifiedText({ text }: { text: string }): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  const re = new RegExp(URL_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const full = m[0];
    const start = m.index;
    if (start > last) {
      nodes.push(text.slice(last, start));
    }
    const parsed = hrefFromMatch(full);
    if (parsed) {
      const yid = youtubeVideoIdFromUrl(parsed.href);
      if (yid) {
        nodes.push(
          <YouTubeEmbed key={`yt-${key++}`} videoId={yid} url={parsed.href} />,
        );
      } else {
        nodes.push(
          <a
            key={`lnk-${key++}`}
            href={parsed.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#6B6B6B]/40 underline-offset-[2px] hover:text-black"
          >
            {parsed.label}
          </a>,
        );
      }
      if (parsed.rest) {
        nodes.push(parsed.rest);
      }
    } else {
      nodes.push(full);
    }
    last = start + full.length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return <>{nodes}</>;
}
