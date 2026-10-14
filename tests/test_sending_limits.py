"""Unit tests for Daily Sending Caps, Ramp-Up Schedule, and Circuit Breaker."""
import unittest
import sqlite3
import datetime
from core.db import SCHEMA_SQL
from core.mailer import MailerGovernor

class TestSendingLimits(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA_SQL)
        self.conn.commit()
        self.governor = MailerGovernor(self.conn)

        # Create test user and settings
        self.conn.execute("INSERT INTO users (id, email, password_hash, salt) VALUES ('u1', 'test@test.com', 'h', 's')")
        self.conn.execute("INSERT INTO settings (user_id, daily_cap, ramp_stage) VALUES ('u1', 40, 0)")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_warmup_ramp_schedule(self):
        # Stage 0: 20 emails
        self.assertEqual(self.governor.get_effective_daily_cap("u1"), 20)

        # Stage 1: 30 emails
        self.conn.execute("UPDATE settings SET ramp_stage = 1 WHERE user_id = 'u1'")
        self.conn.commit()
        self.assertEqual(self.governor.get_effective_daily_cap("u1"), 30)

        # Stage 2: 40 emails
        self.conn.execute("UPDATE settings SET ramp_stage = 2 WHERE user_id = 'u1'")
        self.conn.commit()
        self.assertEqual(self.governor.get_effective_daily_cap("u1"), 40)

    def test_single_recipient_and_7_day_rule(self):
        recip = "admissions@harvard.edu"
        allowed, _ = self.governor.can_email_recipient("u1", recip, "univ_harvard")
        self.assertTrue(allowed)

        # Log a sent email right now
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        self.conn.execute(
            """INSERT INTO sent_log (id, user_id, recipient_email, university_id, subject, sent_at)
               VALUES ('s1', 'u1', ?, 'univ_harvard', 'Inquiry', ?)""",
            (recip, now_str)
        )
        self.conn.commit()

        # Immediate follow-up must be blocked by 7-day rule
        allowed_again, reason = self.governor.can_email_recipient("u1", recip, "univ_harvard")
        self.assertFalse(allowed_again)
        self.assertIn("Follow-up permitted only after 7 days", reason)

    def test_bounce_rate_circuit_breaker(self):
        # Insert 10 sent emails
        for i in range(10):
            self.conn.execute(
                """INSERT INTO sent_log (id, user_id, recipient_email, subject)
                   VALUES (?, 'u1', ?, 'Test')""",
                (f"s_{i}", f"recip_{i}@univ.edu")
            )
        self.conn.commit()

        # No bounces yet
        tripped, rate = self.governor.check_bounce_rate_circuit_breaker("u1")
        self.assertFalse(tripped)
        self.assertEqual(rate, 0.0)

        # Insert 1 bounce (1 / 10 = 10% bounce rate > 5.0% threshold)
        self.conn.execute(
            """INSERT INTO replies (id, user_id, from_email, is_bounce)
               VALUES ('rep_1', 'u1', 'mailer-daemon@univ.edu', 1)"""
        )
        self.conn.commit()

        tripped, rate = self.governor.check_bounce_rate_circuit_breaker("u1", threshold=5.0)
        self.assertTrue(tripped)
        self.assertEqual(rate, 10.0)

if __name__ == "__main__":
    unittest.main()
