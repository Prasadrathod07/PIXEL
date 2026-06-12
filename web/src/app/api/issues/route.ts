import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyManagersNewIssue } from '@/lib/utils/notifications'

export async function GET(request: Request) {
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
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('site_id')
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const search = searchParams.get('search')

  let query = supabase
    .from('issues')
    .select(
      '*, site:sites(id, name, url), creator:users!created_by(id, name, email, avatar_url)'
    )

  if (profile.role === 'client') query = query.eq('created_by', user.id)
  if (siteId) query = query.eq('site_id', siteId)
  if (status) query = query.eq('status', status)
  if (severity) query = query.eq('severity', severity)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, site_id, type, severity } = body

  if (!title || !description || !site_id || !type || !severity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .insert({
      title,
      description,
      site_id,
      type,
      severity,
      status: 'open',
      created_by: user.id,
      attachment_url: body.attachment_url ?? null,
      attachment_name: body.attachment_name ?? null,
      ai_summary: body.ai_summary ?? null,
      ai_suggested_severity: body.ai_suggested_severity ?? null,
      ai_suggested_category: body.ai_suggested_category ?? null,
      ai_recommended_actions: body.ai_recommended_actions ?? null,
      ai_similar_issues: body.ai_similar_issues ?? null,
    })
    .select(
      '*, site:sites(id, name, url), creator:users!created_by(id, name, email, avatar_url)'
    )
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create timeline 'created' event
  await supabase.from('timeline_events').insert({
    issue_id: issue.id,
    event_type: 'created',
    author_id: user.id,
  })

  // Notify all managers about the new issue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (issue as any).creator?.name ?? 'A client'
  await notifyManagersNewIssue(issue.id, issue.title, clientName)

  return NextResponse.json(issue, { status: 201 })
}
