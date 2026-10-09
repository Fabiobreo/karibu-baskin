/**
 * Album foto da cartelle Google Drive (UX-52): lettura della cartella e URL
 * delle immagini. I file restano su Drive, il sito ne tiene solo l'indice.
 *
 * La cartella si legge con la Drive API v3 e una API key (niente OAuth): basta
 * che sia condivisa con "Chiunque abbia il link".
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Oltre questo numero le foto di una cartella non si indicizzano. */
export const MAX_ALBUM_PHOTOS = 1000;

/** Proporzioni di ripiego quando Drive non conosce le dimensioni di un file. */
const FALLBACK_SIZE = { width: 1600, height: 1200 };

export function isDriveConfigured(): boolean {
  return !!process.env.GOOGLE_DRIVE_API_KEY;
}

// ── URL ───────────────────────────────────────────────────────────────────────

/**
 * Immagine già ridimensionata da Google, larga `width` px.
 *
 * Non è un'API documentata: è l'unico punto in cui il sito costruisce questo
 * URL, così se Google lo cambia si interviene qui (o si passa a un proxy con
 * l'API ufficiale). Funziona solo per file condivisi con chiunque abbia il
 * link. Le `<img>` che lo usano vogliono `referrerPolicy="no-referrer"`: con
 * un `Referer` da localhost Google risponde 429 (provato il 07/10/2026), senza
 * referer o dal dominio del sito 200.
 */
export function drivePhotoUrl(fileId: string, width: number): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${Math.round(width)}`;
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

/**
 * Download dell'originale a piena risoluzione: Google lo serve come allegato,
 * con il nome del file. Stesso formato non documentato di `drivePhotoUrl`, e
 * stessa regola: il link vuole `rel="noreferrer"`, perché con il `Referer` di
 * localhost Google risponde 429 (provato il 07/10/2026).
 */
export function driveDownloadUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=d`;
}

// ── Link → id della cartella ──────────────────────────────────────────────────

const ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

/**
 * Id della cartella da quello che lo staff incolla: `…/drive/folders/<id>`,
 * `…/drive/u/0/folders/<id>`, `…/open?id=<id>` (con o senza parametri) o l'id
 * da solo. `null` se non è un link a una cartella Drive.
 */
export function parseDriveFolderId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID_PATTERN.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.hostname !== "drive.google.com") return null;

  const inPath = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (inPath && ID_PATTERN.test(inPath[1])) return inPath[1];

  // `/open?id=` vale per file e cartelle; `/file/d/…` è un file, non una cartella.
  if (url.pathname === "/open" || url.pathname === "/drive/folders") {
    const id = url.searchParams.get("id");
    if (id && ID_PATTERN.test(id)) return id;
  }
  return null;
}

// ── Lettura ───────────────────────────────────────────────────────────────────

export type DriveErrorCode =
  | "NOT_CONFIGURED" // manca GOOGLE_DRIVE_API_KEY
  | "NOT_FOUND" // cartella inesistente o non condivisa con chiunque abbia il link
  | "NOT_A_FOLDER"
  | "QUOTA"
  | "FAILED";

const DRIVE_ERROR_MESSAGE: Record<DriveErrorCode, string> = {
  NOT_CONFIGURED:
    "Google Drive non è configurato: manca la variabile d'ambiente GOOGLE_DRIVE_API_KEY.",
  NOT_FOUND: "La cartella non è condivisa con “Chiunque abbia il link”, oppure non esiste più.",
  NOT_A_FOLDER: "Il link porta a un file, non a una cartella.",
  QUOTA: "Google Drive ha ricevuto troppe richieste. Riprova fra qualche minuto.",
  FAILED: "Google Drive non ha risposto. Riprova fra poco.",
};

export class DriveError extends Error {
  constructor(public readonly code: DriveErrorCode) {
    super(DRIVE_ERROR_MESSAGE[code]);
    this.name = "DriveError";
  }
}

export interface DrivePhoto {
  driveFileId: string;
  name: string;
  width: number;
  height: number;
  takenAt: Date | null;
}

export interface DriveFolderListing {
  folderId: string;
  name: string;
  /** In ordine: data di scatto, poi nome. Al massimo `MAX_ALBUM_PHOTOS`. */
  photos: DrivePhoto[];
  /** Video, sottocartelle e altri file: non si mostrano, si contano. */
  otherFiles: number;
  /** Le foto erano più del tetto: quelle oltre non sono state indicizzate. */
  truncated: boolean;
}

interface DriveImageMetadata {
  width?: number;
  height?: number;
  time?: string;
  rotation?: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  imageMediaMetadata?: DriveImageMetadata;
}

/**
 * Larghezza e altezza come si vede la foto. Drive dà le dimensioni del file
 * e, a parte, quanti quarti di giro servono per raddrizzarla: con 1 o 3 quarti
 * i due lati si scambiano (le miniature arrivano già raddrizzate).
 */
export function orientedSize(meta: DriveImageMetadata | undefined): {
  width: number;
  height: number;
} {
  const width = meta?.width;
  const height = meta?.height;
  if (!width || !height || width <= 0 || height <= 0) return FALLBACK_SIZE;
  const quarterTurns = (((meta?.rotation ?? 0) % 4) + 4) % 4;
  return quarterTurns % 2 === 1 ? { width: height, height: width } : { width, height };
}

/**
 * Data di scatto dall'EXIF che Drive espone ("2026:05:17 15:42:08", senza
 * fuso). Si legge come ora di Roma solo per ordinare e proporre la data
 * dell'album: lo scarto di un'ora non conta. `null` se manca o non è valida.
 */
export function parseExifTime(value: string | undefined): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  return Number.isNaN(date.getTime()) ? null : date;
}

const byName = new Intl.Collator("it", { numeric: true, sensitivity: "base" });

/** Data di scatto, poi nome; le foto senza data in fondo, per nome. */
export function sortPhotos(photos: DrivePhoto[]): DrivePhoto[] {
  return [...photos].sort((a, b) => {
    if (a.takenAt && b.takenAt) {
      const diff = a.takenAt.getTime() - b.takenAt.getTime();
      return diff !== 0 ? diff : byName.compare(a.name, b.name);
    }
    if (a.takenAt) return -1;
    if (b.takenAt) return 1;
    return byName.compare(a.name, b.name);
  });
}

async function driveGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) throw new DriveError("NOT_CONFIGURED");

  const query = new URLSearchParams({ ...params, key, supportsAllDrives: "true" });
  let res: Response;
  try {
    res = await fetch(`${DRIVE_API}${path}?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new DriveError("FAILED");
  }
  if (res.ok) return (await res.json()) as T;

  if (res.status === 404) throw new DriveError("NOT_FOUND");
  if (res.status === 429) throw new DriveError("QUOTA");
  if (res.status === 403) {
    // 403 è sia "quota finita" sia "non hai accesso a questo file".
    const body = (await res.json().catch(() => null)) as {
      error?: { errors?: Array<{ reason?: string }> };
    } | null;
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    if (/limit|quota/i.test(reason)) throw new DriveError("QUOTA");
    if (/insufficient|forbidden|notFound|cannot/i.test(reason)) throw new DriveError("NOT_FOUND");
  }
  console.error(`[drive] ${path} ha risposto ${res.status}`);
  throw new DriveError("FAILED");
}

/** Legge nome e contenuto di una cartella condivisa. Lancia `DriveError`. */
export async function listDriveFolder(folderId: string): Promise<DriveFolderListing> {
  const folder = await driveGet<{ id: string; name: string; mimeType: string }>(
    `/files/${encodeURIComponent(folderId)}`,
    { fields: "id,name,mimeType" }
  );
  if (folder.mimeType !== FOLDER_MIME) throw new DriveError("NOT_A_FOLDER");

  const photos: DrivePhoto[] = [];
  let otherFiles = 0;
  let truncated = false;
  let pageToken: string | undefined;

  do {
    const page = await driveGet<{ nextPageToken?: string; files?: DriveFile[] }>("/files", {
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken,files(id,name,mimeType,imageMediaMetadata(width,height,time,rotation))",
      pageSize: "1000",
      includeItemsFromAllDrives: "true",
      ...(pageToken && { pageToken }),
    });
    for (const file of page.files ?? []) {
      if (!file.mimeType.startsWith("image/")) {
        otherFiles++;
        continue;
      }
      if (photos.length >= MAX_ALBUM_PHOTOS) {
        truncated = true;
        continue;
      }
      photos.push({
        driveFileId: file.id,
        name: file.name,
        ...orientedSize(file.imageMediaMetadata),
        takenAt: parseExifTime(file.imageMediaMetadata?.time),
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return { folderId, name: folder.name, photos: sortPhotos(photos), otherFiles, truncated };
}
