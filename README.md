<div align="center">
  <img src="public/railIcon.png" alt="Ralli logo" width="96" height="96" />
  <h1>Ralli</h1>
  <p><strong>Start it. Join it. Pass it on.</strong></p>
  <p>A social challenge network inside Nimiq Pay.</p>

  [Open Ralli](https://ralli-mu.vercel.app/) · [View the repository](https://github.com/JamesVictor-O/Ralli) · [Nimiq Mini Apps Competition](https://miniappscompetition.com/)
</div>

## What Ralli does

Ralli turns social posts into invitations to participate. People start challenges, respond with photos or videos, react and comment, pass challenges to friends, and use NIM to reward contributions.

The core loop is:

```text
Discover → Join → Respond → See everyone’s take → Pass it on
```

Ralli is not a task marketplace or a passive content feed. Each post gives someone else a concrete reason to create something.

## Why Ralli is different

Ralli connects four retention loops in one social experience:

- **Daily Rallis**: a recurring reason to participate
- **Ralli Chains**: trackable friend-to-friend challenges
- **Communities**: shared-interest spaces where members show up together
- **People**: familiar participants, reactions, comments, and activity

Responding unlocks the social payoff. After someone posts their take, they can see other responses, compare interpretations, react, comment, tip, and challenge the next person.

## Current features

### Create and participate

- Create public or invite-only Rallis
- Attach photo or video covers
- Respond with text, photos, or video
- Upload iPhone video formats, including MOV and M4V
- View optimized media with viewport-aware video playback
- See responses after participating or when hosting the Ralli

### Social layer

- React to Rallis and individual responses
- Comment on Rallis and responses
- Generate trackable **Pass It On** invitations
- Track opened, accepted, and responded invitation states
- Build and explore Ralli Chains
- Receive real-time activity notifications
- View participation streaks and profile statistics

### Communities

- Discover and search interest-based communities
- Create and join communities
- Start a Ralli inside a community
- Participate in community Daily Rallis
- Explore active Rallis, chains, responses, members, and accountability signals

### NIM economy

- Boost a Ralli by sending NIM to its verified creator
- Tip a response by sending NIM to its verified author
- Tip the creator of an original Ralli
- Track pending, confirmed, cancelled, and failed payment states
- Show payment activity to both sender and recipient

Ralli does not custody user funds. Boosts and tips go directly between verified Nimiq addresses.

## Nimiq Pay integration

Ralli runs as a [Nimiq Pay Mini App](https://www.nimiq.dev/mini-apps). The wallet integration supports:

- Nimiq account selection
- Signed-message address verification
- Wallet-based Ralli identity
- Native NIM payment approval
- Transaction submission and confirmation tracking
- Nimiq Hub fallback when Ralli runs in a regular browser

Nimiq Pay handles private keys and approval dialogs. Ralli never receives or stores a private key.

The login flow connects an address, requests a verification signature, and resumes automatically after wallet redirects. Signing the login challenge does not transfer NIM.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│                    Nimiq Pay                    │
│  Account access · Signatures · NIM transactions │
└───────────────────────┬─────────────────────────┘
                        │ Mini App SDK
┌───────────────────────▼─────────────────────────┐
│                    Ralli web app                │
│  Discover · Communities · Rallis · Chains · Me │
└───────────────────────┬─────────────────────────┘
                        │ Supabase client
┌───────────────────────▼─────────────────────────┐
│                     Supabase                    │
│ Auth · Postgres · Storage · Realtime · Functions│
└─────────────────────────────────────────────────┘
```

Wallet-sensitive operations use Nimiq Pay or Nimiq Hub. Supabase stores social data, public profiles, media paths, invitations, activity, and payment records.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Motion and icons | Framer Motion, Lucide React |
| Wallet | Nimiq Mini App SDK, Nimiq Core, Nimiq Hub API |
| Backend | Supabase Auth, Postgres, Realtime, Storage, Edge Functions |
| Media | TUS resumable uploads, browser image optimization |
| Hosting | Vercel |

## Run Ralli locally

You need:

- Node.js 22 or later
- npm
- A Supabase project
- Nimiq Pay on a phone or emulator for embedded wallet testing

Install the project:

```bash
git clone https://github.com/JamesVictor-O/Ralli.git
cd Ralli
npm install
cp .env.example .env.local
```

Add your public Supabase configuration to `.env.local`:

```dotenv
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
VITE_NIMIQ_HUB_URL=https://hub.nimiq.com
```

Never add a Supabase service-role key, wallet private key, or other secret to a `VITE_` variable. Vite exposes these variables to the browser.

Start the development server:

```bash
npm run dev
```

Vite exposes the server to your local network on port `5173`. To test inside Nimiq Pay:

1. Connect your phone and development machine to the same Wi-Fi network
2. Copy the **Network** URL from the Vite output
3. Open **Mini Apps** in Nimiq Pay
4. Load the Network URL

Use the Nimiq testnet before testing payment flows with real funds.

## Configure Supabase

The `supabase` directory contains versioned migrations and Edge Functions. The full backend guide is in [`supabase/README.md`](supabase/README.md).

For a new project:

1. Create a Supabase project
2. Enable **Anonymous Sign-Ins** in the Authentication settings
3. Authenticate and link the Supabase command-line interface (CLI)
4. Apply the migrations
5. Deploy the Edge Functions

```bash
npx supabase login
npx supabase link --project-ref your_project_ref_here
npx supabase db push
npx supabase functions deploy wallet-challenge
npx supabase functions deploy wallet-verify
npx supabase functions deploy payment-submission
```

Set `RALLI_ALLOWED_ORIGINS` as a Supabase Edge Function secret for production. Include the deployed Vercel origin and any approved Nimiq Pay origin.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

Run both production checks before opening a pull request:

```bash
npm run lint
npm run build
```

## Project structure

```text
ralli/
├── api/                    # Vercel server functions
├── public/                 # Icons, manifest, and static assets
├── src/
│   ├── app/                # Providers and application setup
│   ├── components/         # Shared navigation, media, and UI
│   ├── features/           # Product features grouped by domain
│   ├── hooks/              # Data and interaction hooks
│   ├── lib/                # Supabase, media, social, and payment logic
│   ├── nimiq/              # Wallet, signing, and transaction integration
│   ├── store/              # Shared application contexts
│   ├── styles/             # Global responsive styles
│   └── types/              # Application and database types
└── supabase/
    ├── functions/          # Wallet and payment Edge Functions
    └── migrations/         # Versioned database schema
```

## Security and privacy

- Wallet keys remain inside Nimiq Pay or Nimiq Hub
- Every signature and payment requires wallet approval
- Verification challenges expire after five minutes and can only be used once
- The server derives the claimed Nimiq address from the signed proof
- Row Level Security (RLS) protects user-owned Supabase data
- Financial records can only be written by trusted Edge Functions
- Product analytics exclude captions, media, wallet addresses, and invitation tokens
- Content controls include response deletion, reporting, and user blocking

If you discover a security issue, do not publish wallet details, credentials, or an exploit in a public issue. Contact the repository owner privately through the GitHub profile.

## Deploy to Vercel

1. Import this repository into Vercel
2. Select the **Vite** framework preset
3. Add the variables from `.env.example`
4. Run the production deployment

The included `vercel.json` runs `npm run build` and serves the generated `dist` directory.

## Contributing

Issues and pull requests are welcome. Keep changes focused, preserve the mobile-first interaction model, and run lint and build checks before submitting.

## License

Ralli is open source under the [MIT License](LICENSE).
