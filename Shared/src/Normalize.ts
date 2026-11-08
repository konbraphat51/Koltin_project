/** Text normalization shared by App and Server so that identical requests merge. */

/** NFKC, lowercase, then collapse whitespace. */
export function normalizeText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}
