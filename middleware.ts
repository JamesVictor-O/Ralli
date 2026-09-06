import { next } from '@vercel/functions'

export const config = {
  matcher: '/',
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function replaceTag(html: string, pattern: RegExp, replacement: string) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html
}

// Link previews (WhatsApp, iMessage, Twitter/X, Slack, ...) read <meta> tags from
// the raw HTML response — they never run the SPA's JS. Without this, every shared
// Ralli link previews as the generic app homepage instead of that specific challenge.
export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const ralliId = url.searchParams.get('ralli')
  if (!ralliId) return next()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !anonKey) return next()

  try {
    const dataResponse = await fetch(
      `${supabaseUrl}/rest/v1/ralli_feed?id=eq.${encodeURIComponent(ralliId)}&select=prompt,description,cover_path,category`,
      { headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` } },
    )
    if (!dataResponse.ok) return next()
    const [ralli] = await dataResponse.json() as { prompt: string | null; description: string | null; cover_path: string | null; category: string | null }[]
    if (!ralli?.prompt) return next()

    const title = `${ralli.prompt} — Ralli`
    const description = ralli.description?.trim() || `Join this Ralli: ${ralli.category || 'a social challenge'}.`
    const image = ralli.cover_path
      ? /^https?:\/\//.test(ralli.cover_path) ? ralli.cover_path : `${supabaseUrl}/storage/v1/object/public/ralli-media/${ralli.cover_path}`
      : `${url.origin}/railIcon.png`

    const pageResponse = await fetch(new URL('/index.html', request.url))
    if (!pageResponse.ok) return next()
    let html = await pageResponse.text()

    const safeTitle = escapeHtml(title)
    const safeDescription = escapeHtml(description)
    const safeImage = escapeHtml(image)

    html = replaceTag(html, /<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
    html = replaceTag(html, /<meta name="description" content=".*?" \/>/, `<meta name="description" content="${safeDescription}" />`)
    html = replaceTag(html, /<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${safeTitle}" />`)
    html = replaceTag(html, /<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${safeDescription}" />`)
    html = replaceTag(html, /<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${safeImage}" />`)
    html = replaceTag(html, /<meta name="twitter:card" content=".*?" \/>/, '<meta name="twitter:card" content="summary_large_image" />')
    html = replaceTag(html, /<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${safeTitle}" />`)
    html = replaceTag(html, /<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${safeDescription}" />`)
    html = replaceTag(html, /<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${safeImage}" />`)

    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  } catch (error) {
    console.error('Ralli share preview middleware failed', error)
    return next()
  }
}
