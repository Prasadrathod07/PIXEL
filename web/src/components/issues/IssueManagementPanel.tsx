'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Send,
  Loader2,
  Eye,
  Edit3,
  Check,
  Lock,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { StatusBadge, SeverityBadge } from '@/components/issues/IssueBadge'
import { cn } from '@/lib/utils'
import {
  ISSUE_STATUS_LABELS,
  SEVERITY_LABELS,
} from '@/lib/constants'
import type { IssueStatus, IssueSeverity } from '@/lib/types'
import axios from 'axios'
import { toast } from 'sonner'

const STATUS_ORDER: IssueStatus[] = [
  'open',
  'in_review',
  'in_progress',
  'waiting_for_client',
  'resolved',
  'closed',
]

const SEVERITY_ORDER: IssueSeverity[] = ['low', 'medium', 'high', 'critical']

interface IssueManagementPanelProps {
  issueId: string
  initialStatus: IssueStatus
  initialSeverity: IssueSeverity
  onUpdated?: (updates: { status?: IssueStatus; severity?: IssueSeverity }) => void
  onResponseSent?: (event: unknown) => void
  prefillResponse?: string
  issueTitle?: string
  issueDescription?: string
  issueType?: string
}

function SavingIndicator({ saving }: { saving: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs transition-opacity duration-200',
        saving ? 'opacity-100 text-primary' : 'opacity-0'
      )}
    >
      <Loader2 className="w-3 h-3 animate-spin" />
      Saving…
    </span>
  )
}

export function IssueManagementPanel({
  issueId,
  initialStatus,
  initialSeverity,
  onUpdated,
  onResponseSent,
  prefillResponse,
  issueTitle,
  issueDescription,
  issueType,
}: IssueManagementPanelProps) {
  const [status, setStatus] = useState<IssueStatus>(initialStatus)
  const [severity, setSeverity] = useState<IssueSeverity>(initialSeverity)
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingSeverity, setSavingSeverity] = useState(false)
  const [savingResponse, setSavingResponse] = useState(false)
  const [improvingResponse, setImprovingResponse] = useState(false)

  const [response, setResponse] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [internalNote, setInternalNote] = useState('')
  const [showInternalNote, setShowInternalNote] = useState(false)

  const MAX_CHARS = 2000
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync if parent passes new initial values (e.g. after re-fetch)
  useEffect(() => { setStatus(initialStatus) }, [initialStatus])
  useEffect(() => { setSeverity(initialSeverity) }, [initialSeverity])

  // Populate response when AI draft is copied
  useEffect(() => {
    if (prefillResponse) {
      setResponse(prefillResponse)
      setPreviewMode(false)
      textareaRef.current?.focus()
    }
  }, [prefillResponse])

  const updateStatus = useCallback(
    async (newStatus: IssueStatus) => {
      const prev = status
      setStatus(newStatus)
      setSavingStatus(true)
      try {
        await axios.patch(`/api/issues/${issueId}`, { status: newStatus })
        onUpdated?.({ status: newStatus })
        toast.success(`Status updated to ${ISSUE_STATUS_LABELS[newStatus]}`)
      } catch {
        setStatus(prev)
        toast.error('Failed to update status')
      } finally {
        setSavingStatus(false)
      }
    },
    [issueId, status, onUpdated]
  )

  const updateSeverity = useCallback(
    async (newSeverity: IssueSeverity) => {
      const prev = severity
      setSeverity(newSeverity)
      setSavingSeverity(true)
      try {
        await axios.patch(`/api/issues/${issueId}`, { severity: newSeverity })
        onUpdated?.({ severity: newSeverity })
        toast.success(`Severity updated to ${SEVERITY_LABELS[newSeverity]}`)
      } catch {
        setSeverity(prev)
        toast.error('Failed to update severity')
      } finally {
        setSavingSeverity(false)
      }
    },
    [issueId, severity, onUpdated]
  )

  const sendResponse = useCallback(async () => {
    if (!response.trim()) return
    setSavingResponse(true)
    try {
      const { data: event } = await axios.post(`/api/issues/${issueId}/respond`, {
        content: response.trim(),
      })
      setResponse('')
      setPreviewMode(false)
      setStatus('waiting_for_client')
      onResponseSent?.(event)
      onUpdated?.({ status: 'waiting_for_client' })
      toast.success('Response sent to client')
    } catch {
      toast.error('Failed to send response')
    } finally {
      setSavingResponse(false)
    }
  }, [issueId, response, onResponseSent, onUpdated])

  const improveWithAI = useCallback(async () => {
    if (!response.trim()) {
      toast.error('Write a draft response first')
      return
    }
    setImprovingResponse(true)
    const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000'
    try {
      const { data } = await axios.post(`${aiUrl}/api/improve`, {
        draft: response.trim(),
        issue_title: issueTitle ?? '',
        issue_description: issueDescription ?? '',
        issue_type: issueType,
        issue_severity: severity,
      })
      setResponse(data.improved)
      setPreviewMode(false)
      textareaRef.current?.focus()
      toast.success('Response improved by AI')
    } catch {
      toast.error('AI improvement unavailable')
    } finally {
      setImprovingResponse(false)
    }
  }, [response, issueTitle, issueDescription, issueType, severity])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        sendResponse()
      }
    },
    [sendResponse]
  )

  return (
    <div className="space-y-4">
      {/* Status selector */}
      <div className="glass rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Status
          </p>
          <SavingIndicator saving={savingStatus} />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => s !== status && updateStatus(s)}
              disabled={savingStatus}
              className={cn(
                'px-2 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 text-left truncate',
                s === status
                  ? 'bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/80',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              <span className="flex items-center gap-1.5">
                {s === status && <Check className="w-2.5 h-2.5 shrink-0" />}
                {ISSUE_STATUS_LABELS[s]}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-1">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Severity selector */}
      <div className="glass rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Severity
          </p>
          <SavingIndicator saving={savingSeverity} />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {SEVERITY_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => s !== severity && updateSeverity(s)}
              disabled={savingSeverity}
              className={cn(
                'px-2 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 text-left',
                s === severity
                  ? 'bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/80',
                s === 'critical' && s !== severity && 'hover:border-red-500/30 hover:text-red-400',
                s === 'high' && s !== severity && 'hover:border-orange-500/30 hover:text-orange-400',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              <span className="flex items-center gap-1.5">
                {s === severity && <Check className="w-2.5 h-2.5 shrink-0" />}
                {SEVERITY_LABELS[s]}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-1">
          <SeverityBadge severity={severity} />
        </div>
      </div>

      {/* Response box */}
      <div className="glass rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Send Response
          </p>
          <button
            onClick={() => setPreviewMode((p) => !p)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {previewMode ? (
              <>
                <Edit3 className="w-3 h-3" />
                Edit
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Preview
              </>
            )}
          </button>
        </div>

        {previewMode ? (
          <div className="min-h-[96px] bg-muted/30 rounded-md border border-border/50 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {response || (
              <span className="text-muted-foreground italic text-xs">Nothing to preview</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={response}
            onChange={(e) => setResponse(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Type your response to the client…"
            rows={4}
            className="w-full bg-muted/30 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors"
          />
        )}

        {/* Improve with AI */}
        {!previewMode && (
          <button
            onClick={improveWithAI}
            disabled={improvingResponse || !response.trim()}
            className={cn(
              'w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150',
              'border-primary/30 text-primary/80 hover:text-primary hover:bg-primary/10 hover:border-primary/50',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {improvingResponse ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {improvingResponse ? 'Improving…' : 'Improve with AI'}
          </button>
        )}

        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs tabular-nums transition-colors',
              response.length > MAX_CHARS * 0.9
                ? 'text-amber-400'
                : 'text-muted-foreground/50'
            )}
          >
            {response.length}/{MAX_CHARS}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/40 hidden sm:block">
              Ctrl+Enter to send
            </span>
            <button
              onClick={sendResponse}
              disabled={savingResponse || !response.trim()}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {savingResponse ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {savingResponse ? 'Sending…' : 'Send Response'}
            </button>
          </div>
        </div>
      </div>

      {/* Internal notes (manager-only) */}
      <div className="glass rounded-lg p-4 space-y-3">
        <button
          onClick={() => setShowInternalNote((v) => !v)}
          className="w-full flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        >
          <Lock className="w-3 h-3" />
          Internal Notes
          <ChevronDown
            className={cn(
              'w-3 h-3 ml-auto transition-transform duration-200',
              showInternalNote && 'rotate-180'
            )}
          />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            showInternalNote ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="pt-1 space-y-2">
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Private notes — not visible to client…"
              rows={3}
              className="w-full bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none"
            />
            <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Only visible to managers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
