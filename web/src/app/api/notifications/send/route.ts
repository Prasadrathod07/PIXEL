import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager')
    return NextResponse.json({ error: 'Forbidden — manager only' }, { status: 403 })

  const { recipients, message, type = 'info', issue_id = null } = await request.json()

  if (!message?.trim())
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (!recipients || (recipients !== 'all' && !Array.isArray(recipients)))
    return NextResponse.json({ error: 'recipients must be "all" or an array of user IDs' }, { status: 400 })

  const admin = createServiceSupabaseClient()

  // Resolve recipient user IDs
  let userIds: string[] = []
  if (recipients === 'all') {
    const { data: clients } = await admin.from('users').select('id').eq('role', 'client')
    userIds = (clients ?? []).map((c) => c.id)
  } else {
    userIds = recipients as string[]
  }

  if (userIds.length === 0)
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })

  const rows = userIds.map((userId) => ({
    user_id: userId,
    issue_id,
    type,
    message: message.trim(),
  }))

  const { error } = await admin.from('notifications').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sent: userIds.length })
}
