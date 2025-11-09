# SolaceDesk Seed Data Checklist

## Project Info
- **Name**: SolaceDesk
- **Tagline**: Where teams and customers meet clarity.

## 1. Users (8 total)

### Admins (2)
- ✅ `admin@solace.com` - Role: ADMIN, Name: "Admin", Image: Dicebear
- ✅ `clara@solace.com` - Role: ADMIN, Name: "Clara", Image: Dicebear

### Agents (3)
- ✅ `jacob@solace.com` - Role: USER, Name: "Jacob", Image: Dicebear
- ✅ `may@solace.com` - Role: USER, Name: "May", Image: Dicebear
- ✅ `ethan@solace.com` - Role: USER, Name: "Ethan", Image: Dicebear

### Clients (3)
- ✅ `client@acme.com` - Role: USER, Name: "Acme Client", Image: Dicebear
- ✅ `client@starflow.com` - Role: USER, Name: "Starflow Client", Image: Dicebear
- ✅ `client@nova.com` - Role: USER, Name: "Nova Client", Image: Dicebear

**Password**: `demo123` (bcrypt hashed)

---

## 2. Team Rooms (5 public rooms)

All type: `PUBLIC`, isPrivate: `false`

- ✅ `#engineering` - Title: "Engineering", Description: "Engineering discussions and tech talk"
- ✅ `#design` - Title: "Design", Description: "Design team collaboration"
- ✅ `#product` - Title: "Product", Description: "Product discussions and planning"
- ✅ `#announcements` - Title: "Announcements", Description: "Company-wide announcements"
- ✅ `#random` - Title: "Random", Description: "Random chatter and off-topic discussions"

**Members**: All admins + all agents (5 members each)

---

## 3. Private Rooms (4 private rooms)

All type: `PRIVATE`, isPrivate: `true`

- ✅ `#support-team` - Title: "Support Team", Description: "Internal support team discussions"
  - **Members**: All admins (2) + all agents (3) = 5 members
  - **Roles**: Admins as OWNER, Agents as MEMBER

- ✅ `client-acme` - Title: "Client — Acme Corp", Description: "Private client room for Acme Corp"
  - **Members**: 1 admin (OWNER) + 1 agent (MEMBER) + client@acme.com (MEMBER) = 3 members

- ✅ `client-starflow` - Title: "Client — Starflow", Description: "Private client room for Starflow"
  - **Members**: 1 admin (OWNER) + 1 agent (MEMBER) + client@starflow.com (MEMBER) = 3 members

- ✅ `client-nova` - Title: "Client — Nova Studio", Description: "Private client room for Nova Studio"
  - **Members**: 1 admin (OWNER) + 1 agent (MEMBER) + client@nova.com (MEMBER) = 3 members

---

## 4. Ticket Rooms (8 tickets)

All type: `TICKET`, isPrivate: `false` (public tickets)

Status distribution:
- 3 OPEN
- 3 WAITING
- 2 RESOLVED

### Ticket List:
1. ✅ `ticket-cannot-reset-password` - Title: "[TICKET] Cannot reset password"
   - Status: OPEN
   - Creator: client@acme.com
   - Assigned: admin@solace.com (OWNER)
   - Messages: 1 main + 8 replies (threaded)

2. ✅ `ticket-billing-charged-twice` - Title: "[TICKET] Billing issue: charged twice"
   - Status: WAITING
   - Creator: client@starflow.com
   - Assigned: clara@solace.com (OWNER)
   - Messages: 1 main + 6 replies

3. ✅ `ticket-feature-request-dark-mode` - Title: "[TICKET] Feature request: dark mode"
   - Status: OPEN
   - Creator: client@nova.com
   - Assigned: jacob@solace.com (OWNER)
   - Messages: 1 main + 10 replies (threaded)

4. ✅ `ticket-bug-app-freezes` - Title: "[TICKET] Bug: app freezes on upload"
   - Status: RESOLVED
   - Creator: client@acme.com
   - Assigned: may@solace.com (OWNER)
   - Messages: 1 main + 7 replies

5. ✅ `ticket-login-issues` - Title: "[TICKET] Login issues after update"
   - Status: WAITING
   - Creator: client@starflow.com
   - Assigned: ethan@solace.com (OWNER)
   - Messages: 1 main + 9 replies (threaded)

6. ✅ `ticket-api-rate-limit` - Title: "[TICKET] API rate limit too strict"
   - Status: OPEN
   - Creator: client@nova.com
   - Assigned: admin@solace.com (OWNER)
   - Messages: 1 main + 5 replies

7. ✅ `ticket-missing-feature` - Title: "[TICKET] Missing feature: export data"
   - Status: RESOLVED
   - Creator: client@acme.com
   - Assigned: clara@solace.com (OWNER)
   - Messages: 1 main + 12 replies (threaded)

8. ✅ `ticket-performance-slow` - Title: "[TICKET] Performance: dashboard loads slowly"
   - Status: WAITING
   - Creator: client@starflow.com
   - Assigned: jacob@solace.com (OWNER)
   - Messages: 1 main + 11 replies (threaded)

**Total ticket messages**: 8 main + 68 replies = 76 messages

---

## 5. Messages Summary

### Team Rooms (5 rooms)
- `#engineering`: ~15-20 messages (tech discussions)
- `#design`: ~12-18 messages (design discussions)
- `#product`: ~10-15 messages (product planning)
- `#announcements`: ~5-8 messages (announcements)
- `#random`: ~20-25 messages (random chatter)

**Total team messages**: ~62-96 messages

### Private Rooms (4 rooms)
- `#support-team`: ~15-20 messages (internal discussions)
- `client-acme`: ~8-12 messages (client requests + replies)
- `client-starflow`: ~8-12 messages (client requests + replies)
- `client-nova`: ~8-12 messages (client requests + replies)

**Total private messages**: ~39-56 messages

### Ticket Rooms (8 tickets)
- 8 main complaint messages (no parent)
- 68 reply messages (some threaded, some linear)
- Mix of admin/agent responses + customer follow-ups

**Total ticket messages**: 76 messages

---

## 6. RoomMember Summary

### Team Rooms (5 rooms × 5 members = 25 memberships)
- All admins (2) + all agents (3) in each team room
- Roles: Mix of OWNER (admins) and MEMBER (agents)

### Private Rooms (4 rooms)
- `#support-team`: 5 members (2 admins + 3 agents)
- `client-acme`: 3 members (1 admin OWNER + 1 agent MEMBER + 1 client MEMBER)
- `client-starflow`: 3 members (1 admin OWNER + 1 agent MEMBER + 1 client MEMBER)
- `client-nova`: 3 members (1 admin OWNER + 1 agent MEMBER + 1 client MEMBER)

**Total private memberships**: 14

### Ticket Rooms (8 tickets)
- Each ticket: 1 creator (client) + 1 assigned (admin/agent) + possibly other agents
- Average 2-3 members per ticket

**Total ticket memberships**: ~16-24

**Grand Total RoomMembers**: ~55-63 memberships

---

## 7. Timestamps

All timestamps within last 14 days:
- Users: Created 14 days ago
- Rooms: Created 12-14 days ago
- Messages: Spread across last 14 days (newer messages more recent)
- RoomMembers: Created when rooms are created

---

## 8. Validation Checklist

- ✅ All users have unique emails
- ✅ All rooms have unique names
- ✅ All RoomMembers created before messages
- ✅ All messages reference valid userId (who is a RoomMember)
- ✅ All messages reference valid roomId
- ✅ parentMessageId references messages in same room
- ✅ TICKET rooms have status set
- ✅ All required fields present
- ✅ Password hashing with bcrypt
- ✅ Dicebear avatar URLs generated

---

## Summary

- **Users**: 8 (2 admins, 3 agents, 3 clients)
- **Rooms**: 17 total (5 public team, 4 private, 8 tickets)
- **Messages**: ~177-228 total messages
- **RoomMembers**: ~55-63 memberships
- **Threading**: Mix of linear and threaded messages in tickets
- **Timestamps**: All within last 14 days

