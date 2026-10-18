import { FIELDS_OF_STUDY } from "../core/discoveryData.ts";

const SYNONYMS: Record<string, string[]> = {
  "Computer Science": ["computer science", "computing", "informatics", "informatik", "informatique", "informatica", "informática", "computer engineering", "datalogi", "datavetenskap", "tietojenkäsittely", "computer"],
  "Artificial Intelligence": ["artificial intelligence", "machine learning", "deep learning", "künstliche intelligenz", "intelligence artificielle", "inteligencia artificial", "intelligenza artificiale", "kunstmatige intelligentie", "autonomous systems", "cognitive systems"],
  "Data Science": ["data science", "data analytics", "data engineering", "big data", "datenwissenschaft", "science des données", "ciencia de datos", "business analytics", "analytics"],
  "Software Engineering": ["software engineering", "software development", "softwaretechnik", "softwareentwicklung", "génie logiciel", "ingeniería de software", "software"],
  "Information Technology": ["information technology", "information systems", "wirtschaftsinformatik", "informationstechnik", "cybersecurity", "cyber security", "it security", "it-sicherheit", "informationssysteme"],
  Engineering: ["engineering", "ingenieur", "maschinenbau", "elektrotechnik", "bauingenieur", "mechatronik", "mechatronics", "ingénierie", "ingeniería", "ingegneria", "verfahrenstechnik"],
  "Business Administration": ["business administration", "mba", "betriebswirtschaft", "bwl", "administration des affaires", "administración de empresas"],
  "Business and Management": ["management", "business", "wirtschaftswissenschaft", "gestion", "negocios", "entrepreneurship"],
  "Accountancy and Accounting": ["accounting", "accountancy", "auditing", "rechnungswesen", "comptabilité", "contabilidad"],
  Finance: ["finance", "financial", "banking", "finanz", "finanzen"],
  Economics: ["economics", "econometrics", "volkswirtschaft", "vwl", "économie", "economía", "economia"],
  "Medicine and Health Sciences": ["medicine", "medical", "health", "nursing", "pharmacy", "dentistry", "public health", "medizin", "gesundheit", "pflege", "médecine", "medicina"],
  Law: ["law", "laws", "legal", "rechtswissenschaft", "jura", "jurisprudenz", "droit", "derecho", "giurisprudenza"],
  "Arts and Humanities": ["history", "philosophy", "literature", "linguistics", "humanities", "languages", "geschichte", "philosophie", "germanistik", "anglistik", "art history"],
  Design: ["design", "architecture", "architektur", "gestaltung", "urban planning"],
  "Social Sciences": ["sociology", "political science", "politics", "psychology", "international relations", "social sciences", "soziologie", "politikwissenschaft", "psychologie"],
  Education: ["education", "teaching", "pädagogik", "lehramt", "erziehungswissenschaft", "éducation", "educación"],
  "Natural Sciences": ["physics", "chemistry", "biology", "mathematics", "geology", "astronomy", "physik", "chemie", "biologie", "mathematik", "earth sciences"],
};

const SHORT_WORDS = new Set(["and", "the", "for", "with", "von", "und", "des", "der", "die", "das"]);

export interface FieldMatcher {
  field: string;
  keywords: string[];
  matches(text: string): boolean;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function fieldMatcher(field: string): FieldMatcher {
  const canonical = FIELDS_OF_STUDY.find((f) => f.name.toLowerCase() === field.trim().toLowerCase());
  const keywords = new Set<string>();
  if (canonical) {
    keywords.add(canonical.name.toLowerCase());
    for (const s of SYNONYMS[canonical.name] ?? []) keywords.add(s);
    for (const s of canonical.subfields) keywords.add(s.toLowerCase().replace(/&/g, "and"));
  } else {
    const phrase = field.trim().toLowerCase();
    if (phrase) keywords.add(phrase);
    for (const w of phrase.split(/[^\p{L}\p{N}]+/u)) {
      if (w.length >= 4 && !SHORT_WORDS.has(w)) keywords.add(w);
    }
  }
  const list = [...keywords].filter(Boolean);
  const patterns = list.map((k) => new RegExp(`(^|[^\\p{L}])${escape(k)}`, "iu"));
  return {
    field: canonical?.name ?? field.trim(),
    keywords: list,
    matches: (text: string) => patterns.some((p) => p.test(text)),
  };
}
