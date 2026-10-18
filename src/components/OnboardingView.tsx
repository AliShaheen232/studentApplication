import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Globe, Languages, RotateCw, UserRound } from "lucide-react";
import BrandIcon from "./BrandIcon";
import { FIELDS_OF_STUDY, GLOBAL_COUNTRIES } from "../data/countries";

const ISO_CODES =
  "AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI CV KH CM CA KY CF TD CL CN CO KM CG CD CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GF PF GA GM GE DE GH GR GL GD GP GU GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NC NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW";

const ALL_COUNTRIES = (() => {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return ISO_CODES.split(" ")
    .map((code) => names.of(code) || code)
    .sort((a, b) => a.localeCompare(b));
})();

const DEGREE_LEVELS = ["High school", "Diploma", "Bachelor", "Master", "PhD"];
const TARGET_LEVELS = ["Bachelor", "Master", "PhD", "MBA"];
const GPA_SCALES = [4, 5, 10, 20, 100];
const MAX_SUBJECTS = 7;
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
const GERMAN_LEVELS = [
  ["none", "None"],
  ["A1", "A1"],
  ["A2", "A2"],
  ["B1", "B1"],
  ["B2", "B2"],
  ["C1", "C1"],
  ["C2", "C2"],
  ["native", "Native"],
];
const ENGLISH_TESTS: [string, string, string | null, string][] = [
  ["ielts", "IELTS", "ielts_score", "0 - 9"],
  ["toefl", "TOEFL iBT", "toefl_score", "0 - 120"],
  ["pte", "PTE Academic", "pte_score", "10 - 90"],
  ["duolingo", "Duolingo English Test", "duolingo_score", "10 - 160"],
  ["native", "English is my first language", null, ""],
  ["planned", "I will take a test soon", null, ""],
  ["none", "No test yet", null, ""],
];
const FUNDING = [
  ["self", "I can pay tuition myself"],
  ["partial", "I need some scholarship support"],
  ["full_scholarship", "I need a full scholarship"],
];

const STEPS = [
  { title: "About you", icon: UserRound, fields: ["full_name", "nationality", "country_of_residence", "linkedin_url"] },
  { title: "Education", icon: GraduationCap, fields: ["current_degree_level", "field_of_study", "current_institution", "graduation_year", "max_gpa", "gpa"] },
  { title: "Your goals", icon: Globe, fields: ["target_level", "subjects", "countries", "intake_term", "budget_max", "currency", "funding"] },
  {
    title: "Languages & experience",
    icon: Languages,
    fields: ["english_test", "ielts_score", "toefl_score", "pte_score", "duolingo_score", "german_level", "work_experience_years", "research_interests", "experience", "academic_achievements", "preferred_universities", "additional_preferences"],
  },
];

function intakeOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const terms: [string, number][] = [["Spring", 3], ["Summer", 6], ["Fall", 9], ["Winter", 10]];
  const out: string[] = [];
  for (let y = year; y <= year + 3; y++) {
    for (const [term, start] of terms) {
      if (y === year && start <= month) continue;
      out.push(`${term} ${y}`);
    }
  }
  return out.slice(0, 10);
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  return typeof value === "string" && value.trim() ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
}

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

type Form = Record<string, string | string[]>;

function initialForm(profile: any): Form {
  const p = profile || {};
  return {
    full_name: str(p.full_name),
    nationality: str(p.nationality),
    country_of_residence: str(p.country_of_residence),
    linkedin_url: str(p.linkedin_url),
    current_degree_level: str(p.current_degree_level),
    field_of_study: str(p.field_of_study),
    current_institution: str(p.current_institution),
    graduation_year: str(p.graduation_year),
    max_gpa: str(p.max_gpa || 4),
    gpa: str(p.gpa),
    target_level: str(p.target_level),
    subjects: toList(p.subjects),
    countries: toList(p.countries),
    intake_term: str(p.intake_term),
    budget_max: str(p.budget_max),
    currency: str(p.currency || "USD"),
    funding: str(p.funding),
    english_test: str(p.english_test),
    ielts_score: str(p.ielts_score),
    toefl_score: str(p.toefl_score),
    pte_score: str(p.pte_score),
    duolingo_score: str(p.duolingo_score),
    german_level: str(p.german_level),
    work_experience_years: str(p.work_experience_years),
    research_interests: str(p.research_interests),
    experience: str(p.experience),
    academic_achievements: str(p.academic_achievements),
    preferred_universities: str(p.preferred_universities),
    additional_preferences: str(p.additional_preferences),
  };
}

function checkStep(step: number, f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  const need = (key: string, msg: string) => {
    const v = f[key];
    if (Array.isArray(v) ? v.length === 0 : !String(v).trim()) e[key] = msg;
  };
  if (step === 0) {
    need("full_name", "Enter your full name.");
    need("nationality", "Choose your nationality.");
    need("country_of_residence", "Choose where you live now.");
  }
  if (step === 1) {
    need("current_degree_level", "Choose your degree.");
    need("field_of_study", "Enter what you studied.");
    need("gpa", "Enter your GPA or grade.");
    const gpa = Number(f.gpa);
    if (f.gpa && (Number.isNaN(gpa) || gpa < 0 || gpa > Number(f.max_gpa))) e.gpa = `Enter a value between 0 and ${f.max_gpa}.`;
  }
  if (step === 2) {
    need("target_level", "Choose the degree you want.");
    need("subjects", "Pick at least one subject.");
    need("countries", "Pick at least one country.");
    need("intake_term", "Choose when you want to start.");
    need("budget_max", "Enter your yearly budget (0 is fine).");
  }
  if (step === 3) {
    need("english_test", "Tell us about your English.");
    const test = ENGLISH_TESTS.find((t) => t[0] === f.english_test);
    if (test?.[2]) need(test[2], "Enter your score.");
  }
  return e;
}

interface OnboardingViewProps {
  profile: any;
  mode: "onboarding" | "edit";
  onSaved: (profile: any) => void;
  onCancel?: () => void;
}

export default function OnboardingView({ profile, mode, onSaved, onCancel }: OnboardingViewProps) {
  const [form, setForm] = useState<Form>(() => initialForm(profile));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const intakes = useMemo(intakeOptions, []);
  const englishTest = ENGLISH_TESTS.find((t) => t[0] === form.english_test);

  const set = (key: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggle = (key: "subjects" | "countries", value: string, max: number) => {
    const current = form[key] as string[];
    if (current.includes(value)) set(key, current.filter((v) => v !== value));
    else if (current.length < max) set(key, [...current, value]);
  };

  const next = () => {
    const e = checkStep(step, form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const save = async () => {
    const e = checkStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setServerError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      for (const key of ["graduation_year", "gpa", "max_gpa", "budget_max", "ielts_score", "toefl_score", "pte_score", "duolingo_score", "work_experience_years"]) {
        payload[key] = form[key] === "" ? null : Number(form[key]);
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const fields: Record<string, string> = data.fields || {};
        setErrors(fields);
        setServerError(data.error || "Could not save your profile.");
        const first = STEPS.findIndex((s) => s.fields.some((f) => fields[f]));
        if (first >= 0) setStep(first);
        return;
      }
      onSaved(data.profile);
    } catch (err: any) {
      setServerError(err.message || "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string, optional = false) => (
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      {text} {optional && <span className="font-normal text-slate-400">(optional)</span>}
    </label>
  );
  const err = (key: string) => errors[key] && <p className="mt-1 text-[11px] text-rose-600">{errors[key]}</p>;
  const inputCls = (key: string) =>
    `w-full bg-white border rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 ${
      errors[key] ? "border-rose-400" : "border-slate-300"
    }`;
  const textInput = (key: string, placeholder = "", type = "text") => (
    <input type={type} value={form[key] as string} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} className={inputCls(key)} />
  );
  const textArea = (key: string, placeholder: string) => (
    <textarea value={form[key] as string} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} rows={3} className={inputCls(key)} />
  );
  const select = (key: string, options: (string | [string, string])[], placeholder: string) => (
    <select value={form[key] as string} onChange={(e) => set(key, e.target.value)} className={inputCls(key)}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const [value, text] = Array.isArray(o) ? o : [o, o];
        return (
          <option key={value} value={value}>
            {text}
          </option>
        );
      })}
    </select>
  );
  const pills = (key: string, options: string[]) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => set(key, o)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            form[key] === o ? "bg-emerald-50 border-[#047857] text-emerald-900" : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );

  const StepIcon = STEPS[step].icon;
  const last = step === STEPS.length - 1;

  return (
    <div className={mode === "onboarding" ? "min-h-screen bg-[#f4f6f8] py-8 px-4" : ""}>
      <div className="max-w-2xl mx-auto">
        {mode === "onboarding" && (
          <div className="text-center mb-6">
            <div className="inline-flex p-2 rounded-2xl bg-white border border-slate-200 mb-3">
              <BrandIcon size="lg" />
            </div>
            <h1 className="font-serif-editorial text-2xl font-bold text-slate-900">Set up your student profile</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              We use this to match you with programs that fit and to write emails that sound like you. Takes about 3 minutes.
            </p>
          </div>
        )}

        <div className="flex gap-1.5 mb-4">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-[#047857]" : "bg-slate-200"} ${i < step ? "cursor-pointer" : "cursor-default"}`}
              aria-label={s.title}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <StepIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="text-base font-bold text-slate-900">{STEPS[step].title}</h2>
            </div>
          </div>

          {serverError && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">{serverError}</div>}

          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                {label("Full name, as on your passport")}
                {textInput("full_name", "Ali Shaheen")}
                {err("full_name")}
              </div>
              <div>
                {label("Nationality")}
                {select("nationality", ALL_COUNTRIES, "Choose a country")}
                {err("nationality")}
              </div>
              <div>
                {label("Where you live now")}
                {select("country_of_residence", ALL_COUNTRIES, "Choose a country")}
                {err("country_of_residence")}
              </div>
              <div className="sm:col-span-2">
                {label("LinkedIn or portfolio link", true)}
                {textInput("linkedin_url", "https://www.linkedin.com/in/your-name", "url")}
                {err("linkedin_url")}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                {label("Highest degree, completed or in progress")}
                {pills("current_degree_level", DEGREE_LEVELS)}
                {err("current_degree_level")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {label("Major or subject")}
                  {textInput("field_of_study", "Computer Science")}
                  {err("field_of_study")}
                </div>
                <div>
                  {label("University or school", true)}
                  {textInput("current_institution", "University of Siegen")}
                </div>
                <div>
                  {label("Graduation year", true)}
                  {textInput("graduation_year", "2025", "number")}
                  {err("graduation_year")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    {label("Grade / GPA")}
                    {textInput("gpa", "3.4", "number")}
                  </div>
                  <div>
                    {label("Out of")}
                    {select("max_gpa", GPA_SCALES.map(String), "Scale")}
                  </div>
                  <div className="col-span-2">
                    {err("gpa")}
                    {err("max_gpa")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                {label("Degree you want to apply for")}
                {pills("target_level", TARGET_LEVELS)}
                {err("target_level")}
              </div>
              <div>
                {label(`Subjects (up to ${MAX_SUBJECTS})`)}
                <div className="flex flex-wrap gap-1.5">
                  {FIELDS_OF_STUDY.map((f) => {
                    const on = (form.subjects as string[]).includes(f.name);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggle("subjects", f.name, MAX_SUBJECTS)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition ${
                          on ? "bg-emerald-50 border-[#047857] text-emerald-900 font-medium" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {on && <Check className="inline h-3 w-3 mr-1" />}
                        {f.name}
                      </button>
                    );
                  })}
                </div>
                {err("subjects")}
              </div>
              <div>
                {label("Countries you would study in (up to 10)")}
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1 -m-1">
                  {GLOBAL_COUNTRIES.map((c) => {
                    const on = (form.countries as string[]).includes(c.name);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => toggle("countries", c.name, 10)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition ${
                          on ? "bg-emerald-50 border-[#047857] text-emerald-900 font-medium" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {c.flag} {c.name}
                      </button>
                    );
                  })}
                </div>
                {err("countries")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  {label("Start date")}
                  {select("intake_term", intakes, "Choose")}
                  {err("intake_term")}
                </div>
                <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    {label("Max tuition per year")}
                    {textInput("budget_max", "10000", "number")}
                  </div>
                  <div>
                    {label("Currency")}
                    {select("currency", CURRENCIES, "-")}
                  </div>
                  <div className="col-span-3">{err("budget_max")}</div>
                </div>
              </div>
              <div>
                {label("Funding", true)}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {FUNDING.map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("funding", form.funding === value ? "" : value)}
                      className={`px-3 py-2 rounded-lg text-xs text-left border transition ${
                        form.funding === value ? "bg-emerald-50 border-[#047857] text-emerald-900" : "bg-white border-slate-300 text-slate-700"
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {label("English test")}
                  {select("english_test", ENGLISH_TESTS.map((t) => [t[0], t[1]] as [string, string]), "Choose")}
                  {err("english_test")}
                </div>
                {englishTest?.[2] && (
                  <div>
                    {label(`${englishTest[1]} score (${englishTest[3]})`)}
                    {textInput(englishTest[2], "", "number")}
                    {err(englishTest[2])}
                  </div>
                )}
                <div>
                  {label("German level", true)}
                  {select("german_level", GERMAN_LEVELS as [string, string][], "Choose")}
                </div>
                <div>
                  {label("Work experience in years", true)}
                  {textInput("work_experience_years", "0", "number")}
                  {err("work_experience_years")}
                </div>
              </div>
              <div>
                {label("Research interests", true)}
                {textArea("research_interests", "e.g. computer vision in low light, battery systems for EVs")}
                <p className="mt-1 text-[11px] text-slate-400">Used to write a specific opening line in emails to professors and labs.</p>
              </div>
              <div>
                {label("Work, research or project experience", true)}
                {textArea("experience", "e.g. Working student in EV charging software, final-year project on car brand recognition")}
              </div>
              <div>
                {label("Awards, publications or achievements", true)}
                {textArea("academic_achievements", "e.g. Dean's list 2024, paper at a student conference")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {label("Dream universities", true)}
                  {textInput("preferred_universities", "TU Munich, RWTH Aachen")}
                </div>
                <div>
                  {label("Anything else", true)}
                  {textInput("additional_preferences", "e.g. need a program taught in English")}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              {step > 0 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              ) : (
                mode === "edit" &&
                onCancel && (
                  <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                    Cancel
                  </button>
                )
              )}
            </div>
            {last ? (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {mode === "onboarding" ? "Finish setup" : "Save profile"}
              </button>
            ) : (
              <button type="button" onClick={next} className="px-5 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold flex items-center gap-1.5">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
