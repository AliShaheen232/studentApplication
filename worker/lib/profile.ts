import { FIELDS_OF_STUDY, GLOBAL_COUNTRIES } from "../../core/discoveryData.ts";

export const DEGREE_LEVELS = ["High school", "Diploma", "Bachelor", "Master", "PhD"] as const;
export const TARGET_LEVELS = ["Bachelor", "Master", "PhD", "MBA"] as const;
export const GPA_SCALES = [4, 5, 10, 20, 100] as const;
export const ENGLISH_TESTS = ["ielts", "toefl", "pte", "duolingo", "native", "planned", "none"] as const;
export const GERMAN_LEVELS = ["none", "A1", "A2", "B1", "B2", "C1", "C2", "native"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export const FUNDING = ["self", "partial", "full_scholarship"] as const;
export const MAX_SUBJECTS = 7;

const SUBJECTS = new Set(FIELDS_OF_STUDY.map((f) => f.name));
const DESTINATIONS = new Set(GLOBAL_COUNTRIES.map((c) => c.name));

const SCORE_RANGES: Record<string, { field: string; min: number; max: number; step?: number }> = {
  ielts: { field: "ielts_score", min: 0, max: 9, step: 0.5 },
  toefl: { field: "toefl_score", min: 0, max: 120 },
  pte: { field: "pte_score", min: 10, max: 90 },
  duolingo: { field: "duolingo_score", min: 10, max: 160 },
};

export const PROFILE_COLUMNS = [
  "full_name",
  "nationality",
  "country_of_residence",
  "linkedin_url",
  "current_degree_level",
  "field_of_study",
  "current_institution",
  "graduation_year",
  "gpa",
  "max_gpa",
  "qualification",
  "target_level",
  "subjects",
  "countries",
  "intake_term",
  "budget_max",
  "currency",
  "funding",
  "english_test",
  "ielts_score",
  "toefl_score",
  "pte_score",
  "duolingo_score",
  "german_level",
  "work_experience_years",
  "research_interests",
  "experience",
  "academic_achievements",
  "preferred_universities",
  "additional_preferences",
] as const;

export type ProfileValues = Record<(typeof PROFILE_COLUMNS)[number], string | number | null>;

type Input = Record<string, unknown>;

function text(input: Input, key: string, max: number): string | null {
  const v = input[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
}

function longText(input: Input, key: string, max = 2000): string | null {
  const v = input[key];
  if (typeof v !== "string") return null;
  const t = v.replace(/\r\n/g, "\n").trim();
  return t ? t.slice(0, max) : null;
}

function num(input: Input, key: string): number | null {
  const v = input[key];
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function list(input: Input, key: string): string[] {
  const v = input[key];
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean))];
}

function oneOf<T extends readonly (string | number)[]>(values: T, v: unknown): v is T[number] {
  return values.includes(v as T[number]);
}

export function validateProfile(input: Input, now = new Date()): { values: ProfileValues; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const req = (key: string, value: unknown, message: string) => {
    if (value === null || value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) {
      errors[key] = message;
    }
  };

  const full_name = text(input, "full_name", 120);
  req("full_name", full_name, "Enter your full name.");
  const nationality = text(input, "nationality", 80);
  req("nationality", nationality, "Choose your nationality.");
  const country_of_residence = text(input, "country_of_residence", 80);
  req("country_of_residence", country_of_residence, "Choose where you live now.");

  let linkedin_url = text(input, "linkedin_url", 300);
  if (linkedin_url) {
    try {
      const u = new URL(linkedin_url);
      if (u.protocol !== "https:") throw new Error();
      linkedin_url = u.toString();
    } catch {
      errors.linkedin_url = "Enter a full https:// link, or leave it empty.";
    }
  }

  const current_degree_level = text(input, "current_degree_level", 30);
  if (!oneOf(DEGREE_LEVELS, current_degree_level)) errors.current_degree_level = "Choose your highest completed or current degree.";
  const field_of_study = text(input, "field_of_study", 120);
  req("field_of_study", field_of_study, "Enter what you studied.");
  const current_institution = text(input, "current_institution", 160);

  const graduation_year = num(input, "graduation_year");
  const thisYear = now.getUTCFullYear();
  if (graduation_year !== null && (!Number.isInteger(graduation_year) || graduation_year < 1970 || graduation_year > thisYear + 6)) {
    errors.graduation_year = `Enter a year between 1970 and ${thisYear + 6}.`;
  }

  const max_gpa = num(input, "max_gpa");
  if (!oneOf(GPA_SCALES, max_gpa)) errors.max_gpa = "Choose your grading scale.";
  const gpa = num(input, "gpa");
  if (gpa === null || Number.isNaN(gpa)) errors.gpa = "Enter your GPA or grade.";
  else if (gpa < 0 || (typeof max_gpa === "number" && gpa > max_gpa)) errors.gpa = "GPA must be between 0 and your scale maximum.";

  const target_level = text(input, "target_level", 20);
  if (!oneOf(TARGET_LEVELS, target_level)) errors.target_level = "Choose the degree you want to apply for.";

  const subjects = list(input, "subjects");
  if (!subjects.length) errors.subjects = "Pick at least one subject.";
  else if (subjects.length > MAX_SUBJECTS) errors.subjects = `Pick at most ${MAX_SUBJECTS} subjects.`;
  else if (subjects.some((s) => !SUBJECTS.has(s))) errors.subjects = "Pick subjects from the list.";

  const countries = list(input, "countries");
  if (!countries.length) errors.countries = "Pick at least one country.";
  else if (countries.length > 10) errors.countries = "Pick at most 10 countries.";
  else if (countries.some((c) => !DESTINATIONS.has(c))) errors.countries = "Pick countries from the list.";

  const intake_term = text(input, "intake_term", 20);
  const intake = intake_term?.match(/^(Spring|Summer|Fall|Winter) (\d{4})$/);
  if (!intake || Number(intake[2]) < thisYear || Number(intake[2]) > thisYear + 4) {
    errors.intake_term = "Choose when you want to start.";
  }

  const budget_max = num(input, "budget_max");
  if (budget_max === null || Number.isNaN(budget_max) || budget_max < 0 || budget_max > 1_000_000) {
    errors.budget_max = "Enter your yearly tuition budget (0 if you only want free or fully funded programs).";
  }
  const currency = text(input, "currency", 3);
  if (!oneOf(CURRENCIES, currency)) errors.currency = "Choose a currency.";
  const fundingRaw = text(input, "funding", 30);
  const funding = fundingRaw && oneOf(FUNDING, fundingRaw) ? fundingRaw : null;
  if (fundingRaw && !funding) errors.funding = "Choose a funding option.";

  const english_test = text(input, "english_test", 20);
  const scores: Record<"ielts_score" | "toefl_score" | "pte_score" | "duolingo_score", number | null> = {
    ielts_score: null,
    toefl_score: null,
    pte_score: null,
    duolingo_score: null,
  };
  if (!oneOf(ENGLISH_TESTS, english_test)) {
    errors.english_test = "Tell us about your English test.";
  } else if (SCORE_RANGES[english_test]) {
    const r = SCORE_RANGES[english_test];
    const score = num(input, r.field);
    if (score === null || Number.isNaN(score) || score < r.min || score > r.max || (r.step && Math.round(score / r.step) * r.step !== score)) {
      errors[r.field] = `Enter a score between ${r.min} and ${r.max}${r.step ? ` in steps of ${r.step}` : ""}.`;
    } else {
      scores[r.field as keyof typeof scores] = score;
    }
  }

  const germanRaw = text(input, "german_level", 10);
  const german_level = germanRaw && oneOf(GERMAN_LEVELS, germanRaw) ? germanRaw : null;
  if (germanRaw && !german_level) errors.german_level = "Choose a German level.";

  const work_experience_years = num(input, "work_experience_years");
  if (work_experience_years !== null && (Number.isNaN(work_experience_years) || work_experience_years < 0 || work_experience_years > 50)) {
    errors.work_experience_years = "Enter years between 0 and 50.";
  }

  const values: ProfileValues = {
    full_name,
    nationality,
    country_of_residence,
    linkedin_url: errors.linkedin_url ? null : linkedin_url,
    current_degree_level,
    field_of_study,
    current_institution,
    graduation_year: errors.graduation_year ? null : graduation_year,
    gpa: errors.gpa ? null : gpa,
    max_gpa: errors.max_gpa ? null : max_gpa,
    qualification: current_degree_level && field_of_study ? `${current_degree_level} in ${field_of_study}` : null,
    target_level,
    subjects: subjects.join(", "),
    countries: countries.join(", "),
    intake_term,
    budget_max: errors.budget_max ? null : budget_max,
    currency,
    funding,
    english_test,
    ...scores,
    german_level,
    work_experience_years: errors.work_experience_years ? null : work_experience_years,
    research_interests: longText(input, "research_interests", 1000),
    experience: longText(input, "experience"),
    academic_achievements: longText(input, "academic_achievements"),
    preferred_universities: text(input, "preferred_universities", 500),
    additional_preferences: longText(input, "additional_preferences", 1000),
  };
  return { values, errors };
}
