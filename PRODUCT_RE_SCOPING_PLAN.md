# Product Re-Scoping Plan
## Enterprise Patterns Demo (3-Minute Portfolio Showcase)

**Goal**: Transform from "full internal helpdesk system" to "enterprise patterns demo" optimized for hiring manager understanding in < 3 minutes.

**Important Clarification**: 
- ✅ **Tickets remain fully functional** - created and managed by admins
- ✅ **Only the external customer submission flow is removed** (`/support` public form)
- ✅ **All ticket features preserved**: creation, management, chat, status tracking, assignment

**Core Patterns to Showcase**:
1. **Auth & RBAC** - Role-based access control
2. **Realtime** - Socket.io live chat
3. **Audit Logging** - Action tracking
4. **Observability** - System metrics
5. **Full-Text Search** - PostgreSQL tsvector
6. **Threading** - Hierarchical conversations

---

## 1. KEEP (Core Value - Must Show)

### 1.1 Authentication & RBAC
- ✅ **Email/Password Login** - Simple, clear
- ✅ **Role-Based Access** - ADMIN vs USER roles
- ✅ **Protected Routes** - Server-side role checks
- ✅ **Session Management** - JWT-based sessions

**Why**: Core enterprise pattern, easy to demonstrate

### 1.2 Real-Time Chat
- ✅ **Socket.io Integration** - Live message delivery
- ✅ **Presence Indicators** - Online/offline status
- ✅ **Typing Indicators** - Real-time typing status
- ✅ **Room System** - Public/Private rooms
- ✅ **Threaded Conversations** - Reply to messages

**Why**: Shows real-time capabilities, core differentiator

### 1.3 Admin Dashboard (Simplified)
- ✅ **Admin Panel** (`/admin`) - Overview page
- ✅ **System Statistics** - Users, messages, rooms counts
- ✅ **User Management** - View users table
- ✅ **Observability Dashboard** (`/admin/telemetry`) - Real-time metrics
- ✅ **Audit Log** (`/admin/audit`) - Action tracking

**Why**: Core enterprise patterns (observability, audit)

### 1.4 Full-Text Search
- ✅ **Global Search Bar** - In navbar
- ✅ **Search Page** (`/search`) - Results with highlighting
- ✅ **Complex Queries** - `from:`, `tag:`, `before:` syntax
- ✅ **Deep-Linking** - Click results to jump to messages

**Why**: Shows advanced search capabilities

### 1.5 Basic Room Features
- ✅ **Create Rooms** - Public/Private
- ✅ **Join Rooms** - Auto-join public rooms
- ✅ **Room Discovery** - Browse available rooms
- ✅ **Message Actions** - Edit, delete, react

**Why**: Core collaboration features

---

## 2. HIDE (Behind "Demo Mode" - Advanced Features)

### 2.1 Advanced Admin Features
- 🔒 **Staff Analytics** (`/admin/staff-analytics`)
  - **Action**: Hide from admin nav, keep route accessible
  - **Reason**: Too detailed for 3-min demo, but shows capability
  - **Access**: Direct URL or "Advanced Features" toggle

- 🔒 **User Ban/Unban** (in Admin Panel)
  - **Action**: Hide from main UI, keep API functional
  - **Reason**: Not core to demo story

- 🔒 **Room Deletion** (admin only)
  - **Action**: Hide delete button, keep API functional
  - **Reason**: Destructive action, not needed for demo

### 2.2 Complex Features
- 🔒 **Activity Feed** (`/activity`)
  - **Action**: Hide from navbar, keep route accessible
  - **Reason**: Nice to have, not core pattern

- 🔒 **AI Assistant** (Ticket rooms)
  - **Action**: Hide sidebar, keep API functional
  - **Reason**: Advanced feature, can mention but not show

- 🔒 **Department-Based Visibility**
  - **Action**: Simplify to show all PUBLIC rooms to all users
  - **Reason**: Adds complexity without showcasing core patterns

### 2.3 OAuth Providers
- 🔒 **GitHub OAuth** - Hide button, keep in code
- 🔒 **Email Magic Link** - Hide button, keep in code
- **Reason**: Not core to demo, adds complexity

---

## 3. REMOVE (Simplify Story)

### 3.1 External Customer Complexity
- ❌ **Customer Portal** (`/` for external customers)
  - **Action**: Remove external customer detection logic
  - **Action**: All authenticated users see same home page
  - **Reason**: Adds complexity, not core to enterprise patterns demo

- ❌ **External Customer Flow**
  - **Action**: Remove `isExternalCustomer()` checks
  - **Action**: Remove customer-specific UI variations
  - **Reason**: Simplifies story, focus on internal collaboration

- ❌ **Public Support Form** (`/support`)
  - **Action**: Remove public support form route and page
  - **Action**: Remove external customer ticket submission flow
  - **Reason**: External customer flow adds complexity
  - **Note**: Tickets themselves remain - admins create and manage them via `/tickets` page

### 3.2 Department System
- ❌ **Department-Based Room Visibility**
  - **Action**: Remove department filtering logic
  - **Action**: All PUBLIC rooms visible to all users
  - **Reason**: Adds complexity without showcasing patterns

- ❌ **Department Badges** (in UI)
  - **Action**: Remove department display from rooms
  - **Reason**: Simplifies UI

- ❌ **Department Assignment** (user creation)
  - **Action**: Remove department field from signup/creation
  - **Reason**: Not needed for demo

### 3.3 Ticket System (Simplify)
- ✅ **KEEP**: All ticket functionality remains
- ✅ **KEEP**: Ticket creation and management by admins
- ✅ **KEEP**: `/tickets` admin page (view, filter, manage tickets)
- ✅ **KEEP**: Ticket chat interface (`/chat?room={ticketId}`)
- ✅ **KEEP**: Ticket status tracking (OPEN, WAITING, RESOLVED)
- ✅ **KEEP**: Ticket assignment to admins
- ✅ **KEEP**: Ticket threading and conversations
- ⚠️ **REMOVE**: Only the `/support` public form (external customer submission)
- ⚠️ **REFRAME**: "Support Tickets" → "Internal Issues" or "Tasks" (terminology only)

**Actions**: 
  - Remove `/support` public form route and page
  - Keep `/tickets` admin page (full functionality)
  - Keep ticket creation via admin panel
  - Keep all ticket management features
  - Keep ticket chat interface
  - Update terminology: "Support Tickets" → "Issues" or "Internal Tasks"

**Reason**: Tickets demonstrate threading, admin management, and workflow - core patterns. Only removing external customer submission flow to simplify the demo story.

### 3.4 Sign-Up Flow
- ❌ **Public Sign-Up** (`/sign-up`)
  - **Action**: Redirect to sign-in with message
  - **Action**: Disable sign-up API (return 403)
  - **Reason**: Not needed for demo, use pre-seeded accounts

### 3.5 Complex Navigation
- ❌ **Activity Feed Link** (navbar)
  - **Action**: Remove from navbar
  - **Reason**: Not core pattern

---

## 4. REFRAME (Same Logic, Different Wording)

### 4.1 Product Name & Branding
- 🔄 **"Accessly"** → **"SolaceDesk"** (or your demo name)
- **Files**: All UI text, navbar, auth pages
- **Reason**: More professional, consistent branding

### 4.2 Room Terminology
- 🔄 **"Team Workspace"** → **"Workspace"** or **"Chat Rooms"**
- **Files**: Home page header
- **Reason**: Simpler, clearer

### 4.3 Ticket Terminology
- 🔄 **"Support Tickets"** → **"Issues"** or **"Tasks"**
- **Files**: `/tickets` page, ticket UI
- **Reason**: Less "customer support" focused, more internal

### 4.4 Admin Terminology
- 🔄 **"Admin Panel"** → **"System Dashboard"**
- 🔄 **"Staff Analytics"** → **"Team Performance"** (if kept)
- **Files**: Admin pages, navigation
- **Reason**: More enterprise-focused

### 4.5 User Roles
- 🔄 **"ADMIN"** → Keep as "Admin"
- 🔄 **"USER"** → Keep as "User" or "Member"
- **Files**: Badges, UI text
- **Reason**: Clear and simple

### 4.6 Messaging
- 🔄 **"Internal Helpdesk Workspace"** → **"Enterprise Collaboration Platform"**
- 🔄 **"Team Collaboration"** → **"Real-Time Collaboration"**
- **Files**: Home page, README
- **Reason**: Focus on patterns, not use case

---

## 5. DEMO NARRATIVE (3-Minute Story)

### 5.1 Demo Accounts

**Account 1: Admin**
- Email: `admin@solace.com`
- Password: `demo123`
- Role: `ADMIN`
- **What they can do**: Full system access, view metrics, audit logs, manage users

**Account 2: User**
- Email: `user@solace.com` (or `clara@solace.com`)
- Password: `demo123`
- Role: `USER`
- **What they can do**: Join rooms, send messages, search, view own activity

### 5.2 3-Minute Demo Flow

#### **Minute 1: Authentication & RBAC** (30 seconds)
1. **Sign In as User**
   - Show simple email/password login
   - Land on home page (workspace)
   - Show user badge: "USER"

2. **Sign Out, Sign In as Admin**
   - Show same login flow
   - Land on home page
   - Show admin badge: "ADMIN"
   - **Key Point**: "Same login, different permissions"

3. **Navigate to Admin Panel**
   - Click "Admin" button (only visible to admins)
   - Show system statistics
   - **Key Point**: "Role-based access control - admins see more"

#### **Minute 2: Real-Time Collaboration** (60 seconds)
1. **Join a Room**
   - Browse available rooms
   - Click to join
   - Show chat interface

2. **Send Messages**
   - Type and send message
   - **Key Point**: "Real-time delivery via Socket.io"
   - Show presence indicators (who's online)
   - Show typing indicators

3. **Threaded Conversations**
   - Reply to a message
   - Show thread expansion
   - **Key Point**: "Hierarchical threading for organized discussions"

4. **Search**
   - Use search bar
   - Show results with highlighting
   - Click result to jump to message
   - **Key Point**: "Full-text search with PostgreSQL tsvector"

#### **Minute 3: Enterprise Patterns** (90 seconds)
1. **Observability Dashboard**
   - Navigate to `/admin/telemetry`
   - Show real-time metrics:
     - Messages per minute
     - Active connections
     - Socket latency
     - CPU/Memory usage
   - **Key Point**: "Real-time system observability"

2. **Audit Log**
   - Navigate to `/admin/audit`
   - Show action tracking:
     - Message deletions
     - Room edits
     - User actions
   - **Key Point**: "Comprehensive audit trail for compliance"

3. **User Management**
   - Show user table in admin panel
   - **Key Point**: "Centralized user management"

### 5.3 Key Talking Points

**For Each Pattern**:
1. **What it is**: Brief description
2. **How it works**: Technical implementation (if asked)
3. **Why it matters**: Enterprise value

**Example Script**:
- "This demonstrates **role-based access control** - users see different interfaces based on their role."
- "Messages are delivered in **real-time** using Socket.io WebSockets."
- "All actions are **audit logged** for compliance and security."
- "The **observability dashboard** shows real-time system health."

---

## 6. SIMPLIFIED ARCHITECTURE

### 6.1 User Types (Simplified)
- **Before**: Internal employees, External customers, Departments
- **After**: ADMIN, USER (no departments, no external customers)

### 6.2 Room System (Simplified)
- **Before**: PUBLIC (department-filtered), PRIVATE, TICKET, DM
- **After**: PUBLIC (all visible), PRIVATE, TICKET (simplified)

### 6.3 Navigation (Simplified)
- **Before**: Home, Chat, Tickets, Support, Activity, Admin, Search
- **After**: Home, Chat, Tickets (admin), Admin, Search

### 6.4 Admin Features (Simplified)
- **Visible**: Overview, Observability, Audit Log
- **Hidden**: Staff Analytics, Advanced user management
- **Removed**: External customer management

---

## 7. IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Hide OAuth buttons (conditional rendering)
2. ✅ Redirect sign-up route
3. ✅ Update product name to "SolaceDesk"
4. ✅ Remove Activity Feed from navbar
5. ✅ Simplify messaging

### Phase 2: Simplify Flows (2-3 hours)
1. ✅ Remove external customer detection
2. ✅ Remove department-based filtering
3. ✅ Simplify home page (single view for all users)
4. ✅ Remove public support form (`/support` route only - tickets remain functional)

### Phase 3: Hide Advanced Features (1 hour)
1. ✅ Hide Staff Analytics from nav
2. ✅ Hide AI Assistant sidebar
3. ✅ Add "Demo Mode" toggle (optional)

### Phase 4: Reframe Terminology (1 hour)
1. ✅ Update all UI text
2. ✅ Update README
3. ✅ Update demo script

**Total Estimated Time**: 5-7 hours

---

## 8. DEMO SCRIPT (Updated)

### Opening (10 seconds)
"This is **SolaceDesk**, an enterprise collaboration platform showcasing:
- Authentication and role-based access control
- Real-time communication with Socket.io
- System observability and audit logging
- Full-text search and threaded conversations"

### Demo Flow (2 minutes 50 seconds)
[Follow 3-minute flow from section 5.2]

### Closing (10 seconds)
"All built with Next.js 15, TypeScript, PostgreSQL, and Socket.io. The codebase demonstrates enterprise patterns including RBAC, real-time systems, observability, and comprehensive audit logging."

---

## 9. CHECKLIST

### Pre-Demo
- [ ] Remove external customer flows
- [ ] Simplify department system
- [ ] Hide advanced admin features
- [ ] Update branding to "SolaceDesk"
- [ ] Create demo accounts
- [ ] Test 3-minute flow

### Demo Day
- [ ] Have demo accounts ready
- [ ] Test login flow
- [ ] Verify admin panel access
- [ ] Check real-time features
- [ ] Verify observability dashboard
- [ ] Test audit log

### Post-Demo
- [ ] Update README with demo instructions
- [ ] Create demo video (optional)
- [ ] Document key talking points

---

## 10. SUMMARY

### What We're Keeping
- ✅ Auth & RBAC (core pattern)
- ✅ Real-time chat (core pattern)
- ✅ Observability dashboard (core pattern)
- ✅ Audit log (core pattern)
- ✅ Full-text search (core pattern)
- ✅ Threading (core pattern)
- ✅ Basic admin features (user management, stats)

### What We're Hiding
- 🔒 Staff Analytics (advanced, behind "Demo Mode")
- 🔒 Activity Feed (nice to have, not core)
- 🔒 AI Assistant (advanced feature)
- 🔒 OAuth providers (not needed for demo)

### What We're Removing
- ❌ External customer flows (adds complexity)
- ❌ Department-based visibility (not core pattern)
- ❌ Public sign-up (use pre-seeded accounts)
- ❌ Public support form (`/support` - external customer submission only)
  - **Note**: Tickets remain - admins create/manage via `/tickets` page

### What We're Reframing
- 🔄 "Accessly" → "SolaceDesk"
- 🔄 "Support Tickets" → "Issues" or "Internal Tasks" (terminology only, functionality unchanged)
- 🔄 "Team Workspace" → "Workspace"
- 🔄 "Internal Helpdesk" → "Enterprise Collaboration Platform"

### Result
A **focused 3-minute demo** that clearly showcases enterprise patterns without overwhelming the viewer with complex business logic.

---

**Document Version**: 1.0  
**Created**: 2024  
**Purpose**: Re-scope product for enterprise patterns demo (3-minute portfolio showcase)

