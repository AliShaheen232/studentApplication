"""Automated SaaS Acceptance Test Suite for AdminPath.
Tests:
- RBAC (Admin vs Student)
- Student Profile Read-Only backend enforcement
- Admin student account provisioning & profile updates
- Public subscription plans & simulated payment webhook (idempotency, awaiting provisioning)
- Daily application sending quota & Start Sending batch validation
- Gmail account connection lifecycle
- Polite crawler SSRF defenses
"""
import unittest
import sqlite3
import json
import urllib.request
import urllib.error
import time
BASE_URL = "http://127.0.0.1:3000"

class TestAdminPathSaaS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Give server a moment if needed
        time.sleep(1)

    def make_request(self, path, method="GET", data=None, headers=None):
        url = f"{BASE_URL}{path}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        
        body = json.dumps(data).encode("utf-8") if data else None
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

    def test_01_health_and_ssrf_status(self):
        status, data = self.make_request("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("ssrf_protection"), "active")
        self.assertTrue(data.get("rbac_active"))

    def test_02_public_subscription_plans(self):
        status, plans = self.make_request("/api/public/plans")
        self.assertEqual(status, 200)
        self.assertGreaterEqual(len(plans), 3)
        plan_names = [p["name"] for p in plans]
        self.assertIn("Starter Scholar", plan_names)
        self.assertIn("Scholar Pro", plan_names)
        self.assertIn("Global Fellow", plan_names)

    def test_03_student_profile_is_strictly_read_only(self):
        # Attempting to POST /api/profile as a student must fail with HTTP 403 Forbidden
        status, res = self.make_request(
            "/api/profile",
            method="POST",
            data={"full_name": "Hacked Student Name", "gpa": 4.0},
            headers={"x-impersonate-role": "student"}
        )
        self.assertEqual(status, 403)
        self.assertEqual(res.get("code"), "STUDENT_PROFILE_READ_ONLY")
        self.assertIn("Profile modification is restricted", res.get("error", ""))

    def test_04_payment_webhook_idempotency_and_provisioning(self):
        event_id = f"evt_test_{int(time.time())}"
        webhook_payload = {
            "event_id": event_id,
            "event_type": "checkout.session.completed",
            "data": {
                "customer_email": "sophia.chen@example.edu",
                "customer_name": "Sophia Chen",
                "plan_id": "plan_fellow",
                "amount_cents": 14900
            }
        }
        # First delivery: creates awaiting_provisioning subscription
        status, res = self.make_request("/api/webhooks/payment", method="POST", data=webhook_payload)
        self.assertEqual(status, 200)
        self.assertEqual(res.get("status"), "awaiting_provisioning")

        # Second delivery with exact same event_id: must be ignored idempotently
        status2, res2 = self.make_request("/api/webhooks/payment", method="POST", data=webhook_payload)
        self.assertEqual(status2, 200)
        self.assertEqual(res2.get("status"), "ignored")

    def test_05_admin_student_provisioning_workflow(self):
        # Admin can provision new student account
        new_student_data = {
            "email": f"marcus.aurelius_{int(time.time())}@admitpath.app",
            "full_name": "Marcus Aurelius",
            "nationality": "Italy",
            "country_of_residence": "Italy",
            "gpa": 3.92,
            "max_gpa": 4.0,
            "qualification": "B.S. in Philosophy and Computing",
            "target_level": "Master",
            "intake_term": "Fall 2026",
            "subjects": "Artificial Intelligence, Ethics, Computer Science",
            "countries": "United Kingdom, USA, Germany",
            "preferred_universities": "Oxford, Cambridge, Edinburgh",
            "budget_max": 40000,
            "ielts_score": 8.0,
            "toefl_score": 115,
            "experience": "Research fellow in AI alignment and ancient logic",
            "plan_id": "plan_pro"
        }
        status, res = self.make_request(
            "/api/admin/students",
            method="POST",
            data=new_student_data,
            headers={"x-impersonate-role": "admin"}
        )
        self.assertEqual(status, 200)
        self.assertTrue(res.get("success"))
        self.assertIn("usr_", res.get("user_id", ""))
        self.assertTrue(res.get("activation_link"))

    def test_06_ssrf_crawler_defense(self):
        # Attempt SSRF attack to internal metadata or localhost
        malicious_urls = [
            "http://169.254.169.254/latest/meta-data/",
            "http://localhost:8080/internal-secrets",
            "http://127.0.0.1:22",
            "http://192.168.1.1/admin",
            "http://10.0.0.1/private"
        ]
        for bad_url in malicious_urls:
            status, res = self.make_request(
                "/api/crawler/run",
                method="POST",
                data={"custom_url": bad_url},
                headers={"x-impersonate-role": "student"}
            )
            self.assertEqual(status, 400)
            self.assertIn("SSRF policy", res.get("error", ""))

    def test_07_gmail_account_status_and_lifecycle(self):
        status, data = self.make_request("/api/gmail/status", headers={"x-impersonate-role": "student"})
        self.assertEqual(status, 200)
        self.assertIn("connected", data)
        self.assertIn("scopes", data)

    def test_08_queue_quota_and_start_sending(self):
        status, queue_data = self.make_request("/api/queue", headers={"x-impersonate-role": "student"})
        self.assertEqual(status, 200)
        self.assertIn("daily_cap", queue_data)
        self.assertIn("remaining_daily_quota", queue_data)

        # Trigger Start Sending
        status_send, send_res = self.make_request(
            "/api/queue/start-sending",
            method="POST",
            data={},
            headers={"x-impersonate-role": "student"}
        )
        self.assertEqual(status_send, 200)
        self.assertTrue(send_res.get("success"))

if __name__ == "__main__":
    unittest.main()
