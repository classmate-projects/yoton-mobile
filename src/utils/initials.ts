// Mirrors the web app's lib/getInitials.ts (and the MAUI InitialsConverter): a contact's avatar
// circle shows the same initials on every platform. "Dr." titles are skipped.
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "";

  let cleaned = name.trim();
  if (/^dr\./i.test(cleaned)) cleaned = cleaned.slice(3).trimStart();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// First + last name initial ("John Smith" -> "JS"), falling back gracefully for single-word or
// empty names. Used for the profile headers on the More and Settings screens (the MAUI
// AppShell.ComputeInitials).
export function computeInitials(name?: string | null): string {
  if (!name || !name.trim()) return "P";

  const parts = name.split(" ").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "P";

  const first = parts[0][0].toUpperCase();
  const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : "";
  return first + last;
}
