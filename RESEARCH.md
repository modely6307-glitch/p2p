# Project Analysis: Gull (P2P Wishlist App)

## Architecture
- **Frontend**: Next.js (App Router)
- **Styling**: TailwindCSS + Radix UI
- **Backend/DB**: Supabase (PostgreSQL + RLS + Server Actions)
- **AI**: Google Gemini (via `@ai-sdk/google`)
- **Payment**: ECPay (integrated/planned)

## Deployment Mechanism (Inferred)
1. **Hosting**: Hosted on **Vercel** (standard for Next.js, mentioned in README and .gitignore).
2. **CI/CD**: Pushing to `master` likely triggers an automatic build/deploy on Vercel.
3. **Database**: Migrations are located in `supabase/migrations/`. These likely need to be pushed manually via `supabase db push` or hooked into a CI pipeline.
4. **Environment**: Managed via `.env` files (excluded from git).

## Recent Changes
- Heavy focus on moving logic to **Server Actions** for security.
- Migration from client-side API calls to server-side enforcement.
- Implementation of an Admin Dispute resolution system with state rewind capability.
