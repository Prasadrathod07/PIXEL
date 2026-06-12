export type UserRole = 'client' | 'manager'

export type SiteStatus = 'online' | 'down' | 'degraded' | 'unknown'

export type IssueType = 'bug' | 'feedback' | 'suggestion' | 'improvement'

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IssueStatus =
  | 'open'
  | 'in_review'
  | 'in_progress'
  | 'waiting_for_client'
  | 'resolved'
  | 'closed'

export type TimelineEventType =
  | 'created'
  | 'status_changed'
  | 'severity_changed'
  | 'comment_added'
  | 'response_added'
  | 'resolved'
  | 'closed'
  | 'attachment_added'
  | 'ai_analyzed'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Site {
  id: string
  name: string
  url: string
  status: SiteStatus
  last_checked: string
  client_id: string
  client?: User
  open_issues_count?: number
  created_at: string
}

export interface Issue {
  id: string
  title: string
  description: string
  type: IssueType
  severity: IssueSeverity
  status: IssueStatus
  site_id: string
  site?: Site
  created_by: string
  creator?: User
  assigned_to?: string
  assignee?: User
  attachment_url?: string
  attachment_name?: string
  ai_summary?: string
  ai_suggested_severity?: IssueSeverity
  ai_suggested_category?: IssueType
  ai_recommended_actions?: string
  ai_draft_response?: string
  ai_similar_issues?: SimilarIssue[]
  created_at: string
  updated_at: string
}

export interface SimilarIssue {
  id: string
  title: string
  severity: IssueSeverity
  status: IssueStatus
  similarity_score: number
}

export interface TimelineEvent {
  id: string
  issue_id: string
  event_type: TimelineEventType
  old_value?: string
  new_value?: string
  content?: string
  author_id: string
  author?: User
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  issue_id: string
  issue?: Issue
  type: string
  message: string
  read: boolean
  created_at: string
}

export interface AIAnalysis {
  suggested_severity: IssueSeverity
  suggested_category: IssueType
  summary: string
  recommended_actions: string[]
  draft_response: string
  similar_issues: SimilarIssue[]
  confidence_score: number
}
