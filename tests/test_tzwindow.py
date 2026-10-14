"""Unit tests for Recipient Local Timezone Windows."""
import unittest
import datetime
from core.tzwindow import is_within_timezone_window, get_country_tz_offset, get_next_valid_send_time

class TestTzWindow(unittest.TestCase):
    def test_country_offsets(self):
        self.assertEqual(get_country_tz_offset("United Kingdom"), 0)
        self.assertEqual(get_country_tz_offset("Germany"), 1)
        self.assertEqual(get_country_tz_offset("Australia"), 10)
        self.assertEqual(get_country_tz_offset("USA"), -5)

    def test_within_business_hours(self):
        # 14:00 UTC on a Wednesday
        wednesday_utc = datetime.datetime(2026, 10, 14, 14, 0, 0)
        
        # In UK (UTC+0), 14:00 is within 08:00 - 17:00
        allowed, hour, _ = is_within_timezone_window("United Kingdom", wednesday_utc)
        self.assertTrue(allowed)
        self.assertEqual(hour, 14)

        # In Australia (UTC+10), 14:00 UTC is 00:00 (Midnight), so disallowed
        allowed_aus, hour_aus, reason = is_within_timezone_window("Australia", wednesday_utc)
        self.assertFalse(allowed_aus)
        self.assertEqual(hour_aus, 0)
        self.assertIn("Outside allowable", reason)

    def test_weekend_rejection(self):
        # Sunday 12:00 UTC
        sunday_utc = datetime.datetime(2026, 10, 18, 12, 0, 0)
        allowed, _, reason = is_within_timezone_window("Germany", sunday_utc)
        self.assertFalse(allowed)
        self.assertIn("Weekend", reason)

if __name__ == "__main__":
    unittest.main()
