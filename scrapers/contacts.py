"""Public Admissions Contact Finder.
Extracts public admissions contacts from university pages:
- admissions, department, 'contact us', faculty/staff directory and international office pages.
- Never guesses emails, never probes mail servers, never scrapes behind a login.
- Distinguishes role emails (e.g. admissions@) vs personal emails (e.g. prof.name@).
"""
import re
import urllib.parse
from html.parser import HTMLParser

ROLE_PREFIXES = {
    "admissions", "admission", "gradadmissions", "grad-admissions", "gradschool",
    "graduate.admissions", "study", "info", "contact", "international", "futurestudents",
    "future-students", "recruitment", "enquiries", "inquiries", "registrar"
}

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"(\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}")

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for k, v in attrs:
                if k == "href" and v:
                    self.links.append(v)

    def handle_data(self, data):
        self.text_parts.append(data)

    def get_text(self):
        return " ".join(self.text_parts)

def extract_contacts_from_html(html_content: str, source_url: str, university_id: str) -> list[dict]:
    """Extracts public contacts from raw HTML content."""
    parser = TextExtractor()
    parser.feed(html_content)
    full_text = parser.get_text()

    # Extract emails from text and mailto: links
    raw_emails = set()
    for link in parser.links:
        if link.lower().startswith("mailto:"):
            clean_link = link[7:].split("?")[0].strip()
            raw_emails.add(clean_link)

    for match in EMAIL_REGEX.findall(full_text):
        raw_emails.add(match.strip())

    contacts = []
    seen = set()

    # Search for phone
    phone_match = PHONE_REGEX.search(full_text)
    detected_phone = phone_match.group(0) if phone_match else None

    parsed_domain = urllib.parse.urlparse(source_url).netloc.lower()

    for email in raw_emails:
        email_clean = email.lower().strip()
        # Filter obvious static asset or mock false positives
        if any(email_clean.endswith(ext) for ext in [".png", ".jpg", ".gif", ".svg", ".css", ".js"]):
            continue
        if "@" not in email_clean or email_clean in seen:
            continue
        seen.add(email_clean)

        local_part, domain_part = email_clean.split("@", 1)
        
        # Determine email type
        prefix_clean = re.sub(r"[^a-z]", "", local_part.lower())
        is_role = any(p in prefix_clean for p in ROLE_PREFIXES)
        email_type = "role" if is_role else "personal"

        # Determine reasonable title/name
        if is_role:
            role_title = "Admissions Office"
            name = f"Admissions Team ({local_part.replace('.', ' ').title()})"
        else:
            role_title = "Academic / Faculty Contact"
            name = local_part.replace(".", " ").title()

        contacts.append({
            "university_id": university_id,
            "name": name,
            "role": role_title,
            "email": email_clean,
            "email_type": email_type,
            "phone": detected_phone,
            "source_url": source_url
        })

    return contacts
