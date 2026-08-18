import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, ErrorAlert, LoadingState, MetricGrid, ScoreCard, SectionHeader, StatusBadge } from '../components/ui';
import { asArray, safeScore, scoreLabel } from '../utils/formatters';

const CATEGORIES = [
  { id: 'technical', label: 'Technical' },
  { id: 'project_based', label: 'Project' },
  { id: 'hr', label: 'Behavioral' },
];

function difficultyLabel(index) {
  if (index <= 0) {
    return 'Easy';
  }
  if (index === 1) {
    return 'Medium';
  }
  return 'Advanced';
}

export function MockInterviewPage({
  state,
  onResumeIdChange,
  onJdChange,
  onGenerateQuestions,
  onQuestionChange,
  onAnswerChange,
  onEvaluate,
  loadingBy,
  errorBy,
}) {
  const [activeCategory, setActiveCategory] = useState('technical');
  const [questionIndex, setQuestionIndex] = useState(0);

  const questionsByCategory = useMemo(() => ({
    technical: asArray(state.questions?.questions?.technical),
    project_based: asArray(state.questions?.questions?.project_based),
    hr: asArray(state.questions?.questions?.hr),
  }), [state.questions]);

  const activeQuestions = questionsByCategory[activeCategory] || [];

  const currentQuestion = activeQuestions[questionIndex] || state.interviewQuestion;
  const totalQuestions = activeQuestions.length;
  const evaluationScore = safeScore((state.evaluation?.score || 0) * 10);

  const goToQuestion = (nextIndex) => {
    if (!activeQuestions.length) {
      return;
    }
    const clamped = Math.max(0, Math.min(nextIndex, activeQuestions.length - 1));
    setQuestionIndex(clamped);
    onQuestionChange(activeQuestions[clamped]);
  };

  const handleCategorySwitch = (categoryId) => {
    setActiveCategory(categoryId);
    setQuestionIndex(0);
    const first = questionsByCategory[categoryId]?.[0] || '';
    onQuestionChange(first);
  };

  return (
    <div className="page-grid">
      <Card className="hero-card">
        <SectionHeader title="Mock Interview" subtitle="Generate category-based questions, submit answers, and improve with AI feedback." />
        <div className="form-grid compact">
          <label htmlFor="interviewResumeId">Resume ID</label>
          <input id="interviewResumeId" value={state.resumeId} onChange={(event) => onResumeIdChange(event.target.value)} />
          <label htmlFor="interviewJd">Job Description Context</label>
          <textarea id="interviewJd" rows={5} value={state.jd} onChange={(event) => onJdChange(event.target.value)} />
        </div>
        <div className="inline-actions">
          <Button onClick={onGenerateQuestions} disabled={loadingBy.questions || !state.resumeId}>{loadingBy.questions ? 'Generating...' : 'Generate Questions'}</Button>
        </div>
        <p className="muted">Interview Session ID: <strong>{state.interviewSessionId || '-'}</strong></p>
      </Card>

      <ErrorAlert message={errorBy.questions || errorBy.evaluation} onRetry={state.resumeId ? onGenerateQuestions : undefined} />
      {(loadingBy.questions || loadingBy.evaluation) ? <LoadingState label="Preparing interview insights..." /> : null}

      <Card>
        <SectionHeader title="Question Flow" subtitle="Category tabs with progressive question navigation" />
        <div className="tab-row" role="tablist" aria-label="Interview question categories">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'primary' : 'ghost'}
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => handleCategorySwitch(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {!activeQuestions.length ? (
          <EmptyState title="No questions generated" message="Generate interview questions to begin practice." />
        ) : (
          <div className="content-stack">
            <div className="question-card">
              <div className="inline-badges">
                <StatusBadge status="neutral">Question {questionIndex + 1} of {totalQuestions}</StatusBadge>
                <StatusBadge status="success">{difficultyLabel(questionIndex)}</StatusBadge>
                <StatusBadge status="neutral">{CATEGORIES.find((item) => item.id === activeCategory)?.label}</StatusBadge>
              </div>
              <p>{currentQuestion}</p>
            </div>

            <label htmlFor="questionEdit">Question</label>
            <textarea id="questionEdit" rows={3} value={state.interviewQuestion} onChange={(event) => onQuestionChange(event.target.value)} />

            <label htmlFor="answerInput">Your Answer</label>
            <textarea
              id="answerInput"
              rows={6}
              value={state.interviewAnswer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder="Use Context → Action → Technical Detail → Result"
              disabled={loadingBy.evaluation}
            />

            <div className="inline-actions">
              <Button variant="secondary" onClick={() => goToQuestion(questionIndex - 1)} disabled={questionIndex === 0}>Previous</Button>
              <Button variant="secondary" onClick={() => goToQuestion(questionIndex + 1)} disabled={questionIndex >= totalQuestions - 1}>Next</Button>
              <Button onClick={onEvaluate} disabled={loadingBy.evaluation || !state.interviewSessionId || !state.interviewAnswer.trim()}>
                {loadingBy.evaluation ? 'Evaluating...' : 'Evaluate Answer'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Evaluation Panel" subtitle="Score, strengths, improvements, and better response structure" />
        {!state.evaluation ? (
          <EmptyState title="No evaluation yet" message="Submit an answer and run evaluation to get targeted feedback." />
        ) : (
          <div className="content-stack">
            <MetricGrid>
              <ScoreCard label="Answer Score" value={Math.round((state.evaluation.score || 0) * 10)} helper={scoreLabel(evaluationScore)} />
            </MetricGrid>

            <div className="split-columns">
              <div>
                <h3>Strengths</h3>
                <ul>{asArray(state.evaluation.feedback?.strengths).map((entry) => <li key={entry}>{entry}</li>)}</ul>
              </div>
              <div>
                <h3>Improvements</h3>
                <ul>{asArray(state.evaluation.feedback?.missing_points).map((entry) => <li key={entry}>{entry}</li>)}</ul>
              </div>
            </div>

            <div className="mini-card">
              <h3>Suggested Structure</h3>
              <p>{state.evaluation.feedback?.better_structure || 'Context → Action → Technical Detail → Result'}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
