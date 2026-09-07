import { geolocation } from '@vercel/functions'

export const config = { runtime: 'edge' }

// Powers the "Lagos 🇳🇬 · Berlin 🇩🇪" presence pills on Today's Ralli — Vercel already
// resolves this from the request's IP on every edge request, so there's nothing to ask
// the visitor for and nothing to guess.
export default function handler(request: Request) {
  const { city, country, flag } = geolocation(request)
  return Response.json({ city: city ?? null, country: country ?? null, flag: flag ?? null })
}
