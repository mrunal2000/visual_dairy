import { FlutedGlass } from "@paper-design/shaders-react";

const VINYL_BG = "/vinyl_disc.png";

/** Paper D2-0 proportions × this scale (1 = 180×119). */
const SCALE = 1.5;

const OUT_W = 180 * SCALE;
const OUT_H = 119 * SCALE;
const VINYL_LEFT = 61 * SCALE;
const VINYL_SIZE = 119 * SCALE;
const SLEEVE_W = 121 * SCALE;
const INSET = 7 * SCALE;
const COVER_H = 105 * SCALE;
const SLEEVE_RADIUS = 2 * SCALE;

type Props = {
  /** Album cover — not the vinyl texture; vinyl is always `vinyl_disc.png`. */
  artworkUrl?: string;
};

/**
 * Paper `currently_listening_component` (node D2-0): sleeve + vinyl peeking out.
 */
export function VinylArtworkStack({ artworkUrl }: Props) {
  const hasArt = Boolean(artworkUrl?.trim());

  return (
    <div
      className="relative shrink-0"
      style={{ boxSizing: "border-box", width: OUT_W, height: OUT_H }}
    >
      <div
        className="absolute top-0 bg-center bg-cover"
        style={{
          boxSizing: "border-box",
          left: VINYL_LEFT,
          width: VINYL_SIZE,
          height: VINYL_SIZE,
          backgroundImage: `url(${VINYL_BG})`,
        }}
        aria-hidden
      />
      <div
        className="absolute left-0 top-0 flex flex-col overflow-hidden bg-[#2C2C2C]"
        style={{
          boxSizing: "border-box",
          width: SLEEVE_W,
          gap: INSET,
          padding: INSET,
          borderRadius: SLEEVE_RADIUS,
        }}
      >
        {hasArt ? (
          <FlutedGlass
            size={0.5}
            shape="lines"
            angle={0}
            distortionShape="prism"
            distortion={0.5}
            shift={0}
            blur={0}
            edges={0.25}
            stretch={0}
            image={artworkUrl}
            scale={1}
            fit="cover"
            highlights={0.1}
            shadows={0.25}
            colorBack="#00000000"
            colorHighlight="#FFFFFF"
            colorShadow="#000000"
            style={{
              alignSelf: "stretch",
              boxSizing: "border-box",
              flexShrink: 0,
              height: COVER_H,
              width: "100%",
              backgroundColor: "transparent",
            }}
          />
        ) : (
          <div
            className="w-full shrink-0 bg-[#3a3a3a]"
            style={{ boxSizing: "border-box", height: COVER_H }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
