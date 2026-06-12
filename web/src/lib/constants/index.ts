export const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  in_progress: 'In Progress',
  waiting_for_client: 'Waiting for Client',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_review: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  waiting_for_client: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export const SITE_STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500/10 text-green-400 border-green-500/20',
  down: 'bg-red-500/10 text-red-400 border-red-500/20',
  degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  feedback: 'Feedback',
  suggestion: 'Suggestion',
  improvement: 'Improvement',
}
