# AI-Powered Resume Analyzer + Mock Interview Platform (Review 2 Ready)

A full-stack demo application that analyzes resumes, compares them with job descriptions, generates an **AI-generated approximate ATS compatibility score**, and runs mock interviews with answer evaluation.

> v1 is single-user demo mode (no authentication).  
> Gemini is used when `GEMINI_API_KEY` is configured; otherwise deterministic mock mode keeps the demo fully functional.

## Features

- Resume PDF upload and text extraction
- Resume analysis output (skills, education, projects, experience highlights, quality notes)
- JD matching with requirement-vs-resume table and missing skills
- AI-generated ATS compatibility estimate + rationale + disclaimer
- Skill-gap analysis and improvement suggestions
- Mock interview question generation (technical, project-based, HR)
- Candidate answer evaluation with score and actionable feedback
- Dashboard/history view for prior analyses and interview attempts

## Architecture

```text
+------------------+         HTTP          +--------------------------+
| React (Vite)     |  ------------------>  | FastAPI Backend          |
| frontend:5173    |                       | backend:8000             |
+------------------+                       | - PDF extraction (pypdf) |
         |                                  | - Gemini/mock LLM layer  |
         |                                  | - Resume/JD logic        |
         |                                  +------------+-------------+
         |                                               |
         |                                      SQLAlchemy ORM
         |                                               |
         v                                               v
                                    +------------------------------+
                                    | PostgreSQL (db:5432)         |
                                    | resumes, analyses, interviews |
                                    +------------------------------+
```

## Repository Structure

- `/frontend` React app (Vite)
- `/backend` FastAPI app (Python 3.11+)
- `docker-compose.yml` one-command local stack
- `.env.example` environment template

## Setup (Local without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Database

Run PostgreSQL locally and set `DATABASE_URL` in `.env`.

## Setup (Docker - recommended demo flow)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Health: http://localhost:8000/api/health

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy DB connection |
| `GEMINI_API_KEY` | Gemini API key (optional) |
| `GEMINI_MODEL` | Gemini model name |
| `CORS_ORIGINS` | Allowed frontend origins |
| `VITE_API_BASE_URL` | Frontend backend API URL |
| `POSTGRES_DB/USER/PASSWORD` | Postgres container settings |

## API Endpoints Summary

- `POST /api/resumes/upload` — upload PDF, extract/store text
- `POST /api/analyze` — analyze resume text/ID
- `POST /api/match` — compare resume + JD, return match table + gaps
- `POST /api/ats-score` — ATS compatibility estimate (AI-generated)
- `POST /api/suggestions` — resume improvement suggestions
- `POST /api/interview/questions` — categorized question generation
- `POST /api/interview/evaluate` — score + feedback for answer
- `GET /api/dashboard/{resume_id_or_session_id}` — summary/history
- `GET /api/health` — health status + mode

## Demo Walkthrough (Review 2)

1. Open frontend and upload a resume PDF.
2. Verify extracted analysis appears (skills/education/projects).
3. Paste JD text.
4. Click **Match JD** and show requirement table + missing skills.
5. Click **Generate ATS Score** and mention disclaimer (approximate AI estimate).
6. Click **Suggestions** for improvement recommendations.
7. Go to **Mock Interview**, generate questions, answer one question, evaluate.
8. Open **Dashboard** and show ATS, match, and interview history.

## Data Model

- `resumes(id, filename, extracted_text, parsed_json, created_at)`
- `job_descriptions(id, content, created_at)`
- `analyses(id, resume_id, jd_id, ats_score, skill_match_pct, missing_skills, suggestions, raw_output, created_at)`
- `interview_sessions(id, resume_id, jd_id, questions, created_at)`
- `interview_answers(id, session_id, question, answer, score, feedback, created_at)`

## Known Limitations

- ATS score is heuristic/AI-generated approximation only.
- Resume parsing uses practical pattern matching (good for demo, not perfect extraction).
- v1 has no authentication by design.

## Future Enhancements

- Add user authentication and multi-user data isolation
- Improve extraction with OCR support for image-heavy PDFs
- Add richer analytics charts on dashboard
- Add retry queues and observability for LLM/API failures
