import { GLOBAL_COUNTRIES, type CountryInfo } from "./discoveryData.ts";

const EUROPE = "AL AD AT BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SK SM UA VA XK";
const OTHERS = "RU TR CN MY SG AU CA US KR ZA JP AE PK";

export const DESTINATION_CODES: string[] = `${EUROPE} ${OTHERS}`.split(" ");

const EXTRA: Record<string, [string, string, string]> = {
  AL: ["ALB", "Albania", "Europe"],
  AD: ["AND", "Andorra", "Europe"],
  BA: ["BIH", "Bosnia and Herzegovina", "Europe"],
  BY: ["BLR", "Belarus", "Europe"],
  LI: ["LIE", "Liechtenstein", "Europe"],
  MC: ["MCO", "Monaco", "Europe"],
  MD: ["MDA", "Moldova", "Europe"],
  ME: ["MNE", "Montenegro", "Europe"],
  MK: ["MKD", "North Macedonia", "Europe"],
  RS: ["SRB", "Serbia", "Europe"],
  SM: ["SMR", "San Marino", "Europe"],
  UA: ["UKR", "Ukraine", "Europe"],
  VA: ["VAT", "Vatican City", "Europe"],
  XK: ["XKX", "Kosovo", "Europe"],
  RU: ["RUS", "Russia", "Europe"],
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
