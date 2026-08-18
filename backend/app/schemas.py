from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    resume_id: int | None = None
    resume_text: str | None = None


class MatchRequest(BaseModel):
    resume_id: int
    jd_content: str = Field(min_length=10)


class AtsScoreRequest(BaseModel):
    resume_id: int
    jd_content: str = Field(min_length=10)


class SuggestionsRequest(BaseModel):
    resume_id: int
    jd_content: str | None = None


class InterviewQuestionsRequest(BaseModel):
    resume_id: int
    jd_content: str | None = None
    num_questions_per_category: int = Field(default=3, ge=1, le=5)


class InterviewEvaluateRequest(BaseModel):
    session_id: int
    question: str = Field(min_length=5)
    answer: str = Field(min_length=5)
