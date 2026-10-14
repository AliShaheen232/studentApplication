"""AdmitPath Student Profile & Program Matching Engine.
Ranks university programs against a student's academic background, preferences, and test scores.
Produces an overall percentage score (0-100) and an interpretable reason list.
"""

def calculate_match_score(student_profile: dict, program: dict, university: dict) -> tuple[int, list[str], dict]:
    """
    Calculates a compatibility match score between a student and a program.
    Returns:
        (total_score, reasons_list, score_breakdown)
    """
    score = 0
    reasons = []
    breakdown = {
        "subject_fit": 0,
        "degree_level": 0,
        "country_fit": 0,
        "budget_fit": 0,
        "requirements_fit": 0
    }

    # 1. Subject Alignment (up to 35 points)
    student_subjects = [s.strip().lower() for s in (student_profile.get("subjects") or "").split(",") if s.strip()]
    prog_subject = (program.get("subject_category") or "").lower()
    prog_name = (program.get("name") or "").lower()

    subject_matched = False
    for sub in student_subjects:
        if sub in prog_subject or sub in prog_name:
            subject_matched = True
            break

    if subject_matched:
        breakdown["subject_fit"] = 35
        score += 35
        reasons.append(f"Direct curriculum alignment with your interested field: {program.get('subject_category')}")
    elif any(word in prog_name for word in ["science", "engineering", "computing", "technology"]):
        breakdown["subject_fit"] = 20
        score += 20
        reasons.append("Related STEM discipline matching your general focus")
    else:
        breakdown["subject_fit"] = 10
        score += 10

    # 2. Degree Level Match (up to 20 points)
    target_level = (student_profile.get("target_level") or "Master").strip().lower()
    prog_level = (program.get("level") or "").strip().lower()

    if target_level == prog_level:
        breakdown["degree_level"] = 20
        score += 20
        reasons.append(f"Exact degree level match ({program.get('level')})")
    else:
        breakdown["degree_level"] = 5
        score += 5

    # 3. Country Preference (up to 15 points)
    preferred_countries = [c.strip().lower() for c in (student_profile.get("countries") or "").split(",") if c.strip()]
    univ_country = (university.get("country") or "").strip().lower()

    if not preferred_countries or univ_country in preferred_countries:
        breakdown["country_fit"] = 15
        score += 15
        reasons.append(f"Located in your preferred study destination ({university.get('country')})")
    else:
        breakdown["country_fit"] = 5
        score += 5

    # 4. Budget Compatibility (up to 15 points)
    max_budget = float(student_profile.get("budget_max") or 0)
    prog_tuition = float(program.get("tuition") or 0)

    if max_budget <= 0:
        breakdown["budget_fit"] = 15
        score += 15
    elif prog_tuition <= max_budget:
        breakdown["budget_fit"] = 15
        score += 15
        reasons.append(f"Tuition (${prog_tuition:,.0f}) is within your stated budget limit (${max_budget:,.0f})")
    elif prog_tuition <= max_budget * 1.25:
        breakdown["budget_fit"] = 8
        score += 8
        reasons.append(f"Tuition is slightly above budget but eligible for departmental funding / scholarships")
    else:
        breakdown["budget_fit"] = 2
        score += 2
        reasons.append(f"Tuition (${prog_tuition:,.0f}) exceeds your current budget preference")

    # 5. Academic Profile & Language Readiness (up to 15 points)
    student_gpa = float(student_profile.get("gpa") or 0)
    max_gpa = float(student_profile.get("max_gpa") or 4.0)
    gpa_ratio = (student_gpa / max_gpa) if max_gpa > 0 else 0.75

    student_ielts = float(student_profile.get("ielts_score") or 0)
    student_toefl = float(student_profile.get("toefl_score") or 0)

    req_points = 0
    if gpa_ratio >= 0.85:
        req_points += 8
        reasons.append(f"Strong academic GPA ({student_gpa}/{max_gpa}) exceeds typical admissions baseline")
    elif gpa_ratio >= 0.70:
        req_points += 5
    else:
        req_points += 2

    if student_ielts >= 7.0 or student_toefl >= 95:
        req_points += 7
        reasons.append("English proficiency test scores meet top-tier direct entry requirements")
    elif student_ielts >= 6.5 or student_toefl >= 80:
        req_points += 5
    else:
        req_points += 3

    breakdown["requirements_fit"] = req_points
    score += req_points

    # Cap score between 10 and 99%
    total_score = min(max(score, 10), 99)
    return total_score, reasons, breakdown
