"""Recipient Local Timezone Window Validation (tzwindow).
Ensures emails are delivered strictly during normal business hours in the recipient's timezone
(default 08:00 AM to 05:00 PM local time).
"""
import datetime

# Standard UTC offsets in hours for common university locations
COUNTRY_TZ_OFFSETS = {
    "USA": -5,          # EST baseline (ranging -5 to -8)
    "United States": -5,
    "Canada": -5,       # EST baseline
    "United Kingdom": 0,# GMT/BST
    "UK": 0,
    "Germany": 1,       # CET
    "Netherlands": 1,   # CET
    "France": 1,        # CET
    "Italy": 1,         # CET
    "Spain": 1,         # CET
    "Sweden": 1,        # CET
    "Finland": 2,       # EET
    "Ireland": 0,       # GMT/IST
    "Australia": 10,    # AEST
    "South Korea": 9,   # KST
    "Indonesia": 7,     # WIB (Jakarta/Bandung)
    "Malaysia": 8,      # MYT
    "South Africa": 2   # SAST
}

def get_country_tz_offset(country: str) -> int:
    """Returns approximate UTC hour offset for country."""
    if not country:
        return 0
    return COUNTRY_TZ_OFFSETS.get(country.strip(), 0)

def is_within_timezone_window(country: str, current_utc_time: datetime.datetime = None, start_hour: int = 8, end_hour: int = 17) -> tuple[bool, int, str]:
    """
    Checks if current time in the recipient's country is within business hours (start_hour to end_hour).
    Returns:
        (is_allowed, recipient_local_hour, reason)
    """
    if current_utc_time is None:
        current_utc_time = datetime.datetime.utcnow()

    offset = get_country_tz_offset(country)
    local_time = current_utc_time + datetime.timedelta(hours=offset)
    local_hour = local_time.hour
    weekday = local_time.weekday() # 0 = Monday, 6 = Sunday

    # Disallow weekend sends (Saturday=5, Sunday=6)
    if weekday >= 5:
        return False, local_hour, f"Weekend in {country} ({local_time.strftime('%A')}). Rescheduling to next business day."

    if start_hour <= local_hour < end_hour:
        return True, local_hour, f"Within permissible window ({local_time.strftime('%H:%M')} {country} local time)."
    else:
        return False, local_hour, f"Outside allowable sending window ({local_time.strftime('%H:%M')} {country} local time, allowed {start_hour:02d}:00-{end_hour:02d}:00)."

def get_next_valid_send_time(country: str, from_utc_time: datetime.datetime = None, start_hour: int = 8) -> datetime.datetime:
    """Calculates next UTC datetime when recipient's local time will be start_hour on a business day."""
    if from_utc_time is None:
        from_utc_time = datetime.datetime.utcnow()

    offset = get_country_tz_offset(country)
    local_now = from_utc_time + datetime.timedelta(hours=offset)

    # Next candidate: today at start_hour
    candidate_local = local_now.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    if candidate_local <= local_now:
        candidate_local += datetime.timedelta(days=1)

    # If candidate is weekend, skip to Monday
    while candidate_local.weekday() >= 5:
        candidate_local += datetime.timedelta(days=1)

    # Convert back to UTC
    next_utc = candidate_local - datetime.timedelta(hours=offset)
    return next_utc
