"""Unit tests for Suppression and Opt-Out Logic."""
import unittest
import sqlite3
from core.db import SCHEMA_SQL
from core.compliance import (
    is_optout_message,
    add_to_suppression_list,
    is_email_suppressed,
    export_student_data,
    delete_student_account_data
)

class TestSuppression(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA_SQL)
        self.conn.commit()

        # Seed student
        self.conn.execute("INSERT INTO users (id, email, password_hash, salt) VALUES ('u_alice', 'alice@test.com', 'h', 's')")
        self.conn.execute("INSERT INTO students (user_id, full_name) VALUES ('u_alice', 'Alice Tester')")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_optout_keyword_detection(self):
        self.assertTrue(is_optout_message("Please stop emailing me"))
        self.assertTrue(is_optout_message("Unsubscribe"))
        self.assertTrue(is_optout_message("Remove me from your list"))
        self.assertFalse(is_optout_message("Thank you, please send me your transcript"))

    def test_suppression_list_isolation(self):
        # Global suppression (user_id is None)
        add_to_suppression_list("global_optout@univ.edu", user_id=None, conn=self.conn)
        self.assertTrue(is_email_suppressed("global_optout@univ.edu", user_id="u_alice", conn=self.conn))
        self.assertTrue(is_email_suppressed("global_optout@univ.edu", user_id="u_bob", conn=self.conn))

        # Alice-specific suppression
        add_to_suppression_list("alice_blocked@univ.edu", user_id="u_alice", conn=self.conn)
        self.assertTrue(is_email_suppressed("alice_blocked@univ.edu", user_id="u_alice", conn=self.conn))
        self.assertFalse(is_email_suppressed("alice_blocked@univ.edu", user_id="u_bob", conn=self.conn))

    def test_gdpr_export_and_deletion(self):
        # Insert a draft for Alice
        self.conn.execute(
            "INSERT INTO drafts (id, user_id, subject, body_text, body_html) VALUES ('d1', 'u_alice', 'Sub', 'Body', '<p>Body</p>')"
        )
        self.conn.commit()

        # Export Alice's data
        exported = export_student_data("u_alice", conn=self.conn)
        self.assertEqual(exported["account"]["email"], "alice@test.com")
        self.assertEqual(len(exported["drafts"]), 1)

        # Right-to-be-forgotten deletion
        deleted = delete_student_account_data("u_alice", conn=self.conn)
        self.assertTrue(deleted)

        # Check cascading deletion
        user_check = self.conn.execute("SELECT id FROM users WHERE id = 'u_alice'").fetchone()
        self.assertIsNone(user_check)
        draft_check = self.conn.execute("SELECT id FROM drafts WHERE user_id = 'u_alice'").fetchone()
        self.assertIsNone(draft_check)

if __name__ == "__main__":
    unittest.main()
