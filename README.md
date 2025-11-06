# Accessly

Forum-style realtime chat application with role-based authentication, room management, and instant message delivery.

Built with Next.js 15, TypeScript, Tailwind CSS, NextAuth, Prisma, PostgreSQL, and Socket.io.

## Architecture

**Next.js is a full-stack framework** - it combines frontend and backend in one application:

- **Frontend**: `src/app/` (pages/components) - React components, runs in browser
- **Backend**: `src/app/api/` (route handlers) - API endpoints, runs on Node.js server
- **Server**: Custom Node.js HTTP server with Socket.io (runs on port 3000)
- **Single Process**: One Next.js server handles both (runs on port 3000)

See [ARCHITECTURE_EXPLAINED.md](./ARCHITECTURE_EXPLAINED.md) for details.

## Features

### Forum-Style Home Page
- **Room Discovery**: Browse public rooms with search, tag filters, and sorting
- **My Rooms**: Quick access to rooms you've joined
- **Room Cards**: Display title, description, tags, member count, last message preview
- **Create Room**: Modal form to create new public or private rooms
- **SSR + Client Interactions**: Fast initial load with server-side rendering, instant client-side filtering
- **Pagination**: Load more rooms with cursor-based pagination

### Authentication & Authorization
- **Multi-Provider Auth**: NextAuth with GitHub OAuth, Email (magic link), and Credentials (email/password)
- **RBAC**: Role-based access control (USER, ADMIN)
- **Room Roles**: OWNER, MODERATOR, MEMBER for fine-grained room permissions
- **Session Management**: JWT-based sessions with secure cookies
- **Protected Routes**: Server-side role verification

### Chat System
- **Realtime Chat**: Socket.io-powered chat with instant message delivery
- **Room Types**: 
  - Public rooms (anyone can discover and join)
  - Private rooms (invite-only, hidden from discovery)
  - Direct Messages (DM) between two users
- **Room Management**:
  - Create rooms with title, description, tags, and type
  - Edit room metadata (OWNER only)
  - Invite users to private rooms (OWNER/MODERATOR)
  - Remove members (OWNER/MODERATOR)
  - View member list with roles
- **Room Header**: 
  - Visibility badges (Public/Private/DM)
  - Tag display
  - User role badge
  - Edit button (OWNER)
  - Invite button (OWNER/MODERATOR)
  - Members button with count
- **Presence Indicators**: Shows who's online in each room
- **Message History**: Cursor-based pagination for efficient message loading
- **Smart Caching**: Per-room message caching with Zustand for instant room switching
- **Scroll Position Memory**: Remembers exact scroll position when switching between rooms
- **Flash-Free Navigation**: Smooth room switching without visual jumps or flashes
- **Incremental Loading**: Only fetches new messages since last visit for better performance
- **Anchored Scroll**: Preserves scroll position when loading older messages (pagination)
- **Auto-Join**: Automatically joins public rooms when navigating from discover page
- **Rate Limiting**: Prevents message spam

### Dashboard & Admin
- **User Dashboard**: Personal stats (messages sent, rooms joined)
- **Admin Dashboard**: System-wide statistics (users, messages, rooms)
- **Admin Panel**: 
  - User management table
  - Room creation and management
  - System statistics
- **Role-Based UI**: Different views for USER vs ADMIN

### Technical Features
- **Type Safety**: Full TypeScript with Zod validation
- **State Management**: Zustand for efficient client-side state management
- **Testing**: Comprehensive test suite with Vitest
- **Docker Support**: Multi-stage builds with docker-compose
- **Horizontal Scaling**: Redis adapter for Socket.io (optional)
- **Graceful Shutdown**: Proper cleanup of connections and resources
- **Performance**: Optimized rendering with scroll restoration and message caching
- **User Experience**: Instant scroll positioning, flash-free transitions, responsive design

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth (Auth.js) v5
- **Realtime**: Socket.io with optional Redis adapter
- **State Management**: Zustand
- **Validation**: Zod
- **Testing**: Vitest + Testing Library
- **Password Hashing**: bcryptjs
- **Date Formatting**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (or npm/yarn)
- Docker & Docker Compose (optional, for containerized setup)

### Install

```bash
pnpm i
```

### Environment Setup

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

**Required environment variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -hex 32`)
- `NEXTAUTH_URL` - Application URL (default: http://localhost:3000)

**Optional (for authentication providers):**
- `GITHUB_ID` and `GITHUB_SECRET` - GitHub OAuth
- `EMAIL_SERVER` and `EMAIL_FROM` - Email provider (magic link)
- Note: Credentials provider works without any additional setup

**Optional (for production):**
- `REDIS_URL` - Redis adapter for Socket.io horizontal scaling
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

### Database Setup

```bash
# Generate Prisma client
pnpm prisma:gen

# Run migrations
pnpm prisma migrate dev

# Seed database (creates admin user, regular user, and sample rooms)
pnpm db:seed

# Or seed with realistic demo data (5 users, 8 rooms, 150 messages)
pnpm db:seed-demo

# Quick demo setup (migrate + seed + start)
pnpm demo
```

**Default Accounts (from seed.ts):**
- Admin: `admin@accessly.com` / `admin123`
- User: `user@accessly.com` / `user123`

**Demo Accounts (from seed-demo.ts):**
- Admin: `admin@demo.com` / `admin123`
- Users: `sarah@demo.com`, `alex@demo.com`, `emma@demo.com`, `james@demo.com` / `demo123`

### Development

**Option 1: Standard Next.js dev server (no Socket.io)**
```bash
pnpm dev
```

**Option 2: Custom server with Socket.io (recommended)**
```bash
pnpm dev:server
```

Visit http://localhost:3000

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui
```

## Docker Support

### Quick Start with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Next.js app)
docker-compose up -d

# Run migrations
docker-compose exec app pnpm prisma migrate deploy

# Seed database
docker-compose exec app pnpm db:seed

# Or seed demo data
docker-compose exec app pnpm db:seed-demo

# View logs
docker-compose logs -f app
```

### Docker Services

- **app**: Next.js application with Socket.io (port 3000)
- **db**: PostgreSQL database (port 5432)
- **redis**: Redis for Socket.io scaling (port 6379, optional)

### Manual Docker Build

```bash
# Build image
docker build -t accessly .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  accessly
```

## Deployment

**⚠️ Important**: This application uses a custom Node.js server with Socket.io. It requires a **long-lived Node.js process**, not serverless functions.

### Recommended Platforms

- **Fly.io**: Excellent for Docker deployments with persistent connections
- **Render**: Supports Docker and long-running processes
- **Railway**: Docker-first platform, great for Node.js apps
- **AWS ECS/EC2**: Self-hosted with Docker
- **DigitalOcean App Platform**: Supports Docker deployments

### NOT Recommended

- **❌ Vercel**: Serverless functions don't support Socket.io long-lived connections
- **❌ Netlify**: Serverless-only, no persistent connections

See [docs/deploy.md](./docs/deploy.md) for detailed deployment instructions.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── auth/          # NextAuth handlers
│   │   ├── chat/          # Chat API (messages, rooms)
│   │   │   ├── rooms/     # Room management
│   │   │   │   ├── discover/    # Public room discovery
│   │   │   │   ├── [roomId]/   # Room-specific operations
│   │   │   │   │   ├── join/   # Join room
│   │   │   │   │   ├── leave/  # Leave room
│   │   │   │   │   ├── invite/ # Invite users
│   │   │   │   │   ├── members/ # Member management
│   │   │   │   │   └── route.ts # Get/update room details
│   │   │   └── messages/  # Message CRUD
│   │   ├── users/          # User search (for invites)
│   │   └── status/         # Health check endpoint
│   ├── (auth)/            # Auth pages (sign-in, error)
│   ├── page.tsx           # Forum-style home page (room discovery)
│   ├── chat/              # Chat interface (client-side)
│   ├── admin/             # Admin panel (SSR, ADMIN only)
│   └── status/            # Health check page
├── components/            # React components
│   ├── rooms/            # Room-related components
│   │   ├── RoomCard.tsx      # Room card for discovery
│   │   ├── RoomFilters.tsx    # Search, tags, sort filters
│   │   ├── RoomHeader.tsx     # Room header with badges and actions
│   │   ├── HomePageClient.tsx # Client-side forum page
│   │   └── CreateRoomButton.tsx # Create room modal
│   ├── ChatRoom.tsx       # Chat room component
│   ├── MessageItem.tsx    # Individual message display
│   ├── PresenceBar.tsx    # Online users indicator
│   ├── Navbar.tsx         # Navigation bar
│   └── ...
├── lib/                   # Utilities
│   ├── auth.ts            # NextAuth configuration
│   ├── env.ts             # Environment validation
│   ├── prisma.ts          # Prisma client singleton
│   ├── rbac.ts            # Role-based access control
│   ├── socket.ts          # Socket.io client
│   ├── validation.ts      # Zod schemas
│   ├── chatStore.ts       # Zustand store for chat state
│   ├── scroll.ts          # Scroll utilities (preserve, restore)
│   └── io.ts              # Socket.io server singleton
├── data/                  # Seed scripts
│   ├── seed.ts            # Basic seed (admin + user)
│   ├── seed-demo.ts       # Realistic demo data
│   └── diagnose-chat.ts   # Diagnostic tools
├── tests/                 # Test files
├── prisma/                # Prisma schema and migrations
└── server/                # Custom Node.js server entry
    └── index.ts           # HTTP server + Socket.io setup
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Rooms
- `GET /api/chat/rooms` - List user's joined rooms
- `POST /api/chat/rooms` - Create room (any authenticated user)
- `GET /api/chat/rooms/discover` - Discover public rooms (search, filter, sort, pagination)
- `GET /api/chat/rooms/available` - List available public rooms (not joined yet)
- `GET /api/chat/rooms/[roomId]` - Get room details with membership info
- `PATCH /api/chat/rooms/[roomId]` - Update room metadata (OWNER only)
- `POST /api/chat/rooms/[roomId]/join` - Join a public room
- `POST /api/chat/rooms/[roomId]/leave` - Leave a room
- `POST /api/chat/rooms/[roomId]/invite` - Invite user to private room (OWNER/MODERATOR)
- `GET /api/chat/rooms/[roomId]/members` - List room members
- `DELETE /api/chat/rooms/[roomId]/members?userId=...` - Remove member (OWNER/MODERATOR)

### Messages
- `GET /api/chat/messages?roomId=...` - Get messages (paginated with cursor/after)
- `POST /api/chat/messages` - Send message

### Users
- `GET /api/users/search?email=...` - Search user by email (for invites)

### System
- `GET /api/status` - Health check (DB, Redis status)
- `GET /api/debug/session` - Debug session info
- `GET /api/debug/rooms` - Debug room/membership info

## Realtime Communication

This project uses **Socket.io** for realtime chat and presence:

- **Messages**: Broadcast to room members via Socket.io events (`message:new`)
- **Presence**: Shows online users in each room
- **Room Events**: `room:join` and `room:leave` events for presence tracking
- **Scaling**: For production, use Redis adapter with `REDIS_URL` environment variable
- **Connection**: Socket.io available at `/socket.io` path

See [docs/scaling.md](./docs/scaling.md) for scaling strategies.

## User Interface

### Home Page (Forum)
- **My Rooms Section**: Displays rooms you've joined with last message preview
- **Discover Section**: Browse public rooms with:
  - Search bar (title, description)
  - Tag filter chips
  - Sort options (Most Active, Newest, Most Members)
  - Pagination (Load More button)
- **Room Cards**: Show title, description, tags, member count, message count, last message snippet, visibility badge
- **Create Room**: Modal form accessible from header

### Chat Page
- **Sidebar**: List of joined rooms
- **Chat Area**: Messages with scroll preservation
- **Room Header**: 
  - Room title and description
  - Visibility badge (Public/Private/DM)
  - Tag badges
  - User role badge
  - Edit button (OWNER only)
  - Invite button (OWNER/MODERATOR)
  - Members button
- **Message Input**: Send messages with realtime delivery

## Chat Features

### Message Caching
- Messages are cached per room using Zustand
- Switching rooms is instant when messages are already cached
- Only fetches new messages since last visit
- Empty rooms are cached to prevent unnecessary refetches

### Scroll Position
- Scroll position is remembered for each room
- Returns to exact previous position when switching back
- No flash or visual jumps during room navigation
- Instant scroll to bottom on first visit (no animation, hidden during scroll)
- Container visibility managed to prevent flashes

### Pagination
- Load older messages with anchored scroll (preserves viewport)
- Incremental loading of newer messages
- Efficient cursor-based pagination
- Only shows "Loading older messages" indicator when fetching

## Room System

### Room Types
- **PUBLIC**: Discoverable in forum, anyone can join
- **PRIVATE**: Hidden from discovery, invite-only
- **DM**: Direct message between exactly two users

### Room Roles
- **OWNER**: Created the room, can edit metadata, invite/remove members
- **MODERATOR**: Can invite/remove members (except OWNER)
- **MEMBER**: Regular member, can send messages

### Room Features
- **Title & Description**: Editable by OWNER
- **Tags**: Array of tags for categorization and filtering
- **Member Count**: Shows number of members
- **Last Message Preview**: Shows most recent message snippet with author and time
- **Creator**: Tracks who created the room
- **Metadata Editing**: OWNER can update title, description, tags
- **Member Management**: OWNER/MODERATOR can invite and remove members
- **One-to-One DM Rule**: DMs have exactly two members, prevents duplicates

### Room Discovery
- **Search**: Full-text search across title, name, description
- **Tag Filters**: Click tags to filter rooms
- **Sorting**: 
  - Most Active (by message count)
  - Newest (by creation date)
  - Most Members (by member count)
- **Pagination**: Cursor-based pagination for performance

## Development Scripts

```bash
# Development
pnpm dev              # Next.js dev server (no Socket.io)
pnpm dev:server       # Custom server with Socket.io

# Build
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm prisma:gen       # Generate Prisma client
pnpm prisma:migrate   # Run migrations (dev)
pnpm prisma:deploy    # Deploy migrations (production)
pnpm db:seed          # Seed database (basic)
pnpm db:seed-demo     # Seed database (realistic demo data)
pnpm db:check         # Check user memberships
pnpm db:diagnose      # Comprehensive diagnostics
pnpm demo             # Quick demo: migrate + seed-demo + start

# Testing
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:ui          # UI mode

# Checks
pnpm check:core       # Check @auth/core version
pnpm check:client-imports  # Check for server imports in client
pnpm check:ssg        # Check SSG safety
```

## Navigation Flow

1. **After Login** → Redirects to home page (forum) (`/`)
2. **Home Page** → Forum-style room discovery and browsing
3. **Click Room Card** → Navigates to `/chat?room={roomId}` (auto-joins if public)
4. **Chat Page** → Shows only joined rooms, full chat interface
5. **Discover Button** → Links back to home page for finding new rooms

## License

MIT
