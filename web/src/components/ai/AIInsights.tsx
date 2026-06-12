'use client'

import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import { SeverityBadge, TypeBadge } from '@/components/issues/IssueBadge'
import type { AIAnalysis } from '@/lib/types'

interface AIInsightsProps {
  analysis: AIAnalysis
  onApplySuggestion?: (field: string, value: string) => void
}

export function AIInsights({ analysis, onApplySuggestion }: AIInsightsProps) {
  return (
    <div className="glass rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Analysis</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {Math.round(analysis.confidence_score * 100)}% confidence
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{analysis.summary}</p>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Suggested:</span>
        <SeverityBadge severity={analysis.suggested_severity} />
        <TypeBadge type={analysis.suggested_category} />
      </div>

      {analysis.recommended_actions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Recommended Actions</p>
          <ul className="space-y-1.5">
            {analysis.recommended_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.draft_response && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Draft Response</p>
          <p className="text-xs text-muted-foreground bg-muted rounded-md p-3 leading-relaxed">
            {analysis.draft_response}
          </p>
          {onApplySuggestion && (
            <button
              onClick={() => onApplySuggestion('response', analysis.draft_response)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Use this response
            </button>
          )}
        </div>
      )}

      {analysis.similar_issues.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">
            Similar Issues ({analysis.similar_issues.length})
          </p>
          <div className="space-y-1.5">
            {analysis.similar_issues.slice(0, 3).map((issue) => (
              <div key={issue.id} className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">{issue.title}</span>
                <span className="ml-auto text-muted-foreground shrink-0">
                  {Math.round(issue.similarity_score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
