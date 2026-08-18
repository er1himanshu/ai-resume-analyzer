from app.services.analysis_service import (
    compute_ats_score,
    evaluate_answer,
    match_resume_to_jd,
    parse_resume_text,
)


def test_parse_resume_text_detects_skills_and_sections():
    text = """
    John Doe

    B.Tech in Computer Science, ABC University

    Developed a FastAPI service using Python and PostgreSQL.

    Internship experience as backend developer.
    """
    parsed = parse_resume_text(text)

    assert "Python" in parsed["skills"]
    assert any("University" in line for line in parsed["education"])
    assert parsed["projects"]


def test_match_and_ats_score_are_deterministic():
    match = match_resume_to_jd(["Python", "Fastapi"], "Need Python, FastAPI, Docker")
    assert match["skill_match_pct"] > 0
    assert "Docker" in match["missing_skills"]

    ats = compute_ats_score(match["skill_match_pct"], ["short resume"])
    assert 0 <= ats["ats_score"] <= 100


def test_evaluate_answer_returns_feedback():
    result = evaluate_answer(
        "How does FastAPI handle APIs?",
        "FastAPI helps build APIs quickly with type hints. I used it to implement endpoints and validation.",
    )
    assert 0 <= result["score"] <= 10
    assert "feedback" in result
