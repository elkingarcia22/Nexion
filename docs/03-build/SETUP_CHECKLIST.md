# Nexión — Release 1 Setup Checklist

**Status:** Build complete, awaiting credential configuration  
**Last Updated:** 2026-04-21  
**Build Status:** ✅ Compiles successfully (17 routes)

---

## Overview

Nexión Release 1 frontend is **fully built and styled** per the Ubits Brand Kit. The platform now requires credential setup before the dev server can run authentication and access the database.

### What's Complete

- ✅ Next.js 14 App Router structure with route groups `(auth)` and `(app)`
- ✅ Ubits Brand Kit tokens fully integrated (colors, typography, shadows, spacing)
- ✅ Login page redesigned per Stitch prototype (two-column layout, value prop + form)
- ✅ OAuth callback handler (`/auth/callback`)
- ✅ App shell with responsive sidebar navigation
- ✅ Día > Hoy page with Day Engine 8-block operational view
- ✅ Supabase schema (migrations in `/supabase/migrations/`)
- ✅ UI component library (Button, Card, Badge, KPICard with Ubits styling)
- ✅ TypeScript configuration with proper path aliases
- ✅ Tailwind CSS with full Ubits token system

### What's Needed

- ⏳ Supabase project credentials (3 keys from Supabase console)
- ⏳ Google OAuth credentials (client ID + secret)
- ⏳ Supabase auth redirect URL configuration
- ⏳ Gemini API key (for source analysis)
- ⏳ n8n Cloud setup (for automation workflows)

---

## Step 1: Supabase Project Setup

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in / create account
3. Click "New project"
4. Fill in:
   - **Name:** `Nexión` (or similar)
   - **Database password:** Generate strong password, save securely
   - **Region:** Choose closest to users (recommend `us-east-1` or `eu-west-1`)
   - **Pricing plan:** `Free` tier OK for development

5. Click "Create new project" — wait 3–5 minutes for initialization

### Get Supabase Credentials

Once project is ready:

1. Go to **Settings → API** in the Supabase console
2. Copy these three keys into `.env.local`:
   - **`Project URL`** → `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role secret`** → `SUPABASE_SERVICE_ROLE_KEY`
3. Also copy the **`project_ref`** (the short ID in the URL or settings) → `SUPABASE_PROJECT_REF`

### Apply Migrations

Once credentials are in `.env.local`, apply the Release 1 schema:

```bash
cd /Users/ub-col-pro-lf4/Desktop/Nexión

# If using Supabase CLI:
supabase db push

# Or manually:
# - Go to Supabase console → SQL Editor
# - Paste contents of: supabase/migrations/20260421000001_release1_base.sql
# - Click "Run"
```

**Expected result:** All tables, enums, RLS policies created successfully.

---

## Step 2: Google OAuth Setup

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (name: `Nexión`)
3. Enable the **Google+ API**:
   - Search "Google+ API" in APIs & Services
   - Click "Enable"

### Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials → OAuth 2.0 Client ID"**
3. Choose **Application type: Web application**
4. Add **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://localhost:3001
   https://your-vercel-domain.vercel.app  (add after deployment)
   ```
5. Add **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   https://your-project.supabase.co/auth/v1/callback
   https://your-other-domain.supabase.co/auth/v1/callback  (if using custom domain)
   ```
6. Copy the credentials:
   - **Client ID** → `.env.local`: `GOOGLE_CLIENT_ID`
   - **Client secret** → `.env.local`: `GOOGLE_CLIENT_SECRET`

### Configure Supabase Auth with Google

1. In Supabase console → **Authentication → Providers**
2. Enable **Google**
3. Paste **Client ID** and **Client secret** from Google Cloud
4. Copy the **Callback URL** from Supabase (looks like `https://your-project.supabase.co/auth/v1/callback`)
5. Go back to Google Cloud Console and add this URL to **Authorized redirect URIs** (if not already there)

---

## Step 3: API Keys (Gemini & n8n)

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Get API key"**
3. Create new API key in default project or your Nexión project
4. Copy key → `.env.local`: `GEMINI_API_KEY`

### n8n Cloud Setup

1. Go to [n8n Cloud](https://n8n.cloud)
2. Create account / sign in
3. Create new workflow (n8n will auto-create a workspace)
4. Get API key:
   - User menu → **Settings → API**
   - Create API key
   - Copy → `.env.local`: `N8N_API_KEY`
5. Get base URL:
   - Your n8n instance URL (e.g., `https://your-instance.n8n.cloud`)
   - Copy → `.env.local`: `N8N_BASE_URL`

---

## Step 4: Verify Configuration

Once all credentials are in `.env.local`:

```bash
cd /Users/ub-col-pro-lf4/Desktop/Nexión/apps/web

# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

Expected output:
```
> next dev
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
```

### Test Login Flow

1. Open **http://localhost:3000/auth/login**
2. Verify:
   - ✅ Two-column layout renders (left: value prop, right: login form)
   - ✅ Google button is visible and clickable
   - ✅ Responsive on mobile (left column hides, form centers)
3. Click **"Continuar con Google"**
4. You should be redirected to Google OAuth consent screen
5. After approval, you should be redirected to **http://localhost:3000/day/today**

### Test Day Engine Page

Once logged in:
1. Verify **http://localhost:3000/day/today** loads
2. Check all 8 blocks render:
   - ✅ KPI Bar (4 cards: Fuentes, Tareas Propuestas, Alertas, Insights)
   - ✅ Bloque A: Foco del Día
   - ✅ Bloque B: Tareas Pendientes Prioritarias
   - ✅ Bloque C: Alertas Importantes
   - ✅ Bloque D: Próximas Reuniones
   - ✅ Bloque E: Distribución de Tiempo
   - ✅ Bloque F: Propuesta de Organización
   - ✅ Bloque G: Estado del Sistema
   - ✅ Bloque H: Propuestas Pendientes
3. Verify Ubits styling:
   - Navy headings (#04101f)
   - Light blue backgrounds (#cadeff)
   - 16px rounded corners on cards
   - Soft shadows on cards

### Test Sidebar Navigation

1. Verify sidebar renders with:
   - ✅ Nexión logo at top
   - ✅ Navigation items (Día, Tareas, Objetivos, etc.)
   - ✅ Active state: blue background + white text
   - ✅ Inactive state: light/60 text color
   - ✅ Responsive: sidebar hidden on mobile (<md breakpoint)

---

## Step 5: Database Seeding (Optional for Development)

To populate mock data for testing:

```bash
cd /Users/ub-col-pro-lf4/Desktop/Nexión

# Seed development data (creates workspace, user, sources)
supabase db push --include-seed
```

This will create a default workspace and test user for local development.

---

## Environment Variables — Complete Reference

```bash
# SUPABASE (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_PROJECT_REF=your-project-ref-here

# GOOGLE OAUTH (required)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
SUPABASE_AUTH_REDIRECT_URL=https://your-project.supabase.co/auth/v1/callback

# GEMINI (required for Release 1)
GEMINI_API_KEY=your-gemini-api-key-here

# N8N (required for Release 1 automation)
N8N_BASE_URL=https://your-instance.n8n.cloud
N8N_API_KEY=your-n8n-api-key-here

# APP (required)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Build Status Summary

| Component | Status | Details |
|-----------|--------|---------|
| Frontend Build | ✅ Complete | 17 routes, no errors |
| TypeScript | ✅ Complete | All types correct, no errors |
| Ubits Design System | ✅ Complete | Tailwind tokens, CSS variables, typography |
| Login Page (Redesigned) | ✅ Complete | Stitch prototype two-column layout |
| Day Engine Page | ✅ Complete | 8 operational blocks per spec |
| Navigation & Sidebar | ✅ Complete | Responsive, proper styling |
| Database Schema | ✅ Complete | Migrations ready to apply |
| Supabase Setup | ⏳ Pending | Awaiting user to create project + get keys |
| Google OAuth | ⏳ Pending | Awaiting user to create credentials |
| Gemini API | ⏳ Pending | Awaiting user to get API key |
| n8n Workflows | ⏳ Pending | Awaiting user to set up account + key |

---

## Next Steps (In Order)

1. **Create Supabase project** → Get 4 keys
2. **Apply database schema** → Run migrations
3. **Create Google OAuth credentials** → Get client ID + secret
4. **Configure Supabase auth** → Link Google OAuth
5. **Get Gemini API key** → For source analysis
6. **Create n8n account** → For automation (Release 1 workflows)
7. **Fill `.env.local`** → All 8 keys
8. **Run dev server** → `npm run dev`
9. **Test login flow** → Google OAuth redirect + Day Engine page
10. **Verify styling** → Ubits tokens applied correctly

---

## Troubleshooting

### "Cannot find module" errors
- Ensure all environment variables are filled (non-empty)
- Check paths in `tsconfig.json` match your project structure
- Clear `.next/` cache: `rm -rf .next && npm run dev`

### "SUPABASE_URL is undefined"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is in `.env.local`
- Dev server must be restarted after changing `.env.local`

### OAuth redirect loop
- Check `SUPABASE_AUTH_REDIRECT_URL` matches the URL in Google Console **exactly**
- Check Supabase auth providers have Google enabled and credentials set

### Login button does nothing
- Open browser DevTools Console → check for errors
- Verify Google Client ID is correct in `.env.local`
- Check Google Cloud credentials are for the correct project

---

## References

- Supabase docs: [supabase.com/docs](https://supabase.com/docs)
- Next.js 14 docs: [nextjs.org/docs](https://nextjs.org/docs)
- Google OAuth: [developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)
- Ubits Design: See `docs/00-foundation/DESIGN.md`
