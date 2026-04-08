import {
  layoutNextLine,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TrashIcon } from "@/components/Icons";
import type { JournalEntry } from "@/types";

/** Matches timeline body: text-sm leading-[18px], Helvetica stack (pretext avoids system-ui). */
const BODY_FONT =
  '400 14px "Helvetica Neue", Helvetica, Arial, sans-serif';
const LINE_HEIGHT = 18;
const TEXT_GAP = 10;
/** Same as ImageRow: `gap-[10px]` and `h-[161px]`; width = half the column minus half the gap. */
const IMAGE_ROW_GAP = 10;
const TILE_H = 161;

type ImageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const MIN_SLOT_W = 36;

function isLineEntirelyAbove(
  _lineTop: number,
  lineBottom: number,
  img: ImageRect,
): boolean {
  return lineBottom <= img.top;
}

function isLineEntirelyBelow(
  lineTop: number,
  _lineBottom: number,
  img: ImageRect,
): boolean {
  return lineTop >= img.top + img.height;
}

function isLineOverlapBand(
  lineTop: number,
  lineBottom: number,
  img: ImageRect,
): boolean {
  return !isLineEntirelyAbove(lineTop, lineBottom, img) &&
    !isLineEntirelyBelow(lineTop, lineBottom, img);
}

type LaidOutLine = {
  text: string;
  y: number;
  offsetX: number;
  slotWidth: number;
};

function layoutBodyAroundImage(
  prepared: PreparedTextWithSegments,
  containerWidth: number,
  img: ImageRect,
): LaidOutLine[] {
  const out: LaidOutLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = 0;
  const imgRight = img.left + img.width;

  while (true) {
    const lineTop = y;
    const lineBottom = y + LINE_HEIGHT;

    if (!isLineOverlapBand(lineTop, lineBottom, img)) {
      const line = layoutNextLine(prepared, cursor, containerWidth);
      if (line === null) break;
      out.push({
        text: line.text,
        y,
        offsetX: 0,
        slotWidth: containerWidth,
      });
      cursor = line.end;
      y += LINE_HEIGHT;
      continue;
    }

    const wLeft = img.left - TEXT_GAP;
    const wRight = containerWidth - imgRight - TEXT_GAP;

    if (wLeft >= MIN_SLOT_W && wRight >= MIN_SLOT_W) {
      const leftLine = layoutNextLine(prepared, cursor, wLeft);
      if (leftLine === null) break;
      out.push({
        text: leftLine.text,
        y,
        offsetX: 0,
        slotWidth: wLeft,
      });
      cursor = leftLine.end;

      const rightLine = layoutNextLine(prepared, cursor, wRight);
      if (rightLine === null) break;
      out.push({
        text: rightLine.text,
        y,
        offsetX: imgRight + TEXT_GAP,
        slotWidth: wRight,
      });
      cursor = rightLine.end;
    } else if (wLeft >= MIN_SLOT_W && wRight < MIN_SLOT_W) {
      const line = layoutNextLine(prepared, cursor, wLeft);
      if (line === null) break;
      out.push({ text: line.text, y, offsetX: 0, slotWidth: wLeft });
      cursor = line.end;
    } else if (wRight >= MIN_SLOT_W && wLeft < MIN_SLOT_W) {
      const line = layoutNextLine(prepared, cursor, wRight);
      if (line === null) break;
      out.push({
        text: line.text,
        y,
        offsetX: imgRight + TEXT_GAP,
        slotWidth: wRight,
      });
      cursor = line.end;
    } else {
      const line = layoutNextLine(prepared, cursor, containerWidth);
      if (line === null) break;
      out.push({
        text: line.text,
        y,
        offsetX: 0,
        slotWidth: containerWidth,
      });
      cursor = line.end;
    }

    y += LINE_HEIGHT;
  }

  return out;
}

/** Pertext float only when the entry has at least one image; otherwise use the normal timeline. */
export type EntryPretextPattern =
  | {
      useFloat: true;
      imageSrc: string;
      text: string;
      skipBlockIds: ReadonlySet<string>;
    }
  | { useFloat: false };

const DEFAULT_BODY =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";

/**
 * Merged description + text blocks around the chosen hero image (after user drags it).
 * Not used until an image is moved — default layout stays side-by-side rows.
 */
export function buildPretextForHero(
  entry: JournalEntry,
  heroBlockId: string,
): EntryPretextPattern {
  const hero = entry.blocks.find(
    (b) => b.id === heroBlockId && b.kind === "image" && b.body,
  );
  if (!hero?.body) {
    return { useFloat: false };
  }

  const parts: string[] = [];
  if (entry.description.trim()) parts.push(entry.description);
  for (const b of entry.blocks) {
    if (b.kind === "text" && b.body) parts.push(b.body);
  }
  const text = parts.length > 0 ? parts.join("\n\n") : DEFAULT_BODY;

  const skipBlockIds = new Set<string>();
  for (const b of entry.blocks) {
    if (b.kind === "text" && b.body) skipBlockIds.add(b.id);
  }
  skipBlockIds.add(heroBlockId);

  return {
    useFloat: true,
    imageSrc: hero.body,
    text,
    skipBlockIds,
  };
}

type Props = {
  imageSrc: string;
  text: string;
  /** When false, image position is fixed (view mode). Default true. */
  interactive?: boolean;
  /** Trash control on the hero image (edit mode). */
  onRemoveHero?: () => void;
};

/**
 * Canvas-free layout via @chenglou/pretext: body copy wraps on all sides of a draggable image.
 */
export function PretextFloatImage({
  imageSrc,
  text,
  interactive = true,
  onRemoveHero,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startImg: { x: number; y: number };
  } | null>(null);

  const prepared = useMemo(
    () => prepareWithSegments(text, BODY_FONT, { whiteSpace: "pre-wrap" }),
    [text],
  );

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /** Matches one tile in a two-up ImageRow: `(column - gap) / 2`. */
  const tileW = useMemo(
    () =>
      containerWidth > 0
        ? Math.max(120, (containerWidth - IMAGE_ROW_GAP) / 2)
        : 200,
    [containerWidth],
  );

  const imageRect: ImageRect = useMemo(
    () => ({
      left: imgPos.x,
      top: imgPos.y,
      width: tileW,
      height: TILE_H,
    }),
    [imgPos.x, imgPos.y, tileW],
  );

  const lines = useMemo(() => {
    if (containerWidth <= 0) return [];
    return layoutBodyAroundImage(prepared, containerWidth, imageRect);
  }, [prepared, containerWidth, imageRect]);

  const textHeight =
    lines.length === 0 ? 0 : Math.max(...lines.map((l) => l.y)) + LINE_HEIGHT;
  const contentBottom = Math.max(textHeight, imgPos.y + TILE_H);
  const minH = contentBottom + 8;

  const clampPos = useCallback(
    (x: number, y: number) => {
      const w = rootRef.current?.clientWidth ?? containerWidth;
      if (w <= 0) return { x, y };
      const maxX = Math.max(0, w - tileW);
      const maxY = Math.max(0, minH - TILE_H);
      return {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY),
      };
    },
    [containerWidth, minH, tileW],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      startImg: { ...imgPos },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.originX;
    const dy = e.clientY - d.originY;
    setImgPos(clampPos(d.startImg.x + dx, d.startImg.y + dy));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      dragRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative w-full min-w-0 overflow-visible"
      style={{ minHeight: minH }}
    >
      <div className="absolute inset-0 z-0 text-sm leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
        {lines.map((line, idx) => (
          <div
            key={`${line.y}-${line.offsetX}-${idx}`}
            className="absolute whitespace-pre-wrap break-words"
            style={{
              top: line.y,
              left: line.offsetX,
              width: line.slotWidth,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>

      <p className="sr-only">{text}</p>

      {interactive ? (
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute z-[2] cursor-grab touch-none overflow-hidden rounded-sm shadow-[0_0_4px_rgba(0,0,0,0.2)] active:cursor-grabbing"
          style={{
            left: imgPos.x,
            top: imgPos.y,
            width: tileW,
            height: TILE_H,
          }}
          aria-label="Move image; text reflows around it"
        >
          <img src={imageSrc} alt="" className="h-full w-full object-cover" draggable={false} />
        </button>
      ) : null}
      {interactive && onRemoveHero ? (
        <button
          type="button"
          aria-label="Remove floating photo"
          title="Remove floating photo"
          className="absolute z-[3] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
          style={{
            left: imgPos.x + tileW - 26,
            top: imgPos.y + 4,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveHero();
          }}
        >
          <TrashIcon className="text-white" />
        </button>
      ) : null}
      {!interactive ? (
        <div
          className="pointer-events-none absolute z-[2] overflow-hidden rounded-sm shadow-[0_0_4px_rgba(0,0,0,0.2)]"
          style={{
            left: imgPos.x,
            top: imgPos.y,
            width: tileW,
            height: TILE_H,
          }}
          aria-hidden
        >
          <img src={imageSrc} alt="" className="h-full w-full object-cover" draggable={false} />
        </div>
      ) : null}
    </div>
  );
}
