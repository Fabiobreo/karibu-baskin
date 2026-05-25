import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { randomUUID } from "crypto";

export type BlobFolder = "avatars" | "teams" | "matches" | "events" | "posts";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB

interface UploadOptions {
  folder: BlobFolder;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface UploadResult {
  url: string;
  size: number;
}

export async function uploadImage(
  input: File | Buffer,
  opts: UploadOptions
): Promise<UploadResult> {
  const { folder, maxWidth = 1920, maxHeight = 1920, quality = 80 } = opts;

  let buffer: Buffer;
  let mimeType: string;

  if (input instanceof File) {
    if (input.size > MAX_INPUT_BYTES) {
      throw new Error("Il file supera il limite di 5 MB");
    }
    if (!ALLOWED_MIME.has(input.type)) {
      throw new Error("Formato non supportato. Usa JPEG, PNG o WebP");
    }
    mimeType = input.type;
    buffer = Buffer.from(await input.arrayBuffer());
  } else {
    buffer = input;
    mimeType = "image/jpeg"; // Buffer path — assume già validato dal chiamante
  }

  let processed: Buffer;
  try {
    processed = await sharp(buffer)
      .rotate() // applica EXIF orientation
      .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch {
    throw new Error("File non valido o corrotto");
  }

  void mimeType; // usato solo per validazione sopra

  const filename = `${folder}/${randomUUID()}.webp`;
  const blob = await put(filename, processed, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });

  return { url: blob.url, size: processed.length };
}

export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  // Elimina solo URL Vercel Blob — non toccare URL esterni (es. Google profile photos)
  if (!url.includes("blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch (err) {
    // Non bloccare il flusso se la cancellazione fallisce — logga e prosegui
    console.error("[blob] deleteImage failed:", url, err);
  }
}

export async function replaceImage(
  oldUrl: string | null | undefined,
  file: File,
  opts: UploadOptions
): Promise<UploadResult> {
  const result = await uploadImage(file, opts);
  // Elimina il vecchio dopo aver confermato il nuovo upload
  await deleteImage(oldUrl);
  return result;
}
