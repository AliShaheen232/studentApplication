"""AdmitPath Compliance, Suppression & Privacy Module.
Handles:
- Suppression list (global & per-user)
- Opt-out detection ("stop", "unsubscribe", "remove me")
- GDPR / Right-to-be-forgotten deletion
- Data subject access requests (full export in JSON)
"""
import json
import secrets
from .db import get_connection

OPTOUT_KEYWORDS = ["stop", "unsubscribe", "remove me", "do not contact", "please remove", "opt out", "opt-out"]

def is_optout_message(text: str) -> bool:
    """Detects if message text contains an opt-out / unsubscribe signal."""
    if not text:
        return False
    lower = text.lower().strip()
    return any(kw in lower for kw in OPTOUT_KEYWORDS)

def add_to_suppression_list(email: str, user_id: str = None, reason: str = "opt_out", conn=None) -> str:
    """Adds an email address to suppression list."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        supp_id = secrets.token_hex(12)
        conn.execute(
            "INSERT OR REPLACE INTO suppression (id, user_id, email, reason) VALUES (?, ?, ?, ?)",
            (supp_id, user_id, email.strip().lower(), reason)
        )
        conn.commit()
        return supp_id
    finally:
        if close_conn:
            conn.close()

def is_email_suppressed(email: str, user_id: str = None, conn=None) -> bool:
    """Checks whether an address is suppressed globally or for the user."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        cursor = conn.execute(
            """SELECT id FROM suppression 
               WHERE LOWER(email) = ? AND (user_id IS NULL OR user_id = ?)""",
            (email.strip().lower(), user_id)
        )
        return cursor.fetchone() is not None
    finally:
        if close_conn:
            conn.close()

def export_student_data(user_id: str, conn=None) -> dict:
    """Generates complete GDPR Data Subject Access Request export in JSON format."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        user_row = conn.execute("SELECT id, email, created_at, role FROM users WHERE id = ?", (user_id,)).fetchone()
        student_row = conn.execute("SELECT * FROM students WHERE user_id = ?", (user_id,)).fetchone()
        shortlists = [dict(r) for r in conn.execute("SELECT * FROM shortlists WHERE user_id = ?", (user_id,)).fetchall()]
        drafts = [dict(r) for r in conn.execute("SELECT * FROM drafts WHERE user_id = ?", (user_id,)).fetchall()]
        sent_logs = [dict(r) for r in conn.execute("SELECT * FROM sent_log WHERE user_id = ?", (user_id,)).fetchall()]
        documents = [dict(r) for r in conn.execute("SELECT id, doc_type, filename, file_size, mime_type, uploaded_at FROM documents WHERE user_id = ?", (user_id,)).fetchall()]

        return {
            "account": dict(user_row) if user_row else {},
            "student_profile": dict(student_row) if student_row else {},
            "shortlists": shortlists,
            "drafts": drafts,
            "sent_logs": sent_logs,
            "documents_metadata": documents
        }
    finally:
        if close_conn:
            conn.close()

def delete_student_account_data(user_id: str, conn=None) -> bool:
    """Implements GDPR Article 17 Right to Erasure ('Right to be Forgotten')."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        # Cascade delete removes all associated sessions, students, documents, shortlists, drafts, outbox, sent_log
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return True
    finally:
        if close_conn:
            conn.close()
