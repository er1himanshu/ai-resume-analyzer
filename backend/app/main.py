from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, init_db_with_retry
from app.models import Analysis, InterviewAnswer, InterviewSession, JobDescription, Resume
from app.schemas import (
    AnalyzeRequest,
    AtsScoreRequest,
    InterviewEvaluateRequest,
    InterviewQuestionsRequest,
    MatchRequest,
    SuggestionsRequest,
)
from app.services.analysis_service import (
    build_suggestions,
    compute_ats_score,
    evaluate_answer,
    generate_mock_questions,
    match_resume_to_jd,
    parse_resume_text,
)
from app.services.llm_service import gemini_service
from app.services.pdf_service import extract_text_from_pdf

app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db_with_retry()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "mode": "gemini" if gemini_service.enabled else "mock"}


@app.post("/api/resumes/upload")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    extracted_text = await extract_text_from_pdf(file)
    parsed = parse_resume_text(extracted_text)
    resume = Resume(filename=file.filename or "resume.pdf", extracted_text=extracted_text, parsed_json=parsed)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "parsed": parsed,
        "message": "Resume uploaded and text extracted successfully.",
    }


@app.post("/api/analyze")
async def analyze_resume(payload: AnalyzeRequest, db: Session = Depends(get_db)) -> dict:
    resume_text = payload.resume_text
    resume_id = payload.resume_id

    if resume_id is not None:
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        resume_text = resume.extracted_text
    elif not resume_text:
        raise HTTPException(status_code=400, detail="Either resume_id or resume_text is required")

    parsed = parse_resume_text(resume_text)
    enriched = await gemini_service.maybe_enhance_json("Analyze resume sections", parsed)

    return {
        "analysis": enriched["content"],
        "provider": enriched["provider"],
        "note": "AI-assisted output may be approximate.",
    }


@app.post("/api/match")
async def match_resume(payload: MatchRequest, db: Session = Depends(get_db)) -> dict:
    resume = db.get(Resume, payload.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    jd = JobDescription(content=payload.jd_content)
    db.add(jd)
    db.commit()
    db.refresh(jd)

    parsed = resume.parsed_json or parse_resume_text(resume.extracted_text)
    match = match_resume_to_jd(parsed.get("skills", []), payload.jd_content)

    analysis = Analysis(
        resume_id=resume.id,
        jd_id=jd.id,
        skill_match_pct=match["skill_match_pct"],
        missing_skills=match["missing_skills"],
        raw_output=match,
    )
    db.add(analysis)
    db.commit()

    return match


@app.post("/api/ats-score")
async def ats_score(payload: AtsScoreRequest, db: Session = Depends(get_db)) -> dict:
    resume = db.get(Resume, payload.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    parsed = resume.parsed_json or parse_resume_text(resume.extracted_text)
    match = match_resume_to_jd(parsed.get("skills", []), payload.jd_content)
    ats = compute_ats_score(match["skill_match_pct"], parsed.get("quality_notes", []))

    analysis = Analysis(
        resume_id=resume.id,
        ats_score=ats["ats_score"],
        skill_match_pct=match["skill_match_pct"],
        missing_skills=match["missing_skills"],
        raw_output={"match": match, "ats": ats},
    )
    db.add(analysis)
    db.commit()

    return {
        **ats,
        "disclaimer": "This is an AI-generated compatibility estimate, not a real ATS vendor score.",
    }


@app.post("/api/suggestions")
async def suggestions(payload: SuggestionsRequest, db: Session = Depends(get_db)) -> dict:
    resume = db.get(Resume, payload.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    parsed = resume.parsed_json or parse_resume_text(resume.extracted_text)
    missing = []
    if payload.jd_content:
        match = match_resume_to_jd(parsed.get("skills", []), payload.jd_content)
        missing = match["missing_skills"]

    tips = build_suggestions(missing, parsed.get("quality_notes", []))
    enhanced = await gemini_service.maybe_enhance_json("Provide actionable resume suggestions", {"suggestions": tips})

    return {
        "suggestions": enhanced["content"].get("suggestions", tips),
        "provider": enhanced["provider"],
    }


@app.post("/api/interview/questions")
async def interview_questions(payload: InterviewQuestionsRequest, db: Session = Depends(get_db)) -> dict:
    resume = db.get(Resume, payload.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    jd_id = None
    jd_content = payload.jd_content or ""
    if jd_content:
        jd = JobDescription(content=jd_content)
        db.add(jd)
        db.commit()
        db.refresh(jd)
        jd_id = jd.id

    parsed = resume.parsed_json or parse_resume_text(resume.extracted_text)
    questions = generate_mock_questions(parsed.get("skills", []), jd_content, payload.num_questions_per_category)
    enhanced = await gemini_service.maybe_enhance_json("Generate interview questions by category", questions)
    final_questions = enhanced["content"]

    session = InterviewSession(resume_id=resume.id, jd_id=jd_id, questions=final_questions)
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"session_id": session.id, "questions": final_questions, "provider": enhanced["provider"]}


@app.post("/api/interview/evaluate")
async def interview_evaluate(payload: InterviewEvaluateRequest, db: Session = Depends(get_db)) -> dict:
    session = db.get(InterviewSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    evaluation = evaluate_answer(payload.question, payload.answer)

    answer_record = InterviewAnswer(
        session_id=session.id,
        question=payload.question,
        answer=payload.answer,
        score=evaluation["score"],
        feedback=evaluation["feedback"],
    )
    db.add(answer_record)
    db.commit()

    return evaluation


@app.get("/api/dashboard/{resume_or_session_id}")
def dashboard(resume_or_session_id: int, db: Session = Depends(get_db)) -> dict:
    resume = db.get(Resume, resume_or_session_id)

    if not resume:
        session = db.get(InterviewSession, resume_or_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Resume/session not found")
        resume = db.get(Resume, session.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Associated resume not found")

    analyses = (
        db.query(Analysis)
        .filter(Analysis.resume_id == resume.id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.resume_id == resume.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(10)
        .all()
    )

    session_ids = [session.id for session in sessions]
    answers = []
    if session_ids:
        answers = (
            db.query(InterviewAnswer)
            .filter(InterviewAnswer.session_id.in_(session_ids))
            .order_by(InterviewAnswer.created_at.desc())
            .all()
        )

    latest_analysis = analyses[0] if analyses else None
    avg_interview_score = round(sum(ans.score for ans in answers) / len(answers), 2) if answers else None

    return {
        "resume": {
            "id": resume.id,
            "filename": resume.filename,
            "created_at": resume.created_at,
            "parsed": resume.parsed_json,
        },
        "summary": {
            "ats_compatibility": latest_analysis.ats_score if latest_analysis else None,
            "skill_match": latest_analysis.skill_match_pct if latest_analysis else None,
            "resume_quality_notes": (resume.parsed_json or {}).get("quality_notes", []),
            "missing_skills": latest_analysis.missing_skills if latest_analysis else [],
            "avg_interview_score": avg_interview_score,
        },
        "analysis_history": [
            {
                "id": item.id,
                "ats_score": item.ats_score,
                "skill_match_pct": item.skill_match_pct,
                "missing_skills": item.missing_skills,
                "created_at": item.created_at,
            }
            for item in analyses
        ],
        "interview_sessions": [
            {
                "session_id": session.id,
                "created_at": session.created_at,
                "questions": session.questions,
            }
            for session in sessions
        ],
        "interview_answers": [
            {
                "id": ans.id,
                "session_id": ans.session_id,
                "question": ans.question,
                "score": ans.score,
                "feedback": ans.feedback,
                "created_at": ans.created_at,
            }
            for ans in answers
        ],
    }
