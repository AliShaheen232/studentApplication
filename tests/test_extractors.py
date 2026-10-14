"""Unit tests for Generic and Country-Specific Program Extractors."""
import unittest
from scrapers.generic import extract_programs_generic, detect_degree_level, normalize_subject_category
from scrapers.usa import parse_usa_program_snippet
from scrapers.uk import parse_uk_program_snippet
from scrapers.canada import parse_canada_program_snippet
from scrapers.germany import parse_germany_program_snippet

class TestExtractors(unittest.TestCase):
    def test_detect_degree_level(self):
        self.assertEqual(detect_degree_level("Master of Science in Artificial Intelligence"), "Master")
        self.assertEqual(detect_degree_level("PhD in Robotics and Autonomous Systems"), "PhD")
        self.assertEqual(detect_degree_level("Bachelor of Science in Computer Science"), "Bachelor")
        self.assertEqual(detect_degree_level("Doctorate of Philosophy in Bioengineering"), "PhD")
        self.assertEqual(detect_degree_level("MBA in Technology Management"), "Master")

    def test_normalize_subject_category(self):
        self.assertEqual(normalize_subject_category("MSc in Software Engineering"), "Computer Science")
        self.assertEqual(normalize_subject_category("MSc in Machine Learning and Data Science"), "Data Science & AI")
        self.assertEqual(normalize_subject_category("Master of Business Administration"), "Business & Management")
        self.assertEqual(normalize_subject_category("Master of Biomedical Sciences"), "Medicine & Health")

    def test_generic_html_extractor(self):
        sample_html = """
        <div class="course-list">
            <div class="program-card">
                <h3>Master of Science in Computer Science</h3>
                <p>Advanced study in software engineering and algorithms.</p>
            </div>
            <div class="program-card">
                <h3>PhD in Artificial Intelligence</h3>
                <p>Conduct doctoral research in deep learning.</p>
            </div>
        </div>
        """
        programs = extract_programs_generic(sample_html, "https://example.edu/programs", "univ_test")
        self.assertGreaterEqual(len(programs), 2)
        names = [p["name"] for p in programs]
        self.assertTrue(any("Computer Science" in n for n in names))
        self.assertTrue(any("Artificial Intelligence" in n for n in names))

    def test_country_adapters(self):
        # USA adapter
        us_text = "Master of Science in Electrical Engineering\nRequires GPA 3.5, 30 credits."
        us_prog = parse_usa_program_snippet(us_text, "univ_us", "https://us.edu/eecs")
        self.assertEqual(us_prog["level"], "Master")
        self.assertIn("3.5", us_prog["requirements"])

        # UK adapter (12 months)
        uk_text = "MSc in Advanced Computing"
        uk_prog = parse_uk_program_snippet(uk_text, "univ_uk", "https://uk.ac.uk/pg")
        self.assertEqual(uk_prog["duration_months"], 12)
        self.assertIn("2:1", uk_prog["requirements"])

        # Germany adapter (ECTS)
        ger_text = "Master in Informatics\nWinter semester intake."
        ger_prog = parse_germany_program_snippet(ger_text, "univ_de", "https://tum.de")
        self.assertIn("ECTS", ger_prog["requirements"])
        self.assertIn("May 31", ger_prog["deadline"])

if __name__ == "__main__":
    unittest.main()
