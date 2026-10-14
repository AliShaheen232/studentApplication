"""Unit tests for Gmail RFC 2822 MIME Building."""
import unittest
import base64
from core.gmail import build_gmail_mime_message

class TestGmailMime(unittest.TestCase):
    def test_mime_multipart_structure(self):
        sender = "student@gmail.com"
        recip = "admissions@ox.ac.uk"
        subject = "MSc Inquiry"
        body_plain = "Hello Admissions,\n\nI am applying to the MSc program."
        body_html = "<p>Hello Admissions,<br>I am applying to the MSc program.</p>"

        attachments = [
            {
                "filename": "CV_Student.pdf",
                "content_bytes": b"%PDF-1.4 mock pdf data",
                "mime_type": "application/pdf"
            }
        ]

        msg, b64_str = build_gmail_mime_message(
            sender_email=sender,
            recipient_email=recip,
            subject=subject,
            body_text=body_plain,
            body_html=body_html,
            attachments=attachments
        )

        self.assertEqual(msg["To"], recip)
        self.assertEqual(msg["From"], sender)
        self.assertEqual(msg["Subject"], subject)
        self.assertTrue(msg.is_multipart())

        # Test base64 decoding back to valid email payload
        decoded_bytes = base64.urlsafe_b64decode(b64_str)
        self.assertIn(b"MSc Inquiry", decoded_bytes)
        self.assertIn(b"CV_Student.pdf", decoded_bytes)

if __name__ == "__main__":
    unittest.main()
