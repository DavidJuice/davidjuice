# AceHR

Multi-tenant HR SaaS for independent insurance agencies: PTO requests, weekly
work-hour tracking, overtime rollups with pay estimates, and Stripe-billed
subscriptions.

**Stack:** React 18 + Vite + Tailwind · Supabase (Postgres, Auth, RLS) ·
Stripe subscriptions · Resend · Vercel.

---

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node | ≥ 18.18 |
| Supabase CLI | ≥ 1.190 (`brew install supabase/tap/supabase`) |
| Stripe CLI | latest (`brew install stripe/stripe-cli/stripe`) |
| Docker | running (required by `supabase start`) |

## 2. Local setup

```bash
npm install
cp .env.example .env.local

supabase start          # boots Postgres, Auth, Studio in Docker
supabase db reset       # applies migrations/001_init.sql then seed.sql
```

`supabase start` prints the local API URL and anon key. Paste them into
`.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
```

Then:

```bash
npm run dev             # http://localhost:5173
```

Seeded login: **admin@acehr.test / Password123!** (5 employees, 10 vacation
requests, a full week of work logs).

> `supabase db reset` re-runs migrations **and** the seed, wiping local data.
> It never touches a hosted project.

## 3. Database

| File | Purpose |
|---|---|
| `supabase/migrations/001_init.sql` | Schema, indexes, RLS policies, PTO + overtime triggers |
| `supabase/seed.sql` | Local-only sample data |

**Tenancy.** Every table carries `org_id`. RLS is enabled on all six tables with
explicit SELECT/INSERT/UPDATE/DELETE policies keyed on
`org_id = public.current_org_id()`, where `current_org_id()` is a
`SECURITY DEFINER` function reading `public.users` for `auth.uid()` (defined this
way so policies on `users` do not recurse). The client never sends a chosen
`org_id` — it is always taken from the session.

**Derived data.**
- `work_logs.hours_worked` and `work_logs.is_overtime` are stored generated
  columns. Postgres forbids one generated column referencing another, so
  `is_overtime` repeats the hours expression rather than referencing
  `hours_worked`.
- Approving or un-approving a vacation request debits/credits
  `employees.pto_balance_days` (annual and personal types only) via the
  `vacation_requests_pto` trigger.
- Writing a work log recomputes that employee's weekly `overtime_records` row
  (`regular = min(total, 40)`, `overtime = max(total − 40, 0)`,
  `pay = overtime × rate × 1.5`). Records already marked approved/paid are left
  alone.

To apply the schema to a hosted project:

```bash
supabase link --project-ref <ref>
supabase db push
```

## 4. Stripe

### 4.1 Products and prices

Create three recurring monthly prices in the Stripe dashboard (or CLI) and put
the price IDs in your env:

| Plan | Price | Seats | Env key |
|---|---|---|---|
| Starter | $49/mo | 10 | `VITE_STRIPE_PRICE_STARTER` |
| Growth | $99/mo | 30 | `VITE_STRIPE_PRICE_GROWTH` |
| Enterprise | $199/mo | unlimited | `VITE_STRIPE_PRICE_ENTERPRISE` |

```bash
stripe products create --name "AceHR Growth"
stripe prices create --product prod_xxx --unit-amount 9900 \
  --currency usd --recurring[interval]=month
```

Enable the **Customer Portal** at
<https://dashboard.stripe.com/settings/billing/portal> — `/billing` redirects
there for upgrades, downgrades and cancellations.

### 4.2 Webhook

The endpoint lives at `api/stripe-webhook.js` and handles
`customer.subscription.created|updated|deleted`, writing `plan` and
`stripe_subscription_id` back to `organizations` with the service-role key.

Locally:

```bash
stripe listen --forward-to localhost:5173/api/stripe-webhook
# copy the printed whsec_… into STRIPE_WEBHOOK_SECRET in .env.local
stripe trigger customer.subscription.updated
```

`vite dev` does not run Vercel functions. To exercise `/api/*` locally, use
`vercel dev` instead of `npm run dev` (same port), or deploy a preview.

In production, add the endpoint at
<https://dashboard.stripe.com/webhooks> pointing at
`https://<your-domain>/api/stripe-webhook`, subscribe to the three
`customer.subscription.*` events, and copy its signing secret into
`STRIPE_WEBHOOK_SECRET` in Vercel.

## 5. Email (Resend)

`api/invite-user.js` issues the Supabase auth invite and sends a branded
notification through Resend. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a
verified sending domain). Without them, invites still work — the extra email is
skipped and the response says so.

## 6. Deploying to Vercel

```bash
vercel link
vercel env add VITE_SUPABASE_URL           # repeat for every key in .env.example
vercel --prod
```

`vercel.json` builds with Vite, serves `dist/`, keeps `/api/*` on the Node
runtime, and rewrites everything else to `index.html` for client-side routing.

Server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`) must **not** be prefixed with
`VITE_` — anything `VITE_`-prefixed is inlined into the browser bundle.

## 7. Project layout

```
acehr/
├── api/                      Vercel serverless functions
│   ├── _lib/server.js        Stripe + Supabase admin clients, auth guards
│   ├── create-customer.js
│   ├── create-checkout-session.js
│   ├── create-portal-session.js
│   ├── invite-user.js
│   └── stripe-webhook.js
├── src/
│   ├── components/{layout,ui,vacation,hours,overtime}
│   ├── context/AuthContext.jsx
│   ├── hooks/{useOrg,useEmployees,useVacation,useHours,useOvertime}.js
│   ├── lib/{supabase,auth,stripe,dates,csv}.js
│   ├── pages/                Login, Signup, Dashboard, Employees, Vacation,
│   │                         WorkHours, Overtime, Settings, Billing
│   └── App.jsx               Routes; everything but /login,/signup in AuthGuard
├── supabase/{migrations,seed.sql}
├── .env.example
└── vercel.json
```

## 8. Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run db:start` | `supabase start` |
| `npm run db:reset` | Re-apply migrations + seed |
| `npm run stripe:listen` | Forward Stripe events to the local webhook |

## 9. Design system

Primary `#4CAF87` · warning `#E8833A` · danger `#E24B4A` · canvas `#F5F6FA` ·
cards white, 12px radius, 0.5px `#E5E7EB` border · sidebar white 200px with a
right border (hamburger drawer under 768px) · Inter from Google Fonts. Badge
tones: approved `#E8F8F1/#2E9E6D`, pending `#FFF7ED/#E8833A`, rejected and
overtime-flagged `#FEF2F2/#E24B4A`, overtime-ok `#EEF2FF/#4F46E5`. No component
library — Tailwind only.
