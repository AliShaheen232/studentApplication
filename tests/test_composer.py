"""Unit tests for Personalized Email Composer."""
import unittest
from core.compose import generate_personalized_email, TEMPLATES

class TestComposer(unittest.TestCase):
    def setUp(self):
        self.student = {
            "full_name": "Jordan Lee",
            "email": "jordan.lee@example.com",
            "nationality": "Australia",
            "gpa": 3.9,
            "max_gpa": 4.0,
            "subjects": "Artificial Intelligence",
            "budget_max": 50000,
            "experience": "Autonomous systems research"
        }
        self.program = {
            "name": "MSc in Robotics",
            "subject_category": "Robotics & AI"
        }
        self.contact = {
            "name": "Prof. Alan Smith",
            "email": "a.smith@tech.edu"
        }
        self.university = {
            "name": "Tech University"
        }

    def test_academic_inquiry_personalization(self):
        draft = generate_personalized_email(
            "academic_inquiry",
            self.student,
            self.program,
            self.contact,
            self.university,
            custom_hook="Your lab's work on quadruped locomotion aligns directly with my senior thesis."
        )

        self.assertIn("Jordan Lee", draft["subject"])
        self.assertIn("Prof. Alan Smith", draft["body_text"])
        self.assertIn("quadruped locomotion", draft["body_text"])
        self.assertIn("jordan.lee@example.com", draft["body_text"])
        # Opt-out line is mandatory
        self.assertTrue(draft["optout_included"])
        self.assertIn("reply 'stop'", draft["body_text"].lower())
        self.assertIn("reply 'stop'", draft["body_html"].lower())

    def test_research_lab_template_difference(self):
        draft_inq = generate_personalized_email("academic_inquiry", self.student, self.program, self.contact, self.university)
        draft_lab = generate_personalized_email("research_lab", self.student, self.program, self.contact, self.university)

        self.assertNotEqual(draft_inq["subject"], draft_lab["subject"])
        self.assertNotEqual(draft_inq["body_text"], draft_lab["body_text"])
        self.assertIn("Research Inquiry", draft_lab["subject"])

if __name__ == "__main__":
    unittest.main()
