import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Button, ErrorAlert, StatusBadge } from './components/ui';
import { DashboardPage } from './pages/DashboardPage';
import { JdMatchPage } from './pages/JdMatchPage';
import { MockInterviewPage } from './pages/MockInterviewPage';
import { ResumeAnalysisPage } from './pages/ResumeAnalysisPage';
import { apiService } from './services/api';

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

const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analysis', label: 'Resume Analysis' },
  { id: 'match', label: 'JD Match' },
  { id: 'interview', label: 'Mock Interview' },
];

export default function App() {
  const [state, setState] = useState(initialState);
  const [uploadFile, setUploadFile] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState({ status: 'Checking', mode: '-' });
  const [loadingBy, setLoadingBy] = useState({});
  const [errorBy, setErrorBy] = useState({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await apiService.health();
        setAiStatus({ status: health.status || 'ok', mode: health.mode || 'mock' });
      } catch {
        setAiStatus({ status: 'offline', mode: 'unknown' });
      }
    };

    fetchHealth();
  }, []);

  const run = async (action, fn) => {
    setLoadingBy((prev) => ({ ...prev, [action]: true }));
    setErrorBy((prev) => ({ ...prev, [action]: '' }));
    setGlobalError('');
    try {
      await fn();
    } catch (error) {
      const message = error.message || 'Something went wrong. Please try again.';
      setErrorBy((prev) => ({ ...prev, [action]: message }));
      setGlobalError(message);
    } finally {
      setLoadingBy((prev) => ({ ...prev, [action]: false }));
    }
  };

  const handlers = useMemo(() => ({
    upload: () => run('upload', async () => {
      if (!uploadFile) {
        throw new Error('Please choose a PDF resume to upload.');
      }
      const result = await apiService.uploadResume(uploadFile);
      setState((prev) => ({
        ...prev,
        resumeId: String(result.resume_id),
        dashboardId: String(result.resume_id),
        analyze: result,
      }));
    }),
    analyze: () => run('analyze', async () => {
      const result = await apiService.analyzeResume(state.resumeId);
      setState((prev) => ({ ...prev, analyze: result }));
    }),
    match: () => run('match', async () => {
      const result = await apiService.matchResume(state.resumeId, state.jd);
      setState((prev) => ({ ...prev, match: result }));
    }),
    ats: () => run('ats', async () => {
      const result = await apiService.atsScore(state.resumeId, state.jd);
      setState((prev) => ({ ...prev, ats: result }));
    }),
    suggestions: () => run('suggestions', async () => {
      const result = await apiService.suggestions(state.resumeId, state.jd);
      setState((prev) => ({ ...prev, suggestions: result }));
    }),
    questions: () => run('questions', async () => {
      const result = await apiService.interviewQuestions(state.resumeId, state.jd);
      const firstQuestion = result.questions?.technical?.[0] || '';
      setState((prev) => ({
        ...prev,
        questions: result,
        interviewSessionId: String(result.session_id),
        interviewQuestion: firstQuestion,
      }));
    }),
    evaluate: () => run('evaluation', async () => {
      const result = await apiService.evaluateAnswer({
        sessionId: state.interviewSessionId,
        question: state.interviewQuestion,
        answer: state.interviewAnswer,
      });
      setState((prev) => ({ ...prev, evaluation: result }));
    }),
    dashboard: () => run('dashboard', async () => {
      const result = await apiService.dashboard(state.dashboardId);
      setState((prev) => ({ ...prev, dashboard: result }));
    }),
  }), [state, uploadFile]);

  const sharedProps = {
    state,
    onResumeIdChange: (resumeId) => setState((prev) => ({ ...prev, resumeId })),
    onJdChange: (jd) => setState((prev) => ({ ...prev, jd })),
    loadingBy,
    errorBy,
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-block">
          <h1>AI Resume Analyzer</h1>
          <p>Backend API contracts preserved. Frontend redesigned for production-ready usability.</p>
        </div>

        <button
          className="menu-toggle"
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
        >
          Menu
        </button>

        <nav id="primary-nav" className={`route-nav ${menuOpen ? 'open' : ''}`} aria-label="Primary">
          {pages.map((page) => (
            <Button
              key={page.id}
              variant={activePage === page.id ? 'primary' : 'ghost'}
              onClick={() => {
                setActivePage(page.id);
                setMenuOpen(false);
              }}
            >
              {page.label}
            </Button>
          ))}
        </nav>

        <div className="ai-status" aria-live="polite">
          <span>AI Status</span>
          <StatusBadge status={aiStatus.status === 'ok' ? 'success' : 'warning'}>
            {aiStatus.status}
          </StatusBadge>
          <small>Mode: {aiStatus.mode}</small>
        </div>
      </header>

      <main className="page-body">
        <ErrorAlert message={globalError} />

        {activePage === 'dashboard' ? (
          <DashboardPage
            state={state}
            onDashboardIdChange={(dashboardId) => setState((prev) => ({ ...prev, dashboardId }))}
            onLoadDashboard={handlers.dashboard}
            onNavigate={setActivePage}
            loadingBy={loadingBy}
            errorBy={errorBy}
          />
        ) : null}

        {activePage === 'analysis' ? (
          <ResumeAnalysisPage
            {...sharedProps}
            uploadFile={uploadFile}
            setUploadFile={setUploadFile}
            onUpload={handlers.upload}
            onAnalyze={handlers.analyze}
          />
        ) : null}

        {activePage === 'match' ? (
          <JdMatchPage
            {...sharedProps}
            onMatch={handlers.match}
            onAts={handlers.ats}
            onSuggestions={handlers.suggestions}
          />
        ) : null}

        {activePage === 'interview' ? (
          <MockInterviewPage
            {...sharedProps}
            onGenerateQuestions={handlers.questions}
            onQuestionChange={(interviewQuestion) => setState((prev) => ({ ...prev, interviewQuestion }))}
            onAnswerChange={(interviewAnswer) => setState((prev) => ({ ...prev, interviewAnswer }))}
            onEvaluate={handlers.evaluate}
          />
        ) : null}
      </main>
    </div>
  );
}
