import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const MAX_QUESTIONS_PER_WEEK = 10

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405)

    const { question } = await req.json()
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return json({ error: 'Question required' }, 400)
    }
    if (question.length > 500) return json({ error: 'Question too long (max 500 chars)' }, 400)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()

    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await supabaseUser
      .from('profile')
      .select('role, trial_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!profile) return json({ error: 'Profile not found' }, 404)

    const isPremium = ['premium', 'lifetime', 'developer'].includes(profile.role) ||
      (profile.trial_expires_at && new Date(profile.trial_expires_at) > new Date())

    if (!isPremium) return json({ error: 'Premium required' }, 403)

    // Rate limit: count questions this week
    const now = new Date()
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - day)
    weekStart.setHours(0, 0, 0, 0)

    const { count } = await supabaseUser
      .from('coach_questions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())

    const questionsUsed = count ?? 0
    if (questionsUsed >= MAX_QUESTIONS_PER_WEEK) {
      return json({
        error: 'Rate limit reached',
        questions_used: questionsUsed,
        questions_max: MAX_QUESTIONS_PER_WEEK,
      }, 429)
    }

    const { data: coachData, error: rpcError } = await supabaseUser
      .rpc('get_coach_data', { p_user_id: user.id })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return json({ error: 'Failed to get data' }, 500)
    }

    const systemPrompt = `You are an AI fitness coach for PullPush, a Swedish training app.
Answer the user's question based on their actual training/nutrition data.
Be specific, reference their numbers. Keep answers concise (2-4 paragraphs max).
Respond in the same language as the question.
Do not give medical advice. For health concerns, recommend consulting a doctor.`

    const userPrompt = `User data:
${JSON.stringify(coachData, null, 2)}

User's question: ${question.trim()}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('Anthropic API error:', anthropicRes.status, errBody)
      return json({ error: 'AI service error' }, 502)
    }

    const anthropicData = await anthropicRes.json()
    const answer = anthropicData.content?.find((c: { type: string }) => c.type === 'text')?.text
    if (!answer) return json({ error: 'Empty AI response' }, 502)

    const tokensUsed = (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0)

    await supabaseUser
      .from('coach_questions')
      .insert({
        user_id: user.id,
        question: question.trim(),
        answer,
        tokens_used: tokensUsed,
      })

    return json({
      answer,
      questions_used: questionsUsed + 1,
      questions_max: MAX_QUESTIONS_PER_WEEK,
    })
  } catch (e) {
    console.error('Edge function error:', e)
    return json({ error: String(e) }, 500)
  }
})
