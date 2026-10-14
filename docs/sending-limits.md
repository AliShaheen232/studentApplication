# Sending Limits & Deliverability Protection (`docs/sending-limits.md`)

## Overview
To protect student mailbox reputation and university spam filters, AdmitPath enforces strict rate limits, warming ramp-ups, randomized intervals, and recipient local timezone windows.

## Deliverability Controls
1. **Daily Cap & Warm-up Ramp Schedule**:
   - New accounts start on a ramp schedule: Day 1 = 20 emails max, Day 2 = 30 emails max, Day 3+ = 40 emails max (configurable up to custom ceiling).
   - Once the daily cap is met, subsequent emails are deferred to the next sending window.
2. **Random Jitter & Intervals**:
   - Consecutive emails are spaced with a random gap between 60 seconds and 240 seconds.
   - Prevents burst patterns that trigger automated SMTP heuristic flags.
3. **Recipient Local Timezone Windows**:
   - Emails are only dispatched between 08:00 AM and 05:00 PM in the recipient university's local timezone.
   - For example, emails to UK universities are sent between 08:00 and 17:00 GMT/BST, while Australian universities are sent during AEST business hours.
4. **Follow-Up Interval Rule**:
   - Only 1 email per recipient per university is allowed at a time.
   - Follow-up emails are blocked until at least 7 days have elapsed since the prior message.
5. **Bounce Rate Circuit Breaker**:
   - If the delivery failure/bounce rate exceeds 5.0% within a rolling 24-hour window, the entire outbox queue is automatically paused with an alert.

## Verification & Testing
- Unit tests in `tests/test_sending_limits.py` and `tests/test_tzwindow.py` test ramp schedules, daily caps, timezone window calculations, follow-up intervals, and circuit breaker activation.
