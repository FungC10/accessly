# Render Deployment Checklist

## Pre-Deployment Verification

### 1. Dockerfile Location & Path
- [ ] **Dockerfile is in repository root** (`/Dockerfile`)
- [ ] **No other Dockerfiles exist** (check for `Dockerfile.*` or `docker/Dockerfile`)
- [ ] **No render.yaml or .render config** that might override Dockerfile
- [ ] **Render service is configured to use Docker** (not Buildpacks)

### 2. Dockerfile Base Image
- [ ] **Uses `node:20-bullseye-slim`** (NOT `node:20-alpine`)
- [ ] **All stages use same base**: deps, builder, runner
- [ ] **Reason**: Alpine uses MUSL, Render uses Debian/glibc

### 3. Prisma Configuration

#### Schema (`src/prisma/schema.prisma`)
- [ ] **Has `binaryTargets = ["native", "debian-openssl-3.0.x"]`**
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

#### Dockerfile Environment Variables
- [ ] **Before `prisma generate`, has:**
```dockerfile
ENV PRISMA_CLI_QUERY_ENGINE_TYPE="libquery_engine-linux-glibc"
ENV PRISMAengines="debian-openssl-3.0.x"
```

### 4. Port Binding
- [ ] **Dockerfile sets `ENV PORT=3000`** (Render will override with actual port)
- [ ] **Dockerfile sets `ENV HOSTNAME=0.0.0.0`** (NOT `HOST`)
- [ ] **Reason**: Next.js standalone `server.js` reads `HOSTNAME`, not `HOST`
- [ ] **CMD is `["node", "server.js"]`** (not `pnpm start`)

### 5. Standalone Output
- [ ] **Dockerfile copies `.next/standalone` to root**
- [ ] **Dockerfile copies `.next/static` to `.next/static`**
- [ ] **Dockerfile copies `public` folder**
- [ ] **`next.config.js` has `output: 'standalone'`**

### 6. Build Process
- [ ] **Prisma generate runs BEFORE build** (`pnpm prisma generate`)
- [ ] **Build runs after Prisma** (`pnpm build`)
- [ ] **No custom build commands override Dockerfile**

## Render Service Configuration

### 7. Environment Variables (Required)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` - Full app URL (e.g., `https://your-app.onrender.com`)
- [ ] `NODE_ENV=production`
- [ ] `PORT` - **DO NOT SET** (Render sets this automatically)
- [ ] `HOSTNAME=0.0.0.0` - **DO NOT SET** (Dockerfile sets this)

### 8. Render Service Settings
- [ ] **Build Command**: Leave empty (Dockerfile handles it)
- [ ] **Start Command**: Leave empty (Dockerfile CMD handles it)
- [ ] **Dockerfile Path**: `/Dockerfile` or leave empty (defaults to root)
- [ ] **Root Directory**: `/` or leave empty
- [ ] **Docker Context**: Root directory

### 9. Health Check
- [ ] **Health Check Path**: `/api/health` or `/status`
- [ ] **Health Check Timeout**: 30 seconds
- [ ] **Health Check Interval**: 10 seconds

## Post-Deployment Verification

### 10. Logs Check
After deployment, check Render logs for:

- [ ] **No "MUSL" or "alpine" references** in Prisma logs
- [ ] **Should see**: `libquery_engine-linux-glibc` or `debian-openssl-3.0.x`
- [ ] **Server starts**: "Ready on http://0.0.0.0:XXXX"
- [ ] **No "No open ports detected"** error
- [ ] **No PrismaClientInitializationError**

### 11. Browser Test
- [ ] **Chrome**: Should load (not 502)
- [ ] **Safari**: Should load (not blank page)
- [ ] **Firefox**: Should load
- [ ] **API endpoints work**: `/api/health` returns 200

## Common Issues & Fixes

### Issue: "No open ports detected"
**Cause**: Server not binding to `0.0.0.0` or wrong PORT
**Fix**: Ensure `ENV HOSTNAME=0.0.0.0` in Dockerfile (not `HOST`)
**Status**: ✅ FIXED - Changed `ENV HOST=0.0.0.0` to `ENV HOSTNAME=0.0.0.0`

### Issue: Blank page / 502 error
**Cause**: Prisma MUSL binary incompatible with Render's glibc
**Fix**: 
1. Verify Dockerfile uses `node:20-bullseye-slim` (not alpine)
2. Verify Prisma env vars are set before `prisma generate`
3. Verify schema has `binaryTargets = ["native", "debian-openssl-3.0.x"]`
**Status**: ✅ FIXED - Changed from `node:20-alpine` to `node:20-bullseye-slim` and added Prisma glibc env vars

### Issue: Render not using updated Dockerfile
**Cause**: Render might be using cached build or wrong path
**Fix**:
1. Clear Render build cache
2. Verify Dockerfile path in Render settings
3. Force redeploy

### Issue: Prisma still using MUSL
**Cause**: Build happening on Alpine or env vars not set
**Fix**:
1. Check Dockerfile base image is `bullseye-slim`
2. Verify Prisma env vars are BEFORE `prisma generate` command
3. Check build logs for actual base image used
**Status**: ✅ FIXED - Added `ENV PRISMA_CLI_QUERY_ENGINE_TYPE` and `ENV PRISMAengines` before prisma generate

### Issue: Cannot login as admin
**Cause**: Database not seeded - no admin users exist
**Fix**: 
1. After first deployment, run migrations: `pnpm prisma:deploy`
2. Seed database: `pnpm db:seed` (creates `admin@accessly.com` / `admin123`)
   OR `pnpm db:seed-demo` (creates `admin@solace.com` / `demo123`)
3. Use Render Shell tab to run these commands
**Status**: ⚠️ REQUIRES MANUAL STEP - See "Post-Deployment Database Setup" below

## Bugs Fixed in This Deployment

### Bug #1: Prisma MUSL Binary Issue
**Symptoms**: 
- Render shows "deployment success" but Safari shows blank page
- Chrome shows HTTP 502 error
- Logs show Prisma using `libquery_engine-linux-musl.so.node`

**Root Cause**: 
- Dockerfile was using `node:20-alpine` (MUSL libc)
- Render uses Debian (glibc)
- Prisma generated MUSL binaries that don't work on glibc

**Fix Applied**:
1. Changed base image: `node:20-alpine` → `node:20-bullseye-slim`
2. Added Prisma env vars before `prisma generate`:
   ```dockerfile
   ENV PRISMA_CLI_QUERY_ENGINE_TYPE="libquery_engine-linux-glibc"
   ENV PRISMAengines="debian-openssl-3.0.x"
   ```
3. Updated Prisma schema: `binaryTargets = ["native", "debian-openssl-3.0.x"]`

### Bug #2: "No Open Ports Detected"
**Symptoms**:
- Render logs show "No open ports detected"
- Container starts but server doesn't bind to port

**Root Cause**:
- Next.js standalone `server.js` reads `process.env.HOSTNAME` (not `HOST`)
- Dockerfile was setting `ENV HOST=0.0.0.0`

**Fix Applied**:
- Changed `ENV HOST=0.0.0.0` → `ENV HOSTNAME=0.0.0.0`

### Bug #3: Environment Variable Validation During Build
**Symptoms**:
- Build fails with "Invalid environment variables: DATABASE_URL: Required"

**Root Cause**:
- Next.js tries to validate env vars during build phase
- `DATABASE_URL` and `AUTH_SECRET` not available during Docker build

**Fix Applied**:
- Updated `src/lib/env.ts` to skip strict validation during build time
- Uses placeholder values during build, validates at runtime

## Post-Deployment Database Setup

After the first successful deployment, you **must** run database migrations and seed data:

### Step 1: Run Migrations
1. Go to Render Dashboard → Your Web Service → **Shell** tab
2. Run: `pnpm prisma:deploy`
3. This creates all database tables

### Step 2: Seed Database (Choose One)

**Option A: Basic Seed** (creates admin + regular user)
```bash
pnpm db:seed
```
Creates:
- `admin@accessly.com` / `admin123`
- `user@accessly.com` / `user123`

**Option B: Demo Seed** (creates realistic demo data)
```bash
pnpm db:seed-demo
```
Creates multiple users including:
- `admin@solace.com` / `demo123`
- `clara@solace.com` / `demo123` (also admin)
- `jacob@solace.com` / `demo123`
- And more...

### Step 3: Verify Login
1. Visit your Render app URL
2. Go to `/sign-in`
3. Login with seeded credentials

## Final Verification Command

Run this locally to verify Dockerfile structure:
```bash
docker build -t test-accessly .
docker run -p 3000:3000 -e DATABASE_URL="..." -e AUTH_SECRET="..." test-accessly
```

Then check:
- Server starts on port 3000
- No Prisma errors
- App loads in browser

