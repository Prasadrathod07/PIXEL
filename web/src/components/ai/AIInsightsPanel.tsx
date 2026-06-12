'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,
  WifiOff,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { SeverityBadge } from '@/components/issues/IssueBadge'
import { cn } from '@/lib/utils'
import type { AIAnalysis, IssueSeverity, Issue } from '@/lib/types'
import axios from 'axios'
import { toast } from 'sonner'

interface AIInsightsPanelProps {
  issue: Issue
  initialAnalysis?: AIAnalysis | null
  onCopyToResponse?: (text: string) => void
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-muted/40 rounded animate-pulse', className)} />
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/5" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 80
      ? 'bg-green-500'
      : pct >= 60
      ? 'bg-amber-500'
      : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span
          className={cn(
            'font-semibold tabular-nums',
            pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function AIInsightsPanel({
  issue,
  initialAnalysis,
  onCopyToResponse,
}: AIInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(initialAnalysis ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedDraft, setCopiedDraft] = useState(false)
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set())

  const hasAnalysis = !!analysis

  // Build analysis from issue fields if no separate analysis object
  const displayAnalysis: AIAnalysis | null = hasAnalysis
    ? analysis
    : issue.ai_summary
    ? {
        summary: issue.ai_summary,
        suggested_severity: issue.ai_suggested_severity ?? issue.severity,
        suggested_category: issue.ai_suggested_category ?? issue.type,
        recommended_actions: (() => {
          try {
            const v = issue.ai_recommended_actions
            if (!v) return []
            const parsed = typeof v === 'string' ? JSON.parse(v) : v
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })(),
        draft_response: issue.ai_draft_response ?? '',
        similar_issues: Array.isArray(issue.ai_similar_issues) ? issue.ai_similar_issues : [],
        confidence_score: 0.82,
      }
    : null

  const reAnalyze = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post('/api/ai/analyze', {
        title: issue.title,
        description: issue.description,
        type: issue.type,
        severity: issue.severity,
      })
      const result: AIAnalysis = {
        summary: data.summary,
        suggested_severity: data.suggested_severity,
        suggested_category: data.suggested_category,
        recommended_actions: data.recommended_actions ?? [],
        draft_response: data.draft_response ?? '',
        similar_issues: data.similar_issues ?? [],
        confidence_score: data.confidence_score ?? 0.8,
      }
      setAnalysis(result)
      toast.success('AI analysis refreshed')
    } catch {
      setError('AI service unavailable. Please try again later.')
      toast.error('AI service unavailable')
    } finally {
      setLoading(false)
    }
  }, [issue])

  const copyDraftResponse = useCallback(() => {
    if (!displayAnalysis?.draft_response) return
    navigator.clipboard.writeText(displayAnalysis.draft_response).then(() => {
      setCopiedDraft(true)
      setTimeout(() => setCopiedDraft(false), 2000)
      onCopyToResponse?.(displayAnalysis.draft_response)
      toast.success('Copied to clipboard')
    })
  }, [displayAnalysis, onCopyToResponse])

  const toggleAction = (i: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="glass rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 0 10px hsl(217 91% 60% / 0.15)' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground flex-1">AI Analysis</h3>
        <button
          onClick={reAnalyze}
          disabled={loading}
          title="Re-analyze with AI"
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150',
            'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/80',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {loading ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>

      {/* Loading state */}
      {loading && <LoadingSkeleton />}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <WifiOff className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-400">AI service unavailable</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* No analysis yet */}
      {!loading && !error && !displayAnalysis && (
        <div className="text-center py-4 space-y-3">
          <Sparkles className="w-8 h-8 text-muted-foreground/20 mx-auto" />
          <div>
            <p className="text-xs font-medium text-foreground">No AI analysis yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click Re-analyze to generate insights for this issue.
            </p>
          </div>
        </div>
      )}

      {/* Analysis content */}
      {!loading && displayAnalysis && (
        <div className="space-y-4">
          {/* Confidence */}
          <ConfidenceBar score={displayAnalysis.confidence_score} />

          {/* Summary */}
          <blockquote className="border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground leading-relaxed italic">
            {displayAnalysis.summary}
          </blockquote>

          {/* Severity suggestion */}
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-md border border-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1.5">Suggested severity</p>
              <SeverityBadge severity={displayAnalysis.suggested_severity as IssueSeverity} />
            </div>
            {displayAnalysis.suggested_severity !== issue.severity && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-amber-400 font-medium">Differs from current</p>
                <p className="text-[10px] text-muted-foreground">
                  Current: {issue.severity}
                </p>
              </div>
            )}
            {displayAnalysis.suggested_severity === issue.severity && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-green-400 font-medium">Matches current</p>
              </div>
            )}
          </div>

          {/* Recommended actions */}
          {displayAnalysis.recommended_actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Recommended Actions
              </p>
              <ol className="space-y-2">
                {displayAnalysis.recommended_actions.map((action, i) => (
                  <li
                    key={i}
                    onClick={() => toggleAction(i)}
                    className={cn(
                      'flex items-start gap-2.5 text-xs cursor-pointer group transition-opacity',
                      checkedActions.has(i) && 'opacity-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-all',
                        checkedActions.has(i)
                          ? 'bg-green-500 border-green-500'
                          : 'border-border group-hover:border-primary/50'
                      )}
                    >
                      {checkedActions.has(i) && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors',
                        checkedActions.has(i) && 'line-through'
                      )}
                    >
                      {i + 1}. {action}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Draft response */}
          {displayAnalysis.draft_response && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Draft Response
                </p>
                <button
                  onClick={copyDraftResponse}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs transition-colors',
                    copiedDraft ? 'text-green-400' : 'text-muted-foreground hover:text-primary'
                  )}
                >
                  {copiedDraft ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedDraft ? 'Copied!' : 'Copy to response'}
                </button>
              </div>
              <div className="bg-muted/30 border border-border/60 rounded-md p-3 font-mono text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {displayAnalysis.draft_response}
              </div>
            </div>
          )}

          {/* Similar issues */}
          {displayAnalysis.similar_issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Similar Issues
              </p>
              <div className="flex flex-wrap gap-1.5">
                {displayAnalysis.similar_issues.slice(0, 5).map((si) => (
                  <Link
                    key={si.id}
                    href={`/manager/issues/${si.id}`}
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] bg-muted/40 border border-border/60',
                      'text-muted-foreground px-2 py-0.5 rounded-full hover:text-foreground',
                      'hover:border-primary/30 transition-colors max-w-[160px]'
                    )}
                    title={si.title}
                  >
                    <span className="truncate">{si.title}</span>
                    {si.similarity_score && (
                      <span className="shrink-0 text-primary/70 font-medium">
                        {Math.round(si.similarity_score * 100)}%
                      </span>
                    )}
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
