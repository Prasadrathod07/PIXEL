'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Bug,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeverityBadge } from '@/components/issues/IssueBadge'
import type { AIAnalysis, Site } from '@/lib/types'

// ─── constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  {
    value: 'bug',
    label: 'Bug',
    icon: Bug,
    description: 'Something is broken or not working correctly',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    icon: MessageSquare,
    description: 'Share your experience or thoughts',
  },
  {
    value: 'suggestion',
    label: 'Suggestion',
    icon: Lightbulb,
    description: 'An idea to improve something',
  },
  {
    value: 'improvement',
    label: 'Improvement',
    icon: TrendingUp,
    description: 'Enhancement to an existing feature',
  },
] as const

const SEVERITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low',
    description: 'Minor issue with minimal impact',
    border: 'border-green-500/30',
    activeBorder: 'border-green-500',
    bg: 'bg-green-500/5',
    activeBg: 'bg-green-500/15',
    text: 'text-green-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Moderate impact on functionality',
    border: 'border-yellow-500/30',
    activeBorder: 'border-yellow-500',
    bg: 'bg-yellow-500/5',
    activeBg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Significant impact on users',
    border: 'border-orange-500/30',
    activeBorder: 'border-orange-500',
    bg: 'bg-orange-500/5',
    activeBg: 'bg-orange-500/15',
    text: 'text-orange-400',
  },
  {
    value: 'critical',
    label: 'Critical',
    description: 'Blocking issue requiring immediate attention',
    border: 'border-red-500/30',
    activeBorder: 'border-red-500',
    bg: 'bg-red-500/5',
    activeBg: 'bg-red-500/15',
    text: 'text-red-400',
  },
] as const

const STEPS = ['Basic Info', 'Severity & Attachment', 'AI Analysis', 'Review & Submit']

const inputClass =
  'w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'

// ─── inner form (uses useSearchParams — must be inside Suspense) ───────────────

function NewIssueForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSiteId = searchParams.get('site_id') ?? ''

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [siteId, setSiteId] = useState(preSiteId)
  const [type, setType] = useState('bug')
  const [severity, setSeverity] = useState('medium')
  const [attachment, setAttachment] = useState<File | null>(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysis | null>(null)
  const [aiApplied, setAiApplied] = useState(false)

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get('/api/sites')
      return data
    },
  })

  // Auto-select site if pre-filled or only one exists
  useEffect(() => {
    if (!siteId && sites.length === 1) setSiteId(sites[0].id)
  }, [sites, siteId])

  const titleError = title.length > 0 && title.length < 10 ? 'Title must be at least 10 characters' : ''
  const descError = description.length > 0 && description.length < 30 ? 'Description must be at least 30 characters' : ''
  const step1Valid = title.length >= 10 && description.length >= 30 && !!siteId
  const step2Valid = !!severity

  const selectedSite = sites.find((s) => s.id === siteId)

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const { data } = await axios.post('/api/ai/analyze', {
        title,
        description,
        type,
        severity,
      })
      setAiResult(data)
    } catch {
      toast.error('AI analysis unavailable. You can still submit your issue.')
    } finally {
      setAnalyzing(false)
    }
  }

  function applyAiSuggestions() {
    if (!aiResult) return
    setSeverity(aiResult.suggested_severity)
    setType(aiResult.suggested_category)
    setAiApplied(true)
    toast.success('AI suggestions applied')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: issue } = await axios.post('/api/issues', {
        title,
        description,
        site_id: siteId,
        type,
        severity,
        ...(attachment && { attachment_name: attachment.name }),
        ...(aiResult && {
          ai_summary: aiResult.summary,
          ai_suggested_severity: aiResult.suggested_severity,
          ai_suggested_category: aiResult.suggested_category,
          ai_recommended_actions: JSON.stringify(aiResult.recommended_actions),
          ai_similar_issues: aiResult.similar_issues,
        }),
      })
      toast.success('Issue reported successfully')
      router.push(`/issues/${issue.id}`)
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) ? (err.response?.data?.error ?? err.message) : 'Failed to submit'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Report an Issue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe the problem you encountered
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STEPS.map((s, i) => {
          const num = i + 1
          const done = step > num
          const active = step === num
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border',
                  done && 'bg-green-500/15 border-green-500 text-green-400',
                  active && 'bg-primary/15 border-primary text-primary',
                  !done && !active && 'bg-muted border-border text-muted-foreground'
                )}
              >
                {done ? <Check className="w-3 h-3" /> : num}
              </div>
              <span
                className={cn(
                  'text-xs hidden sm:block',
                  active ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('w-6 h-px mx-1', done ? 'bg-green-500/40' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step panel */}
      <div className="glass rounded-lg p-6">
        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue (min 10 chars)"
                className={inputClass}
              />
              {titleError && (
                <p className="text-xs text-destructive mt-1">{titleError}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description: steps to reproduce, expected vs actual behaviour (min 30 chars)"
                rows={5}
                className={cn(inputClass, 'resize-none')}
              />
              <div className="flex items-center justify-between mt-1">
                {descError ? (
                  <p className="text-xs text-destructive">{descError}</p>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    'text-xs',
                    description.length >= 30 ? 'text-muted-foreground' : 'text-amber-400'
                  )}
                >
                  {description.length} / 30 min
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Site <span className="text-destructive">*</span>
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a site…</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-3">
                Issue Type <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const active = type === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted/20 hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          className={cn(
                            'w-4 h-4',
                            active ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Severity & Attachment ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-3">
                Severity <span className="text-destructive">*</span>
              </label>
              <div className="space-y-2">
                {SEVERITY_OPTIONS.map((opt) => {
                  const active = severity === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className={cn(
                        'w-full p-4 rounded-lg border text-left transition-all flex items-center gap-4',
                        active ? `${opt.activeBorder} ${opt.activeBg}` : `${opt.border} ${opt.bg} hover:opacity-90`
                      )}
                    >
                      <span className={cn('text-sm font-semibold w-16 shrink-0', opt.text)}>
                        {opt.label}
                      </span>
                      <span className="text-sm text-muted-foreground flex-1">
                        {opt.description}
                      </span>
                      {active && <Check className={cn('w-4 h-4 shrink-0', opt.text)} />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-3">
                Attachment{' '}
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </label>

              {attachment ? (
                <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="flex-1 text-sm text-foreground truncate">{attachment.name}</div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    PNG, JPG, PDF — up to 10 MB
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".png,.jpg,.jpeg,.pdf,.gif,.webp"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: AI Analysis ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center space-y-2 pb-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-base font-medium text-foreground">AI Analysis</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Let AI analyze your issue for better categorization and actionable insights.
              </p>
            </div>

            {!aiResult && !analyzing && (
              <button
                type="button"
                onClick={handleAnalyze}
                className="w-full py-3 bg-primary/10 border border-primary/30 rounded-lg text-sm font-medium text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Analyze with AI
              </button>
            )}

            {analyzing && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Analyzing your issue…</p>
              </div>
            )}

            {aiResult && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Analysis Complete</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {Math.round(aiResult.confidence_score * 100)}% confidence
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {aiResult.summary}
                  </p>

                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Suggested severity:</span>
                    <SeverityBadge severity={aiResult.suggested_severity} />
                    {aiResult.suggested_severity !== severity && (
                      <span className="text-xs text-amber-400">
                        (you selected: {severity})
                      </span>
                    )}
                  </div>

                  {aiResult.recommended_actions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">
                        Recommended Actions
                      </p>
                      <ul className="space-y-1.5">
                        {aiResult.recommended_actions.map((action, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={applyAiSuggestions}
                  disabled={aiApplied}
                  className={cn(
                    'w-full py-2.5 border rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                    aiApplied
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-default'
                      : 'bg-muted/30 border-border text-foreground hover:bg-muted/50'
                  )}
                >
                  {aiApplied ? (
                    <>
                      <Check className="w-4 h-4" /> Suggestions Applied
                    </>
                  ) : (
                    'Apply AI Suggestions'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setAiResult(null); setAiApplied(false) }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center"
                >
                  Re-analyze
                </button>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 rounded-md p-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              AI analysis is optional. You can skip this step and submit directly.
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Submit ── */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Review your submission</h2>

            <div className="space-y-0 divide-y divide-border/50">
              <ReviewRow label="Title" value={title} />
              <ReviewRow label="Site" value={selectedSite?.name ?? '—'} />
              <ReviewRow
                label="Type"
                value={TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type}
              />
              <ReviewRow
                label="Severity"
                value={<SeverityBadge severity={severity as 'low' | 'medium' | 'high' | 'critical'} />}
              />
              {attachment && <ReviewRow label="Attachment" value={attachment.name} />}
              {aiResult && (
                <ReviewRow
                  label="AI Analysis"
                  value={
                    <span className="text-xs text-primary font-medium">
                      Included ({Math.round(aiResult.confidence_score * 100)}% confidence)
                    </span>
                  }
                />
              )}
            </div>

            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
              <div className="text-sm text-muted-foreground bg-muted/20 border border-border/50 rounded-md p-3 leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 ? !step1Valid : step === 2 ? !step2Valid : false}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {step === 3 ? 'Continue to Review' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Issue'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

// ─── page export (wraps form in Suspense for useSearchParams) ─────────────────

export default function NewIssuePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto flex items-center justify-center h-48 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <NewIssueForm />
    </Suspense>
  )
}
