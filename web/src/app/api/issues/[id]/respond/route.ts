import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyManagerResponse } from '@/lib/utils/notifications'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'manager' && role !== 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { content } = await request.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const { data: issue } = await supabase
    .from('issues')
    .select('created_by, title')
    .eq('id', id)
    .single()

  // Clients can only comment on their own issues
  if (role === 'client' && issue?.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const eventType = role === 'manager' ? 'response_added' : 'comment_added'

  const { data: event, error: evErr } = await supabase
    .from('timeline_events')
    .insert({ issue_id: id, event_type: eventType, content, author_id: user.id })
    .select('*, author:users(id, name, email, avatar_url)')
    .single()

  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })

  if (role === 'manager' && issue) {
    await supabase
      .from('issues')
      .update({ status: 'waiting_for_client', updated_at: new Date().toISOString() })
      .eq('id', id)
    await notifyManagerResponse(id, issue.title, issue.created_by)
  }

  return NextResponse.json(event, { status: 201 })
}
