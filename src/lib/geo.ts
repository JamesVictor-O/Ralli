export interface ViewerGeo {
  city: string | null
  country: string | null
  flag: string | null
}

const EMPTY_GEO: ViewerGeo = { city: null, country: null, flag: null }

let cached: Promise<ViewerGeo> | null = null

// Fetched once per session — local dev (no /api routes) and any network hiccup both just
// fall back to no geo, which degrades gracefully: responses still post, just without a city.
export function fetchViewerGeo(): Promise<ViewerGeo> {
  if (!cached) {
    cached = fetch('/api/geo')
      .then((response) => (response.ok ? response.json() as Promise<ViewerGeo> : EMPTY_GEO))
      .catch(() => EMPTY_GEO)
  }
  return cached
}
