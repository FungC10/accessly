# Deployment Quick Reference

Quick reference guide for deploying Accessly to production.

## One-Line Demo Setup (Local)

```bash
pnpm demo
```

This automatically:
- Starts PostgreSQL & Redis (Docker)
- Runs migrations
- Seeds demo data
- Starts the app

## Render Deployment (Recommended)

### Step 1: Create Services

1. **PostgreSQL**: New → PostgreSQL → Create
2. **Redis** (optional): New → Redis → Create
3. **Web Service**: New → Web Service → Connect GitHub repo

### Step 2: Configure Web Service

**Settings:**
- Environment: **Docker**
- Build Command: (leave empty)
- Start Command: `pnpm start`
- Health Check: `/status`

**Environment Variables:**
```
DATABASE_URL=<Internal Database URL>
AUTH_SECRET=<openssl rand -hex 32>
NEXTAUTH_URL=https://your-app.onrender.com
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
REDIS_URL=<Internal Redis URL>  # Optional
NODE_ENV=production
```

### Step 3: Deploy & Migrate

1. Render auto-deploys on git push
2. **CRITICAL**: After first deploy, run migrations:
   - Go to Web Service → **Shell** tab
   - Run: `pnpm prisma:deploy`
   - This creates all database tables
3. **REQUIRED**: Seed database to create admin users:
   - **Option A** (basic): `pnpm db:seed` → Creates `admin@accessly.com` / `admin123`
   - **Option B** (demo): `pnpm db:seed-demo` → Creates `admin@solace.com` / `demo123` and more
4. **Without seeding, you cannot login** - no users exist in the database!

### Important Notes

**⚠️ Dockerfile Configuration:**
- Uses `node:20-bullseye-slim` (Debian/glibc, not Alpine/MUSL)
- Sets `ENV HOSTNAME=0.0.0.0` (not `HOST`) for port binding
- Includes Prisma glibc binary generation

**⚠️ Build/Start Commands:**
- **Build Command**: Leave empty (Dockerfile handles it)
- **Start Command**: Leave empty (Dockerfile CMD handles it)

## Environment Variables Checklist

**Required:**
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `AUTH_SECRET` - NextAuth secret (32+ chars)
- ✅ `NEXTAUTH_URL` - Your app URL
- ✅ `NEXT_PUBLIC_APP_URL` - Public app URL

**Optional:**
- `REDIS_URL` - For Socket.io scaling
- `GITHUB_ID` / `GITHUB_SECRET` - GitHub OAuth
- `EMAIL_SERVER` / `EMAIL_FROM` - Email auth
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

## Health Check

All platforms should use:
- **Path**: `/status`
- **Interval**: 30 seconds

## Database Migrations

```bash
pnpm prisma:deploy
```

## Scaling

**Single Instance:**
- Works for small to medium deployments
- No Redis needed

**Multiple Instances:**
- Set `REDIS_URL` environment variable
- Socket.io automatically uses Redis adapter
- Scale to 2+ instances
- No sticky sessions needed

## Troubleshooting

**App won't start:**
- Check environment variables are set
- Verify database is accessible
- Check logs in platform dashboard

**Socket.io not working:**
- Ensure using `pnpm start` (not `next start`)
- Check `/status` endpoint shows `"socketio": "up"`
- For multiple instances, verify `REDIS_URL` is set

**Health check failing:**
- Check `/status` endpoint manually
- Verify database connection
- Review application logs

## Platform Comparison

| Platform | Docker | WebSockets | Redis | Auto-Deploy | Free Tier |
|----------|--------|------------|-------|-------------|-----------|
| Render   | ✅     | ✅         | ✅    | ✅          | ⚠️ Spins down |
| Fly.io   | ✅     | ✅         | ✅    | ✅          | ✅        |
| Railway  | ✅     | ✅         | ✅    | ✅          | ⚠️ Limited |
| Vercel   | ❌     | ❌         | ❌    | ✅          | ✅        |

**⚠️ Vercel is NOT supported** - Socket.io requires long-lived processes.

## Quick Commands

```bash
# Local demo
pnpm demo

# Start Docker services only
pnpm demo:db

# Stop Docker services
pnpm demo:down

# Reset everything (fresh start)
pnpm demo:reset

# Production migrations
pnpm prisma:deploy

# Seed demo data
pnpm db:seed-demo
```

