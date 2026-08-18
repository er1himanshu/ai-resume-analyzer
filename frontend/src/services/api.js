const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function toFriendlyError(message) {
  if (!message) {
    return 'Something went wrong. Please try again.';
  }
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Unable to reach the server. Check your connection and ensure the backend is running.';
  }
  if (message.toLowerCase().includes('not found')) {
    return 'We could not find the requested record. Verify the resume or session ID and try again.';
  }
  return message;
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(toFriendlyError(data.detail || data.message || 'Request failed'));
  }
  return data;
}

export const apiService = {
  health: () => api('/api/health'),
  uploadResume: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api('/api/resumes/upload', { method: 'POST', body: formData });
  },
  analyzeResume: (resumeId) => api('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id: Number(resumeId) }),
  }),
  matchResume: (resumeId, jdContent) => api('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id: Number(resumeId), jd_content: jdContent }),
  }),
  atsScore: (resumeId, jdContent) => api('/api/ats-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id: Number(resumeId), jd_content: jdContent }),
  }),
  suggestions: (resumeId, jdContent) => api('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id: Number(resumeId), jd_content: jdContent }),
  }),
  interviewQuestions: (resumeId, jdContent) => api('/api/interview/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_id: Number(resumeId),
      jd_content: jdContent,
      num_questions_per_category: 3,
    }),
  }),
  evaluateAnswer: ({ sessionId, question, answer }) => api('/api/interview/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: Number(sessionId),
      question,
      answer,
    }),
  }),
  dashboard: (id) => api(`/api/dashboard/${Number(id)}`),
};
