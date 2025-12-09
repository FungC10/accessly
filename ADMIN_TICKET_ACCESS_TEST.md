# Test Scenario: Admin Access to Unassigned Tickets

## Test Case

**Scenario**: Admin accessing ticket messages without membership

**Setup**:
- `dbUser.role = Role.ADMIN`
- `room.type = 'TICKET'`
- `membership = null` (admin is not assigned/member of ticket)

**Expected Behavior**:
- `/api/chat/messages?roomId={ticketId}` should return `200 OK` with messages
- `/api/chat/rooms/{ticketId}` should return `200 OK` with room details
- Messages should render in the UI

## Implementation Verification

### 1. Messages API (`/api/chat/messages`)

**Current Logic**:
```typescript
const isTicketRoom = room.type === 'TICKET'
const isAdmin = dbUser.role === Role.ADMIN

if (isTicketRoom && isAdmin) {
  // Admin on ticket → always allowed, skip membership check
  // Continue to fetch messages
} else if (!membership) {
  // Deny access
  return FORBIDDEN
}
```

**Test**:
- ✅ If `isTicketRoom = true` AND `isAdmin = true` → Access granted
- ✅ If `isTicketRoom = true` AND `isAdmin = false` → Check membership
- ✅ If `isTicketRoom = false` → Check membership

### 2. Room Access API (`/api/chat/rooms/[roomId]`)

**Current Logic**:
```typescript
if (room.type === 'TICKET' && !membership && dbUser.role !== Role.ADMIN) {
  return FORBIDDEN
}
```

**Test**:
- ✅ If `room.type = 'TICKET'` AND `membership = null` AND `dbUser.role = Role.ADMIN` → Access granted
- ✅ If `room.type = 'TICKET'` AND `membership = null` AND `dbUser.role != Role.ADMIN` → Access denied
- ✅ If `room.type = 'TICKET'` AND `membership != null` → Access granted (member)

### 3. Frontend Access Check (`ChatPageClient.tsx`)

**Current Logic** (line 194):
```typescript
if (room.isMember || (room.type === 'TICKET' && session?.user?.role === 'ADMIN')) {
  // Allow access
}
```

**Potential Issue**: Uses `session?.user?.role` which might be string 'ADMIN' instead of enum

**Test**:
- ✅ If `room.isMember = true` → Access granted
- ✅ If `room.type = 'TICKET'` AND `session.user.role = 'ADMIN'` → Access granted
- ⚠️ If `session.user.role` is enum `Role.ADMIN` but compared to string → Might fail

## Potential Issues

### Issue 1: Frontend Role Comparison
**Location**: `ChatPageClient.tsx` line 194

**Problem**: `session?.user?.role === 'ADMIN'` might not match if role is enum

**Fix**: Should use `session?.user?.role === 'ADMIN' || session?.user?.role === Role.ADMIN` OR ensure session always returns string

### Issue 2: Room Access API Returns `isMember: false` for Admins
**Location**: `/api/chat/rooms/[roomId]` line 197

**Problem**: Returns `isMember: !!membership` which will be `false` for admins on unassigned tickets

**Impact**: Frontend might check `room.isMember` and deny access even though admin should have access

**Fix**: Should return `isMember: !!membership || (room.type === 'TICKET' && dbUser.role === Role.ADMIN)`

## Recommended Fixes

1. **Fix `isMember` in room access API** to account for admin access
2. **Verify frontend role comparison** works with both string and enum
3. **Add explicit admin check** in frontend access logic

