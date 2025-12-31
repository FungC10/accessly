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

### Issue: Blank page / 502 error
**Cause**: Prisma MUSL binary incompatible with Render's glibc
**Fix**: 
1. Verify Dockerfile uses `node:20-bullseye-slim` (not alpine)
2. Verify Prisma env vars are set before `prisma generate`
3. Verify schema has `binaryTargets = ["native", "debian-openssl-3.0.x"]`

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

