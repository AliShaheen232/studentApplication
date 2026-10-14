"""Unit tests for AdmitPath Authentication & User Isolation."""
import unittest
import sqlite3
import datetime
from core.db import SCHEMA_SQL
from core.auth import (
    signup_user,
    login_user,
    validate_session,
    logout_user,
    validate_password_strength,
    hash_password,
    verify_password
)

class TestAuth(unittest.TestCase):
    def setUp(self):
        """Set up an in-memory SQLite database for test isolation."""
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA_SQL)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_password_strength_validation(self):
        # Too short
        ok, msg = validate_password_strength("Short1")
        self.assertFalse(ok)
        self.assertIn("at least 8 characters", msg)

        # No digits
        ok, msg = validate_password_strength("AllLettersOnly")
        self.assertFalse(ok)
        self.assertIn("at least one digit", msg)

        # No letters
        ok, msg = validate_password_strength("1234567890")
        self.assertFalse(ok)
        self.assertIn("at least one letter", msg)

        # Valid password
        ok, msg = validate_password_strength("SecurePass123")
        self.assertTrue(ok)
        self.assertEqual(msg, "")

    def test_signup_and_duplicate_email(self):
        ok, msg, user = signup_user("alice@example.com", "Password123", "Alice Smith", self.conn)
        self.assertTrue(ok)
        self.assertEqual(user["email"], "alice@example.com")

        # Duplicate signup must fail
        ok2, msg2, _ = signup_user("alice@example.com", "AnotherPass456", "Alice 2", self.conn)
        self.assertFalse(ok2)
        self.assertIn("already exists", msg2)

    def test_login_flow_and_sessions(self):
        signup_user("bob@example.com", "BobSecret999", "Bob Jones", self.conn)

        # Wrong password
        ok, msg, _ = login_user("bob@example.com", "WrongPassword1", self.conn)
        self.assertFalse(ok)
        self.assertIn("Invalid email or password", msg)

        # Correct password
        ok, msg, session = login_user("bob@example.com", "BobSecret999", self.conn)
        self.assertTrue(ok)
        self.assertIn("token", session)
        token = session["token"]

        # Validate valid session
        user_info = validate_session(token, self.conn)
        self.assertIsNotNone(user_info)
        self.assertEqual(user_info["email"], "bob@example.com")

        # Logout session
        logout_ok = logout_user(token, self.conn)
        self.assertTrue(logout_ok)

        # Post-logout session is invalid
        user_info_after = validate_session(token, self.conn)
        self.assertIsNone(user_info_after)

    def test_session_expiry(self):
        signup_user("carol@example.com", "CarolPass123", "Carol White", self.conn)
        ok, _, session = login_user("carol@example.com", "CarolPass123", self.conn)
        self.assertTrue(ok)
        token = session["token"]

        # Manually expire the session in DB
        past_time = (datetime.datetime.utcnow() - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        self.conn.execute("UPDATE sessions SET expires_at = ? WHERE token = ?", (past_time, token))
        self.conn.commit()

        user_info = validate_session(token, self.conn)
        self.assertIsNone(user_info)

    def test_multi_user_data_isolation(self):
        # Create User A and User B
        _, _, user_a = signup_user("student_a@example.com", "PasswordA1", "Student A", self.conn)
        _, _, user_b = signup_user("student_b@example.com", "PasswordB1", "Student B", self.conn)

        # Insert private drafts for User A
        self.conn.execute(
            """INSERT INTO drafts (id, user_id, subject, body_text, body_html) 
               VALUES (?, ?, ?, ?, ?)""",
            ("draft_a1", user_a["id"], "Inquiry for MIT", "Hello Admissions", "<p>Hello Admissions</p>")
        )
        self.conn.commit()

        # Query drafts for User B
        cursor = self.conn.execute("SELECT * FROM drafts WHERE user_id = ?", (user_b["id"],))
        b_drafts = cursor.fetchall()
        self.assertEqual(len(b_drafts), 0)

        # Query drafts for User A
        cursor = self.conn.execute("SELECT * FROM drafts WHERE user_id = ?", (user_a["id"],))
        a_drafts = cursor.fetchall()
        self.assertEqual(len(a_drafts), 1)
        self.assertEqual(a_drafts[0]["subject"], "Inquiry for MIT")

if __name__ == "__main__":
    unittest.main()
