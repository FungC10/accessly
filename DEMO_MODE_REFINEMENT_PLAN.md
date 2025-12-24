# Demo Mode Refinement Plan
## Single-Company Internal Helpdesk Story

**Goal**: Transform the app from a "public SaaS" feel to a "single-company internal helpdesk" demo story for portfolio and demo purposes.

---

## 1. IDENTIFIED PUBLIC SAAS / MULTI-TENANT ELEMENTS

### 1.1 Authentication & Onboarding

#### **A. Public Sign-Up Flow**
**Location**: `/sign-up` route and page
- **Current State**: Full public sign-up form accessible to anyone
- **UI Elements**:
  - "Create your account" heading
  - "Create Account" button
  - Link from sign-in page: "Don't have an account? Sign up"
- **API**: `/api/auth/signup` - Creates new user accounts
- **Impact**: HIGH - This is the most obvious "public SaaS" element

#### **B. GitHub OAuth Provider**
**Location**: Sign-in page (`/sign-in`)
- **Current State**: "Sign in with GitHub" button prominently displayed
- **UI Elements**:
  - GitHub logo button
  - "Or" divider between email/password and OAuth
- **Backend**: `src/lib/auth.ts` - GitHub provider configured if env vars present
- **Impact**: MEDIUM - OAuth suggests developer tool / public platform

#### **C. Email Magic Link Provider**
**Location**: Sign-in page (`/sign-in`)
- **Current State**: "Sign in with Email (Magic Link)" button
- **UI Elements**:
  - Email icon button
  - Magic link input form
- **Backend**: `src/lib/auth.ts` - Email provider configured if env vars present
- **Impact**: LOW-MEDIUM - Less obvious, but still suggests modern SaaS onboarding

#### **D. Sign-Up Links in UI**
**Locations**:
- Sign-in page: "Don't have an account? Sign up"
- Support page: "Already have an account? Sign in" + "create an account" link
- **Impact**: MEDIUM - Reinforces public signup narrative

### 1.2 Branding & Messaging

#### **A. Generic Product Name**
**Location**: Multiple places
- **Current**: "Accessly" as the product name
- **Better for Demo**: "SolaceDesk" (already mentioned in README as the product scenario)
- **Impact**: LOW - But helps with story consistency

#### **B. Generic Auth Text**
**Location**: Sign-in and sign-up pages
- **Current**: "Secure, role-based authentication" footer text
- **Current**: "Create your account" / "Sign in to continue"
- **Impact**: LOW - But can be more company-specific

#### **C. Support Form Messaging**
**Location**: `/support` page
- **Current**: "Submit a support ticket and our team will get back to you as soon as possible."
- **Current**: "Already have an account? Sign in" + "create an account" links
- **Impact**: MEDIUM - Could be more company-specific

### 1.3 Self-Service Features

#### **A. Public Room Discovery**
**Location**: Home page (`/`)
- **Current State**: "Discover" section shows all PUBLIC rooms user can see
- **Impact**: LOW - This is actually appropriate for internal tool (employees discovering team rooms)
- **Note**: Keep this - it's part of the internal collaboration story

#### **B. Create Room Button**
**Location**: Home page header
- **Current State**: Any authenticated user can create rooms
- **Impact**: LOW - Appropriate for internal tool (employees creating team rooms)
- **Note**: Keep this - it's part of the internal collaboration story

---

## 2. RECOMMENDATIONS: HIDE vs KEEP IN CODE

### 2.1 HIDE IN UI (For Demo Mode)

#### **Priority 1: Must Hide**
1. **Public Sign-Up Route** (`/sign-up`)
   - **Action**: Redirect to sign-in page with message
   - **Keep in Code**: Yes (for future use)
   - **Risk**: LOW - Simple redirect

2. **Sign-Up Link in Sign-In Page**
   - **Action**: Remove "Don't have an account? Sign up" link
   - **Keep in Code**: Yes (comment out, easy to restore)
   - **Risk**: LOW - Simple UI change

3. **GitHub OAuth Button**
   - **Action**: Hide GitHub button (keep in code, just don't show)
   - **Keep in Code**: Yes (provider stays configured)
   - **Risk**: LOW - Conditional rendering

4. **Email Magic Link Button**
   - **Action**: Hide magic link button (keep in code)
   - **Keep in Code**: Yes (provider stays configured)
   - **Risk**: LOW - Conditional rendering

#### **Priority 2: Should Hide**
5. **Sign-Up Links in Support Page**
   - **Action**: Remove "Already have an account?" and "create an account" links
   - **Keep in Code**: Yes (comment out)
   - **Risk**: LOW - Simple UI change

6. **Sign-Up API Endpoint**
   - **Action**: Return 403 Forbidden with message "Account creation is restricted. Please contact your administrator."
   - **Keep in Code**: Yes (just add early return)
   - **Risk**: LOW - Simple API guard

### 2.2 KEEP IN CODE (But Not Exposed)

These features stay in the codebase but are hidden from UI:
- GitHub OAuth provider (configured but not shown)
- Email Magic Link provider (configured but not shown)
- Sign-up API endpoint (returns 403 in demo mode)
- Sign-up page route (redirects to sign-in)

**Rationale**: Easy to re-enable for future use or if needed for specific demos.

### 2.3 UPDATE TEXT / MESSAGING

#### **Low-Risk Text Updates**
1. **Product Name**: Use "SolaceDesk" consistently in UI (instead of "Accessly")
2. **Sign-In Page**: Update heading to "SolaceDesk" and subtitle to "Internal Helpdesk Portal"
3. **Support Page**: Update messaging to be more company-specific
4. **Auth Footer**: Remove generic "Secure, role-based authentication" or make it company-specific

---

## 3. DEMO MODE STORY

### 3.1 Pre-Seeded Demo Accounts

**Recommended Accounts**:
1. **Admin Account**
   - Email: `admin@solace.com`
   - Password: `demo123`
   - Role: `ADMIN`
   - Department: `GENERAL`
   - Use Case: Full system access, ticket management, analytics

2. **Agent Account** (Internal Employee)
   - Email: `agent@solace.com` (or use existing `clara@solace.com`)
   - Password: `demo123`
   - Role: `USER`
   - Department: `ENGINEERING` (or `PRODUCT`, `BILLING`)
   - Use Case: Team collaboration, ticket handling

3. **Customer Account** (External Customer - Optional)
   - Email: `customer@example.com`
   - Password: `demo123`
   - Role: `USER`
   - Department: `null`
   - Use Case: Submit tickets, view own tickets

**Note**: These accounts already exist in seed data (`seed-demo.ts`). We just need to ensure they're consistent.

### 3.2 Simple Login Flow

**Demo Mode Authentication**:
- **Primary Method**: Email/Password only
- **No OAuth**: GitHub button hidden
- **No Magic Link**: Email magic link button hidden
- **No Sign-Up**: Sign-up route redirects to sign-in

**Sign-In Page Flow**:
1. User lands on `/sign-in`
2. Sees "SolaceDesk - Internal Helpdesk Portal"
3. Simple email/password form
4. No "Sign up" link
5. No OAuth buttons
6. Clean, company-specific feel

**Demo Instructions** (for recruiters/clients):
- "Sign in with: `admin@solace.com` / `demo123`"
- "Or try: `agent@solace.com` / `demo123`"

### 3.3 External Customer Flow (Keep)

**Support Form** (`/support`):
- **Keep**: Public support form (no auth required)
- **Update**: Remove sign-up links, keep it simple
- **Message**: "Submit a support ticket. Our team will respond via email or you can sign in to track your ticket."

**Rationale**: External customers submitting tickets is part of the helpdesk story. We just don't need a full public signup system.

---

## 4. STEP-BY-STEP IMPLEMENTATION PLAN

### Phase 1: Hide Public Sign-Up (Low Risk)

#### **Step 1.1: Redirect Sign-Up Route**
**File**: `src/app/(auth)/sign-up/page.tsx`
- **Action**: Add redirect to sign-in page at the top of component
- **Code Change**: 
  ```tsx
  useEffect(() => {
    router.push('/sign-in?message=Account creation is restricted. Please contact your administrator.')
  }, [])
  ```
- **Risk**: LOW - Simple redirect, no breaking changes
- **Keep Original Code**: Yes (comment out, easy to restore)

#### **Step 1.2: Guard Sign-Up API**
**File**: `src/app/api/auth/signup/route.ts`
- **Action**: Add early return with 403 Forbidden
- **Code Change**: 
  ```ts
  return Response.json({
    ok: false,
    code: 'SIGNUP_DISABLED',
    message: 'Account creation is restricted. Please contact your administrator.',
  }, { status: 403 })
  ```
- **Risk**: LOW - Simple API guard
- **Keep Original Code**: Yes (wrap in feature flag or env var check)

#### **Step 1.3: Remove Sign-Up Link from Sign-In Page**
**File**: `src/app/(auth)/sign-in/page.tsx`
- **Action**: Remove or comment out the "Don't have an account? Sign up" section
- **Lines**: ~182-190
- **Risk**: LOW - Simple UI removal
- **Keep Original Code**: Yes (comment out)

#### **Step 1.4: Remove Sign-Up Links from Support Page**
**File**: `src/app/support/page.tsx`
- **Action**: Remove "Already have an account?" and "create an account" links
- **Lines**: ~101-112
- **Risk**: LOW - Simple UI removal
- **Keep Original Code**: Yes (comment out)

### Phase 2: Hide OAuth Providers (Low Risk)

#### **Step 2.1: Hide GitHub Button**
**File**: `src/app/(auth)/sign-in/page.tsx`
- **Action**: Conditionally hide GitHub button based on env var or feature flag
- **Code Change**: 
  ```tsx
  {hasGitHub && process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH !== 'false' && (
    <button onClick={handleGitHubSignIn}>...</button>
  )}
  ```
- **Risk**: LOW - Conditional rendering
- **Keep Original Code**: Yes (just add condition)

#### **Step 2.2: Hide Email Magic Link Button**
**File**: `src/app/(auth)/sign-in/page.tsx`
- **Action**: Conditionally hide magic link button
- **Code Change**: Similar to GitHub
- **Risk**: LOW - Conditional rendering
- **Keep Original Code**: Yes

#### **Step 2.3: Remove "Or" Divider**
**File**: `src/app/(auth)/sign-in/page.tsx`
- **Action**: Hide divider if no OAuth providers shown
- **Lines**: ~194-202
- **Risk**: LOW - Conditional rendering
- **Keep Original Code**: Yes

### Phase 3: Update Branding & Messaging (Low Risk)

#### **Step 3.1: Update Product Name in Sign-In Page**
**File**: `src/app/(auth)/sign-in/page.tsx`
- **Action**: Change "Accessly" to "SolaceDesk"
- **Action**: Update subtitle to "Internal Helpdesk Portal"
- **Lines**: ~112-114
- **Risk**: LOW - Text change only

#### **Step 3.2: Update Product Name in Sign-Up Page** (if we keep it accessible)
**File**: `src/app/(auth)/sign-up/page.tsx`
- **Action**: Change "Accessly" to "SolaceDesk"
- **Lines**: ~85
- **Risk**: LOW - Text change only

#### **Step 3.3: Update Auth Footer Text**
**File**: `src/app/(auth)/sign-in/page.tsx`
- **Action**: Remove or update "Secure, role-based authentication"
- **Lines**: ~320-322
- **Risk**: LOW - Text change only

#### **Step 3.4: Update Support Page Messaging**
**File**: `src/app/support/page.tsx`
- **Action**: Update to be more company-specific
- **Current**: "Submit a support ticket and our team will get back to you as soon as possible."
- **Suggested**: "Submit a support ticket. Our team will respond via email or you can sign in to track your ticket."
- **Risk**: LOW - Text change only

#### **Step 3.5: Update Navbar Branding**
**File**: `src/components/Navbar.tsx`
- **Action**: Change "Accessly" to "SolaceDesk" (optional, for consistency)
- **Lines**: ~60, ~79, ~139
- **Risk**: LOW - Text change only

### Phase 4: Demo Mode Configuration (Optional)

#### **Step 4.1: Add Demo Mode Flag**
**File**: `src/lib/env.ts`
- **Action**: Add `DEMO_MODE` env var (optional)
- **Use Case**: Control demo mode behavior
- **Risk**: LOW - New optional env var

#### **Step 4.2: Use Flag in Conditional Logic**
**Files**: Various
- **Action**: Use `DEMO_MODE` to control sign-up, OAuth visibility
- **Risk**: LOW - Feature flag pattern

---

## 5. HIGH-RISK CHANGES TO AVOID

### ❌ **DO NOT TOUCH** (Before Deployment)

1. **Database Schema**
   - No changes to Prisma schema
   - No migrations needed
   - **Reason**: Schema changes are risky and require careful testing

2. **Authentication Backend Logic**
   - Don't remove providers from `src/lib/auth.ts`
   - Don't change session/JWT logic
   - **Reason**: Core auth logic, changes could break existing sessions

3. **User Creation Logic**
   - Don't change how users are created in seed scripts
   - Don't change user role assignment
   - **Reason**: Seed scripts are working, don't break them

4. **API Route Structure**
   - Don't delete API routes
   - Don't change route handlers (except adding guards)
   - **Reason**: API changes could break frontend

5. **Room/Chat Functionality**
   - Don't change room creation, joining, or chat features
   - **Reason**: Core functionality, changes could break user experience

### ✅ **SAFE TO CHANGE** (Low Risk)

1. **UI Text/Labels**: Text changes only, no logic
2. **Conditional Rendering**: Hide/show elements based on flags
3. **Redirects**: Simple route redirects
4. **API Guards**: Early returns with error messages
5. **Link Removal**: Comment out links, don't delete code

---

## 6. IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Review plan with ChatGPT
- [ ] Create feature branch: `demo-mode-refinement`
- [ ] Backup current state (git commit)

### Phase 1: Hide Sign-Up
- [ ] Redirect `/sign-up` route to sign-in
- [ ] Add 403 guard to `/api/auth/signup`
- [ ] Remove sign-up link from sign-in page
- [ ] Remove sign-up links from support page
- [ ] Test: Verify sign-up is inaccessible

### Phase 2: Hide OAuth
- [ ] Hide GitHub button (conditional rendering)
- [ ] Hide Email magic link button (conditional rendering)
- [ ] Hide "Or" divider when no OAuth shown
- [ ] Test: Verify only email/password shown

### Phase 3: Update Branding
- [ ] Update product name to "SolaceDesk" in sign-in
- [ ] Update subtitle to "Internal Helpdesk Portal"
- [ ] Update auth footer text
- [ ] Update support page messaging
- [ ] Update navbar branding (optional)
- [ ] Test: Verify consistent branding

### Phase 4: Demo Mode Config (Optional)
- [ ] Add `DEMO_MODE` env var
- [ ] Use flag in conditional logic
- [ ] Test: Verify demo mode works

### Post-Implementation
- [ ] Test all authentication flows
- [ ] Test demo accounts login
- [ ] Test support form (external customer flow)
- [ ] Verify no broken links
- [ ] Update README with demo instructions
- [ ] Create demo script/documentation

---

## 7. DEMO INSTRUCTIONS (For Recruiters/Clients)

### Quick Start
1. Run `pnpm demo` to start the application
2. Navigate to `http://localhost:3000`
3. Sign in with one of these accounts:
   - **Admin**: `admin@solace.com` / `demo123`
   - **Agent**: `agent@solace.com` / `demo123` (or `clara@solace.com` / `demo123`)
   - **Customer**: `customer@example.com` / `demo123` (optional)

### Demo Story
"This is **SolaceDesk**, an internal helpdesk workspace for a single company. Internal teams collaborate in shared rooms while managing customer support tickets in one unified platform."

### Key Features to Show
1. **Internal Collaboration**: Team rooms, threaded conversations
2. **Ticket Management**: Support tickets, status tracking, AI assistant
3. **Real-Time Communication**: Socket.io, presence, typing indicators
4. **Admin Tools**: Observability, audit logs, analytics

---

## 8. SUMMARY

### What We're Hiding
- ✅ Public sign-up flow (redirect + API guard)
- ✅ GitHub OAuth button (conditional rendering)
- ✅ Email magic link button (conditional rendering)
- ✅ Sign-up links in UI (comment out)

### What We're Keeping
- ✅ All code (just hidden/guarded)
- ✅ Email/password authentication
- ✅ Support form for external customers
- ✅ All core functionality

### What We're Updating
- ✅ Product name: "Accessly" → "SolaceDesk"
- ✅ Messaging: More company-specific
- ✅ Auth page: "Internal Helpdesk Portal"

### Risk Level
- **Overall Risk**: **LOW**
- **Breaking Changes**: None
- **Schema Changes**: None
- **API Changes**: Minimal (just guards)

### Estimated Time
- **Phase 1**: 30 minutes
- **Phase 2**: 20 minutes
- **Phase 3**: 30 minutes
- **Phase 4**: 20 minutes (optional)
- **Total**: ~1.5-2 hours

---

## 9. NEXT STEPS

1. **Review this plan with ChatGPT** to ensure it meets your needs
2. **Create feature branch** for changes
3. **Implement changes** phase by phase
4. **Test thoroughly** before merging
5. **Update documentation** (README, DEMO_SCRIPT.md)

---

**Document Version**: 1.0  
**Created**: 2024  
**Purpose**: Refinement plan for demo mode - single-company internal helpdesk story

