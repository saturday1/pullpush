import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: image_base64,
                },
              },
              {
                text: `Analyze this food photo. Estimate the nutritional content of the visible food.
Respond ONLY with a JSON object in this exact format, no other text:
{"food": "brief description of the food", "protein_g": number, "carbs_g": number, "fat_g": number, "kcal": number}
Use reasonable estimates based on typical portion sizes visible in the photo. All numbers should be integers.`,
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, errBody)
      return json({ error: 'AI service error' }, 502)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
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
