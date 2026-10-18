import { FIELDS_OF_STUDY } from "../core/discoveryData.ts";

const SYNONYMS: Record<string, string[]> = {
  "Computer Science": ["computer science", "computing", "informatics", "informatik", "informatique", "informatica", "informática", "computer engineering", "datalogi", "datavetenskap", "tietojenkäsittely", "computer", "计算机", "計算機", "информатик", "вычислительн", "情報科学", "情報工学", "コンピュータ", "컴퓨터", "bilgisayar"],
  "Artificial Intelligence": ["artificial intelligence", "machine learning", "deep learning", "künstliche intelligenz", "intelligence artificielle", "inteligencia artificial", "intelligenza artificiale", "kunstmatige intelligentie", "autonomous systems", "cognitive systems", "人工智能", "искусственн", "人工知能", "인공지능", "yapay zeka", "yapay zekâ"],
  "Data Science": ["data science", "data analytics", "data engineering", "big data", "datenwissenschaft", "science des données", "ciencia de datos", "business analytics", "analytics", "数据科学", "大数据", "наука о данных", "анализ данных", "データサイエンス", "데이터", "veri bilimi"],
  "Software Engineering": ["software engineering", "software development", "softwaretechnik", "softwareentwicklung", "génie logiciel", "ingeniería de software", "software", "软件工程", "программная инженерия", "программн", "ソフトウェア", "소프트웨어", "yazılım"],
  "Information Technology": ["information technology", "information systems", "wirtschaftsinformatik", "informationstechnik", "cybersecurity", "cyber security", "it security", "it-sicherheit", "informationssysteme", "信息技术", "информационн", "情報システム", "정보", "bilişim", "bilgi sistemleri"],
  Engineering: ["engineering", "ingenieur", "maschinenbau", "elektrotechnik", "bauingenieur", "mechatronik", "mechatronics", "ingénierie", "ingeniería", "ingegneria", "verfahrenstechnik", "工程", "инженер", "工学", "공학", "mühendisliği", "mühendislik"],
  "Business Administration": ["business administration", "mba", "betriebswirtschaft", "bwl", "administration des affaires", "administración de empresas", "工商管理", "経営学", "경영", "işletme"],
  "Business and Management": ["management", "business", "wirtschaftswissenschaft", "gestion", "negocios", "entrepreneurship", "管理学", "менеджмент", "управлен", "マネジメント", "관리", "yönetim"],
  "Accountancy and Accounting": ["accounting", "accountancy", "auditing", "rechnungswesen", "comptabilité", "contabilidad", "会计", "бухгалтер", "会計", "회계", "muhasebe"],
  Finance: ["finance", "financial", "banking", "finanz", "finanzen", "金融", "финанс", "금융", "finans"],
  Economics: ["economics", "econometrics", "volkswirtschaft", "vwl", "économie", "economía", "economia", "经济", "экономик", "経済", "경제", "iktisat", "ekonomi"],
  "Medicine and Health Sciences": ["medicine", "medical", "health", "nursing", "pharmacy", "dentistry", "public health", "medizin", "gesundheit", "pflege", "médecine", "medicina", "医学", "медицин", "здравоохран", "医療", "의학", "간호", "tıp", "sağlık", "hemşirelik"],
  Law: ["law", "laws", "legal", "rechtswissenschaft", "jura", "jurisprudenz", "droit", "derecho", "giurisprudenza", "法学", "юриспруденц", "правоведен", "法律", "법학", "hukuk"],
  "Arts and Humanities": ["history", "philosophy", "literature", "linguistics", "humanities", "languages", "geschichte", "philosophie", "germanistik", "anglistik", "art history", "文学", "历史", "哲学", "филолог", "истори", "философ", "人文", "인문", "tarih", "felsefe", "edebiyat"],
  Design: ["design", "architecture", "architektur", "gestaltung", "urban planning", "设计", "建筑", "дизайн", "архитектур", "デザイン", "建築", "디자인", "건축", "tasarım", "mimarlık"],
  "Social Sciences": ["sociology", "political science", "politics", "psychology", "international relations", "social sciences", "soziologie", "politikwissenschaft", "psychologie", "社会学", "心理学", "социолог", "психолог", "политолог", "사회학", "심리학", "sosyoloji", "psikoloji", "uluslararası ilişkiler"],
  Education: ["education", "teaching", "pädagogik", "lehramt", "erziehungswissenschaft", "éducation", "educación", "教育", "педагог", "образовани", "교육", "eğitim", "öğretmenliği"],
  "Natural Sciences": ["physics", "chemistry", "biology", "mathematics", "geology", "astronomy", "physik", "chemie", "biologie", "mathematik", "earth sciences", "物理", "化学", "生物", "数学", "физик", "хими", "биолог", "математик", "물리", "화학", "생물", "수학", "fizik", "kimya", "biyoloji", "matematik"],
};

const NO_WORD_BOUNDARY = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

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
  const patterns = list.map((k) => (NO_WORD_BOUNDARY.test(k) ? new RegExp(escape(k), "iu") : new RegExp(`(^|[^\\p{L}])${escape(k)}`, "iu")));
  return {
    field: canonical?.name ?? field.trim(),
    keywords: list,
    matches: (text: string) => patterns.some((p) => p.test(text)),
  };
}

const ALL_FIELDS = FIELDS_OF_STUDY.map((f) => fieldMatcher(f.name));

export function classifySubjects(title: string): string[] {
  return ALL_FIELDS.filter((m) => m.matches(title)).map((m) => m.field);
}

export const anyFieldMatcher: FieldMatcher = {
  field: "All subjects",
  keywords: ALL_FIELDS.flatMap((m) => m.keywords),
  matches: (text: string) => ALL_FIELDS.some((m) => m.matches(text)),
};
