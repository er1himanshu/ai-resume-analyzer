import { Card, Button, EmptyState, ErrorAlert, LoadingState, SectionHeader, SkillChip, StatusBadge } from '../components/ui';
import { asArray, toTitle } from '../utils/formatters';

function getQualityStatus(note) {
  const text = String(note || '').toLowerCase();
  if (text.includes('no ') || text.includes('missing') || text.includes('limited') || text.includes('short')) {
    return 'warning';
  }
  return 'success';
}

export function ResumeAnalysisPage({
  state,
  uploadFile,
  setUploadFile,
  onResumeIdChange,
  onJdChange,
  onUpload,
  onAnalyze,
  loadingBy,
  errorBy,
}) {
  const analysisData = state.analyze?.analysis || state.analyze?.parsed || {};
  const skills = asArray(analysisData.skills);
  const education = asArray(analysisData.education);
  const projects = asArray(analysisData.projects);
  const experience = asArray(analysisData.experience_highlights);
  const notes = asArray(analysisData.quality_notes);
  const isUploading = loadingBy.upload;
  const isAnalyzing = loadingBy.analyze;

  return (
    <div className="page-grid">
      <Card className="hero-card">
        <SectionHeader title="Resume Analysis" subtitle="Upload your PDF and get a structured analysis with practical quality feedback." />
        <div className="upload-dropzone" role="group" aria-label="Resume upload">
          <p>Drag and drop your resume PDF here or browse manually.</p>
          <input
            id="resume-file"
            type="file"
            accept="application/pdf"
            onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
          />
          <div className="inline-actions">
            <Button onClick={onUpload} disabled={isUploading || !uploadFile}>{isUploading ? 'Uploading...' : 'Upload Resume'}</Button>
            <Button variant="secondary" onClick={onAnalyze} disabled={isAnalyzing || !state.resumeId}>{isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}</Button>
          </div>
        </div>

        <div className="form-grid compact">
          <label htmlFor="resumeId">Resume ID</label>
          <input
            id="resumeId"
            value={state.resumeId}
            onChange={(event) => onResumeIdChange(event.target.value)}
            placeholder="e.g. 1"
          />
          <label htmlFor="jdContent">Job Description (for downstream modules)</label>
          <textarea
            id="jdContent"
            rows={5}
            value={state.jd}
            onChange={(event) => onJdChange(event.target.value)}
            placeholder="Paste the target job description"
          />
        </div>
      </Card>

      <Card>
        <SectionHeader title="Upload Status" subtitle="Current extraction and resume record details" />
        <ErrorAlert message={errorBy.upload} onRetry={uploadFile ? onUpload : undefined} />
        {isUploading ? <LoadingState label="Extracting resume content..." /> : null}
        <div className="status-grid">
          <div><span>Filename</span><strong>{state.analyze?.filename || uploadFile?.name || '-'}</strong></div>
          <div><span>File Type</span><strong>{uploadFile?.type || 'application/pdf'}</strong></div>
          <div><span>Upload</span>{state.resumeId ? <StatusBadge status="success">Completed</StatusBadge> : <StatusBadge status="neutral">Pending</StatusBadge>}</div>
          <div><span>Extraction</span>{state.analyze?.parsed ? <StatusBadge status="success">Ready</StatusBadge> : <StatusBadge status="neutral">Waiting</StatusBadge>}</div>
          <div><span>Resume ID</span><strong>{state.resumeId || '-'}</strong></div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Structured Analysis" subtitle="Readable insights with missing-field resilience" />
        <ErrorAlert message={errorBy.analyze} onRetry={state.resumeId ? onAnalyze : undefined} />
        {isAnalyzing ? <LoadingState label="Generating AI-assisted analysis..." /> : null}

        {!state.analyze ? (
          <EmptyState
            title="No analysis yet"
            message="Upload your resume first, then run analysis to see skills, education, projects, and quality notes."
          />
        ) : (
          <div className="content-stack">
            <div>
              <h3>Skills</h3>
              {skills.length ? (
                <div className="chip-wrap">{skills.map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}</div>
              ) : (
                <p className="muted">No skills detected yet.</p>
              )}
            </div>

            <div className="split-columns">
              <div>
                <h3>Education</h3>
                {education.length ? <ul>{education.map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p className="muted">No education entries found.</p>}
              </div>
              <div>
                <h3>Experience Highlights</h3>
                {experience.length ? <ul>{experience.map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p className="muted">No experience highlights found.</p>}
              </div>
            </div>

            <div>
              <h3>Projects</h3>
              {projects.length ? (
                <div className="cards-grid">
                  {projects.map((project) => (
                    <article key={project} className="mini-card">
                      <p>{project}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No project statements found.</p>
              )}
            </div>

            <div>
              <h3>Quality Notes</h3>
              {notes.length ? (
                <div className="note-list">
                  {notes.map((note) => (
                    <div key={note} className="note-item">
                      <StatusBadge status={getQualityStatus(note)}>{toTitle(getQualityStatus(note))}</StatusBadge>
                      <p>{note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No quality notes generated.</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
