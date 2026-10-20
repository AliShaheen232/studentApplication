import { GLOBAL_COUNTRIES, type CountryInfo } from "./discoveryData.ts";

const EUROPE = "AT BA BE BY CH CY CZ DE DK EE ES FI GB GR HR HU IE IS IT LT LU LV MT NL NO PL PT RO RS SE SI SK UA";
const OTHERS = "RU TR CN MY SG AU CA US KR ZA JP AE GE AZ KG UZ TJ";

export const DESTINATION_CODES: string[] = `${EUROPE} ${OTHERS}`.split(" ");

const EXTRA: Record<string, [string, string, string]> = {
  BA: ["BIH", "Bosnia and Herzegovina", "Europe"],
  BY: ["BLR", "Belarus", "Europe"],
  RS: ["SRB", "Serbia", "Europe"],
  UA: ["UKR", "Ukraine", "Europe"],
  RU: ["RUS", "Russia", "Europe"],
  GE: ["GEO", "Georgia", "Asia"],
  AZ: ["AZE", "Azerbaijan", "Asia"],
  KG: ["KGZ", "Kyrgyzstan", "Asia"],
  UZ: ["UZB", "Uzbekistan", "Asia"],
  TJ: ["TJK", "Tajikistan", "Asia"],
};

function flag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const DESTINATION_COUNTRIES: CountryInfo[] = DESTINATION_CODES.map((code) => {
  const known = GLOBAL_COUNTRIES.find((c) => c.code === code);
  if (known) return known;
  const [code3, name, region] = EXTRA[code];
  return { code, code3, name, flag: flag(code), region, hasCatalog: true };
}).sort((a, b) => a.name.localeCompare(b.name));

export const MAX_DESTINATIONS = 10;
