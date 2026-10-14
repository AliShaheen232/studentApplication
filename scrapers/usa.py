"""USA University Program Adapter."""
import re
from .generic import detect_degree_level, normalize_subject_category

def parse_usa_program_snippet(raw_text: str, university_id: str, source_url: str) -> dict:
    """Parses typical US catalog description."""
    level = detect_degree_level(raw_text)
    subject = normalize_subject_category(raw_text)

    # Search for GRE / TOEFL / GPA mentions
    gpa_match = re.search(r"GPA(?:\s+of)?\s+([0-9]\.[0-9]+)", raw_text, re.IGNORECASE)
    min_gpa = gpa_match.group(1) if gpa_match else "3.0"

    credits_match = re.search(r"([0-9]{2,3})\s+(?:credits|credit\s+hours)", raw_text, re.IGNORECASE)
    duration = 24 if level == "Master" else 48

    return {
        "university_id": university_id,
        "name": raw_text.split("\n")[0].strip() or f"{level} in {subject}",
        "level": level,
        "department": f"Department of {subject}",
        "language": "English",
        "duration_months": duration,
        "tuition": 55000 if level in ("Master", "PhD") else 48000,
        "deadline": "December 15",
        "requirements": f"Minimum GPA {min_gpa}/4.0, official transcripts, 3 letters of recommendation, TOEFL/IELTS",
        "program_url": source_url,
        "subject_category": subject
    }
