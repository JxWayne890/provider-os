# ProviderOS Feature Implementation Prompt

You are working on ProviderOS, a React + TypeScript business management app for a service provider (web development, SEO, digital marketing). The app uses Vite, Supabase (Postgres), Stripe API, Google Calendar API, Resend (email), and Google Gemini AI. The relay server at scripts/server.mjs handles Stripe/email/calendar operations with bearer token auth.

## IMPORTANT PATH NOTE
This project directory has special characters (apostrophe + trailing space). When using Write/Edit tools, the path may not work. **Always use bash with heredocs or sed to write files.** Test with `cat` and `head` to verify writes. Build with `npx vite build` after changes.

## Current Architecture
- **App.tsx** — Main app with 6 nav sections (Dashboard, Clients, Billing, Sessions, Projects, Settings) with sub-tabs. Has Supabase Realtime subscriptions and 60s background polling for Stripe sync.
- **services/dataService.ts** — Supabase CRUD + Stripe/email relay calls with auth headers. Has camelCase↔snake_case mappers for all entity types.
- **services/supabase.ts** — Supabase client (env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- **services/geminiService.ts** — Google Gemini AI for lead qualification and meeting summaries
- **scripts/server.mjs** — Node relay server (port 3001) with bearer token auth. Handles: Stripe (products, payment links, invoices, customers, charges, subscriptions, balance), email (Resend), Google Calendar (list events, list past events). Uses googleapis for Calendar with service account.
- **scripts/sync-stripe-to-supabase.mjs** — Pulls Stripe data into Supabase (customers→clients, invoices→payments, charges→payments, subscriptions→payments). Deduplicates invoice-linked charges.
- **types.ts** — TypeScript interfaces: Lead, Client, Deal, Payment, Session, Project, Task, Metric, ConfigItem, Contract
- **supabase/schema.sql** — All table definitions with RLS enabled and permissive policies
- **.env.local** — Has: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_RELAY_AUTH_TOKEN, RELAY_AUTH_TOKEN, STRIPE_API_KEY, RESEND_API_KEY

## Design System
- Tailwind CSS with a Swiss mineral aesthetic — clean, lots of white space
- Colors: #1D1D1F (text), #B8860B (gold accents), #86868B (secondary text), #F5F5F7 (backgrounds)
- Font: font-serif for headings, font-sans for body
- Cards use `luminous-card` class with rounded-2xl/3xl
- Modals: fixed inset-0 with backdrop-blur, rounded-3xl white cards
- Status badges: rounded-full with color-coded bg/text/border

## Features to Implement

Implement ALL of the following features. Work through them one at a time, building and testing after each. Do NOT skip any.

---

### Feature 1: Notifications Feed
The bell icon in the header currently does nothing. Build a real notification system.

**What to build:**
- A `notifications` table in Supabase: `id TEXT PRIMARY KEY, type TEXT, title TEXT, message TEXT, link TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()`
- Run the SQL to create this table via the Supabase REST API or output it for the user to run
- A NotificationsPanel component that slides in from the right when clicking the bell icon
- Show unread count badge on the bell (replace the static red dot)
- Notification types: `payment_received`, `invoice_overdue`, `meeting_soon`, `contract_signed`
- Generate notifications during the Stripe sync: when a payment status is 'Paid' and there's no existing notification for it, create one. When an invoice is 'Past Due', create an overdue notification.
- Generate meeting notifications: during calendar sync, if a meeting is within 1 hour, create a `meeting_soon` notification
- Each notification row: icon (based on type), title, message, time ago, click to navigate to relevant section
- Mark as read on click, "Mark all read" button
- Wire into App.tsx — the bell onClick opens the panel, badge shows unread count

---

### Feature 2: Client Onboarding Flow
When converting a lead or creating a new client, provide a guided onboarding wizard.

**What to build:**
- A multi-step modal/wizard component: `ClientOnboardingWizard.tsx`
- Steps: (1) Client info (name, email, phone, service package) → (2) Create Stripe customer automatically → (3) Generate & send contract → (4) Send first invoice → (5) Create project → (6) Schedule kickoff call
- Each step shows progress bar and can be skipped
- On completion, all records are created: Client in Supabase, Stripe customer, Contract, Invoice, Project, Calendar event
- Add an "Onboard Client" button in the Clients section header
- Uses existing relay endpoints: create_customer, send_email, list_calendar_events
- Add a `create_calendar_event` action to server.mjs that creates a Google Calendar event with Google Meet link (the service account has "Make changes to events" permission on theprovidersystem@gmail.com calendar)

---

### Feature 3: Proposal Builder
Transform the Deals & Proposals sub-tab into a real proposal builder.

**What to build:**
- Redesign DealsManager.tsx to include a proposal creation flow
- A proposal has: client name, title, line items (description + price), total, terms, expiration date
- Add a `proposals` table in Supabase: `id TEXT PRIMARY KEY, client_id TEXT, title TEXT, line_items JSONB, total NUMERIC, terms TEXT, status TEXT DEFAULT 'Draft', expires_at TEXT, created_at TEXT, accepted_at TEXT, proposal_url TEXT`
- Create a shareable proposal link (like the contract signing interface): `?mode=proposal&id=xxx`
- When client views the proposal, they see a clean page with line items and an "Accept" button
- On accept: auto-create a Contract from the proposal terms, create an Invoice for the total, update proposal status to 'Accepted'
- Add proposal CRUD functions to dataService.ts
- Add proposal fetch/upsert to App.tsx sync

---

### Feature 4: Revenue Reports
Add a Reports sub-tab under Billing (alongside Transactions, Payment Links, Contracts).

**What to build:**
- A `ReportsManager.tsx` component
- Charts (using recharts, already installed): 
  - Revenue by month (bar chart) — last 12 months
  - Revenue by client (horizontal bar chart) — top 10 clients
  - Paid vs Outstanding over time (area chart)
  - Payment type breakdown (pie chart — invoices vs charges vs subscriptions)
- Summary cards: Total all-time revenue, this month revenue, average deal size, collection rate (paid/total)
- Data comes from the existing payments array — group and aggregate in the component
- Add 'reports' to the billing sub-tabs in App.tsx

---

### Feature 5: Expense Tracking
Track business expenses to calculate profit margins.

**What to build:**
- An `expenses` table in Supabase: `id TEXT PRIMARY KEY, description TEXT, amount NUMERIC, category TEXT, vendor TEXT, date TEXT, recurring BOOLEAN DEFAULT false, client_id TEXT, project_id TEXT, receipt_url TEXT, created_at TEXT`
- An `ExpensesManager.tsx` component with:
  - Add expense form (description, amount, category dropdown, vendor, date, optional client/project link)
  - Expense list with category filters (Software, Hosting, Domains, Tools, Marketing, Other)
  - Monthly expense total vs revenue = profit margin display
  - Per-client profitability: revenue from client minus expenses tagged to that client
- Add expense CRUD to dataService.ts (fetchExpenses, upsertExpense)
- Add expenses to the App.tsx sync and state
- Add 'expenses' to the billing sub-tabs
- Update the Dashboard to show profit margin (revenue - expenses)

---

### Feature 6: Meeting Notes → Auto Follow-up
After a session/meeting, generate a follow-up email using Gemini AI.

**What to build:**
- In the SessionsManager, when viewing a past meeting (clicking on it in the detail modal), add a "Generate Follow-up" button
- When clicked, call geminiService to generate a follow-up email based on: meeting title, attendees, description, and any notes
- Show the generated email in an editable textarea
- Add a "Send" button that sends via the relay's send_email action
- The attendee emails come from the CalendarEvent data
- Use the existing `summarizeMeeting` function pattern in geminiService.ts as a reference for the Gemini API call

---

### Feature 7: File Attachments (Supabase Storage)
Allow attaching files to clients and projects.

**What to build:**
- Enable Supabase Storage — create a bucket called 'attachments'
- An `attachments` table: `id TEXT PRIMARY KEY, file_name TEXT, file_url TEXT, file_size INTEGER, mime_type TEXT, entity_type TEXT, entity_id TEXT, uploaded_at TEXT`
- entity_type can be 'client', 'project', 'contract'
- Upload component: drag-and-drop zone or file picker
- In the Client detail panel, add an "Attachments" section showing uploaded files with download links
- In ProjectsManager, add file attachments per project
- Use Supabase Storage JS client: `supabase.storage.from('attachments').upload(path, file)`
- Add to dataService.ts: uploadFile, fetchAttachments, deleteAttachment

---

### Feature 8: Client Portal (Shareable Link)
A read-only page where clients can see their invoices and project status.

**What to build:**
- A `ClientPortal.tsx` component rendered when URL has `?mode=portal&client=xxx`
- Shows: Client name, list of invoices (with status + Stripe payment links), project progress, active contract
- Clean, minimal design — no sidebar, just a branded page with the ProviderOS logo
- No authentication required (security through obscurity via the client ID)
- Add a "Copy Portal Link" button in the client detail panel
- The portal fetches data from Supabase directly (client, payments, projects, contracts filtered by client_id)
- Add the portal route check in App.tsx alongside the existing signing mode check

---

## Implementation Notes

- **CRITICAL**: This project has path issues with the Write/Edit tools due to the apostrophe in the directory name. Always use `bash` with heredocs (`cat > file << 'EOF'`) or `sed` to write files. Verify with `cat` or `head` after writing.
- Use `PROJDIR=$(find "/Users/john/Desktop" -maxdepth 3 -type d -name "the-provider*" 2>/dev/null | head -1)` to get the correct path for bash commands.
- Build after each feature: `cd "$PROJDIR" && npx vite build 2>&1 | tail -5`
- The relay server is at localhost:3001. Auth token: read from .env.local RELAY_AUTH_TOKEN
- Supabase URL and key are in .env.local
- For new Supabase tables, output the CREATE TABLE SQL and tell the user to run it in their Supabase SQL editor, OR use the Supabase REST API to check if the table exists first
- Keep the existing design system — dark text, gold accents, luminous-card class, font-serif headings
- All new data types need: TypeScript interface in types.ts, Supabase table, dataService CRUD functions, App.tsx state + sync
