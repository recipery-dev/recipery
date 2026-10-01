// combining diacritical marks left behind by NFKD normalization
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "recipe";
}

/** Appends `-2`, `-3`, … to `baseSlug` until it's not in `taken`. */
export function uniqueSlug(baseSlug: string, taken: Set<string>): string {
  if (!taken.has(baseSlug)) return baseSlug;
  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}
