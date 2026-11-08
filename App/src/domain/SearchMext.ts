/** In-memory search over the bundled MEXT food composition table. */
import { normalizeText, type Nutrients } from "@nutri/shared";
import type { FoodItem } from "./Models";

/** One row of the generated MextFoods.json (values per 100 g edible portion). */
export interface MextRecord {
  /** MEXT food number, e.g. "01001". */
  id: string;
  name: string;
  nutrients: Nutrients;
}

export interface MextIndexEntry {
  record: MextRecord;
  nameNorm: string;
}

export function createMextIndex(records: MextRecord[]): MextIndexEntry[] {
  return records.map((record) => ({ record, nameNorm: normalizeText(record.name.replace(/[\s　]+/g, " ")) }));
}

/** Matches when every whitespace-separated query term appears in the name; prefix matches rank first. */
export function searchMext(index: MextIndexEntry[], query: string, limit = 40): FoodItem[] {
  const terms = normalizeText(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  const hits = index.filter((entry) => terms.every((term) => entry.nameNorm.includes(term)));
  hits.sort((a, b) => Number(b.nameNorm.startsWith(terms[0]!)) - Number(a.nameNorm.startsWith(terms[0]!)) || a.nameNorm.length - b.nameNorm.length);
  return hits.slice(0, limit).map(({ record }) => ({
    id: null,
    source: "MEXT",
    sourceRef: record.id,
    name: record.name.replace(/[\s　]+/g, " "),
    brand: "",
    servingG: null,
    per100g: record.nutrients,
  }));
}
