"""Germany University Program Adapter."""
import re
from .generic import detect_degree_level, normalize_subject_category

def parse_germany_program_snippet(raw_text: str, university_id: str, source_url: str) -> dict:
    level = detect_degree_level(raw_text)
    subject = normalize_subject_category(raw_text)

    # Detect language requirements
    has_german = "german" in raw_text.lower() or "deutsch" in raw_text.lower()
    languages = "English, German" if has_german else "English"

    return {
        "university_id": university_id,
        "name": raw_text.split("\n")[0].strip() or f"{level} in {subject}",
        "level": level,
        "department": f"Department of {subject}",
        "language": languages,
        "duration_months": 24 if level == "Master" else 36,
        "tuition": 3000, # Low or subsidized tuition
        "deadline": "May 31 (Winter semester) / November 30 (Summer semester)",
        "requirements": "Recognized Bachelor degree (180 ECTS credits), academic qualification test, language certificate",
        "program_url": source_url,
        "subject_category": subject
    }
