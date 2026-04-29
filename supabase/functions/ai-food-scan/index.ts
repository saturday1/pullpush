import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

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

    const { image_base64 } = await req.json()
    if (!image_base64 || typeof image_base64 !== 'string') {
      return json({ error: 'image_base64 required' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()

    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await supabaseAdmin
      .from('profile')
      .select('role, trial_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!profile) return json({ error: 'Profile not found' }, 404)

    const isPremium = ['premium', 'lifetime', 'developer'].includes(profile.role) ||
      (profile.trial_expires_at && new Date(profile.trial_expires_at) > new Date())

    if (!isPremium) return json({ error: 'Premium required' }, 403)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image_base64,
              },
            },
            {
              type: 'text',
              text: `Analyze this food photo. Estimate the nutritional content of the visible food.
Respond ONLY with a JSON object in this exact format, no other text:
{"food": "brief description of the food", "protein_g": number, "carbs_g": number, "fat_g": number, "kcal": number}
Use reasonable estimates based on typical portion sizes visible in the photo. All numbers should be integers.`,
            },
          ],
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('Anthropic API error:', anthropicRes.status, errBody)
      return json({ error: 'AI service error' }, 502)
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.find((c: { type: string }) => c.type === 'text')?.text
    if (!rawText) return json({ error: 'Empty AI response' }, 502)

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Validate required numeric fields
    const result = {
      food: typeof parsed.food === 'string' ? parsed.food : 'Unknown food',
      protein_g: typeof parsed.protein_g === 'number' ? parsed.protein_g : 0,
      carbs_g: typeof parsed.carbs_g === 'number' ? parsed.carbs_g : 0,
      fat_g: typeof parsed.fat_g === 'number' ? parsed.fat_g : 0,
      kcal: typeof parsed.kcal === 'number' ? parsed.kcal : 0,
    }

    return json(result)
  } catch (e) {
    console.error('Edge function error:', e)
    return json({ error: String(e) }, 500)
  }
})
