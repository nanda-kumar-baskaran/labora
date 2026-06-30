# LabMS Deployment Guide — Dual Mode

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHOOSE ONE MODE AT SETUP                      │
│                                                                   │
│   ☁️  CLOUD MODE (Online)      💾 LOCAL MODE (Offline)           │
│                                                                   │
│   Browser                      Browser                           │
│     ↓                            ↓                               │
│   Vercel (Next.js)             Next.js (run locally)             │
│     ↓                            ↓                               │
│   Supabase                     SQLite file on disk               │
│   (DB + Auth +                 (labms.db in project dir)         │
│    Storage + JWT)              PDF files in ./storage/           │
│                                Local cookie auth                  │
└─────────────────────────────────────────────────────────────────┘

Switch: set STORAGE_MODE=cloud (default) or STORAGE_MODE=local
No sync between modes in v1 — pick one per installation.
```

---

## Mode A: Cloud (Online) — Vercel + Supabase

### Step 1 — Supabase Setup

**1. Create project**
- Go to https://supabase.com → New project
- Region: **ap-south-1** (Mumbai — lowest India latency)
- Note your project URL and API keys

**2. Run the schema**
```bash
# Option A: Supabase CLI
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
# Paste and run schema.sql in Supabase SQL Editor
# Dashboard → SQL Editor → paste schema.sql → Run

# Option B: Direct SQL Editor
# Dashboard → SQL Editor → paste schema.sql → Run
```

**3. Run seed data (optional)**
```sql
-- Paste supabase/seed.sql in SQL Editor for demo test catalog + doctors
```

**4. Create Storage buckets**
```
Dashboard → Storage → New bucket:
- Name: reports    | Private (unchecked Public)
- Name: logos      | Public (checked)
```

**5. Deploy Auth Hook Edge Function** ← CRITICAL
```bash
mkdir -p supabase/functions/custom-access-token
# File already exists at: supabase/functions/custom-access-token/index.ts
supabase functions deploy custom-access-token
```
Then in Dashboard → Auth → Hooks → **Custom Access Token Hook** → select `custom-access-token`

**6. Create first user**
```
Dashboard → Auth → Users → Invite user (enter your email)
→ copy the UUID from the users list
```
```sql
-- Run in SQL Editor (replace UUIDs):
INSERT INTO users (id, tenant_id, full_name, role)
VALUES (
  'PASTE_USER_UUID',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Lab Admin',
  'admin'
);
```

### Step 2 — Vercel Deployment

```bash
npm install -g vercel
cd /path/to/labms
vercel login
vercel  # first deploy, follow prompts

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL      # https://xxx.supabase.co
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY # eyJ... (anon key)
vercel env add SUPABASE_SERVICE_ROLE_KEY     # eyJ... (service_role key — SECRET)
vercel env add NEXT_PUBLIC_APP_URL           # https://your-app.vercel.app
# STORAGE_MODE is NOT set (defaults to "cloud")

vercel --prod  # deploy to production
```

**Vercel settings:**
- Framework: Next.js (auto-detected)
- Node version: 20.x
- Region: bom1 (Mumbai)

### Step 3 — Verify Cloud Mode

```
✅ https://your-app.vercel.app → redirects to /login
✅ Login works → reaches /dashboard with ☁️ Cloud badge
✅ Create patient → appears in list
✅ Create order → sample ID generated (SMP-YYYYMMDD-NNNN)
✅ Generate report PDF → downloads
✅ Public link /r/[token] → accessible without login
✅ Record payment → invoice updates
```

---

## Mode B: Local (Offline) — Next.js on your own machine

No Vercel. No Supabase. Runs entirely on the lab's PC.

### Requirements
- Node.js 18+ installed on the lab's Windows/Mac/Linux PC
- The `labms` project folder copied to the PC

### Step 1 — Configure for local mode

```bash
cd labms

# Create .env.local with local mode settings
cat > .env.local << 'EOF'
STORAGE_MODE=local
NEXT_PUBLIC_APP_URL=http://localhost:3000
LOCAL_DB_PATH=./labms.db
LOCAL_STORAGE_PATH=./storage
LOCAL_AUTH_SECRET=change-this-to-a-random-64-char-string
EOF
```

Generate a secure `LOCAL_AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — First run

```bash
npm run dev
```

Then open http://localhost:3000:
- You'll be redirected to `/setup` (first-time wizard)
- Enter: Lab Name, Your Name, Email, Password
- Click "Create Lab & Login"
- SQLite DB (`labms.db`) is auto-created with your data

### Step 4 — Production local run

```bash
# Build optimized version
npm run build

# Start production server
npm start
```

The app now runs at http://localhost:3000.

**Auto-start on boot (Windows):**
```
Add to Task Scheduler:
  Action: Start a program
  Program: node
  Arguments: .next/standalone/server.js
  Working dir: C:\path\to\labms
```

**Auto-start on boot (Linux/Mac):**
```bash
# Create systemd service or use PM2:
npm install -g pm2
pm2 start npm --name "labms" -- start
pm2 startup
pm2 save
```

### Step 5 — Add more staff users (local mode)

In the app: Settings → Users → Add User
- Enter name, email, role, and password
- Staff can then log in at http://localhost:3000

Or via Settings → Users in the web UI (admin only).

### Local mode — what's on disk

```
labms/
├── labms.db          ← SQLite database (ALL your data)
├── storage/          ← PDF reports
│   └── local-tenant-00000001/
│       └── SMP-*.pdf
└── .env.local        ← config (keep private)
```

**Backup:** Copy `labms.db` + `storage/` folder to an external drive regularly.

---

## Environment Variables Reference

| Variable | Cloud | Local | Description |
|---|---|---|---|
| `STORAGE_MODE` | `cloud` (or unset) | `local` | Switches entire data layer |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Not needed | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Not needed | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Not needed | Supabase service role (SECRET) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | `http://localhost:3000` | Base URL for share links |
| `LOCAL_DB_PATH` | Not needed | `./labms.db` | SQLite file path |
| `LOCAL_STORAGE_PATH` | Not needed | `./storage` | PDF storage directory |
| `LOCAL_AUTH_SECRET` | Not needed | Random 64-char hex | HMAC key for session cookies |

---

## Mode Comparison

| Feature | Cloud Mode | Local Mode |
|---|---|---|
| Internet required | Yes | No |
| Auth | Supabase JWT + Auth Hook | HMAC-signed cookie |
| Database | Supabase PostgreSQL (cloud) | SQLite file on disk |
| PDF storage | Supabase Storage (S3) | Local `./storage/` folder |
| Multi-tenant | Yes (RLS enforced) | Single-tenant |
| Multi-device | Yes (browser anywhere) | Same machine only |
| Public report links | https://your-app.vercel.app/r/TOKEN | http://localhost:3000/r/TOKEN |
| Backups | Supabase handles it | Manual — copy `labms.db` |
| Setup | Supabase + Vercel accounts needed | Just Node.js |
| Cost | Free tier available | Free (self-hosted) |

---

## Local Development (both modes)

```bash
# Cloud mode locally (needs real Supabase credentials in .env.local)
STORAGE_MODE=cloud npm run dev

# Local/offline mode (no Supabase needed)
STORAGE_MODE=local npm run dev

# Run tests (works for both modes)
npm test
# → 112 tests pass

# Build check
npm run build
# → 42 routes, no errors
```

---

## About Railway

Railway is **not needed** for this app.

Next.js API routes (`/app/api/*`) are your entire backend — they run server-side on Vercel in cloud mode, or as part of `npm start` in local mode. No separate Express/Node server is required.

Railway would only be useful for:
- Heavy async batch jobs (e.g., bulk PDF generation for 1000+ reports)
- WebSocket servers (real-time notifications)
- Neither is in the current MVP scope
