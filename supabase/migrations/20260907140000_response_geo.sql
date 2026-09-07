-- Today's Ralli shows where responses are coming from ("Lagos 🇳🇬 · Berlin 🇩🇪 +47").
-- These come from Vercel's request geolocation, captured client-side once via /api/geo
-- and attached when a response is posted — never guessed or hand-entered.
alter table public.responses
  add column city text,
  add column country text,
  add column flag text;
