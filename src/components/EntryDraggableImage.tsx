import { createContext, useContext, useRef, type RefObject } from "react";
import { TrashIcon } from "@/components/Icons";

type Offset = { x: number; y: number };

export type EntryColumnContextValue = {
  columnRef: RefObject<HTMLDivElement | null>;
  getOffset: (blockId: string) => Offset;
  setOffset: (blockId: string, o: Offset) => void;
};

/** Drag scope: one column per entry; offsets are per image block id. */
export const EntryColumnContext = createContext<EntryColumnContextValue | null>(
  null,
);

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Ignore sub-pixel noise when deciding if the tile was moved from its default slot. */
const MOVED_EPS_PX = 4;

type TileProps = {
  blockId: string;
  src: string;
  className: string;
  /**
   * Row layout: after pointer up, if this tile ended away from its default position, enables pretext for this image.
   */
  onFirstMove?: (blockId: string) => void;
  /** Icon overlay; does not change tile dimensions. */
  onRemove?: () => void;
};

/**
 * Dragging moves the tile (margin offset). With `onFirstMove`, releasing after a real move
 * switches that image into pretext float mode; default stays side-by-side until then.
 */
export function DraggableEntryImage({
  blockId,
  src,
  className,
  onFirstMove,
  onRemove,
}: TileProps) {
  const ctx = useContext(EntryColumnContext);
  if (!ctx) {
    throw new Error("DraggableEntryImage must be used inside EntryColumnContext");
  }
  const { columnRef, getOffset, setOffset } = ctx;
  const offset = getOffset(blockId);
  const tileRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOff: Offset;
    naturalLeft: number;
    naturalTop: number;
    tileW: number;
    tileH: number;
  } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const col = columnRef.current?.getBoundingClientRect();
    const tile = tileRef.current?.getBoundingClientRect();
    if (!col || !tile) return;

    const naturalLeft = tile.left - col.left - offset.x;
    const naturalTop = tile.top - col.top - offset.y;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOff: { ...offset },
      naturalLeft,
      naturalTop,
      tileW: tile.width,
      tileH: tile.height,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    const col = columnRef.current?.getBoundingClientRect();
    if (!col) return;

    const nx = d.startOff.x + dx;
    const ny = d.startOff.y + dy;

    const visualLeft = d.naturalLeft + nx;
    const visualTop = d.naturalTop + ny;
    const maxX = Math.max(0, col.width - d.tileW);
    const maxY = Math.max(0, col.height - d.tileH);
    const clampedLeft = clamp(visualLeft, 0, maxX);
    const clampedTop = clamp(visualTop, 0, maxY);

    setOffset(blockId, {
      x: clampedLeft - d.naturalLeft,
      y: clampedTop - d.naturalTop,
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const nx = d.startOff.x + dx;
      const ny = d.startOff.y + dy;
      const col = columnRef.current?.getBoundingClientRect();
      if (col && onFirstMove) {
        const visualLeft = d.naturalLeft + nx;
        const visualTop = d.naturalTop + ny;
        const maxX = Math.max(0, col.width - d.tileW);
        const maxY = Math.max(0, col.height - d.tileH);
        const clampedLeft = clamp(visualLeft, 0, maxX);
        const clampedTop = clamp(visualTop, 0, maxY);
        const ox = clampedLeft - d.naturalLeft;
        const oy = clampedTop - d.naturalTop;
        if (Math.hypot(ox, oy) > MOVED_EPS_PX) {
          onFirstMove(blockId);
        }
      }
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
      className={`relative min-w-0 overflow-visible ${className}`}
      style={{ marginLeft: offset.x, marginTop: offset.y }}
    >
      <button
        ref={tileRef}
        type="button"
        className="relative z-[1] h-full w-full touch-none overflow-hidden rounded-sm shadow-[0_0_4px_rgba(0,0,0,0.2)] active:cursor-grabbing"
        style={{
          cursor: "grab",
        }}
        aria-label={
          onFirstMove
            ? "Drag to reposition; release after moving to wrap text around this image"
            : "Drag to move image within this entry"
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      </button>
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove image"
          title="Remove image"
          className="absolute right-1 top-1 z-[3] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <TrashIcon className="text-white" />
        </button>
      ) : null}
    </div>
  );
}
