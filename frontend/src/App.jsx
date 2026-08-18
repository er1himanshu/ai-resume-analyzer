import { useMemo, useState } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const initialState = {
  resumeId: '',
  jd: '',
  analyze: null,
  match: null,
  ats: null,
  suggestions: null,
  questions: null,
  interviewSessionId: '',
  interviewQuestion: '',
  interviewAnswer: '',
  evaluation: null,
  dashboardId: '',
  dashboard: null,
};

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Request failed');
  }
  return data;
}

function Section({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ResultBox({ data }) {
  if (!data) return null;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const skillRows = useMemo(() => state.match?.match_table || [], [state.match]);

  const run = async (fn) => {
    setLoading(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async () => {
    if (!uploadFile) throw new Error('Please select a PDF file first.');

    const formData = new FormData();
    formData.append('file', uploadFile);

    const result = await api('/api/resumes/upload', {
      method: 'POST',
      body: formData,
    });

    setState((prev) => ({
      ...prev,
      resumeId: String(result.resume_id),
      dashboardId: String(result.resume_id),
      analyze: result,
    }));
  };

  const runAnalyze = async () => {
    const result = await api('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: Number(state.resumeId) }),
    });
    setState((prev) => ({ ...prev, analyze: result }));
  };

  const runMatch = async () => {
    const result = await api('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: Number(state.resumeId), jd_content: state.jd }),
    });
    setState((prev) => ({ ...prev, match: result }));
  };

  const runAts = async () => {
    const result = await api('/api/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: Number(state.resumeId), jd_content: state.jd }),
    });
    setState((prev) => ({ ...prev, ats: result }));
  };

  const runSuggestions = async () => {
    const result = await api('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: Number(state.resumeId), jd_content: state.jd }),
    });
    setState((prev) => ({ ...prev, suggestions: result }));
  };

  const runQuestions = async () => {
    const result = await api('/api/interview/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: Number(state.resumeId), jd_content: state.jd, num_questions_per_category: 3 }),
    });

    const firstQuestion = result.questions?.technical?.[0] || '';
    setState((prev) => ({
      ...prev,
      questions: result,
      interviewSessionId: String(result.session_id),
      interviewQuestion: firstQuestion,
    }));
  };

  const runEvaluation = async () => {
    const result = await api('/api/interview/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: Number(state.interviewSessionId),
        question: state.interviewQuestion,
        answer: state.interviewAnswer,
      }),
    });
    setState((prev) => ({ ...prev, evaluation: result }));
  };

  const runDashboard = async () => {
    const result = await api(`/api/dashboard/${Number(state.dashboardId)}`);
    setState((prev) => ({ ...prev, dashboard: result }));
  };

  return (
    <div className="app">
      <header>
        <h1>AI-Powered Resume Analyzer + Mock Interview Platform</h1>
        <p>Demo mode works without Gemini key. ATS score is AI-generated and approximate.</p>
      </header>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="loading">Processing...</div> : null}

      <Section title="1) Resume Upload">
        <input type="file" accept="application/pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
        <button onClick={() => run(uploadResume)} disabled={loading}>Upload PDF</button>
        <p>Resume ID: {state.resumeId || '-'}</p>
        <ResultBox data={state.analyze?.parsed ? state.analyze : null} />
      </Section>

      <Section title="2) Analysis + JD Matching">
        <label htmlFor="resumeId">Resume ID</label>
        <input
          id="resumeId"
          value={state.resumeId}
          onChange={(e) => setState((prev) => ({ ...prev, resumeId: e.target.value }))}
          placeholder="e.g. 1"
        />

        <label htmlFor="jd">Job Description</label>
        <textarea
          id="jd"
          rows={6}
          value={state.jd}
          onChange={(e) => setState((prev) => ({ ...prev, jd: e.target.value }))}
          placeholder="Paste JD text here"
        />

        <div className="actions">
          <button onClick={() => run(runAnalyze)} disabled={loading}>Analyze Resume</button>
          <button onClick={() => run(runMatch)} disabled={loading}>Match JD</button>
          <button onClick={() => run(runAts)} disabled={loading}>Generate ATS Score</button>
          <button onClick={() => run(runSuggestions)} disabled={loading}>Suggestions</button>
        </div>

        {skillRows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Resume</th>
              </tr>
            </thead>
            <tbody>
              {skillRows.map((row) => (
                <tr key={row.requirement}>
                  <td>{row.requirement}</td>
                  <td>{row.status === 'Found' ? '✅ Found' : '❌ Missing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <ResultBox data={state.analyze?.analysis || state.analyze?.parsed ? state.analyze : null} />
        <ResultBox data={state.ats} />
        <ResultBox data={state.suggestions} />
      </Section>

      <Section title="3) Mock Interview">
        <button onClick={() => run(runQuestions)} disabled={loading}>Generate Questions</button>
        <p>Session ID: {state.interviewSessionId || '-'}</p>

        <label htmlFor="question">Question</label>
        <textarea
          id="question"
          rows={3}
          value={state.interviewQuestion}
          onChange={(e) => setState((prev) => ({ ...prev, interviewQuestion: e.target.value }))}
        />

        <label htmlFor="answer">Your Answer</label>
        <textarea
          id="answer"
          rows={4}
          value={state.interviewAnswer}
          onChange={(e) => setState((prev) => ({ ...prev, interviewAnswer: e.target.value }))}
          placeholder="Type your answer"
        />

        <button onClick={() => run(runEvaluation)} disabled={loading}>Evaluate Answer</button>

        <ResultBox data={state.questions} />
        <ResultBox data={state.evaluation} />
      </Section>

      <Section title="4) Dashboard / History">
        <label htmlFor="dashboardId">Resume ID or Session ID</label>
        <input
          id="dashboardId"
          value={state.dashboardId}
          onChange={(e) => setState((prev) => ({ ...prev, dashboardId: e.target.value }))}
        />
        <button onClick={() => run(runDashboard)} disabled={loading}>Load Dashboard</button>

        {state.dashboard?.summary ? (
          <div className="summary-grid">
            <div><strong>ATS Compatibility:</strong> {state.dashboard.summary.ats_compatibility ?? '-'}</div>
            <div><strong>Skill Match %:</strong> {state.dashboard.summary.skill_match ?? '-'}</div>
            <div><strong>Avg Interview Score:</strong> {state.dashboard.summary.avg_interview_score ?? '-'}</div>
          </div>
        ) : null}

        <ResultBox data={state.dashboard} />
      </Section>
    </div>
  );
}
