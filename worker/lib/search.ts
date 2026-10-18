import { DESTINATION_COUNTRIES } from "../../core/destinations.ts";

export const CACHE_DAYS = 30;
export const MAX_QUEUED_PER_DAY = 10;

export function normalizeField(field: string): string {
  return field.toLowerCase().replace(/\s+/g, " ").trim();
}

export function resolveCountry(nameOrCode: string): { code: string; name: string } | null {
  const v = nameOrCode.trim().toLowerCase();
  if (!v) return null;
  const hit = DESTINATION_COUNTRIES.find((c) => c.code.toLowerCase() === v || c.code3.toLowerCase() === v || c.name.toLowerCase() === v);
  return hit ? { code: hit.code, name: hit.name } : null;
}

export function searchKey(countryCode: string, field: string): string {
  return `${countryCode.toUpperCase()}|${normalizeField(field)}`;
}
