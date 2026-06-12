'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ClientCommentForm({ issueId }: { issueId: string }) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await axios.post(`/api/issues/${issueId}/respond`, { content: comment.trim() })
      toast.success('Comment added')
      setComment('')
      router.refresh()
    } catch {
      toast.error('Failed to add comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment or follow-up information…"
        rows={3}
        className={cn(
          'w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-1 focus:ring-primary resize-none'
        )}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !comment.trim()}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {submitting ? 'Posting…' : 'Add Comment'}
        </button>
      </div>
    </form>
  )
}
