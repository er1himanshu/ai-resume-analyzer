export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function StatusBadge({ status, children }) {
  return <span className={`badge badge-${status || 'neutral'}`}>{children}</span>;
}

export function SkillChip({ children }) {
  return <span className="skill-chip">{children}</span>;
}

export function ProgressBar({ label, value, max = 100 }) {
  const safeValue = Math.min(Math.max(value || 0, 0), max);
  const percent = max > 0 ? (safeValue / max) * 100 : 0;

  return (
    <div className="progress-row">
      <div className="progress-label-row">
        <span>{label}</span>
        <strong>{Math.round(safeValue)}/{max}</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(safeValue)}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ScoreCard({ label, value, helper, max = 100 }) {
  return (
    <Card className="score-card">
      <p className="score-label">{label}</p>
      <p className="score-value">{value == null ? '-' : `${value}${max ? `/${max}` : ''}`}</p>
      {helper ? <p className="score-helper">{helper}</p> : null}
    </Card>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state" role="status">
      <h3>{title}</h3>
      <p>{message}</p>
      {action || null}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-line" />
      <div className="loading-line short" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) {
    return null;
  }
  return (
    <div className="error-alert" role="alert">
      <p>{message}</p>
      {onRetry ? <Button variant="ghost" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function MetricGrid({ children }) {
  return <div className="metric-grid">{children}</div>;
}
