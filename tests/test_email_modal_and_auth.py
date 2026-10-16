"""Automated tests for Feature 1 (Email Modal & Sending Pipeline) and Feature 2 (Individual Student Accounts, Login, Logout, and Session Security)."""
import unittest
import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://127.0.0.1:3000"

class TestEmailModalAndStudentAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        time.sleep(0.5)

    def make_request(self, path, method="GET", data=None, headers=None):
        url = f"{BASE_URL}{path}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                res_body = resp.read().decode("utf-8")
                return resp.status, json.loads(res_body) if res_body else {}
        except urllib.error.HTTPError as e:
            res_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(res_body)
            except Exception:
                parsed = {"error": res_body}
            return e.code, parsed

    # ==========================================
    # FEATURE 2: AUTHENTICATION, LOGIN, LOGOUT
    # ==========================================

    def test_auth_01_student_login_with_valid_credentials(self):
        """Student signs in with valid credentials and receives server-side session token."""
        status, data = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        self.assertEqual(status, 200)
        self.assertTrue(data.get("success"))
        self.assertIn("token", data)
        self.assertEqual(len(data["token"]), 64)
        self.assertEqual(data["user"]["email"], "scholar@admitpath.app")
        self.assertEqual(data["user"]["full_name"], "Alex Vance")
        self.assertEqual(data["user"]["role"], "student")
        self.assertIsNotNone(data["user"]["subscription"])
        self.assertEqual(data["user"]["subscription"]["plan_name"], "Scholar Pro")

    def test_auth_02_student_login_with_invalid_credentials(self):
        """Login with wrong password must be rejected with 401."""
        status, data = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "WrongPassword999"}
        )
        self.assertEqual(status, 401)
        self.assertIn("Invalid email or password", data.get("error", ""))

    def test_auth_03_me_endpoint_returns_authenticated_identity(self):
        """GET /api/auth/me returns the authenticated student's session details."""
        # 1. Login
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        # 2. Query /api/auth/me
        status, me = self.make_request("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status, 200)
        self.assertEqual(me["id"], "usr_scholar_demo")
        self.assertEqual(me["full_name"], "Alex Vance")
        self.assertEqual(me["role"], "student")
        self.assertEqual(me["subscription"]["plan_name"], "Scholar Pro")
        self.assertTrue(me["gmail"]["connected"])

    def test_auth_04_second_student_account_has_distinct_identity(self):
        """Distinct student account (Marcus Aurelius) logs in and sees their own identity and plan."""
        status, data = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "marcus.student@admitpath.app", "password": "ScholarPass2026"}
        )
        self.assertEqual(status, 200)
        token = data["token"]

        status_me, me = self.make_request("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_me, 200)
        self.assertEqual(me["id"], "usr_student_marcus")
        self.assertEqual(me["full_name"], "Marcus Aurelius")
        self.assertEqual(me["subscription"]["plan_name"], "Starter Scholar")

    def test_auth_05_unauthenticated_request_rejected(self):
        """Protected API endpoints must reject unauthenticated requests without session token."""
        # /api/profile
        status, res = self.make_request("/api/profile")
        self.assertEqual(status, 401)
        self.assertIn("Authentication required", res.get("error", ""))

        # /api/drafts
        status_dr, _ = self.make_request("/api/drafts")
        self.assertEqual(status_dr, 401)

        # /api/queue
        status_q, _ = self.make_request("/api/queue")
        self.assertEqual(status_q, 401)

    def test_auth_06_logout_invalidates_session_and_rejects_subsequent_access(self):
        """Calling logout invalidates session on backend; subsequent requests return 401."""
        # 1. Login
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        # 2. Verify token is active
        status_before, _ = self.make_request("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_before, 200)

        # 3. Logout
        status_out, out_res = self.make_request(
            "/api/auth/logout",
            method="POST",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status_out, 200)
        self.assertTrue(out_res.get("success"))

        # 4. Verify token is now invalid (401)
        status_after, after_res = self.make_request("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_after, 401)

        # 5. Accessing protected data with logged out token must fail
        status_prof, _ = self.make_request("/api/profile", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_prof, 401)

    def test_auth_07_student_cannot_access_admin_functions(self):
        """Student session cannot access administrator endpoints (returns 403)."""
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        # /api/admin/metrics
        status_m, _ = self.make_request("/api/admin/metrics", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_m, 403)

        # /api/admin/students
        status_s, _ = self.make_request("/api/admin/students", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_s, 403)

    # ==========================================
    # FEATURE 1: EMAIL MODAL & SENDING PIPELINE
    # ==========================================

    def test_email_01_draft_generation_with_programme_association(self):
        """Draft generation associates exact programme and returns verified contact info."""
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        # Generate draft for MIT EECS
        status, data = self.make_request(
            "/api/compose/generate",
            method="POST",
            data={
                "program_id": "prog_mit_cs_ms",
                "custom_hook": "I have been following your lab publications on compiler optimization."
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status, 200)
        self.assertIn("subject", data)
        self.assertIn("body_text", data)
        self.assertIn("compiler optimization", data["body_text"])
        self.assertTrue(data.get("is_verified_contact"))
        self.assertTrue(data.get("optout_included"))
        self.assertIn("@", data.get("recipient_email", ""))

    def test_email_02_send_validation_rejects_missing_fields(self):
        """POST /api/compose/send rejects invalid recipient, missing subject, or missing body."""
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        # Missing / invalid recipient
        status_rec, res_rec = self.make_request(
            "/api/compose/send",
            method="POST",
            data={"program_id": "prog_mit_cs_ms", "subject": "Hello", "body_text": "Content"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status_rec, 400)
        self.assertEqual(res_rec.get("code"), "INVALID_RECIPIENT")

        # Missing subject
        status_sub, res_sub = self.make_request(
            "/api/compose/send",
            method="POST",
            data={"recipient_email": "admissions@mit.edu", "subject": "", "body_text": "Content"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status_sub, 400)
        self.assertEqual(res_sub.get("code"), "MISSING_SUBJECT")

        # Missing body
        status_bod, res_bod = self.make_request(
            "/api/compose/send",
            method="POST",
            data={"recipient_email": "admissions@mit.edu", "subject": "Hello", "body_text": ""},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status_bod, 400)
        self.assertEqual(res_bod.get("code"), "MISSING_BODY")

    def test_email_03_send_validation_rejects_disconnected_gmail(self):
        """If student's Gmail is disconnected, /api/compose/send rejects with GMAIL_NOT_CONNECTED."""
        # Login as student Marcus
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "marcus.student@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        # Disconnect Gmail for Marcus
        self.make_request("/api/gmail/disconnect", method="POST", headers={"Authorization": f"Bearer {token}"})

        # Attempt to send
        status, res = self.make_request(
            "/api/compose/send",
            method="POST",
            data={
                "program_id": "prog_tum_inf_ms",
                "recipient_email": "admissions@tum.de",
                "recipient_name": "TUM Admissions",
                "subject": "Inquiry regarding MS Informatics",
                "body_text": "Dear Admissions Committee, I am writing to inquire..."
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status, 400)
        self.assertEqual(res.get("code"), "GMAIL_NOT_CONNECTED")

        # Reconnect Gmail for Marcus
        self.make_request(
            "/api/gmail/connect",
            method="POST",
            data={"email": "marcus.aurelius@gmail.com"},
            headers={"Authorization": f"Bearer {token}"}
        )

    def test_email_04_successful_send_updates_draft_outbox_sent_and_quota(self):
        """Successful send records draft, outbox, sent_log, and updates daily quota atomically."""
        _, login_res = self.make_request(
            "/api/auth/login",
            method="POST",
            data={"email": "scholar@admitpath.app", "password": "ScholarPass2026"}
        )
        token = login_res["token"]

        unique_recipient = f"admissions.office.{int(time.time())}@cam.ac.uk"
        send_payload = {
            "program_id": "prog_cam_cs_mphil",
            "recipient_email": unique_recipient,
            "recipient_name": "Cambridge Computer Science Admissions",
            "subject": "Inquiry regarding MPhil in Advanced Computer Science - Alex Vance",
            "body_text": "Dear Admissions Team,\n\nI am writing to inquire regarding departmental funding...",
            "body_html": "<p>Dear Admissions Team,</p><p>I am writing to inquire...</p>",
            "hook": "Inspired by your work on automated theorem proving."
        }

        status, send_res = self.make_request(
            "/api/compose/send",
            method="POST",
            data=send_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status, 200)
        self.assertTrue(send_res.get("success"))
        self.assertIn("sent_id", send_res)
        self.assertIn("draft_id", send_res)
        self.assertIn("outbox_id", send_res)
        self.assertIn("remaining_daily_quota", send_res)
        self.assertIn("dispatched to", send_res.get("message", "").lower())

        # Verify sent record in /api/sent
        status_s, sent_data = self.make_request("/api/sent", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(status_s, 200)
        sent_emails = [item["recipient_email"] for item in sent_data.get("sent", [])]
        self.assertIn(unique_recipient, sent_emails)

        # 7-day follow-up pause check: immediate second send to same recipient must be rejected
        status_repeat, repeat_res = self.make_request(
            "/api/compose/send",
            method="POST",
            data=send_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(status_repeat, 400)
        self.assertEqual(repeat_res.get("code"), "FOLLOW_UP_PAUSE_ACTIVE")

if __name__ == "__main__":
    unittest.main()
