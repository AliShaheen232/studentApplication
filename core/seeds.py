"""AdmitPath University Directory Seed Data.
Seeds representative high-ranking and recognized universities worldwide across 16 countries:
USA, Canada, UK, Germany, Netherlands, France, Italy, Spain, Sweden, Finland, Ireland,
Australia, South Korea, Indonesia, Malaysia, South Africa.
"""
import uuid

UNIVERSITIES_SEED = [
    # USA
    {
        "id": "univ_mit",
        "name": "Massachusetts Institute of Technology (MIT)",
        "country": "USA",
        "city": "Cambridge, MA",
        "website": "https://www.mit.edu",
        "domain": "mit.edu",
        "ranking": 1,
        "languages": "English",
        "tuition_min": 59750,
        "tuition_max": 61500,
        "currency": "USD",
        "intake_months": "September, January",
        "source_url": "https://admissions.mit.edu"
    },
    {
        "id": "univ_stanford",
        "name": "Stanford University",
        "country": "USA",
        "city": "Stanford, CA",
        "website": "https://www.stanford.edu",
        "domain": "stanford.edu",
        "ranking": 2,
        "languages": "English",
        "tuition_min": 62000,
        "tuition_max": 65000,
        "currency": "USD",
        "intake_months": "September",
        "source_url": "https://admission.stanford.edu"
    },
    {
        "id": "univ_berkeley",
        "name": "University of California, Berkeley",
        "country": "USA",
        "city": "Berkeley, CA",
        "website": "https://www.berkeley.edu",
        "domain": "berkeley.edu",
        "ranking": 5,
        "languages": "English",
        "tuition_min": 44000,
        "tuition_max": 49000,
        "currency": "USD",
        "intake_months": "August, January",
        "source_url": "https://admissions.berkeley.edu"
    },
    # UK
    {
        "id": "univ_oxford",
        "name": "University of Oxford",
        "country": "United Kingdom",
        "city": "Oxford",
        "website": "https://www.ox.ac.uk",
        "domain": "ox.ac.uk",
        "ranking": 3,
        "languages": "English",
        "tuition_min": 33000,
        "tuition_max": 48000,
        "currency": "GBP",
        "intake_months": "October",
        "source_url": "https://www.ox.ac.uk/admissions"
    },
    {
        "id": "univ_cambridge",
        "name": "University of Cambridge",
        "country": "United Kingdom",
        "city": "Cambridge",
        "website": "https://www.cam.ac.uk",
        "domain": "cam.ac.uk",
        "ranking": 4,
        "languages": "English",
        "tuition_min": 35000,
        "tuition_max": 50000,
        "currency": "GBP",
        "intake_months": "October",
        "source_url": "https://www.postgraduate.study.cam.ac.uk"
    },
    {
        "id": "univ_imperial",
        "name": "Imperial College London",
        "country": "United Kingdom",
        "city": "London",
        "website": "https://www.imperial.ac.uk",
        "domain": "imperial.ac.uk",
        "ranking": 6,
        "languages": "English",
        "tuition_min": 37000,
        "tuition_max": 43000,
        "currency": "GBP",
        "intake_months": "October",
        "source_url": "https://www.imperial.ac.uk/study"
    },
    # Canada
    {
        "id": "univ_toronto",
        "name": "University of Toronto",
        "country": "Canada",
        "city": "Toronto, ON",
        "website": "https://www.utoronto.ca",
        "domain": "utoronto.ca",
        "ranking": 21,
        "languages": "English",
        "tuition_min": 42000,
        "tuition_max": 60000,
        "currency": "CAD",
        "intake_months": "September, January",
        "source_url": "https://future.utoronto.ca"
    },
    {
        "id": "univ_ubc",
        "name": "University of British Columbia",
        "country": "Canada",
        "city": "Vancouver, BC",
        "website": "https://www.ubc.ca",
        "domain": "ubc.ca",
        "ranking": 34,
        "languages": "English",
        "tuition_min": 38000,
        "tuition_max": 54000,
        "currency": "CAD",
        "intake_months": "September",
        "source_url": "https://you.ubc.ca"
    },
    # Germany
    {
        "id": "univ_tum",
        "name": "Technical University of Munich (TUM)",
        "country": "Germany",
        "city": "Munich",
        "website": "https://www.tum.de",
        "domain": "tum.de",
        "ranking": 37,
        "languages": "English, German",
        "tuition_min": 4000,
        "tuition_max": 6000,
        "currency": "EUR",
        "intake_months": "October, April",
        "source_url": "https://www.tum.de/en/studies/application"
    },
    {
        "id": "univ_lmu",
        "name": "Ludwig Maximilian University of Munich",
        "country": "Germany",
        "city": "Munich",
        "website": "https://www.lmu.de",
        "domain": "lmu.de",
        "ranking": 54,
        "languages": "German, English",
        "tuition_min": 300,
        "tuition_max": 800,
        "currency": "EUR",
        "intake_months": "October, April",
        "source_url": "https://www.lmu.de/en/study"
    },
    # Netherlands
    {
        "id": "univ_delft",
        "name": "Delft University of Technology (TU Delft)",
        "country": "Netherlands",
        "city": "Delft",
        "website": "https://www.tudelft.nl",
        "domain": "tudelft.nl",
        "ranking": 47,
        "languages": "English, Dutch",
        "tuition_min": 18000,
        "tuition_max": 22000,
        "currency": "EUR",
        "intake_months": "September",
        "source_url": "https://www.tudelft.nl/en/education/admission-and-application"
    },
    # France
    {
        "id": "univ_sorbonne",
        "name": "Sorbonne University",
        "country": "France",
        "city": "Paris",
        "website": "https://www.sorbonne-universite.fr",
        "domain": "sorbonne-universite.fr",
        "ranking": 59,
        "languages": "French, English",
        "tuition_min": 3770,
        "tuition_max": 4500,
        "currency": "EUR",
        "intake_months": "September",
        "source_url": "https://www.sorbonne-universite.fr/en/admissions"
    },
    # Italy
    {
        "id": "univ_polimi",
        "name": "Politecnico di Milano",
        "country": "Italy",
        "city": "Milan",
        "website": "https://www.polimi.it",
        "domain": "polimi.it",
        "ranking": 123,
        "languages": "English, Italian",
        "tuition_min": 3900,
        "tuition_max": 4200,
        "currency": "EUR",
        "intake_months": "September, February",
        "source_url": "https://www.polimi.it/en/international-prospective-students"
    },
    # Spain
    {
        "id": "univ_barcelona",
        "name": "University of Barcelona",
        "country": "Spain",
        "city": "Barcelona",
        "website": "https://www.ub.edu",
        "domain": "ub.edu",
        "ranking": 149,
        "languages": "Spanish, English",
        "tuition_min": 3000,
        "tuition_max": 6500,
        "currency": "EUR",
        "intake_months": "September",
        "source_url": "https://www.ub.edu/portal/web/admissions"
    },
    # Sweden
    {
        "id": "univ_kth",
        "name": "KTH Royal Institute of Technology",
        "country": "Sweden",
        "city": "Stockholm",
        "website": "https://www.kth.se",
        "domain": "kth.se",
        "ranking": 73,
        "languages": "English, Swedish",
        "tuition_min": 14500,
        "tuition_max": 19000,
        "currency": "EUR",
        "intake_months": "August",
        "source_url": "https://www.kth.se/en/studies"
    },
    # Finland
    {
        "id": "univ_aalto",
        "name": "Aalto University",
        "country": "Finland",
        "city": "Espoo",
        "website": "https://www.aalto.fi",
        "domain": "aalto.fi",
        "ranking": 109,
        "languages": "English, Finnish",
        "tuition_min": 15000,
        "tuition_max": 18000,
        "currency": "EUR",
        "intake_months": "September",
        "source_url": "https://www.aalto.fi/en/admission-services"
    },
    # Ireland
    {
        "id": "univ_tcd",
        "name": "Trinity College Dublin",
        "country": "Ireland",
        "city": "Dublin",
        "website": "https://www.tcd.ie",
        "domain": "tcd.ie",
        "ranking": 81,
        "languages": "English",
        "tuition_min": 21000,
        "tuition_max": 27000,
        "currency": "EUR",
        "intake_months": "September",
        "source_url": "https://www.tcd.ie/study"
    },
    # Australia
    {
        "id": "univ_melbourne",
        "name": "University of Melbourne",
        "country": "Australia",
        "city": "Melbourne, VIC",
        "website": "https://www.unimelb.edu.au",
        "domain": "unimelb.edu.au",
        "ranking": 14,
        "languages": "English",
        "tuition_min": 45000,
        "tuition_max": 52000,
        "currency": "AUD",
        "intake_months": "February, July",
        "source_url": "https://study.unimelb.edu.au"
    },
    {
        "id": "univ_anu",
        "name": "Australian National University (ANU)",
        "country": "Australia",
        "city": "Canberra, ACT",
        "website": "https://www.anu.edu.au",
        "domain": "anu.edu.au",
        "ranking": 30,
        "languages": "English",
        "tuition_min": 42000,
        "tuition_max": 48000,
        "currency": "AUD",
        "intake_months": "February, July",
        "source_url": "https://www.anu.edu.au/study"
    },
    # South Korea
    {
        "id": "univ_snu",
        "name": "Seoul National University",
        "country": "South Korea",
        "city": "Seoul",
        "website": "https://en.snu.ac.kr",
        "domain": "snu.ac.kr",
        "ranking": 41,
        "languages": "Korean, English",
        "tuition_min": 6000,
        "tuition_max": 9000,
        "currency": "USD",
        "intake_months": "March, September",
        "source_url": "https://en.snu.ac.kr/admission"
    },
    {
        "id": "univ_kaist",
        "name": "KAIST (Korea Advanced Institute of Science and Technology)",
        "country": "South Korea",
        "city": "Daejeon",
        "website": "https://www.kaist.ac.kr",
        "domain": "kaist.ac.kr",
        "ranking": 56,
        "languages": "English",
        "tuition_min": 4500,
        "tuition_max": 7500,
        "currency": "USD",
        "intake_months": "March, September",
        "source_url": "https://admission.kaist.ac.kr"
    },
    # Indonesia
    {
        "id": "univ_ui",
        "name": "Universitas Indonesia (UI)",
        "country": "Indonesia",
        "city": "Depok, West Java",
        "website": "https://www.ui.ac.id",
        "domain": "ui.ac.id",
        "ranking": 237,
        "languages": "Indonesian, English",
        "tuition_min": 3500,
        "tuition_max": 5500,
        "currency": "USD",
        "intake_months": "August",
        "source_url": "https://penerimaan.ui.ac.id"
    },
    {
        "id": "univ_itb",
        "name": "Institut Teknologi Bandung (ITB)",
        "country": "Indonesia",
        "city": "Bandung, West Java",
        "website": "https://www.itb.ac.id",
        "domain": "itb.ac.id",
        "ranking": 281,
        "languages": "Indonesian, English",
        "tuition_min": 3200,
        "tuition_max": 5000,
        "currency": "USD",
        "intake_months": "August",
        "source_url": "https://admission.itb.ac.id"
    },
    # Malaysia
    {
        "id": "univ_um",
        "name": "Universiti Malaya (UM)",
        "country": "Malaysia",
        "city": "Kuala Lumpur",
        "website": "https://www.um.edu.my",
        "domain": "um.edu.my",
        "ranking": 60,
        "languages": "English, Malay",
        "tuition_min": 4000,
        "tuition_max": 7500,
        "currency": "USD",
        "intake_months": "October, March",
        "source_url": "https://study.um.edu.my"
    },
    # South Africa
    {
        "id": "univ_uct",
        "name": "University of Cape Town (UCT)",
        "country": "South Africa",
        "city": "Cape Town",
        "website": "https://www.uct.ac.za",
        "domain": "uct.ac.za",
        "ranking": 173,
        "languages": "English",
        "tuition_min": 4500,
        "tuition_max": 8000,
        "currency": "USD",
        "intake_months": "February",
        "source_url": "https://www.uct.ac.za/apply"
    }
]

PROGRAMS_SEED = [
    # MIT
    {
        "id": "prog_mit_cs_ms",
        "university_id": "univ_mit",
        "name": "Master of Science in Electrical Engineering and Computer Science (EECS)",
        "level": "Master",
        "department": "EECS Department",
        "language": "English",
        "duration_months": 24,
        "tuition": 60000,
        "deadline": "December 15",
        "requirements": "Bachelor in CS/EE, GPA >= 3.8, GRE recommended, TOEFL >= 100 or IELTS >= 7.5",
        "program_url": "https://www.eecs.mit.edu/academics/graduate-programs/",
        "subject_category": "Computer Science & Engineering"
    },
    {
        "id": "prog_mit_ai_phd",
        "university_id": "univ_mit",
        "name": "PhD in Artificial Intelligence and Decision-making",
        "level": "PhD",
        "department": "EECS & CSAIL",
        "language": "English",
        "duration_months": 60,
        "tuition": 60000,
        "deadline": "December 15",
        "requirements": "Research experience in ML/Robotics, publications, strong math background",
        "program_url": "https://www.csail.mit.edu/academics",
        "subject_category": "Artificial Intelligence & Robotics"
    },
    # Stanford
    {
        "id": "prog_stanford_cs_ms",
        "university_id": "univ_stanford",
        "name": "Master of Science in Computer Science",
        "level": "Master",
        "department": "Computer Science",
        "language": "English",
        "duration_months": 24,
        "tuition": 62000,
        "deadline": "December 5",
        "requirements": "Strong CS fundamentals, algorithms, systems, GPA >= 3.7, TOEFL >= 100",
        "program_url": "https://cs.stanford.edu/admissions/graduate",
        "subject_category": "Computer Science & Engineering"
    },
    {
        "id": "prog_stanford_mba",
        "university_id": "univ_stanford",
        "name": "Stanford MBA Program",
        "level": "Master",
        "department": "Graduate School of Business",
        "language": "English",
        "duration_months": 24,
        "tuition": 79000,
        "deadline": "January 10",
        "requirements": "GMAT/GRE, 2-5 years leadership experience, essays, TOEFL/IELTS",
        "program_url": "https://www.gsb.stanford.edu/programs/mba",
        "subject_category": "Business & Management"
    },
    # Oxford
    {
        "id": "prog_oxford_msc_advanced_cs",
        "university_id": "univ_oxford",
        "name": "MSc in Advanced Computer Science",
        "level": "Master",
        "department": "Department of Computer Science",
        "language": "English",
        "duration_months": 12,
        "tuition": 36000,
        "deadline": "January 19",
        "requirements": "First-class honours degree in Mathematics or CS, IELTS >= 7.5 (7.0 each)",
        "program_url": "https://www.cs.ox.ac.uk/admissions/graduate/msc-advanced-computer-science/",
        "subject_category": "Computer Science & Engineering"
    },
    # TUM
    {
        "id": "prog_tum_data_eng_msc",
        "university_id": "univ_tum",
        "name": "Master of Science in Data Engineering and Analytics",
        "level": "Master",
        "department": "School of Computation, Information and Technology",
        "language": "English",
        "duration_months": 24,
        "tuition": 4000,
        "deadline": "May 31",
        "requirements": "Bachelor in Informatics/Math, ECTS credit matching, IELTS >= 6.5 or TOEFL >= 88",
        "program_url": "https://www.cit.tum.de/en/cit/studies/degree-programs/master-data-engineering-and-analytics/",
        "subject_category": "Data Science & AI"
    },
    {
        "id": "prog_tum_mech_msc",
        "university_id": "univ_tum",
        "name": "MSc in Mechanical Engineering",
        "level": "Master",
        "department": "School of Engineering and Design",
        "language": "English, German",
        "duration_months": 24,
        "tuition": 4000,
        "deadline": "May 31",
        "requirements": "Engineering bachelor degree, strong mechanics background, B2 German or C1 English",
        "program_url": "https://www.ed.tum.de/en/ed/studies/degree-programs/",
        "subject_category": "Mechanical Engineering"
    },
    # Toronto
    {
        "id": "prog_uoft_mscac",
        "university_id": "univ_toronto",
        "name": "Master of Science in Applied Computing (MScAC)",
        "level": "Master",
        "department": "Department of Computer Science",
        "language": "English",
        "duration_months": 16,
        "tuition": 48000,
        "deadline": "December 1",
        "requirements": "GPA >= 3.5 in senior CS courses, resume, 8-month applied research internship",
        "program_url": "https://mscac.utoronto.ca/",
        "subject_category": "Computer Science & Engineering"
    },
    # TU Delft
    {
        "id": "prog_tudelft_sustainable_energy",
        "university_id": "univ_delft",
        "name": "MSc in Sustainable Energy Technology",
        "level": "Master",
        "department": "Mechanical, Maritime and Materials Engineering",
        "language": "English",
        "duration_months": 24,
        "tuition": 20500,
        "deadline": "April 1",
        "requirements": "BSc in Engineering or Applied Sciences, CGPA 75%+, IELTS 7.0 (no band < 6.5)",
        "program_url": "https://www.tudelft.nl/en/education/programmes/masters/sustainable-energy-technology",
        "subject_category": "Energy & Sustainability"
    },
    # Melbourne
    {
        "id": "prog_unimelb_biomed",
        "university_id": "univ_melbourne",
        "name": "Master of Biomedical Science",
        "level": "Master",
        "department": "Faculty of Medicine, Dentistry and Health Sciences",
        "language": "English",
        "duration_months": 24,
        "tuition": 49000,
        "deadline": "October 31",
        "requirements": "Undergraduate degree with major in relevant biomedical discipline, IELTS 6.5",
        "program_url": "https://study.unimelb.edu.au/find/courses/graduate/master-of-biomedical-science/",
        "subject_category": "Medicine & Life Sciences"
    },
    # KAIST
    {
        "id": "prog_kaist_robotics",
        "university_id": "univ_kaist",
        "name": "MS/PhD in Robotics and Mechatronics",
        "level": "Master",
        "department": "Department of Mechanical Engineering & KI-Robotics",
        "language": "English",
        "duration_months": 24,
        "tuition": 5500,
        "deadline": "September 23",
        "requirements": "STEM Bachelor, official English test (TOEFL iBT 83 / IELTS 6.5), research proposal",
        "program_url": "https://me.kaist.ac.kr/graduate",
        "subject_category": "Artificial Intelligence & Robotics"
    },
    # UI Indonesia
    {
        "id": "prog_ui_cs_master",
        "university_id": "univ_ui",
        "name": "Magister Ilmu Komputer (Master of Computer Science)",
        "level": "Master",
        "department": "Fakultas Ilmu Komputer (FASILKOM)",
        "language": "English, Indonesian",
        "duration_months": 24,
        "tuition": 4000,
        "deadline": "June 15",
        "requirements": "Bachelor degree in Computing, SIMAK UI / academic potential test, TOEFL >= 500",
        "program_url": "https://cs.ui.ac.id/magister/",
        "subject_category": "Computer Science & Engineering"
    }
]

CONTACTS_SEED = [
    {
        "id": "cnt_mit_eecs_grad",
        "university_id": "univ_mit",
        "department": "Electrical Engineering & Computer Science",
        "name": "EECS Graduate Admissions Office",
        "role": "Admissions Officer",
        "email": "grad-admissions@eecs.mit.edu",
        "email_type": "role",
        "phone": "+1-617-253-4605",
        "source_url": "https://www.eecs.mit.edu/academics/graduate-programs/admission-process/"
    },
    {
        "id": "cnt_stanford_cs_inquiries",
        "university_id": "univ_stanford",
        "department": "Computer Science",
        "name": "Stanford CS Admissions Committee",
        "role": "Graduate Admissions Coordinator",
        "email": "admissions@cs.stanford.edu",
        "email_type": "role",
        "phone": "+1-650-723-2273",
        "source_url": "https://cs.stanford.edu/admissions/faq"
    },
    {
        "id": "cnt_oxford_cs_pg",
        "university_id": "univ_oxford",
        "department": "Department of Computer Science",
        "name": "Postgraduate Admissions Team",
        "role": "Graduate Studies Administrator",
        "email": "graduate.admissions@cs.ox.ac.uk",
        "email_type": "role",
        "phone": "+44 1865 273838",
        "source_url": "https://www.cs.ox.ac.uk/admissions/graduate/"
    },
    {
        "id": "cnt_tum_inquiry",
        "university_id": "univ_tum",
        "department": "TUM International Center",
        "name": "TUM Admissions & International Center",
        "role": "Admissions Advisor",
        "email": "studium@tum.de",
        "email_type": "role",
        "phone": "+49 89 289 22222",
        "source_url": "https://www.tum.de/en/studies/advising"
    },
    {
        "id": "cnt_uoft_mscac",
        "university_id": "univ_toronto",
        "department": "Applied Computing Graduate Office",
        "name": "MScAC Admissions Office",
        "role": "Graduate Program Manager",
        "email": "mscac@cs.toronto.edu",
        "email_type": "role",
        "phone": "+1-416-978-8762",
        "source_url": "https://mscac.utoronto.ca/contact"
    },
    {
        "id": "cnt_tudelft_admissions",
        "university_id": "univ_delft",
        "department": "International Student Admissions",
        "name": "TU Delft Contact Centre",
        "role": "Admissions Counselor",
        "email": "contactcentre-esa@tudelft.nl",
        "email_type": "role",
        "phone": "+31 15 278 8012",
        "source_url": "https://www.tudelft.nl/en/student/administration/contact-centre"
    },
    {
        "id": "cnt_unimelb_int",
        "university_id": "univ_melbourne",
        "department": "International Admissions",
        "name": "Melbourne Future Students",
        "role": "International Admissions Officer",
        "email": "future-students@unimelb.edu.au",
        "email_type": "role",
        "phone": "+61 3 9035 5511",
        "source_url": "https://study.unimelb.edu.au/how-to-apply"
    },
    {
        "id": "cnt_kaist_intl",
        "university_id": "univ_kaist",
        "department": "International Scholar and Student Services",
        "name": "KAIST Admissions Team",
        "role": "Admissions Officer",
        "email": "advancedadmission@kaist.ac.kr",
        "email_type": "role",
        "phone": "+82-42-350-2352",
        "source_url": "https://admission.kaist.ac.kr/intl-graduate/"
    },
    {
        "id": "cnt_ui_io",
        "university_id": "univ_ui",
        "department": "International Office",
        "name": "Universitas Indonesia International Office",
        "role": "International Admissions Specialist",
        "email": "ui-recruitment@ui.ac.id",
        "email_type": "role",
        "phone": "+62 21 78880139",
        "source_url": "https://international.ui.ac.id"
    }
]

def seed_database(conn):
    """Inserts initial universities, programs, and contacts into SQLite."""
    # Insert universities
    for u in UNIVERSITIES_SEED:
        conn.execute("""
            INSERT OR REPLACE INTO universities 
            (id, name, country, city, website, domain, ranking, languages, tuition_min, tuition_max, currency, intake_months, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            u["id"], u["name"], u["country"], u["city"], u["website"], u["domain"],
            u["ranking"], u["languages"], u["tuition_min"], u["tuition_max"],
            u["currency"], u["intake_months"], u["source_url"]
        ))

    # Insert programs
    for p in PROGRAMS_SEED:
        conn.execute("""
            INSERT OR REPLACE INTO programs 
            (id, university_id, name, level, department, language, duration_months, tuition, deadline, requirements, program_url, subject_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"], p["university_id"], p["name"], p["level"], p["department"],
            p["language"], p["duration_months"], p["tuition"], p["deadline"],
            p["requirements"], p["program_url"], p["subject_category"]
        ))

    # Insert contacts
    for c in CONTACTS_SEED:
        conn.execute("""
            INSERT OR REPLACE INTO contacts
            (id, university_id, department, name, role, email, email_type, phone, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c["id"], c["university_id"], c["department"], c["name"], c["role"],
            c["email"], c["email_type"], c["phone"], c["source_url"]
        ))

    conn.commit()
