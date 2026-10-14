"""AdmitPath Outbox Mailer & Deliverability Governor.
Enforces:
- Daily sending cap & warm-up ramp schedule (20 -> 30 -> 40)
- Random interval delays (60-240s)
- Recipient timezone business hours check (tzwindow)
- Max 1 email per recipient per university with 7+ days follow-up delay
- Automatic queue pause if bounce rate > 5%
"""
import random
import datetime
from .db import get_connection
from .tzwindow import is_within_timezone_window, get_next_valid_send_time

class MailerGovernor:
    def __init__(self, conn=None):
        self.conn = conn

    def get_effective_daily_cap(self, user_id: str) -> int:
        """Determines the current daily sending cap based on warm-up ramp stage."""
        cursor = self.conn.execute(
            "SELECT daily_cap, ramp_stage FROM settings WHERE user_id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return 20
        ramp_schedule = [20, 30, 40]
        stage = min(row["ramp_stage"], len(ramp_schedule) - 1)
        configured_cap = row["daily_cap"] or 40
        return min(ramp_schedule[stage], configured_cap)

    def get_emails_sent_today(self, user_id: str) -> int:
        """Counts emails sent by this user within the current UTC day."""
        today_start = datetime.datetime.utcnow().strftime("%Y-%m-%d 00:00:00")
        cursor = self.conn.execute(
            """SELECT COUNT(*) as cnt FROM sent_log 
               WHERE user_id = ? AND sent_at >= ?""",
            (user_id, today_start)
        )
        row = cursor.fetchone()
        return row["cnt"] if row else 0

    def check_bounce_rate_circuit_breaker(self, user_id: str, threshold: float = 5.0) -> tuple[bool, float]:
        """
        Calculates bounce rate for the user. If > threshold (5%), pauses the queue.
        Returns:
            (is_tripped, current_rate)
        """
        cursor = self.conn.execute(
            """SELECT COUNT(*) as total_sent FROM sent_log WHERE user_id = ?""",
            (user_id,)
        )
        total_sent = cursor.fetchone()["total_sent"]
        if total_sent < 5:
            # Need at least 5 messages for statistical significance
            return False, 0.0

        cursor_bounces = self.conn.execute(
            """SELECT COUNT(*) as bounces FROM replies WHERE user_id = ? AND is_bounce = 1""",
            (user_id,)
        )
        bounces = cursor_bounces.fetchone()["bounces"]
        rate = (bounces / total_sent) * 100.0
        return (rate >= threshold), rate

    def can_email_recipient(self, user_id: str, recipient_email: str, university_id: str = None) -> tuple[bool, str]:
        """
        Enforces:
        - Global & user suppression check
        - Max 1 email per recipient per university
        - Follow-up allowed only after 7+ days
        """
        clean_email = recipient_email.strip().lower()

        # 1. Suppression check
        supp_cursor = self.conn.execute(
            "SELECT id FROM suppression WHERE LOWER(email) = ? AND (user_id IS NULL OR user_id = ?)",
            (clean_email, user_id)
        )
        if supp_cursor.fetchone():
            return False, f"Address {recipient_email} is on the suppression/opt-out list."

        # 2. Prior contact & 7-day rule check
        query = """
            SELECT sent_at FROM sent_log 
            WHERE user_id = ? AND LOWER(recipient_email) = ?
        """
        params = [user_id, clean_email]
        if university_id:
            query += " AND university_id = ?"
            params.append(university_id)

        query += " ORDER BY sent_at DESC LIMIT 1"
        cursor = self.conn.execute(query, tuple(params))
        last_sent = cursor.fetchone()

        if last_sent:
            last_date = datetime.datetime.strptime(last_sent["sent_at"][:19], "%Y-%m-%d %H:%M:%S")
            days_elapsed = (datetime.datetime.utcnow() - last_date).total_seconds() / 86400.0
            if days_elapsed < 7.0:
                remaining_days = 7.0 - days_elapsed
                return False, f"Recipient recently contacted. Follow-up permitted only after 7 days ({remaining_days:.1f} days remaining)."

        return True, "Recipient is eligible for contact."

    def get_random_send_interval(self, min_gap: int = 60, max_gap: int = 240) -> int:
        """Returns random jitter in seconds between consecutive emails."""
        return random.randint(min_gap, max_gap)
