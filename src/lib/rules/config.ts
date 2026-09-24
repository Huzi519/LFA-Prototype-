// Configurable business-rule constants. Keep this file the single source of
// truth so numbers used across the app (and their tests) never drift apart.
// See CLAUDE.md "Open Questions" — fee model and auto-release period are
// still being confirmed with the client, so they're env-overridable here.

export const PLATFORM_FEE_PERCENT = Number(
  process.env.PLATFORM_FEE_PERCENT ?? 10
);

export const AUTO_RELEASE_DAYS = Number(process.env.AUTO_RELEASE_DAYS ?? 7);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MIN_BIO_LENGTH = 50;

export const CREDENTIAL_EXPIRY_WARNING_DAYS = 30;
