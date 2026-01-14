# Simple Deployment Guide

**For 80% of freelance projects** - No Docker, no complex infra. Just works.

## Quick Start

### Option 1: Vercel (Recommended for Next.js)

1. **Connect GitHub repo** to Vercel
2. **Add environment variables:**
   ```
   DATABASE_URL=postgresql://user:pass@host/db
   AUTH_SECRET=your-secret-here
   NEXTAUTH_URL=https://your-app.vercel.app
   ```
3. **Deploy** - Vercel handles everything automatically

**Limitations:**
- No Socket.io (Vercel doesn't support long-lived connections)
- Serverless functions only

### Option 2: Render (Native Node Service)

**Important:** Render uses the custom server (`server/index.ts`) which includes both Next.js and Socket.io. This is configured via `npm start` which runs `tsx server/index.ts`.

1. **Create PostgreSQL database** on Render
2. **Create Web Service:**
   - Environment: **Node** (NOT Docker)
   - Build Command: `pnpm install && pnpm build` (or `npm install && npm run build`)
   - Start Command: `pnpm start` (or `npm start`) - This runs the custom server with Socket.io
3. **Add environment variables:**
   ```
   DATABASE_URL=<Internal Database URL>
   AUTH_SECRET=your-secret-here
   NEXTAUTH_URL=https://your-app.onrender.com
   NODE_ENV=production
   ```
4. **Deploy** - Render auto-deploys on git push

## Database Setup

### Using Supabase (Recommended)

1. Create project on [Supabase](https://supabase.com)
2. Copy connection string from Settings → Database
3. Run migrations locally:
   ```bash
   npx prisma migrate deploy
   ```
4. Seed database locally (before first deploy):
   ```bash
   npm run db:seed-demo
   ```

### Using Render PostgreSQL

1. Create PostgreSQL database on Render
2. Get connection string from Render dashboard
3. Run migrations locally:
   ```bash
   DATABASE_URL=<connection-string> npx prisma migrate deploy
   ```
4. Seed database locally:
   ```bash
   DATABASE_URL=<connection-string> npm run db:seed-demo
   ```

## Authentication Setup

### Credentials Only (Simplest)

**Environment variables:**
```
AUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app.vercel.app
```

**No additional setup needed** - Users created via seed script.

### OAuth Only (GitHub)

**Environment variables:**
```
AUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app.vercel.app
GITHUB_ID=<from GitHub OAuth app>
GITHUB_SECRET=<from GitHub OAuth app>
```

**Setup GitHub OAuth:**
1. GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth app
3. Authorization callback URL: `https://your-app.vercel.app/api/auth/callback/github`
4. Copy Client ID and Client Secret

## Required Environment Variables

**Minimum (required):**
```
DATABASE_URL=postgresql://...
AUTH_SECRET=<32+ character secret>
NEXTAUTH_URL=https://your-app.vercel.app
```

**Optional:**
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Deployment Checklist

- [ ] Database created (Supabase or Render PostgreSQL)
- [ ] Migrations run locally: `npx prisma migrate deploy`
- [ ] Database seeded locally: `npm run db:seed-demo`
- [ ] Environment variables set in deployment platform
- [ ] Deployed and tested login

## Troubleshooting

**Login fails:**
- Check database was seeded: `admin@solace.com` / `demo123`
- Verify `AUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your app URL exactly

**Database connection fails:**
- Verify `DATABASE_URL` is correct
- Check database allows connections from deployment platform
- For Supabase: Check connection pooling settings

**Build fails:**
- Ensure `DATABASE_URL` and `AUTH_SECRET` are set (even if placeholders)
- Check Node.js version matches (18+)

## Notes

- **No Docker** - Use platform-native Node.js services
- **No Prisma binary tuning** - Works out of the box
- **Seed locally** - Don't seed in production shell
- **Minimal config** - Just the essentials

