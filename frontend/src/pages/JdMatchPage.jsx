import { Button, Card, EmptyState, ErrorAlert, LoadingState, MetricGrid, ProgressBar, ScoreCard, SectionHeader, SkillChip, StatusBadge } from '../components/ui';
import { asArray, safeScore, scoreLabel } from '../utils/formatters';

function suggestionMeta(text) {
  const lower = String(text || '').toLowerCase();
  if (lower.includes('missing') || lower.includes('add evidence')) {
    return { priority: 'High', impact: 'Directly improves match' };
  }
  if (lower.includes('quantified') || lower.includes('measurable')) {
    return { priority: 'Medium', impact: 'Improves credibility' };
  }
  return { priority: 'Medium', impact: 'General quality improvement' };
}

export function JdMatchPage({
  state,
  onResumeIdChange,
  onJdChange,
  onMatch,
  onAts,
  onSuggestions,
  loadingBy,
  errorBy,
}) {
  const matchTable = asArray(state.match?.match_table);
  const matchedSkills = matchTable.filter((item) => item.status === 'Found').map((item) => item.requirement);
  const missingSkills = asArray(state.match?.missing_skills);
  const suggestions = asArray(state.suggestions?.suggestions);
  const score = safeScore(state.match?.skill_match_pct);
  const atsScore = safeScore(state.ats?.ats_score);

  return (
    <div className="page-grid">
      <Card className="hero-card">
        <SectionHeader title="JD Match & ATS" subtitle="Compare your resume against role requirements and identify targeted improvements." />
        <div className="form-grid compact">
          <label htmlFor="matchResumeId">Resume ID</label>
          <input id="matchResumeId" value={state.resumeId} onChange={(event) => onResumeIdChange(event.target.value)} />
          <label htmlFor="matchJd">Job Description</label>
          <textarea id="matchJd" rows={7} value={state.jd} onChange={(event) => onJdChange(event.target.value)} />
        </div>
        <div className="inline-actions">
          <Button onClick={onMatch} disabled={loadingBy.match || !state.resumeId || state.jd.length < 10}>{loadingBy.match ? 'Matching...' : 'Run JD Match'}</Button>
          <Button variant="secondary" onClick={onAts} disabled={loadingBy.ats || !state.resumeId || state.jd.length < 10}>{loadingBy.ats ? 'Scoring...' : 'Generate ATS Score'}</Button>
          <Button variant="ghost" onClick={onSuggestions} disabled={loadingBy.suggestions || !state.resumeId}>{loadingBy.suggestions ? 'Loading...' : 'Generate Suggestions'}</Button>
        </div>
      </Card>

      <ErrorAlert message={errorBy.match || errorBy.ats || errorBy.suggestions} onRetry={state.resumeId ? onMatch : undefined} />

      {(loadingBy.match || loadingBy.ats || loadingBy.suggestions) ? <LoadingState label="Analyzing alignment with target role..." /> : null}

      <MetricGrid>
        <ScoreCard label="JD Match" value={score == null ? null : Math.round(score)} helper={scoreLabel(score)} />
        <ScoreCard label="ATS Compatibility" value={atsScore == null ? null : Math.round(atsScore)} helper={scoreLabel(atsScore)} />
        <ScoreCard label="Missing Skills" value={missingSkills.length} helper="Gaps to address" max={null} />
      </MetricGrid>

      <Card>
        <SectionHeader title="Skills Coverage" subtitle="Matched and missing requirement groups" />
        <div className="split-columns">
          <div>
            <h3>Matched Skills</h3>
            {matchedSkills.length ? <div className="chip-wrap">{matchedSkills.map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}</div> : <p className="muted">No matched skills yet.</p>}
          </div>
          <div>
            <h3>Missing Skills</h3>
            {missingSkills.length ? <div className="chip-wrap">{missingSkills.map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}</div> : <p className="muted">No missing skills detected.</p>}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Requirement Comparison" subtitle="Role requirements vs resume evidence" />
        {!matchTable.length ? (
          <EmptyState title="No comparison yet" message="Run JD Match to generate requirement-wise status indicators." />
        ) : (
          <div className="table-wrap" role="region" aria-label="Requirement comparison">
            <table>
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {matchTable.map((row) => (
                  <tr key={row.requirement}>
                    <td>{row.requirement}</td>
                    <td>
                      <StatusBadge status={row.status === 'Found' ? 'success' : 'warning'}>{row.status === 'Found' ? 'Matched' : 'Missing'}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="ATS Score Breakdown" subtitle="AI-generated approximation; not an official ATS vendor score" />
        <p className="disclaimer">{state.ats?.disclaimer || 'This score is indicative only and should be used for directional improvement.'}</p>
        <ProgressBar label="ATS Score" value={atsScore || 0} />
        <ProgressBar label="Skill Match Contribution" value={score || 0} />
        <ProgressBar label="Resume Readiness" value={Math.max((atsScore || 0) - 10, 0)} />
      </Card>

      <Card>
        <SectionHeader title="Actionable Suggestions" subtitle="Prioritized recommendations for stronger fit" />
        {!suggestions.length ? (
          <EmptyState title="No suggestions yet" message="Generate suggestions to receive role-specific resume improvement actions." />
        ) : (
          <div className="cards-grid">
            {suggestions.map((tip) => {
              const meta = suggestionMeta(tip);
              return (
                <article className="mini-card" key={tip}>
                  <div className="inline-badges">
                    <StatusBadge status={meta.priority === 'High' ? 'warning' : 'neutral'}>{meta.priority} Priority</StatusBadge>
                    <StatusBadge status="success">{meta.impact}</StatusBadge>
                  </div>
                  <h3>Recommendation</h3>
                  <p>{tip}</p>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
