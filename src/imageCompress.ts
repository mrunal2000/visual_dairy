/** Downscale + JPEG-encode so data URLs fit in localStorage (~5MB limit). */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return readFileAsDataUrl(file);
  }

  let w = bitmap.width;
  let h = bitmap.height;
  if (w > MAX_EDGE || h > MAX_EDGE) {
    const scale = Math.min(MAX_EDGE / w, MAX_EDGE / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return readFileAsDataUrl(file);

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      resolve(typeof r === "string" ? r : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
