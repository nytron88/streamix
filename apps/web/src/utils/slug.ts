export function sanitizeSlug(raw?: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const slug = trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}
