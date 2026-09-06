# Ralli Supabase backend

The database is managed through versioned migrations in `supabase/migrations`.

## Apply to a new Supabase project

1. Create a Supabase project and enable **Anonymous Sign-Ins** under Authentication settings.
2. Add its project URL and publishable/anon key to `.env.local`.
   Browser wallet connections use Nimiq Hub and default to mainnet. Set `VITE_NIMIQ_HUB_URL=https://hub.nimiq-testnet.com` while testing.
3. Install the Supabase CLI, then link and push:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

Deploy wallet verification functions:

```bash
npx supabase functions deploy wallet-challenge
npx supabase functions deploy wallet-verify
npx supabase functions deploy payment-submission
```

Rewards and boosts additionally require the same dedicated custody address in both places:

```bash
npx supabase secrets set RALLI_REWARD_ADDRESS="NQ..."
```

Set `VITE_RALLI_REWARD_ADDRESS` to that address in the frontend environment. Tips do not use custody; they are sent directly to each response author's verified address.

For production, set `RALLI_ALLOWED_ORIGINS` as a comma-separated list of the Vercel and Nimiq Pay app origins.

Never put the service-role key in a `VITE_` variable or frontend file. It belongs only in Supabase Edge Function secrets.

## Security model

- Public content is readable without a session.
- The client creates an anonymous Supabase session for a stable `auth.uid()`.
- Creating Rallis, responding, reacting, passing, and uploading media requires a verified Nimiq address.
- Wallet verification challenges and all financial ledger writes are restricted to trusted Edge Functions.
- Browser wallets sign through Nimiq Hub; embedded Nimiq Pay sessions use the injected Mini App provider. The verifier supports both signature encodings.
- Profile owners can edit public profile fields, but cannot mark their own Nimiq address as verified.
- Wallet challenges expire after five minutes and are single-use. The server verifies the Nimiq signature and derives the claimed address from the returned public key before updating a profile.
