"""UK University Program Adapter."""
import re
from .generic import detect_degree_level, normalize_subject_category

def parse_uk_program_snippet(raw_text: str, university_id: str, source_url: str) -> dict:
    level = detect_degree_level(raw_text)
    subject = normalize_subject_category(raw_text)

    # UK standard degree duration: 12 months for taught MSc, 36 months for Bachelor
    duration = 12 if level == "Master" else (36 if level == "Bachelor" else 36)

    return {
        "university_id": university_id,
        "name": raw_text.split("\n")[0].strip() or f"{level} in {subject}",
        "level": level,
        "department": f"School of {subject}",
        "language": "English",
        "duration_months": duration,
        "tuition": 32000,
        "deadline": "January 15 / March 1",
        "requirements": "Upper second-class honours (2:1) or international equivalent, IELTS 6.5-7.0",
        "program_url": source_url,
        "subject_category": subject
    }
