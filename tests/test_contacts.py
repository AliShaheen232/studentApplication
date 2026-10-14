"""Unit tests for Public Admissions Contact Extractor."""
import unittest
from scrapers.contacts import extract_contacts_from_html

class TestContacts(unittest.TestCase):
    def test_extract_public_contacts(self):
        sample_html = """
        <html>
            <body>
                <h1>Department of Computer Science - Contact Us</h1>
                <p>For admissions questions, contact the office: 
                   <a href="mailto:admissions@cs.univ.edu">admissions@cs.univ.edu</a>
                </p>
                <p>Graduate coordinator: Dr. Jane Doe (<a href="mailto:jane.doe@univ.edu">jane.doe@univ.edu</a>)</p>
                <p>Admissions Helpline: (617) 253-4605</p>
                <p>Ignore static icon: <img src="icon.png" alt="logo@banner.png"></p>
            </body>
        </html>
        """
        contacts = extract_contacts_from_html(sample_html, "https://cs.univ.edu/contact", "univ_cs")
        self.assertEqual(len(contacts), 2)

        emails = {c["email"]: c for c in contacts}
        self.assertIn("admissions@cs.univ.edu", emails)
        self.assertIn("jane.doe@univ.edu", emails)

        # Check role vs personal
        self.assertEqual(emails["admissions@cs.univ.edu"]["email_type"], "role")
        self.assertEqual(emails["jane.doe@univ.edu"]["email_type"], "personal")

        # Check phone and source_url
        self.assertIsNotNone(contacts[0]["phone"])
        self.assertEqual(contacts[0]["source_url"], "https://cs.univ.edu/contact")

if __name__ == "__main__":
    unittest.main()
