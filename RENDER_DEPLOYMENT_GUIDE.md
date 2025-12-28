# Render Deployment Guide for Accessly

Complete step-by-step guide for deploying Accessly to Render using Docker.

## 1. Pre-Deployment Checklist

### Prerequisites
- [ ] GitHub repository is pushed and accessible
- [ ] Render account created (render.com)
- [ ] PostgreSQL database service ready (or will create one)

### Before You Start
1. **Generate AUTH_SECRET** (do this now):
   ```bash
   openssl rand -hex 32
   ```
   Save this value - you'll need it in Step 4.

2. **Know your app URL**: Render will assign something like `accessly-xyz.onrender.com`

---

## 2. Step-by-Step Deployment

### Step 1: Create PostgreSQL Database

1. In Render dashboard: **New** → **PostgreSQL**
2. Configure:
   - **Name**: `accessly-db` (or your choice)
   - **Database**: `accessly` (or your choice)
   - **User**: `accessly` (or your choice)
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 16 (recommended)
   - **Plan**: Free tier works for demo/portfolio
3. Click **Create Database**
4. **IMPORTANT**: Copy the **Internal Database URL** (starts with `postgresql://`)
   - This is different from the External URL
   - Format: `postgresql://user:password@hostname:5432/database`
   - Save this - you'll need it for `DATABASE_URL`

### Step 2: Create Web Service

1. In Render dashboard: **New** → **Web Service**
2. Connect your GitHub repository
3. Configure the service:

   **Basic Settings:**
   - **Name**: `accessly` (or your choice)
   - **Region**: Same as database (important for latency)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `/` (leave empty or `/`)

   **Build & Deploy:**
   - **Environment**: **Docker**
   - **Dockerfile Path**: `Dockerfile` (default)
   - **Build Command**: (leave empty - Docker handles this)
   - **Start Command**: `pnpm start`
   - **Health Check Path**: `/status`
   - **Health Check Interval**: 30 seconds

   **Advanced Settings:**
   - **Auto-Deploy**: Yes (deploys on git push)
   - **Docker Build Context**: `/` (root)

### Step 3: Configure Environment Variables

**DO THIS BEFORE FIRST DEPLOY** - Go to your Web Service → **Environment** tab and add:

#### Required Variables

```bash
# Database (use Internal Database URL from Step 1)
DATABASE_URL=postgresql://user:password@hostname:5432/database

# Auth (use the secret you generated earlier)
AUTH_SECRET=<your-32-char-hex-secret>

# App URLs (replace with your actual Render URL)
NEXTAUTH_URL=https://accessly-xyz.onrender.com
NEXT_PUBLIC_APP_URL=https://accessly-xyz.onrender.com

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

#### Optional Variables (for OAuth - skip for demo)

```bash
# GitHub OAuth (only if you want GitHub login)
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

# Email Auth (only if you want email magic links)
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com
```

#### Optional Variables (for monitoring)

```bash
# Sentry (optional - for error tracking)
SENTRY_DSN=https://your-sentry-dsn
```

**Note**: Since you're using single instance with no Redis, do NOT set `REDIS_URL`. The app will work fine without it.

### Step 4: Deploy

1. Click **Create Web Service**
2. Render will:
   - Build the Docker image (takes 5-10 minutes first time)
   - Deploy the service
   - Start the application

3. **Wait for build to complete** - You'll see logs in the Render dashboard

### Step 5: Run Database Migrations

**CRITICAL**: The app won't work until migrations are run.

1. Go to your Web Service dashboard
2. Click **Shell** tab (opens a terminal in your container)
3. Run:
   ```bash
   pnpm prisma:deploy
   ```
4. Wait for "Migration applied" messages
5. Verify with:
   ```bash
   pnpm prisma migrate status
   ```

### Step 6: (Optional) Seed Demo Data

If you want test data:

1. In the **Shell** tab, run:
   ```bash
   pnpm db:seed-demo
   ```
2. This creates demo users, rooms, and messages

---

## 3. Service Configuration Summary

### Port Configuration
- **Port**: `3000` (set via `PORT` env var, defaults to 3000)
- **Host**: `0.0.0.0` (set via `HOST` env var, required for Docker)
- Render automatically maps this to port 80/443 externally

### Start Command
```bash
pnpm start
```
This runs `tsx server/index.ts` which:
- Starts Next.js server
- Attaches Socket.io to the same HTTP server
- Listens on `0.0.0.0:3000`

### Health Check
- **Path**: `/status`
- **Interval**: 30 seconds
- **Expected Response**: 
  ```json
  {
    "ok": true,
    "timestamp": "2025-01-XX...",
    "db": "up",
    "redis": "not_configured",
    "socketio": "up"
  }
  ```

---

## 4. Required Environment Variables (Before First Boot)

### Must Set Before Deployment:

1. **DATABASE_URL** ✅
   - Use Internal Database URL from Render PostgreSQL service
   - Format: `postgresql://user:password@hostname:5432/database`
   - ❌ **Mistake**: Using External URL (won't work, slower, may have IP restrictions)

2. **AUTH_SECRET** ✅
   - Generate with: `openssl rand -hex 32`
   - Must be 32+ characters
   - ❌ **Mistake**: Using weak/guessable secret (security risk)

3. **NEXTAUTH_URL** ✅
   - Must match your Render app URL exactly
   - Format: `https://your-app.onrender.com` (no trailing slash)
   - ❌ **Mistake**: Using `http://` instead of `https://` (cookies won't work)

4. **NEXT_PUBLIC_APP_URL** ✅
   - Same as NEXTAUTH_URL
   - Used for Socket.io CORS and client-side API calls
   - ❌ **Mistake**: Mismatch with NEXTAUTH_URL (Socket.io won't connect)

5. **NODE_ENV** ✅
   - Must be `production`
   - ❌ **Mistake**: Leaving as `development` (performance issues, wrong cookie settings)

6. **PORT** ✅
   - Set to `3000` (or Render's assigned port)
   - ❌ **Mistake**: Not setting it (may default incorrectly)

7. **HOST** ✅
   - Must be `0.0.0.0` (required for Docker containers)
   - ❌ **Mistake**: Using `localhost` (container can't accept external connections)

---

## 5. Common Mistakes That Cause Silent Failures

### Socket.io Issues

**Problem**: App boots but real-time features don't work (messages don't appear, typing indicators broken)

**Causes:**
1. ❌ **Wrong start command**: Using `next start` instead of `pnpm start`
   - ✅ **Fix**: Use `pnpm start` (runs custom server with Socket.io)

2. ❌ **CORS mismatch**: `NEXT_PUBLIC_APP_URL` doesn't match actual URL
   - ✅ **Fix**: Ensure `NEXT_PUBLIC_APP_URL=https://your-actual-url.onrender.com`

3. ❌ **Socket.io path wrong**: Client can't find `/socket.io` endpoint
   - ✅ **Fix**: Already configured in code, but verify health check shows `"socketio": "up"`

**Verification:**
```bash
# In browser console, after page load:
# Should see: "✅ Socket connected: <socket-id>"
# If not, check Network tab for failed WebSocket connections
```

### Authentication Issues

**Problem**: Can't sign in, redirects fail, sessions don't persist

**Causes:**
1. ❌ **NEXTAUTH_URL mismatch**: URL doesn't match Render URL exactly
   - ✅ **Fix**: Must be `https://your-app.onrender.com` (exact match, no trailing slash)

2. ❌ **AUTH_SECRET missing/weak**: NextAuth can't encrypt sessions
   - ✅ **Fix**: Generate with `openssl rand -hex 32`, set in env vars

3. ❌ **Cookie settings wrong**: Cookies blocked due to secure/httpOnly settings
   - ✅ **Fix**: Code handles this automatically when `NODE_ENV=production`, but verify it's set

4. ❌ **No auth providers configured**: All providers optional, but at least one needed
   - ✅ **Fix**: For demo, Credentials provider works (email/password). For OAuth, set `GITHUB_ID`/`GITHUB_SECRET`

**Verification:**
- Visit `/sign-in` - should see login form
- Try creating account or logging in
- Check browser DevTools → Application → Cookies for `next-auth.session-token`

### Database Issues

**Problem**: App boots but database queries fail, 500 errors on pages

**Causes:**
1. ❌ **Migrations not run**: Database schema doesn't exist
   - ✅ **Fix**: Run `pnpm prisma:deploy` in Shell tab after first deploy

2. ❌ **Wrong DATABASE_URL**: Using External URL or wrong format
   - ✅ **Fix**: Use Internal Database URL from Render dashboard

3. ❌ **Database not ready**: Migrations run before database is accessible
   - ✅ **Fix**: Wait for database to show "Available" in Render dashboard before deploying

4. ❌ **Connection string format**: Missing required parts
   - ✅ **Fix**: Format must be `postgresql://user:password@host:port/database`

**Verification:**
```bash
# In Shell tab:
pnpm prisma migrate status
# Should show: "Database schema is up to date!"

# Check health endpoint:
curl https://your-app.onrender.com/status
# Should show: "db": "up"
```

### Build/Deployment Issues

**Problem**: Build succeeds but app crashes on start

**Causes:**
1. ❌ **Prisma Client not generated**: Missing `prisma:gen` step
   - ✅ **Fix**: Already handled in Dockerfile, but verify build logs show "Prisma Client generated"

2. ❌ **Missing environment variables**: App crashes on startup validation
   - ✅ **Fix**: Check Render logs for "Invalid environment variables" error, add missing vars

3. ❌ **Port binding failure**: Can't bind to port 3000
   - ✅ **Fix**: Ensure `PORT=3000` and `HOST=0.0.0.0` are set

**Verification:**
- Check Render logs for startup errors
- Look for "Server ready on http://0.0.0.0:3000" message
- Health check should return 200 OK

---

## 6. Verify Deployment Success (Under 5 Minutes)

### Quick Verification Steps

1. **Check Health Endpoint** (30 seconds)
   ```bash
   curl https://your-app.onrender.com/status
   ```
   Expected:
   ```json
   {
     "ok": true,
     "db": "up",
     "redis": "not_configured",
     "socketio": "up"
   }
   ```
   ✅ If `ok: true` and `db: "up"`, basic setup is working

2. **Visit Homepage** (30 seconds)
   - Open `https://your-app.onrender.com` in browser
   - Should see Accessly homepage (not error page)
   - Check browser console for errors

3. **Test Authentication** (1 minute)
   - Click "Sign In" or visit `/sign-in`
   - Should see login form
   - Try creating an account (if Credentials provider enabled)
   - Or test OAuth if configured

4. **Test Socket.io Connection** (1 minute)
   - After logging in, open browser DevTools → Console
   - Look for: `✅ Socket connected: <socket-id>`
   - If not present, check Network tab for WebSocket connection

5. **Test Database** (1 minute)
   - After logging in, try creating a room or sending a message
   - If you seeded demo data, try accessing `/chat` or `/dashboard`
   - Should see data, not empty states or errors

6. **Check Render Logs** (30 seconds)
   - In Render dashboard → Logs tab
   - Look for:
     - ✅ "Server ready on http://0.0.0.0:3000"
     - ✅ "Database connected"
     - ✅ "Socket.io available at /socket.io"
   - ❌ No red error messages

### Success Indicators

✅ **All Good If:**
- Health endpoint returns `ok: true`
- Homepage loads without errors
- Can sign in/create account
- Socket.io connects (console shows connection)
- Can create rooms/send messages
- No errors in Render logs

❌ **Needs Fixing If:**
- Health endpoint shows `db: "down"` → Run migrations
- Health endpoint shows `socketio: "down"` → Check start command is `pnpm start`
- Can't sign in → Check `NEXTAUTH_URL` and `AUTH_SECRET`
- Socket.io won't connect → Check `NEXT_PUBLIC_APP_URL` matches actual URL
- 500 errors on pages → Check database migrations and `DATABASE_URL`

---

## 7. Troubleshooting Quick Reference

### App Won't Start
- Check Render logs for error messages
- Verify all required env vars are set
- Ensure `PORT=3000` and `HOST=0.0.0.0`

### Database Connection Failed
- Verify `DATABASE_URL` uses Internal URL (not External)
- Check database is "Available" in Render dashboard
- Run `pnpm prisma:deploy` in Shell tab

### Socket.io Not Working
- Verify start command is `pnpm start` (not `next start`)
- Check `NEXT_PUBLIC_APP_URL` matches actual Render URL
- Verify health endpoint shows `"socketio": "up"`

### Authentication Broken
- Verify `NEXTAUTH_URL` matches Render URL exactly (https://)
- Check `AUTH_SECRET` is set and 32+ characters
- Ensure at least one auth provider is configured

### Migrations Failed
- Check `DATABASE_URL` is correct
- Verify database is accessible
- Try running `pnpm prisma migrate status` first

---

## 8. Post-Deployment

### Optional: Set Up Custom Domain
1. In Web Service → Settings → Custom Domains
2. Add your domain
3. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to match

### Optional: Enable Auto-Deploy
- Already enabled by default
- Every git push to `main` triggers new deployment
- Migrations are NOT auto-run - you must run them manually if schema changes

### Monitoring
- Check Render dashboard → Metrics for CPU/Memory usage
- Check Logs tab for errors
- Health endpoint at `/status` for quick status checks

---

## Summary Checklist

Before deployment:
- [ ] PostgreSQL database created
- [ ] `AUTH_SECRET` generated
- [ ] All env vars configured in Web Service
- [ ] `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` set to Render URL

After first deploy:
- [ ] Build completed successfully
- [ ] Ran `pnpm prisma:deploy` in Shell tab
- [ ] Health endpoint returns `ok: true`
- [ ] Homepage loads
- [ ] Can sign in
- [ ] Socket.io connects
- [ ] Can create rooms/send messages

You're done! 🎉

