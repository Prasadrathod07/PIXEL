import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function createNotification({
  userId,
  issueId,
  type,
  message,
}: {
  userId: string
  issueId: string
  type: string
  message: string
}) {
  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, issue_id: issueId, type, message })
  if (error) console.error('Failed to create notification:', error)
}

async function getManagerIds(): Promise<string[]> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase.from('users').select('id').eq('role', 'manager')
  return (data ?? []).map((u) => u.id)
}

export async function notifyManagersNewIssue(
  issueId: string,
  issueTitle: string,
  clientName: string
) {
  const managerIds = await getManagerIds()
  await Promise.all(
    managerIds.map((managerId) =>
      createNotification({
        userId: managerId,
        issueId,
        type: 'new_issue',
        message: `New issue reported by ${clientName}: "${issueTitle}"`,
      })
    )
  )
}

export async function notifyManagersClientUpdate(
  issueId: string,
  issueTitle: string,
  clientName: string
) {
  const managerIds = await getManagerIds()
  await Promise.all(
    managerIds.map((managerId) =>
      createNotification({
        userId: managerId,
        issueId,
        type: 'client_update',
        message: `${clientName} added an update to "${issueTitle}"`,
      })
    )
  )
}

export async function notifyIssueResolved(issueId: string, issueTitle: string, clientId: string) {
  const supabase = createServiceSupabaseClient()
  const { data: client } = await supabase
    .from('users')
    .select('email')
    .eq('id', clientId)
    .single()

  await createNotification({
    userId: clientId,
    issueId,
    type: 'resolved',
    message: `Your issue "${issueTitle}" has been resolved! Click to view the resolution.`,
  })

  console.log(`
  📧 MOCK EMAIL NOTIFICATION
  ─────────────────────────
  To: ${client?.email ?? clientId}
  Subject: Issue Resolved — ${issueTitle}
  Body: Your issue has been resolved.
        Visit ${process.env.NEXT_PUBLIC_API_URL}/client/issues/${issueId} to see the details.
  ─────────────────────────
  (In production: Send via Resend/SendGrid)
`)
}

export async function notifyManagerResponse(issueId: string, issueTitle: string, clientId: string) {
  await createNotification({
    userId: clientId,
    issueId,
    type: 'response',
    message: `A manager has responded to your issue "${issueTitle}".`,
  })
}

export async function notifyStatusChange(
  issueId: string,
  issueTitle: string,
  clientId: string,
  newStatus: string
) {
  const statusLabel = newStatus.replace(/_/g, ' ')
  await createNotification({
    userId: clientId,
    issueId,
    type: 'status',
    message: `Your issue "${issueTitle}" status changed to ${statusLabel}.`,
  })
}
