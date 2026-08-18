export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function toTitle(value) {
  if (!value) {
    return 'N/A';
  }
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function safeScore(value, max = 100) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), max);
}

export function scoreLabel(score) {
  if (score == null) {
    return 'Unavailable';
  }
  if (score >= 85) {
    return 'Excellent';
  }
  if (score >= 70) {
    return 'Strong';
  }
  if (score >= 55) {
    return 'Moderate';
  }
  return 'Needs Improvement';
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}
