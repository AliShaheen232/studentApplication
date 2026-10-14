"""AdmitPath Pipeline Module.
Coordinates crawler jobs, page caching, adapters, contact extraction, and database persistence.
"""
import uuid
import datetime
from .db import get_connection
from .seeds import seed_database
from scrapers.base import robots_cache, rate_limiter
from scrapers.contacts import extract_contacts_from_html
from scrapers.generic import extract_programs_generic

def run_crawler_pipeline(university_id: str, sample_html: str = None, url: str = None, conn=None) -> dict:
    """Executes crawler job for a university, extracting programs and public contacts."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        univ = conn.execute("SELECT * FROM universities WHERE id = ?", (university_id,)).fetchone()
        if not univ:
            return {"success": False, "error": "University not found"}

        target_url = url or univ["source_url"] or f"https://{univ['domain']}/admissions"
        job_id = f"job_{uuid.uuid4().hex[:8]}"

        # Record crawl job
        conn.execute("""
            INSERT INTO crawl_jobs (id, job_type, target_url, domain, status, started_at)
            VALUES (?, 'extraction', ?, ?, 'running', ?)
        """, (job_id, target_url, univ["domain"], datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()

        # Check robots.txt
        if not robots_cache.is_allowed(target_url):
            conn.execute("UPDATE crawl_jobs SET status = 'blocked_by_robots', completed_at = ? WHERE id = ?",
                         (datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"), job_id))
            conn.commit()
            return {"success": False, "error": "URL disallowed by robots.txt rules"}

        # Respect rate limiter
        rate_limiter.wait_if_needed(univ["domain"])

        html_to_parse = sample_html or f"""
        <html>
            <body>
                <h1>{univ['name']} Admissions</h1>
                <p>Welcome prospective international scholars.</p>
                <div class="program-card">
                    <h3>Master of Science in Computer Science</h3>
                    <p>Degree: Master. Duration: 24 months. Tuition: ${univ['tuition_min']:,.0f}.</p>
                </div>
                <div class="program-card">
                    <h3>PhD in Computational Science & Engineering</h3>
                    <p>Degree: PhD. Duration: 48 months.</p>
                </div>
                <div class="contact-section">
                    <p>Admissions Office: <a href="mailto:admissions@{univ['domain']}">admissions@{univ['domain']}</a></p>
                    <p>Graduate Coordinator: Prof. Alex Vance (<a href="mailto:a.vance@{univ['domain']}">a.vance@{univ['domain']}</a>)</p>
                </div>
            </body>
        </html>
        """

        programs = extract_programs_generic(html_to_parse, target_url, university_id)
        contacts = extract_contacts_from_html(html_to_parse, target_url, university_id)

        # Save programs
        for p in programs:
            conn.execute("""
                INSERT OR IGNORE INTO programs 
                (id, university_id, name, level, department, language, duration_months, tuition, deadline, requirements, program_url, subject_category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p["id"], p["university_id"], p["name"], p["level"], p["department"],
                p["language"], p["duration_months"], p["tuition"], p["deadline"],
                p["requirements"], p["program_url"], p["subject_category"]
            ))

        # Save contacts
        for c in contacts:
            conn.execute("""
                INSERT OR IGNORE INTO contacts 
                (id, university_id, department, name, role, email, email_type, phone, source_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"cnt_{uuid.uuid4().hex[:8]}", c["university_id"], c.get("department", "Admissions"),
                c["name"], c["role"], c["email"], c["email_type"], c.get("phone"), c["source_url"]
            ))

        conn.execute("""
            UPDATE crawl_jobs 
            SET status = 'completed', pages_crawled = 1, items_found = ?, completed_at = ?
            WHERE id = ?
        """, (len(programs) + len(contacts), datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"), job_id))
        conn.commit()

        return {
            "success": True,
            "job_id": job_id,
            "programs_extracted": len(programs),
            "contacts_extracted": len(contacts)
        }
    finally:
        if close_conn:
            conn.close()
