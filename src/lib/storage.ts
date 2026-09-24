import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/rules/config";

// Files live in /uploads (git-ignored) and are only ever served through the
// authorised /api/files/[id] route — never from /public. See CLAUDE.md
// "File uploads".

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export class InvalidFileError extends Error {}

/**
 * Sniffs the real file type from magic bytes rather than trusting the
 * browser-supplied MIME type or the file extension (CLAUDE.md: "Check the
 * MIME type from file contents, not just the extension").
 */
export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("hex") === "25504446") {
    // %PDF
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
  ) {
    return "image/png";
  }
  return null;
}

export type SavedFile = {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Validates size/type by content and writes the file to disk under a random
 * name. The caller is responsible for recording the user-supplied display
 * name (e.g. as File.originalName) — this function never trusts or uses it
 * for the on-disk path.
 */
export async function saveUpload(buffer: Buffer): Promise<SavedFile> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new InvalidFileError(
      `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.`
    );
  }

  const mimeType = detectMimeType(buffer);
  if (
    !mimeType ||
    !ALLOWED_UPLOAD_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]
    )
  ) {
    throw new InvalidFileError("Only PDF, JPG and PNG files are allowed.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = mimeType === "application/pdf" ? "pdf" : mimeType === "image/jpeg" ? "jpg" : "png";
  const storedName = `${randomUUID()}.${ext}`;
  const storagePath = path.join(UPLOAD_DIR, storedName);
  await writeFile(storagePath, buffer);

  return { storagePath, mimeType, sizeBytes: buffer.byteLength };
}

export async function readUpload(storagePath: string): Promise<Buffer> {
  return readFile(storagePath);
}

/** Strips path separators from a display name; never used for the actual on-disk path. */
export function originalNameSafe(name: string): string {
  return name.replace(/[/\\]/g, "_");
}
