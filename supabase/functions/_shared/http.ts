const configuredOrigins = (Deno.env.get('RALLI_ALLOWED_ORIGINS') ?? '')
  .split(',').map((origin) => origin.trim()).filter(Boolean)

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin')
  const allowedOrigin = configuredOrigins.length === 0
    ? '*'
    : origin && configuredOrigins.includes(origin) ? origin : null
  if (!allowedOrigin) return null
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
