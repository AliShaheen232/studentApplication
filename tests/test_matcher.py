"""Unit tests for Student Profile and Program Matcher."""
import unittest
from core.matcher import calculate_match_score

class TestMatcher(unittest.TestCase):
    def setUp(self):
        self.student = {
            "full_name": "Sarah Connor",
            "nationality": "Canadian",
            "gpa": 3.85,
            "max_gpa": 4.0,
            "target_level": "Master",
            "subjects": "Computer Science, Data Science & AI",
            "countries": "USA, Germany, United Kingdom",
            "budget_max": 45000,
            "ielts_score": 7.5,
            "toefl_score": 105,
            "experience": "Machine learning research assistant, published 1 workshop paper"
        }

        self.target_program = {
            "name": "Master of Science in Computer Science",
            "level": "Master",
            "subject_category": "Computer Science",
            "tuition": 40000
        }

        self.target_univ = {
            "name": "Top Tech Institute",
            "country": "USA"
        }

    def test_high_fit_match(self):
        score, reasons, breakdown = calculate_match_score(self.student, self.target_program, self.target_univ)
        self.assertGreaterEqual(score, 80)
        self.assertIn("subject_fit", breakdown)
        self.assertEqual(breakdown["degree_level"], 20)
        self.assertTrue(any("curriculum alignment" in r.lower() for r in reasons))

    def test_low_budget_match_penalty(self):
        low_budget_student = dict(self.student)
        low_budget_student["budget_max"] = 10000
        score, reasons, breakdown = calculate_match_score(low_budget_student, self.target_program, self.target_univ)
        self.assertLess(breakdown["budget_fit"], 10)
        self.assertTrue(any("exceeds your current budget" in r.lower() for r in reasons))

    def test_mismatched_degree_level(self):
        phd_program = dict(self.target_program)
        phd_program["level"] = "PhD"
        score, _, breakdown = calculate_match_score(self.student, phd_program, self.target_univ)
        self.assertEqual(breakdown["degree_level"], 5)

if __name__ == "__main__":
    unittest.main()
