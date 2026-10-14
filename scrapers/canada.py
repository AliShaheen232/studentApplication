"""Canada University Program Adapter."""
from .generic import detect_degree_level, normalize_subject_category

def parse_canada_program_snippet(raw_text: str, university_id: str, source_url: str) -> dict:
    level = detect_degree_level(raw_text)
    subject = normalize_subject_category(raw_text)

    return {
        "university_id": university_id,
        "name": raw_text.split("\n")[0].strip() or f"{level} in {subject}",
        "level": level,
        "department": f"Faculty of {subject}",
        "language": "English",
        "duration_months": 24 if level == "Master" else 48,
        "tuition": 38000,
        "deadline": "January 15",
        "requirements": "Mid-B standing (approx. 75% or 3.0/4.0), English language proficiency (IELTS 6.5+)",
        "program_url": source_url,
        "subject_category": subject
    }
