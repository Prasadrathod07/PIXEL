'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Globe,
  AlertCircle,
  Send,
  X,
  Loader2,
  Users,
  Info,
  Megaphone,
  Activity,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { User } from '@/lib/types'

interface ClientRow {
  client: User
  siteCount: number
  openCount: number
}

type NotifType = 'info' | 'announcement' | 'status'

// ─── Send Notification Modal ────────────────────────────────────────────────

interface ModalProps {
  clients: ClientRow[]
  initialRecipients: 'all' | string[]
  onClose: () => void
}

function SendNotificationModal({ clients, initialRecipients, onClose }: ModalProps) {
  const isAll = initialRecipients === 'all'
  const [selected, setSelected] = useState<Set<string>>(
    isAll
      ? new Set(clients.map((r) => r.client.id))
      : new Set(initialRecipients as string[])
  )
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotifType>('info')
  const [sending, setSending] = useState(false)

  const toggleClient = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map((r) => r.client.id)))
    }
  }

  const allSelected = selected.size === clients.length
  const canSend = message.trim().length > 0 && selected.size > 0

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const { data } = await axios.post('/api/notifications/send', {
        recipients: Array.from(selected),
        message: message.trim(),
        type,
      })
      toast.success(`Notification sent to ${data.sent} client${data.sent !== 1 ? 's' : ''}`)
      onClose()
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? err.message)
        : 'Failed to send'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const typeOptions: { value: NotifType; label: string; icon: React.ElementType }[] = [
    { value: 'info', label: 'Info', icon: Info },
    { value: 'announcement', label: 'Announcement', icon: Megaphone },
    { value: 'status', label: 'Status Update', icon: Activity },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg glass rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Send Notification</h2>
              <p className="text-xs text-muted-foreground">
                {selected.size} recipient{selected.size !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon
                const active = type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all',
                      active
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-2">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              rows={3}
              maxLength={300}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="text-right text-xs text-muted-foreground mt-1">{message.length}/300</p>
          </div>

          {/* Recipients checklist */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-2">Recipients</label>
            <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
              {/* Select-all row */}
              <button
                type="button"
                onClick={toggleAll}
                className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left"
              >
                <Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected} />
                <div className="flex items-center gap-1.5 flex-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    All clients ({clients.length})
                  </span>
                </div>
                {selected.size > 0 && !allSelected && (
                  <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                )}
              </button>

              {/* Individual clients */}
              <div className="max-h-52 overflow-y-auto divide-y divide-border/40">
                {clients.map(({ client, siteCount, openCount }) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => toggleClient(client.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                  >
                    <Checkbox checked={selected.has(client.id)} />
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 uppercase">
                      {getInitials(client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{client.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                      <span>{siteCount} site{siteCount !== 1 ? 's' : ''}</span>
                      {openCount > 0 && (
                        <span className="text-amber-400">{openCount} open</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {selected.size > 0
                ? `Sending to ${selected.size} client${selected.size !== 1 ? 's' : ''}`
                : 'Select at least one recipient'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend || sending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                style={{ boxShadow: canSend ? '0 0 16px hsl(217 91% 60% / 0.3)' : 'none' }}
              >
                {sending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
                ) : (
                  <><Send className="w-3.5 h-3.5" />Send</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div className={cn(
      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
      checked || indeterminate ? 'bg-primary border-primary' : 'border-border'
    )}>
      {indeterminate && !checked ? (
        <div className="w-2 h-0.5 bg-white rounded-full" />
      ) : checked ? (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </div>
  )
}

// ─── Clients Table ───────────────────────────────────────────────────────────

interface ClientsTableProps {
  clientRows: ClientRow[]
}

export function ClientsTable({ clientRows }: ClientsTableProps) {
  const [modal, setModal] = useState<{ recipients: 'all' | string[] } | null>(null)

  return (
    <>
      {modal && (
        <SendNotificationModal
          clients={clientRows}
          initialRecipients={modal.recipients}
          onClose={() => setModal(null)}
        />
      )}

      <div className="glass rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Client', 'Email', 'Sites', 'Open Issues', 'Joined'].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
              <th className="px-5 py-3 text-right">
                <button
                  onClick={() => setModal({ recipients: 'all' })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                  style={{ boxShadow: '0 0 14px hsl(217 91% 60% / 0.3)' }}
                >
                  <Send className="w-3 h-3" />
                  Notify All Clients
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {clientRows.map(({ client, siteCount, openCount }, idx) => (
              <tr
                key={client.id}
                className={cn(
                  'hover:bg-muted/20 transition-colors',
                  idx < clientRows.length - 1 && 'border-b border-border/50'
                )}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 uppercase">
                      {getInitials(client.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {client.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">
                    {client.email}
                  </a>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium tabular-nums">{siteCount}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className={cn('w-3.5 h-3.5', openCount > 0 ? 'text-amber-400' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium tabular-nums', openCount > 0 ? 'text-amber-400' : 'text-muted-foreground')}>
                      {openCount}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(client.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/manager/issues?client=${client.id}`}
                      className="text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      View issues →
                    </Link>
                    <button
                      onClick={() => setModal({ recipients: [client.id] })}
                      title={`Send notification to ${client.name}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all"
                    >
                      <Send className="w-3 h-3" />
                      Notify
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  )
}
