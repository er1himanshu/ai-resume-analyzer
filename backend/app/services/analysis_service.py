import re
from collections import OrderedDict

COMMON_SKILLS = [
    "python",
    "java",
    "c++",
    "sql",
    "fastapi",
    "docker",
    "react",
    "javascript",
    "typescript",
    "aws",
    "git",
    "rest api",
    "machine learning",
    "postgresql",
]

EDUCATION_HINTS = ["b.tech", "m.tech", "bachelor", "master", "university", "college"]
PROJECT_HINTS = ["project", "developed", "built", "implemented", "designed"]
EXPERIENCE_HINTS = ["intern", "experience", "worked", "engineer", "developer"]


def _dedupe(items: list[str]) -> list[str]:
    return list(OrderedDict.fromkeys(items))


def parse_resume_text(text: str) -> dict:
    lower_text = text.lower()

    skills = [skill.title() for skill in COMMON_SKILLS if skill in lower_text]

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    education = [line for line in lines if any(h in line.lower() for h in EDUCATION_HINTS)][:5]
    projects = [line for line in lines if any(h in line.lower() for h in PROJECT_HINTS)][:5]
    experience = [line for line in lines if any(h in line.lower() for h in EXPERIENCE_HINTS)][:5]

    quality_notes = []
    word_count = len(re.findall(r"\w+", text))
    if word_count < 150:
        quality_notes.append("Resume appears short; consider adding more quantified project or experience details.")
    if not skills:
        quality_notes.append("No recognizable technical skills detected from the predefined checklist.")
    if not education:
        quality_notes.append("Education details appear limited; add degree and institution clearly.")

    return {
        "skills": _dedupe(skills),
        "education": education,
        "projects": projects,
        "experience_highlights": experience,
        "quality_notes": quality_notes or ["Resume structure looks usable for initial screening."],
    }


def extract_keywords(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z+#\. ]{1,20}", text.lower())
    prioritized = []
    for skill in COMMON_SKILLS:
        if skill in text.lower():
            prioritized.append(skill)
    for item in words:
        item = item.strip()
        if len(item.split()) <= 3 and item not in prioritized and item in text.lower() and item in " ".join(COMMON_SKILLS):
            prioritized.append(item)
    return _dedupe([word.title() for word in prioritized])


def match_resume_to_jd(resume_skills: list[str], jd_text: str) -> dict:
    jd_lower = jd_text.lower()
    requirements = [skill for skill in COMMON_SKILLS if skill in jd_lower]

    if not requirements:
        requirements = [skill.lower() for skill in resume_skills[:5]]

    table = []
    resume_skill_lower = {s.lower() for s in resume_skills}
    found_count = 0
    for req in _dedupe(requirements):
        if req in resume_skill_lower:
            status = "Found"
            found_count += 1
        else:
            status = "Missing"
        table.append({"requirement": req.title(), "status": status})

    total = max(len(table), 1)
    match_pct = round((found_count / total) * 100, 2)
    missing = [entry["requirement"] for entry in table if entry["status"] == "Missing"]

    return {
        "match_table": table,
        "skill_match_pct": match_pct,
        "missing_skills": missing,
    }


def compute_ats_score(skill_match_pct: float, quality_notes: list[str]) -> dict:
    penalty = min(len(quality_notes) * 3, 15)
    score = round(max(min(skill_match_pct + 20 - penalty, 98), 35), 2)
    rationale = [
        "AI-generated approximate compatibility score (not a real ATS score).",
        f"Skill match contribution: {skill_match_pct}%.",
    ]
    if quality_notes:
        rationale.append("Resume quality factors influenced the score.")
    return {"ats_score": score, "rationale": rationale}


def build_suggestions(missing_skills: list[str], quality_notes: list[str]) -> list[str]:
    suggestions = []
    if missing_skills:
        suggestions.append(
            "Add evidence for missing skills in projects/experience: " + ", ".join(missing_skills[:6])
        )
    suggestions.extend(quality_notes[:3])
    suggestions.append("Use impact-focused bullet points: action + tech + measurable result.")
    return _dedupe(suggestions)


def generate_mock_questions(resume_skills: list[str], jd_text: str, per_category: int) -> dict:
    focus_skills = resume_skills[: max(per_category, 3)] or ["Python", "SQL", "Projects"]
    technical = [f"How have you used {skill} in a real project?" for skill in focus_skills[:per_category]]
    project = [
        "Describe your most relevant project and your specific contribution.",
        "What technical challenge did you face and how did you solve it?",
        "If you could improve the project now, what would you change?",
    ][:per_category]
    hr = [
        "Tell me about yourself in 60 seconds for this role.",
        "Why do you want this job based on the JD?",
        "What are your strengths and one current improvement area?",
    ][:per_category]

    return {
        "technical": technical,
        "project_based": project,
        "hr": hr,
        "jd_context": jd_text[:220],
    }


def evaluate_answer(question: str, answer: str) -> dict:
    answer_words = re.findall(r"\w+", answer.lower())
    question_words = {w for w in re.findall(r"\w+", question.lower()) if len(w) > 3}
    overlap = len(question_words.intersection(answer_words))

    base = 4.0
    length_bonus = min(len(answer_words) / 35, 3.5)
    relevance_bonus = min(overlap * 0.4, 2.5)
    score = round(min(base + length_bonus + relevance_bonus, 10.0), 1)

    strengths = []
    if len(answer_words) >= 35:
        strengths.append("Good depth and explanation length.")
    if overlap >= 2:
        strengths.append("Answer stays relevant to the question.")
    if not strengths:
        strengths.append("Clear start; expand with more specifics.")

    missing = []
    if len(answer_words) < 25:
        missing.append("Add more concrete details and outcomes.")
    if overlap < 2:
        missing.append("Tie your answer directly to the asked topic.")

    return {
        "score": score,
        "feedback": {
            "strengths": strengths,
            "missing_points": missing or ["Could include measurable impact for stronger delivery."],
            "better_structure": "Use: Context -> Action -> Technical Detail -> Result.",
        },
    }
