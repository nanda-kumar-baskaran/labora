# Labora — Online Mode (Cloud)

Labora Cloud is a hosted web application. Access it from any device, any browser. All data is stored securely in Supabase (Postgres). No installation needed.

---

## Live URL

**https://labora-two.vercel.app**

---

## Architecture

```
Browser → Vercel (Next.js serverless) → Supabase (Postgres + Auth + Storage)
```

| Service | Role | Cost |
|---|---|---|
| **Vercel** | Hosts the Next.js app and API routes | Free (Hobby tier) |
| **Supabase** | Postgres database, authentication, PDF file storage | Free (up to 500MB DB, 5GB storage) |
| **Railway** | Not used | — |

---

## Create a New Lab (First Time)

1. Go to **https://labora-two.vercel.app/setup**
2. Enter:
   - **Lab Name** (e.g., "Shree Pathology Lab")
   - **Admin Full Name**
   - **Email** (used to log in)
   - **Password** (min 8 characters)
3. Click **Create Lab & Login**
4. You'll be redirected to sign in — use the credentials you just created
5. A test catalog with 20 standard tests is seeded automatically

> Each lab gets its own isolated tenant. Data from one lab is never visible to another.

---

## Sign In

1. Go to **https://labora-two.vercel.app/login**
2. Enter your email and password → **Sign In to Labora**

---

## Forgot Password

1. Click **"Forgot your password? Reset it →"** on the login page
2. Enter your email → **Send Reset Link**
3. Check your inbox for a reset link from Supabase
4. Click the link → set a new password

> Check your spam folder if the email doesn't arrive within a minute.

---

## Daily Workflow

### 1. Register a Patient
- **Patients → New Patient**
- Enter name, age, gender, phone, email (optional)
- Patient code is auto-assigned (P-00001, P-00002, …)

### 2. Create an Order
- **Orders → New Order**
- Search and select the patient
- Choose tests from the catalog
- Set priority (routine / urgent / stat)
- Optionally select a referring doctor

### 3. Enter Test Results
- **Orders → [order] → Enter Results**
- Fill result value, unit, flag (normal / low / high / critical)
- Mark each test as completed

### 4. Generate & Verify Report
- **Orders → [order] → Report → Generate PDF**
- Review the report preview
- Click **Verify Report** to sign it off
- Click **Print Report** to print or save as PDF

### 5. Email Report to Patient
- On the Report page, click **Email to Patient**
- Requires SMTP configuration in **Settings → Lab Profile**

### 6. Billing
- **Billing → [invoice]** — view the auto-generated invoice
- Record payments: cash, card, UPI, etc.
- Invoice status updates automatically (unpaid → partial → paid)

---

## Admin Features

### Manage Staff
- **Settings → Users → Add User**
- Roles: **Admin**, **Staff**, **Technician**, **Pathologist**
- Each user gets their own login

### Lab Profile
- **Settings → Lab Profile**
- Update lab name, address, GSTIN, report header/footer, logo
- Configure SMTP for email delivery

### Test Catalog
- **Settings → Test Catalog**
- Edit prices, reference ranges, turnaround times
- Add custom tests
- Load 94 built-in ICMR/NABL standard tests

### Audit Log
- **Audit Log** — full history of every create/update/delete action
- Shows actor, timestamp, and what changed

---

## Data & Security

- **All data is isolated by tenant** — Row Level Security (RLS) is enforced at the database level. One lab's data is never accessible to another.
- **Passwords** are hashed by Supabase Auth (bcrypt). Labora never sees plain-text passwords.
- **PDF reports** are stored in a private Supabase Storage bucket. Each file is accessible only to authenticated users of the same tenant.
- **JWT tokens** carry `tenant_id` (injected by a Postgres hook at login) so every DB query is automatically scoped.

---

## Supabase Dashboard Access

The lab owner (who created the Supabase project) can access raw data at:

**https://supabase.com/dashboard/project/dajelimepqhhuwiirlum**

From there you can:
- Browse tables in the **Table Editor**
- Run SQL in the **SQL Editor**
- View auth users in **Authentication → Users**
- See stored PDFs in **Storage → reports**

---

## Self-Hosting (Deploy Your Own Instance)

### Prerequisites
- A [Supabase](https://supabase.com) account (free)
- A [Vercel](https://vercel.com) account (free)
- Your code forked from [github.com/nanda-kumar-baskaran/labora](https://github.com/nanda-kumar-baskaran/labora)

### Step 1 — Supabase Setup
1. Create a new Supabase project
2. Open **SQL Editor** → paste and run `supabase/schema.sql`
3. Run `supabase/seed.sql` (optional demo data)
4. Go to **Settings → API** → copy the **Project URL**, **anon key**, and **service_role key**
5. Go to **Authentication → Hooks** → enable **Custom Access Token** hook → set URI to:
   ```
   pg-functions://postgres/public/custom_access_token_hook
   ```

### Step 2 — Vercel Deploy
1. Go to [vercel.com/new](https://vercel.com/new) → import your GitHub repo
2. Add these environment variables:

| Variable | Value |
|---|---|
| `STORAGE_MODE` | `cloud` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key (**keep secret**) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

3. Click **Deploy**
4. Visit `/setup` to create the first lab admin

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `STORAGE_MODE` | Yes | Set to `cloud` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Secret service role key (server-side only, never expose) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app URL (used for email links) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API routes (serverless on Vercel) |
| Database | Supabase (Postgres 17) with RLS |
| Auth | Supabase Auth + custom Postgres hook |
| File Storage | Supabase Storage (private bucket) |
| PDF | @react-pdf/renderer |
| Charts | Recharts |
