"""Generic Course and Program Catalog Extractor."""
import re
from html.parser import HTMLParser

SUBJECT_KEYWORDS = {
    "Computer Science": ["computer science", "software", "computing", "algorithms", "cybersecurity"],
    "Data Science & AI": ["data science", "machine learning", "artificial intelligence", "big data", "analytics"],
    "Engineering": ["engineering", "mechanical", "electrical", "civil", "aerospace", "chemical"],
    "Business & Management": ["business", "management", "mba", "finance", "economics", "marketing"],
    "Medicine & Health": ["medicine", "biomedical", "nursing", "public health", "pharmacy"],
    "Natural Sciences": ["physics", "chemistry", "biology", "mathematics"],
    "Social Sciences & Humanities": ["psychology", "sociology", "history", "philosophy", "international relations"]
}

def normalize_subject_category(title: str, text: str = "") -> str:
    combined = (title + " " + text).lower()
    for category, keywords in SUBJECT_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            return category
    return "Interdisciplinary Studies"

def detect_degree_level(title: str, text: str = "") -> str:
    combined = (title + " " + text).lower()
    if any(k in combined for k in ["phd", "doctorate", "doctoral", "dphil"]):
        return "PhD"
    if any(k in combined for k in ["master", "msc", "m.s.", "ma", "m.a.", "mba", "meng", "magister"]):
        return "Master"
    if any(k in combined for k in ["bachelor", "bsc", "b.s.", "ba", "b.a.", "undergraduate", "beng"]):
        return "Bachelor"
    return "Master"

class ProgramCatalogParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.programs = []
        self._current_tag = ""
        self._current_text = []

    def handle_starttag(self, tag, attrs):
        self._current_tag = tag

    def handle_data(self, data):
        cleaned = data.strip()
        if len(cleaned) > 4:
            self._current_text.append(cleaned)

    def extract_from_blocks(self, raw_html: str, source_url: str, university_id: str) -> list[dict]:
        # Regex search for program cards or headers
        # Matches patterns like <h3>Master of Science in Computer Science</h3>
        pattern = re.compile(r"<(?:h[2-4]|a|li|div)[^>]*class=[\"'][^\"']*(?:program|course|degree|major)[^\"']*[\"'][^>]*>(.*?)<\/(?:h[2-4]|a|li|div)>", re.IGNORECASE | re.DOTALL)
        matches = pattern.findall(raw_html)
        
        extracted = []
        if not matches:
            # Fallback to general degree title matches
            fallback_pattern = re.compile(r"((?:Master|Bachelor|PhD|Doctorate|BSc|MSc|MBA)\s+in\s+[^<\n\r]{4,50})", re.IGNORECASE)
            matches = fallback_pattern.findall(raw_html)

        seen = set()
        for idx, item in enumerate(matches):
            title = re.sub(r"<[^>]+>", "", item).strip()
            if len(title) < 5 or title.lower() in seen:
                continue
            seen.add(title.lower())
            level = detect_degree_level(title)
            subject = normalize_subject_category(title)

            prog_id = f"prog_{university_id}_{idx+1}"
            extracted.append({
                "id": prog_id,
                "university_id": university_id,
                "name": title,
                "level": level,
                "department": f"Faculty of {subject}",
                "language": "English",
                "duration_months": 24 if level == "Master" else (48 if level == "Bachelor" else 48),
                "tuition": 25000,
                "deadline": "Rolling / January 15",
                "requirements": "Recognized undergraduate degree, transcripts, English proficiency",
                "program_url": source_url,
                "subject_category": subject
            })

        return extracted

def extract_programs_generic(html: str, source_url: str, university_id: str) -> list[dict]:
    parser = ProgramCatalogParser()
    return parser.extract_from_blocks(html, source_url, university_id)
