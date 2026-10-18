import { DESTINATION_CODES, DESTINATION_COUNTRIES } from "../core/destinations.ts";
import { GLOBAL_COUNTRIES } from "../core/discoveryData.ts";

export const DEFAULT_COUNTRIES = DESTINATION_CODES;

const names = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  const upper = code.toUpperCase();
  return (DESTINATION_COUNTRIES.find((c) => c.code === upper) ?? GLOBAL_COUNTRIES.find((c) => c.code === upper))?.name ?? names.of(upper) ?? upper;
}

export function targetCountries(override?: string): string[] {
  const list = override?.trim() ? override.split(/[\s,]+/) : DEFAULT_COUNTRIES;
  return [...new Set(list.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))];
}
