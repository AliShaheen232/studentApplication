"""AdmitPath Authentication & Session Management Module."""
import hashlib
import hmac
import os
import secrets
import re
import datetime
from .db import get_connection

LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW_MINUTES = 15

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return dk.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies a plain password against the stored hash and salt."""
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return hmac.compare_digest(dk.hex(), password_hash)

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validates password strength: min 8 chars, letter + number."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    return True, ""

def is_rate_limited(conn, identifier: str) -> bool:
    """Checks if an identifier (email or IP) is locked out after repeated failures."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=LOCKOUT_WINDOW_MINUTES)
    cursor = conn.execute(
        """SELECT COUNT(*) as count FROM login_attempts 
           WHERE identifier = ? AND success = 0 AND attempt_time > ?""",
        (identifier, cutoff.strftime("%Y-%m-%d %H:%M:%S"))
    )
    row = cursor.fetchone()
    return (row["count"] if row else 0) >= LOCKOUT_THRESHOLD

def record_login_attempt(conn, identifier: str, success: bool):
    """Records a login attempt."""
    conn.execute(
        "INSERT INTO login_attempts (identifier, success) VALUES (?, ?)",
        (identifier, 1 if success else 0)
    )
    conn.commit()

def signup_user(email: str, password: str, full_name: str = "", conn=None) -> tuple[bool, str, dict]:
    """Registers a new user with unique email and password strength validation."""
    email = email.strip().lower()
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        return False, "Invalid email format.", {}

    is_valid, err_msg = validate_password_strength(password)
    if not is_valid:
        return False, err_msg, {}

    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        user_id = secrets.token_hex(12)
        pwd_hash, salt = hash_password(password)
        conn.execute(
            "INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)",
            (user_id, email, pwd_hash, salt)
        )
        # Create initial student profile
        conn.execute(
            "INSERT INTO students (user_id, full_name) VALUES (?, ?)",
            (user_id, full_name or email.split("@")[0].capitalize())
        )
        # Create default user settings
        conn.execute(
            "INSERT INTO settings (user_id) VALUES (?)",
            (user_id,)
        )
        conn.commit()
        return True, "User registered successfully.", {"id": user_id, "email": email}
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            return False, "An account with this email already exists.", {}
        return False, str(e), {}
    finally:
        if close_conn:
            conn.close()

def login_user(email: str, password: str, conn=None) -> tuple[bool, str, dict]:
    """Authenticates a user and creates a session token."""
    email = email.strip().lower()
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        if is_rate_limited(conn, email):
            return False, f"Account temporarily locked due to repeated failed attempts. Please wait {LOCKOUT_WINDOW_MINUTES} minutes.", {}

        cursor = conn.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        if not user or not verify_password(password, user["password_hash"], user["salt"]):
            record_login_attempt(conn, email, False)
            return False, "Invalid email or password.", {}

        record_login_attempt(conn, email, True)
        
        # Create session
        token = secrets.token_hex(32)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user["id"], expires_at.strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()

        return True, "Login successful.", {
            "token": token,
            "user_id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    finally:
        if close_conn:
            conn.close()

def validate_session(token: str, conn=None) -> dict | None:
    """Validates session token and returns active user if valid."""
    if not token:
        return None
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cursor = conn.execute(
            """SELECT u.id, u.email, u.role, s.expires_at 
               FROM sessions s 
               JOIN users u ON s.user_id = u.id 
               WHERE s.token = ? AND s.expires_at > ?""",
            (token, now_str)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {"id": row["id"], "email": row["email"], "role": row["role"]}
    finally:
        if close_conn:
            conn.close()

def logout_user(token: str, conn=None) -> bool:
    """Invalidates a session token."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True
    try:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        return True
    finally:
        if close_conn:
            conn.close()
