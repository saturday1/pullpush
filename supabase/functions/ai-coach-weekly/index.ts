import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
  const start = new Date(now)
  start.setDate(now.getDate() - day)
  return start.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 })
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Verify premium role
    const { data: profile } = await supabaseUser
      .from('profile')
      .select('role, trial_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 })
    }

    const isPremium = ['premium', 'lifetime', 'developer'].includes(profile.role) ||
      (profile.trial_expires_at && new Date(profile.trial_expires_at) > new Date())

    if (!isPremium) {
      return new Response(JSON.stringify({ error: 'Premium required' }), { status: 403 })
    }

    const weekStart = getWeekStart()

    // Check cache
    const { data: cached } = await supabaseUser
      .from('coach_summaries')
      .select('summary_json')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single()

    if (cached) {
      return new Response(JSON.stringify(cached.summary_json))
    }

    // Get coach data via RPC
    const { data: coachData, error: rpcError } = await supabaseUser
      .rpc('get_coach_data', { p_user_id: user.id })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return new Response(JSON.stringify({ error: 'Failed to get data' }), { status: 500 })
    }

    // Call Claude Sonnet
    const systemPrompt = `You are an AI fitness coach for a Swedish training app called PullPush.
Analyze the user's training data and provide personalized coaching.
Respond in the same language the user's app is set to (detect from profile data or default to Swedish).
Be encouraging but honest. Use specific numbers from their data.
Keep insights actionable and concise.`

    const userPrompt = `Here is the user's data from the last 4 weeks:

${JSON.stringify(coachData, null, 2)}

Generate a weekly coaching summary with:
1. "summary": An array of 3-5 personalized insights (strings) based on their actual data. Reference specific numbers, exercises, and trends.
2. "insights": An array of 2-3 short insight cards. Each card has:
   - "title": A short headline (max 8 words)
   - "body": A specific, actionable tip (1-2 sentences)
   - "type": One of "progress", "nutrition", "recovery", "tip"

Respond ONLY with valid JSON matching this schema:
{
  "summary": ["insight1", "insight2", ...],
  "insights": [{"title": "...", "body": "...", "type": "..."}, ...]
}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('Anthropic API error:', anthropicRes.status, errBody)
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 502 })
    }

    const anthropicData = await anthropicRes.json()
    const textContent = anthropicData.content?.find((c: { type: string }) => c.type === 'text')?.text
    if (!textContent) {
      return new Response(JSON.stringify({ error: 'Empty AI response' }), { status: 502 })
    }

    // Parse JSON from response (handle markdown code blocks)
    let summaryJson
    try {
      const jsonStr = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      summaryJson = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse AI response:', textContent)
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), { status: 502 })
    }

    const tokensUsed = (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0)

    // Cache in DB
    await supabaseUser
      .from('coach_summaries')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        summary_json: summaryJson,
        tokens_used: tokensUsed,
      }, { onConflict: 'user_id,week_start' })

    return new Response(JSON.stringify(summaryJson))
  } catch (e) {
    console.error('Edge function error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
