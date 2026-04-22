import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')!
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')!
const APNS_PRIVATE_KEY = Deno.env.get('APNS_PRIVATE_KEY')!

// Bundle ID + Live Activity suffix
const APNS_TOPIC = 'com.pullpush.app.push-type.liveactivity'

// Apple reference date offset (2001-01-01 vs 1970-01-01)
const APPLE_EPOCH_OFFSET = 978307200

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function createAPNsJWT(): Promise<string> {
  const header = { alg: 'ES256', kid: APNS_KEY_ID }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: APNS_TEAM_ID, iat: now }

  // Import .p8 private key (PKCS#8 PEM)
  const pemClean = APNS_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const keyData = Uint8Array.from(atob(pemClean), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)))
  const sigInput = enc.encode(`${headerB64}.${payloadB64}`)

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    sigInput,
  )

  const sigB64 = base64url(new Uint8Array(signature))
  return `${headerB64}.${payloadB64}.${sigB64}`
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Find expired, unprocessed tokens
    const { data: tokens, error } = await supabase
      .from('live_activity_tokens')
      .select('*')
      .lte('end_time', new Date().toISOString())

    if (error) {
      console.error('DB query error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!tokens?.length) {
      return new Response(JSON.stringify({ processed: 0 }))
    }

    const jwt = await createAPNsJWT()
    let processed = 0

    for (const token of tokens) {
      const unixTime = Math.floor(new Date(token.end_time).getTime() / 1000)
      // Swift's default Date Codable uses timeIntervalSinceReferenceDate (2001 epoch)
      const appleTime = unixTime - APPLE_EPOCH_OFFSET

      const apnsPayload = {
        aps: {
          timestamp: unixTime,
          event: 'end',
          'dismissal-date': unixTime,
          'content-state': {
            endTime: appleTime,
          },
        },
      }

      try {
        const res = await fetch(
          `https://api.push.apple.com/3/device/${token.push_token}`,
          {
            method: 'POST',
            headers: {
              authorization: `bearer ${jwt}`,
              'apns-topic': APNS_TOPIC,
              'apns-push-type': 'liveactivity',
              'apns-priority': '10',
              'content-type': 'application/json',
            },
            body: JSON.stringify(apnsPayload),
          },
        )

        if (res.ok) {
          processed++
          console.log(`APNs end sent for token ${token.id}`)
        } else {
          const body = await res.text()
          console.error(`APNs error ${res.status} for ${token.id}: ${body}`)
        }
      } catch (e) {
        console.error(`APNs request failed for ${token.id}:`, e)
      }

      // Delete processed token
      await supabase.from('live_activity_tokens').delete().eq('id', token.id)
    }

    return new Response(JSON.stringify({ processed }))
  } catch (e) {
    console.error('Edge function error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
