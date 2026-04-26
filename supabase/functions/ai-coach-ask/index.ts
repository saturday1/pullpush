import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const MAX_QUESTIONS_PER_WEEK = 10

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST required' }), { status: 405 })
    }

    const { question } = await req.json()
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Question required' }), { status: 400 })
    }

    if (question.length > 500) {
      return new Response(JSON.stringify({ error: 'Question too long (max 500 chars)' }), { status: 400 })
    }

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
      return new Response(JSON.stringify({
        error: 'Rate limit reached',
        questions_used: questionsUsed,
        questions_max: MAX_QUESTIONS_PER_WEEK,
      }), { status: 429 })
    }

    // Get coach data via RPC
    const { data: coachData, error: rpcError } = await supabaseUser
      .rpc('get_coach_data', { p_user_id: user.id })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return new Response(JSON.stringify({ error: 'Failed to get data' }), { status: 500 })
    }

    // Call Claude Haiku
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
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 502 })
    }

    const anthropicData = await anthropicRes.json()
    const answer = anthropicData.content?.find((c: { type: string }) => c.type === 'text')?.text
    if (!answer) {
      return new Response(JSON.stringify({ error: 'Empty AI response' }), { status: 502 })
    }

    const tokensUsed = (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0)

    // Save to DB
    await supabaseUser
      .from('coach_questions')
      .insert({
        user_id: user.id,
        question: question.trim(),
        answer,
        tokens_used: tokensUsed,
      })

    return new Response(JSON.stringify({
      answer,
      questions_used: questionsUsed + 1,
      questions_max: MAX_QUESTIONS_PER_WEEK,
    }))
  } catch (e) {
    console.error('Edge function error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
