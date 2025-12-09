# Ticket Sidebar Plan

## Overview
Add a ticket list sidebar in the `/chat` page (similar to the rooms sidebar) that shows all tickets for admins, allowing quick navigation between tickets without going back to `/tickets`.

## Current State
- **Rooms Sidebar**: Shows PUBLIC and PRIVATE team rooms
- **Tickets Page**: `/tickets` shows all tickets in a list view (admin only)
- **Ticket Access**: Tickets are accessed via `/chat?room={ticketId}`

## Proposed Solution

### Option 1: Tabs in Chat Sidebar (Recommended)
Add a tab switcher in the chat sidebar to toggle between "Rooms" and "Tickets" views.

**Layout:**
```
┌─────────────────────┐
│ Chat                │
│ [Rooms] [Tickets]   │  ← Tab switcher
├─────────────────────┤
│                     │
│ Room/Ticket List    │  ← Content area
│                     │
└─────────────────────┘
```

**Implementation:**
1. Add state for active tab: `'rooms' | 'tickets'`
2. Fetch tickets from `/api/tickets` when "Tickets" tab is active
3. Display tickets similar to rooms list:
   - Ticket title (cleaned, no [TICKET][Department] prefix)
   - Department badge
   - Status badge
   - Message count
   - Last message preview (optional)
4. Clicking a ticket navigates to `/chat?room={ticketId}`
5. Highlight active ticket in the list

**Pros:**
- Clean, familiar UI pattern
- Doesn't take extra space
- Easy to switch between rooms and tickets
- Consistent with existing sidebar design

**Cons:**
- Requires tab switching to see tickets
- Can't see both lists at once

### Option 2: Separate Tickets Section Below Rooms
Add a "Tickets" section below the "Rooms" section in the same sidebar.

**Layout:**
```
┌─────────────────────┐
│ Chat                │
├─────────────────────┤
│ Rooms               │
│ - Room 1            │
│ - Room 2            │
├─────────────────────┤
│ Tickets             │
│ - Ticket 1          │
│ - Ticket 2          │
└─────────────────────┘
```

**Implementation:**
1. Fetch tickets alongside rooms
2. Render rooms list first
3. Render tickets list below with a separator
4. Both lists scrollable together

**Pros:**
- See both rooms and tickets at once
- No tab switching needed
- Simple implementation

**Cons:**
- Sidebar can get long
- Less space for each list
- Might need filtering/search for many tickets

### Option 3: Collapsible Sections
Make both "Rooms" and "Tickets" collapsible sections.

**Layout:**
```
┌─────────────────────┐
│ Chat                │
├─────────────────────┤
│ ▼ Rooms (5)         │
│ - Room 1            │
│ - Room 2            │
├─────────────────────┤
│ ▶ Tickets (12)      │  ← Collapsed
└─────────────────────┘
```

**Pros:**
- Flexible - user can expand/collapse as needed
- Saves space
- Can see counts when collapsed

**Cons:**
- More complex UI
- Requires additional state management

## Recommended: Option 1 (Tabs)

### Implementation Steps

1. **Update ChatPageClient.tsx**
   - Add `activeTab` state: `'rooms' | 'tickets'`
   - Add `tickets` state array
   - Add `fetchTickets()` function
   - Add tab switcher UI in sidebar header
   - Conditionally render rooms or tickets list based on active tab

2. **Ticket List Item Component**
   - Create `TicketListItem` component (similar to room button)
   - Display: cleaned title, department badge, status badge, message count
   - Highlight active ticket (when `roomId` matches ticket ID)
   - Click handler navigates to `/chat?room={ticketId}`

3. **Styling**
   - Match existing room list styling
   - Use same hover/active states
   - Department and status badges styled consistently

4. **Data Fetching**
   - Fetch tickets from `/api/tickets` when tickets tab is active
   - Cache tickets in component state
   - Refresh when navigating back to tickets tab (optional)

5. **Empty States**
   - "No tickets" message when tickets list is empty
   - Link to `/tickets` page for full ticket management

### Example Code Structure

```tsx
// In ChatPageClient.tsx
const [activeTab, setActiveTab] = useState<'rooms' | 'tickets'>('rooms')
const [tickets, setTickets] = useState<Ticket[]>([])

const fetchTickets = async () => {
  const res = await fetch('/api/tickets')
  const data = await res.json()
  if (data.ok) {
    setTickets(data.data.tickets)
  }
}

useEffect(() => {
  if (activeTab === 'tickets' && tickets.length === 0) {
    fetchTickets()
  }
}, [activeTab])

// In sidebar:
<div className="flex gap-2 mb-4">
  <button onClick={() => setActiveTab('rooms')}>Rooms</button>
  <button onClick={() => setActiveTab('tickets')}>Tickets</button>
</div>

{activeTab === 'rooms' ? (
  // Rooms list
) : (
  // Tickets list
)}
```

## Alternative: Quick Access Button

If a full sidebar is too much, consider a simpler approach:

- Add a "View Tickets" button in the sidebar header
- Clicking opens a modal/drawer with ticket list
- Or navigates to `/tickets` page

This is less integrated but simpler to implement.

## Decision Needed

Which approach do you prefer?
1. **Tabs** (Option 1) - Recommended for best UX
2. **Separate Section** (Option 2) - Simpler, shows both
3. **Collapsible** (Option 3) - Most flexible
4. **Quick Access Button** - Simplest, less integrated

