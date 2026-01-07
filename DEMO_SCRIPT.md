# Demo Script (5–7 minutes)

This script is designed for a quick recruiter/client walkthrough of **Accessly / SolaceDesk**.

## Prereqs

- Start the app using demo mode:

```bash
pnpm demo
```

- Sign in with:
  - `admin@solace.com` / `demo123`

## 0) Orientation (30s)

- Confirm you’re on the Team Workspace (`/`).
- Call out the stack: Next.js App Router + Prisma/Postgres + custom Socket.io server (`server/index.ts`).

## 1) Room Discovery + Join (60s)

- Use the Discover list / filters to find a public room.
- Click a room card to open chat (`/chat?room=...`).
- Mention: rooms are persisted client-side for fast switching (Zustand + localStorage).

## 2) Realtime Chat + Presence (90s)

- Send a message and point out it appears instantly (Socket.io broadcast).
- Point out presence/online indicator and typing indicator (if visible).
- Add a reaction to a message (emoji reactions).

## 3) Threading + Deep Linking (90s)

- Reply to a root message and expand/collapse the thread.
- Copy the URL with `?thread=...` and refresh: the thread should auto-expand.
- Mention: two-level threading (root + direct replies) is intentional for UX simplicity.

## 4) Search (60s)

- Use the global search bar and open `/search`.
- Try a structured query example:
  - `tag:billing`
  - `from:@clara`

## 5) Issues / Tickets (60s)

- Go to Tickets (`/tickets`) as an admin.
- Create or open an issue, then jump into its chat (`/chat?room=...`).
- Mention: issues appear under the “Issues” tab for assigned users.

## 6) Admin + Observability (60s)

- Open Admin (`/admin`) and show system stats.
- Open Telemetry (`/admin/telemetry`) and point out:
  - message throughput
  - socket latency
  - slow query tracking
- Open Audit (`/admin/audit`) to show governance/auditability.

## Wrap-up (15s)

- Summarize: realtime collaboration + permissions + issues + search + observability, with a demo-friendly one-command setup (`pnpm demo`).



