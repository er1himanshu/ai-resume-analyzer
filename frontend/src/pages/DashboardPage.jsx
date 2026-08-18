import { Button, Card, EmptyState, ErrorAlert, LoadingState, MetricGrid, ScoreCard, SectionHeader, SkillChip, StatusBadge } from '../components/ui';
import { asArray, formatDate, safeScore, scoreLabel } from '../utils/formatters';

export function DashboardPage({
  state,
  onDashboardIdChange,
  onLoadDashboard,
  onNavigate,
  loadingBy,
  errorBy,
}) {
  const summary = state.dashboard?.summary || {};
  const parsedResume = state.dashboard?.resume?.parsed || {};
  const interviewAnswers = asArray(state.dashboard?.interview_answers);
  const analysisHistory = asArray(state.dashboard?.analysis_history);
  const interviewSessions = asArray(state.dashboard?.interview_sessions);

  const atsScore = safeScore(summary.ats_compatibility);
  const jdMatch = safeScore(summary.skill_match);
  const interviewReadiness = safeScore((summary.avg_interview_score || 0) * 10);

  return (
    <div className="page-grid">
      <Card className="hero-card">
        <SectionHeader
          title="AI Resume Analyzer"
          subtitle="Professional resume intelligence, JD alignment, ATS approximation, and interview readiness in one workflow."
        />
        <div className="inline-actions">
          <Button onClick={() => onNavigate('analysis')}>Start Resume Analysis</Button>
          <Button variant="secondary" onClick={() => onNavigate('match')}>Run JD Match</Button>
          <Button variant="ghost" onClick={() => onNavigate('interview')}>Practice Interview</Button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Load Candidate Dashboard" subtitle="Use resume ID or interview session ID" />
        <div className="inline-form">
          <label htmlFor="dashboardId" className="sr-only">Resume ID or Session ID</label>
          <input
            id="dashboardId"
            value={state.dashboardId}
            onChange={(event) => onDashboardIdChange(event.target.value)}
            placeholder="Enter resume ID or session ID"
          />
          <Button onClick={onLoadDashboard} disabled={loadingBy.dashboard || !state.dashboardId}>{loadingBy.dashboard ? 'Loading...' : 'Load Dashboard'}</Button>
        </div>
        <ErrorAlert message={errorBy.dashboard} onRetry={state.dashboardId ? onLoadDashboard : undefined} />
        {loadingBy.dashboard ? <LoadingState label="Fetching dashboard history..." /> : null}
      </Card>

      {!state.dashboard ? (
        <EmptyState title="No dashboard loaded" message="Load a resume or session ID to view summary metrics and history." />
      ) : (
        <>
          <MetricGrid>
            <ScoreCard label="Resume Score" value={safeScore(80 - asArray(summary.resume_quality_notes).length * 5) || 0} helper="Estimated quality" />
            <ScoreCard label="ATS Score" value={atsScore == null ? null : Math.round(atsScore)} helper={scoreLabel(atsScore)} />
            <ScoreCard label="JD Match" value={jdMatch == null ? null : Math.round(jdMatch)} helper={scoreLabel(jdMatch)} />
            <ScoreCard label="Missing Skills" value={asArray(summary.missing_skills).length} helper="Needs highlighting" max={null} />
            <ScoreCard label="Interview Readiness" value={interviewReadiness == null ? null : Math.round(interviewReadiness)} helper={scoreLabel(interviewReadiness)} />
          </MetricGrid>

          <Card>
            <SectionHeader title="Candidate Snapshot" subtitle="Key resume highlights" />
            <div className="content-stack">
              <p><strong>Resume:</strong> {state.dashboard.resume?.filename || '-'}</p>
              <p><strong>Uploaded:</strong> {formatDate(state.dashboard.resume?.created_at)}</p>

              <div>
                <h3>Skills</h3>
                {asArray(parsedResume.skills).length ? (
                  <div className="chip-wrap">
                    {asArray(parsedResume.skills).map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}
                  </div>
                ) : <p className="muted">No extracted skills available.</p>}
              </div>

              <div>
                <h3>Quality Notes</h3>
                {asArray(summary.resume_quality_notes).length ? (
                  <ul>
                    {asArray(summary.resume_quality_notes).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : <p className="muted">No quality notes available.</p>}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Recent Analysis History" subtitle="Latest ATS and match computations" />
            {!analysisHistory.length ? (
              <EmptyState title="No analysis history" message="Run JD Match or ATS scoring to populate this section." />
            ) : (
              <div className="table-wrap" role="region" aria-label="Analysis history">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>ATS</th>
                      <th>Skill Match</th>
                      <th>Missing Skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisHistory.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.created_at)}</td>
                        <td>{row.ats_score ?? '-'}</td>
                        <td>{row.skill_match_pct ?? '-'}</td>
                        <td>{asArray(row.missing_skills).length ? asArray(row.missing_skills).join(', ') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Interview Results" subtitle="Session history and readiness trend" />
            <div className="split-columns">
              <div>
                <h3>Recent Sessions</h3>
                {!interviewSessions.length ? (
                  <p className="muted">No interview sessions yet.</p>
                ) : (
                  <div className="cards-grid">
                    {interviewSessions.map((session) => (
                      <article className="mini-card" key={session.session_id}>
                        <p><strong>Session #{session.session_id}</strong></p>
                        <p>{formatDate(session.created_at)}</p>
                        <StatusBadge status="neutral">{asArray(session.questions?.technical).length + asArray(session.questions?.project_based).length + asArray(session.questions?.hr).length} Questions</StatusBadge>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3>Recent Evaluations</h3>
                {!interviewAnswers.length ? (
                  <p className="muted">No evaluated answers available.</p>
                ) : (
                  <div className="table-wrap" role="region" aria-label="Interview answer history">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Session</th>
                          <th>Score</th>
                          <th>Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interviewAnswers.slice(0, 8).map((answer) => (
                          <tr key={answer.id}>
                            <td>{formatDate(answer.created_at)}</td>
                            <td>#{answer.session_id}</td>
                            <td>{answer.score ?? '-'}/10</td>
                            <td>{asArray(answer.feedback?.strengths).join('; ') || 'Detailed feedback available in interview module.'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
