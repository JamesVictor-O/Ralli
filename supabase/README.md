# Ralli Supabase backend

The database is managed through versioned migrations in `supabase/migrations`.

## Apply to a new Supabase project

1. Create a Supabase project and enable **Anonymous Sign-Ins** under Authentication settings.
2. Add its project URL and publishable/anon key to `.env.local`.
3. Install the Supabase CLI, then link and push:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

Never put the service-role key in a `VITE_` variable or frontend file. It belongs only in Supabase Edge Function secrets.

## Security model

- Public content is readable without a session.
- The client creates an anonymous Supabase session for a stable `auth.uid()`.
- Creating Rallis, responding, reacting, passing, and uploading media requires a verified Nimiq address.
- Wallet verification challenges and all financial ledger writes are restricted to trusted Edge Functions.
- Profile owners can edit public profile fields, but cannot mark their own Nimiq address as verified.
