import { GLOBAL_COUNTRIES } from "../core/discoveryData.ts";

const EUROPE = "AL AD AT BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SK SM UA VA XK";
const OTHERS = "RU TR CN MY SG AU CA US KR ZA JP AE PK";

export const DEFAULT_COUNTRIES = `${EUROPE} ${OTHERS}`.split(" ");

const names = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  const upper = code.toUpperCase();
  return GLOBAL_COUNTRIES.find((c) => c.code === upper)?.name ?? names.of(upper) ?? upper;
}

export function targetCountries(override?: string): string[] {
  const list = override?.trim() ? override.split(/[\s,]+/) : DEFAULT_COUNTRIES;
  return [...new Set(list.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))];
}
