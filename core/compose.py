"""AdmitPath Personalized Email Composer.
Generates compliant, highly personalized outreach emails with plain-text and HTML MIME parts.
Includes mandatory student sender signature and anti-spam opt-out notice.
"""

TEMPLATES = {
    "academic_inquiry": {
        "name": "Graduate Program Admissions Inquiry",
        "subject": "Inquiry regarding {program_name} Admissions - {student_name}",
        "body_text": """Dear {contact_name},

I hope this message finds you well.

My name is {student_name}, a prospective applicant from {nationality} with an academic background in {subjects} (GPA: {gpa}/{max_gpa}). I am writing to express my strong enthusiasm for the {program_name} at {university_name}.

{hook}

Having reviewed your curriculum and departmental requirements, I would welcome the opportunity to clarify a couple of brief questions:
1. Are there specific faculty research openings or teaching assistantships available for upcoming intakes?
2. Does the admissions committee prioritize prior publication record or specialized coursework for prospective students with my background?

I have attached my current curriculum vitae for your reference. Thank you sincerely for your time, guidance, and consideration.

Best regards,

{student_name}
{student_email}
{student_phone}

---
Opt-out notice: If you are not the appropriate contact or would prefer not to receive further updates, please reply 'stop' and I will not write again.
""",
        "body_html": """<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b;">
<p>Dear {contact_name},</p>

<p>I hope this message finds you well.</p>

<p>My name is <strong>{student_name}</strong>, a prospective applicant from {nationality} with an academic background in {subjects} (GPA: {gpa}/{max_gpa}). I am writing to express my strong enthusiasm for the <strong>{program_name}</strong> at <strong>{university_name}</strong>.</p>

<p style="padding-left: 12px; border-left: 3px solid #6366f1; color: #334155;"><em>{hook}</em></p>

<p>Having reviewed your curriculum and departmental requirements, I would welcome the opportunity to clarify a couple of brief questions:</p>
<ol>
  <li>Are there specific faculty research openings or teaching assistantships available for upcoming intakes?</li>
  <li>Does the admissions committee prioritize prior publication record or specialized coursework for prospective students with my background?</li>
</ol>

<p>I have attached my current curriculum vitae for your reference. Thank you sincerely for your time, guidance, and consideration.</p>

<p>Best regards,<br>
<strong>{student_name}</strong><br>
<span style="color: #64748b;">{student_email}</span></p>

<hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;">
<p style="font-size: 11px; color: #94a3b8;">Opt-out notice: If you are not the appropriate contact or would prefer not to receive further updates, please reply 'stop' and I will not write again.</p>
</div>"""
    },
    "research_lab": {
        "name": "Research Alignment & Lab Fit Inquiry",
        "subject": "Prospective Research Inquiry: {program_name} - {student_name}",
        "body_text": """Dear {contact_name},

I hope this email finds you well.

My name is {student_name}, and I am preparing my application for the {program_name} at {university_name}. I have been following recent developments in your department, specifically {hook}.

With a background in {subjects} and an overall GPA of {gpa}/{max_gpa}, I have conducted research focusing on {experience}. I am particularly interested in contributing to ongoing projects in your lab.

Could you let me know if faculty in this area are currently taking on new graduate research students for the upcoming intake? I would be delighted to share a research statement or schedule a brief virtual meeting at your convenience.

Thank you very much for your time and consideration.

Warm regards,

{student_name}
{student_email}

---
Opt-out notice: Reply 'stop' and I will not write again.
""",
        "body_html": """<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b;">
<p>Dear {contact_name},</p>
<p>I hope this email finds you well.</p>
<p>My name is <strong>{student_name}</strong>, and I am preparing my application for the <strong>{program_name}</strong> at <strong>{university_name}</strong>. I have been following recent developments in your department, specifically:</p>
<p style="padding-left: 12px; border-left: 3px solid #6366f1; color: #334155;"><em>{hook}</em></p>
<p>With a background in {subjects} and an overall GPA of {gpa}/{max_gpa}, I have conducted research focusing on {experience}. I am particularly interested in contributing to ongoing projects in your lab.</p>
<p>Could you let me know if faculty in this area are currently taking on new graduate research students for the upcoming intake? I would be delighted to share a research statement or schedule a brief virtual meeting at your convenience.</p>
<p>Thank you very much for your time and consideration.</p>
<p>Warm regards,<br>
<strong>{student_name}</strong><br>
<span style="color: #64748b;">{student_email}</span></p>
<hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;">
<p style="font-size: 11px; color: #94a3b8;">Opt-out notice: Reply 'stop' and I will not write again.</p>
</div>"""
    },
    "scholarship_funding": {
        "name": "Graduate Scholarship & Funding Inquiry",
        "subject": "Scholarship and Funding Inquiry: {program_name} - {student_name}",
        "body_text": """Dear {contact_name},

I hope you are having a productive week.

My name is {student_name}, an international prospective student from {nationality} intending to apply for the {program_name} at {university_name}.

{hook}

Given that my maximum target self-funded budget is approx. ${budget_max:,.0f}, I am actively exploring departmental fellowships, graduate research assistantships (GRA), and merit awards. Could you kindly advise on the eligibility criteria and nomination deadlines for international graduate scholarships?

My CV is attached for your review. Thank you very much for your support and advice.

Respectfully,

{student_name}
{student_email}

---
Opt-out notice: Reply 'stop' and I will not write again.
""",
        "body_html": """<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b;">
<p>Dear {contact_name},</p>
<p>I hope you are having a productive week.</p>
<p>My name is <strong>{student_name}</strong>, an international prospective student from {nationality} intending to apply for the <strong>{program_name}</strong> at <strong>{university_name}</strong>.</p>
<p style="padding-left: 12px; border-left: 3px solid #6366f1; color: #334155;"><em>{hook}</em></p>
<p>Given that my maximum target self-funded budget is approx. ${budget_max:,.0f}, I am actively exploring departmental fellowships, graduate research assistantships (GRA), and merit awards. Could you kindly advise on the eligibility criteria and nomination deadlines for international graduate scholarships?</p>
<p>My CV is attached for your review. Thank you very much for your support and advice.</p>
<p>Respectfully,<br>
<strong>{student_name}</strong><br>
<span style="color: #64748b;">{student_email}</span></p>
<hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;">
<p style="font-size: 11px; color: #94a3b8;">Opt-out notice: Reply 'stop' and I will not write again.</p>
</div>"""
    }
}

def generate_personalized_email(template_key: str, student: dict, program: dict, contact: dict, university: dict, custom_hook: str = None) -> dict:
    """Renders personalized draft with plain text, HTML, and safety footer."""
    tpl = TEMPLATES.get(template_key, TEMPLATES["academic_inquiry"])

    default_hook = (
        f"I was particularly inspired by {university.get('name')}'s focus on cutting-edge research in "
        f"{program.get('subject_category')} and the innovative curriculum of the {program.get('name')}."
    )
    hook = (custom_hook or "").strip() or default_hook

    data = {
        "student_name": student.get("full_name") or "Prospective Student",
        "student_email": student.get("email") or "student@admitpath.app",
        "student_phone": student.get("phone") or "",
        "nationality": student.get("nationality") or "International Student",
        "subjects": student.get("subjects") or program.get("subject_category") or "Computer Science",
        "gpa": student.get("gpa") or 3.8,
        "max_gpa": student.get("max_gpa") or 4.0,
        "budget_max": float(student.get("budget_max") or 35000),
        "experience": student.get("experience") or "applied software engineering and computational research",
        "contact_name": contact.get("name") or "Admissions Committee",
        "university_name": university.get("name") or "University",
        "program_name": program.get("name") or "Graduate Program",
        "hook": hook
    }

    try:
        subject = tpl["subject"].format(**data)
        body_text = tpl["body_text"].format(**data)
        body_html = tpl["body_html"].format(**data)
    except Exception:
        # Fallback if any key is missing
        subject = f"Inquiry regarding {data['program_name']} - {data['student_name']}"
        body_text = tpl["body_text"].replace("{hook}", hook)
        body_html = tpl["body_html"].replace("{hook}", hook)

    return {
        "template_key": template_key,
        "subject": subject,
        "body_text": body_text,
        "body_html": body_html,
        "recipient_email": contact.get("email"),
        "recipient_name": contact.get("name"),
        "hook": hook,
        "optout_included": True
    }
