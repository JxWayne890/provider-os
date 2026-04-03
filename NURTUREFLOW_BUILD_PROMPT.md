# MEGA BUILD PROMPT — NurtureFlow: Cold Email & Follow-Up Platform

## PURPOSE
You are building a standalone, production-grade cold email and follow-up platform called NurtureFlow. Think of it as a self-hosted Instantly.ai alternative. This is a generic SaaS app — not tied to any specific business or industry. Any user can sign up, import their leads, write email sequences, and run automated cold outreach campaigns with warmup, tracking, and compliance built in.

## STACK
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js (Express or plain http server)
- **Database:** Supabase (Postgres + Auth + Realtime + Row Level Security)
- **Email Provider:** Resend API
- **DNS Guidance:** Cloudflare (docs only — user configures their own)
- **Auth:** Supabase Auth (email/password signup + login)
- **Icons:** lucide-react
- **Charts:** recharts
- **CSV Parsing:** papaparse

## DESIGN SYSTEM
- Modern, dark-mode-first SaaS aesthetic (think Linear, Resend dashboard, Vercel)
- Background: #0A0A0A (near black)
- Cards: #141414 with subtle #1E1E1E borders
- Accent color: #6366F1 (indigo) for primary actions
- Success: #22C55E, Warning: #F59E0B, Error: #EF4444
- Text: #F5F5F5 (primary), #A1A1AA (secondary), #52525B (muted)
- Font: Inter or system-ui sans-serif
- Rounded corners: rounded-xl for cards, rounded-lg for buttons
- Subtle shadows, glass-morphism effects on modals
- Smooth transitions and micro-animations
- Fully mobile responsive

## APP NAME & BRANDING
- Name: **NurtureFlow**
- Tagline: "Outreach that converts. Follow-up that closes."
- Logo: stylized "N" or mail icon in indigo

## CORE FEATURES TO BUILD — IN THIS EXACT ORDER

### PHASE 1: Project Scaffolding
- Initialize React + TypeScript + Vite project
- Install dependencies: @supabase/supabase-js, lucide-react, recharts, papaparse, resend
- Configure Tailwind CSS with the dark theme design tokens
- Set up folder structure:
  ```
  src/
    components/
      auth/
      campaigns/
      contacts/
      sequences/
      analytics/
      settings/
      shared/
    services/
    hooks/
    types/
    utils/
    pages/
  server/
    index.mjs
    routes/
    services/
  supabase/
  ```
- Create .env.example with all required variables
- Create the Express/Node backend server

### PHASE 2: Auth & User System
Using Supabase Auth:
- **Signup page** — email, password, name, company name
- **Login page** — email, password
- **Auth context provider** — wraps the app, provides user state
- **Protected routes** — redirect to login if not authenticated
- **User profile** in Supabase: id, email, name, company_name, timezone, created_at
- **Onboarding flow** — after first signup: "Connect your sending domain" wizard

### PHASE 3: Database Schema
Create `supabase/schema.sql`:

1. **`users_profile`** — id (FK to auth.users), name, company_name, timezone, sending_domain, resend_api_key (encrypted), daily_send_limit, monthly_send_limit, warmup_enabled, created_at
2. **`sender_identities`** — id, user_id (FK), from_name, from_email, domain, domain_verified (bool), spf_verified, dkim_verified, dmarc_verified, created_at
3. **`contacts`** — id, user_id (FK), email (unique per user), first_name, last_name, company_name, city, state, country, website, phone, tags (text[]), custom_fields (jsonb), status (active/unsubscribed/bounced/replied), engagement_score (int), created_at, updated_at
4. **`contact_lists`** — id, user_id, name, description, contact_count, created_at
5. **`contact_list_members`** — id, list_id (FK), contact_id (FK), added_at
6. **`campaigns`** — id, user_id (FK), name, status (draft/active/paused/completed/cancelled), sender_identity_id (FK), contact_list_id (FK), sequence_id (FK), schedule_time (time), timezone, weekdays_only (bool), warmup_enabled (bool), warmup_day (int), daily_limit (int), total_sent, total_opened, total_clicked, total_replied, total_bounced, total_unsubscribed, started_at, paused_at, completed_at, created_at
7. **`sequences`** — id, user_id (FK), name, description, steps_count, created_at
8. **`sequence_steps`** — id, sequence_id (FK), step_number (int), delay_days (int, days after previous step), delay_hours (int), subject_template, body_template (HTML), step_type (initial/follow_up/breakup), condition (send_to_all/not_opened/not_clicked/not_replied), created_at
9. **`send_queue`** — id, user_id, campaign_id, contact_id, sequence_step_id, scheduled_for (timestamptz), status (queued/sending/sent/failed/cancelled), attempts (int), created_at
10. **`send_log`** — id, user_id, campaign_id, contact_id, sequence_step_id, resend_message_id, email, subject, status (sent/delivered/opened/clicked/bounced/complained), sent_at, delivered_at, opened_at, clicked_at, bounced_at, error_message
11. **`tracking_events`** — id, send_log_id, contact_id, event_type (open/click/unsubscribe), link_url, user_agent, ip_address, created_at
12. **`suppression_list`** — id, user_id, email (unique per user), reason (unsubscribed/bounced/complained/replied/manual), source_campaign_id, suppressed_at
13. **`daily_stats`** — id, user_id, campaign_id, date, sent, delivered, opened, clicked, replied, bounced, unsubscribed, open_rate, click_rate, bounce_rate
14. **`webhook_events`** — id, provider (resend), event_type, payload (jsonb), processed (bool), created_at

All tables: enable RLS with policies scoped to authenticated user (user_id = auth.uid()).

### PHASE 4: Types
Create `src/types/index.ts` with TypeScript interfaces and enums for every table above. Include:
- CampaignStatus, SendStatus, ContactStatus, StepType, StepCondition, SuppressionReason, TrackingEventType enums

### PHASE 5: Services Layer
Create `src/services/`:

**supabase.ts** — Supabase client init
**contactService.ts** — CRUD for contacts, lists, bulk import, dedup, suppression check
**campaignService.ts** — CRUD for campaigns, start/pause/resume, stats aggregation
**sequenceService.ts** — CRUD for sequences and steps, template rendering with merge tags
**analyticsService.ts** — daily stats, campaign performance, engagement funnel data, export
**settingsService.ts** — user profile, sender identities, API key management

### PHASE 6: Backend Server
Create `server/index.mjs` (Express):

**Email Sending Routes:**
1. `POST /api/send` — Send a single email via Resend. Injects tracking pixel, wraps links for click tracking, appends unsubscribe link. Returns resend message ID.
2. `POST /api/send-batch` — Process next batch for a campaign. Queries send_queue for next N emails, checks suppression, personalizes templates, staggers sends (2 second gap). Logs everything.
3. `POST /api/process-queue` — Master cron endpoint. For each active campaign: calculate warmup limit, check safety (bounce rate, monthly cap), queue the next batch, execute sends.

**Tracking Routes:**
4. `GET /track/open/:sendLogId` — Returns 1x1 transparent PNG. Logs open event. Updates send_log and contact engagement_score (+1).
5. `GET /track/click/:trackingEventId` — Logs click event. Updates engagement_score (+3). 302 redirects to original URL.
6. `GET /unsubscribe` — Query params: id, email, campaign. Renders simple unsubscribe confirmation page.
7. `POST /unsubscribe` — Processes unsubscribe. Adds to suppression_list. Updates contact status. Returns confirmation.

**Webhook Routes:**
8. `POST /webhook/resend` — Handles Resend webhook events: email.delivered, email.opened, email.clicked, email.bounced, email.complained. Verifies webhook signature. Updates send_log and contact status accordingly. Auto-suppresses on bounce/complaint.

**Booking Routes (optional, for users who want built-in scheduling):**
9. `GET /api/available-slots` — Returns available slots from connected Google Calendar
10. `POST /api/book` — Creates calendar event + sends confirmation

**Auth Middleware:**
- All /api/ routes require valid Supabase JWT in Authorization header
- /track/ and /unsubscribe routes are public (no auth)
- /webhook/ routes verify Resend webhook signature

### PHASE 7: Frontend Pages & Components

#### 7A: Layout
- **Sidebar navigation** (collapsible on mobile): Dashboard, Contacts, Campaigns, Sequences, Analytics, Settings
- **Top bar:** search, notifications bell, user avatar dropdown
- **Main content area** with page transitions

#### 7B: Dashboard (`/`)
- Welcome message with user's name
- Key metrics row: Total Contacts, Active Campaigns, Emails Sent (this month), Avg Open Rate
- Sending activity chart (last 30 days — recharts AreaChart)
- Active campaigns list with progress bars
- Recent activity feed (last 20 events)
- Quick actions: "New Campaign", "Import Contacts", "Create Sequence"

#### 7C: Contacts (`/contacts`)
- **Contact list view** — searchable, sortable table with: name, email, company, status, engagement score, tags, last contacted
- **Import contacts** button → CSV import modal:
  - Drag-and-drop zone
  - Preview first 20 rows
  - Column mapping (dropdowns)
  - Assign to list (existing or create new)
  - Dedup options: skip duplicates, update existing
  - Suppression check: auto-skip emails on suppression list
  - Validation: skip invalid emails
  - Import progress bar
  - Summary: "Imported 9,847 contacts. Skipped 153 (duplicates: 98, invalid: 32, suppressed: 23)"
- **Contact detail view** — all info, engagement timeline, email history, tags, notes
- **Lists management** — create/edit/delete lists, view members, bulk actions
- **Bulk actions:** add to list, remove, tag, delete, suppress

#### 7D: Sequences (`/sequences`)
- **Sequence list** — name, steps count, campaigns using it, created date
- **Sequence builder:**
  - Visual step editor — each step is a card:
    - Step 1: Initial email (Day 0)
    - Step 2: Follow-up if not replied (Day 3)
    - Step 3: Follow-up if not opened (Day 5)
    - Step 4: Breakup email (Day 10)
  - Each step card has:
    - Delay configuration (days + hours after previous step)
    - Condition: send to all, only if not opened, only if not clicked, only if not replied
    - Subject line with merge tag buttons
    - Body editor with merge tag buttons
    - Preview button
  - Add step button between steps
  - Drag to reorder
  - Merge tags available: {{firstName}}, {{lastName}}, {{company}}, {{city}}, {{state}}, {{website}}, {{email}}, {{unsubscribeLink}}, {{senderName}}, {{senderCompany}}
  - **Live preview** — renders template with sample contact data

#### 7E: Campaigns (`/campaigns`)
- **Campaign list** — name, status badge, sequence name, contact list, progress (sent/total), open rate, click rate, actions
- **New campaign wizard** (step-by-step):
  1. Name your campaign
  2. Select sender identity (from_name, from_email)
  3. Select or create a sequence
  4. Select contact list
  5. Configure schedule: send time, timezone, weekdays only
  6. Configure warmup: enable/disable, starting day (for resumed campaigns)
  7. Review & launch (shows summary of everything)
- **Campaign detail view:**
  - Status banner: Draft / Active (Day X of warmup, sending Y/day) / Paused / Completed
  - Performance metrics: sent, delivered, opened (%), clicked (%), replied (%), bounced (%), unsubscribed (%)
  - Daily send chart
  - Engagement funnel visualization: Sent → Delivered → Opened → Clicked → Replied
  - Lead table: all contacts in this campaign with their status, step they're on, engagement score
  - Activity timeline: recent events
  - Controls: Pause, Resume, Cancel, Edit Settings
  - Export: download campaign results as CSV

#### 7F: Analytics (`/analytics`)
- **Overview metrics:** total emails sent (all time), avg open rate, avg click rate, avg reply rate, avg bounce rate
- **Performance over time:** line chart of open/click/reply rates over last 30/60/90 days
- **Campaign comparison:** table comparing all campaigns side-by-side
- **Best performing subjects:** ranked by open rate
- **Best performing templates:** ranked by click rate
- **Deliverability health:** bounce rate trend, complaint rate, suppression growth
- **Engagement heatmap:** best days/times for opens (helps optimize send time)
- **Export reports** as CSV

#### 7G: Settings (`/settings`)
- **Profile:** name, company, timezone
- **Sender Identities:**
  - Add new sending domain
  - DNS verification checklist (SPF ✓, DKIM ✓, DMARC ✓) with copy-paste record values
  - Multiple sender identities per domain
  - Set default sender
- **API Configuration:**
  - Resend API key input (stored encrypted)
  - Test connection button
  - Webhook URL display (for user to configure in Resend dashboard)
- **Sending Limits:**
  - Daily send limit (default 500)
  - Monthly send limit (default 50,000)
  - Warmup auto-scaling toggle
- **Compliance:**
  - Default unsubscribe text
  - Physical address (CAN-SPAM)
  - Custom unsubscribe page branding
- **Data:**
  - Export all contacts
  - Export suppression list
  - Delete account

### PHASE 8: Sequence Engine Logic
The core sending engine that powers automated follow-ups:

1. When a campaign starts, for each contact: create send_queue entries for Step 1 with scheduled_for = campaign send_time
2. After Step 1 is sent, schedule Step 2 based on delay_days/delay_hours IF the step condition is met
3. Before sending any step, check:
   - Is contact suppressed? → skip
   - Has contact replied? → skip all remaining steps
   - Has contact unsubscribed? → skip all remaining steps
   - Does step condition pass? (e.g., "only if not opened" — check if any previous step was opened)
   - Is bounce rate healthy? → if not, pause campaign
4. Continue through all steps in the sequence
5. When all contacts have completed all steps (or been suppressed), mark campaign as completed

### PHASE 9: Warmup System
Warmup schedule (configurable, these are defaults):
```
Day 1-3:   20 emails/day
Day 4-7:   50 emails/day
Day 8-14:  100 emails/day
Day 15-21: 200 emails/day
Day 22-28: 350 emails/day
Day 29+:   500 emails/day (or user's daily_limit, whichever is lower)
```

Rules:
- Warmup applies per sender identity (each new domain starts at Day 1)
- If campaign is paused and resumed, warmup continues from where it left off (not reset)
- If bounce rate > 3% on any day, drop back one warmup tier and hold for 3 days
- If bounce rate > 5%, auto-pause and notify user
- Sends distributed evenly across the sending window (not all at once)

### PHASE 10: Safety & Suppression Rules

**Hard rules (never violate):**
1. Never send to a suppressed email
2. Never exceed daily warmup limit
3. Never exceed monthly send limit
4. Never send on weekends if weekdays_only is enabled
5. Always include unsubscribe link
6. Always check suppression before EVERY send
7. Minimum 2 second gap between sends
8. Auto-pause if bounce rate > 5%
9. Auto-throttle if bounce rate > 3%
10. Auto-suppress on: unsubscribe, hard bounce, complaint
11. Stop sequence for contact on: reply, unsubscribe, bounce
12. Never send duplicate email to same contact in same step
13. Rate limit API endpoints (prevent abuse)

**Suppression priority (checked in order):**
1. Global suppression list (email match)
2. Contact status = unsubscribed/bounced
3. Campaign-specific: already sent this step
4. Sequence condition: not met (e.g., they already opened)

### PHASE 11: Email Infrastructure

**Email composition (server-side, before sending):**
1. Render template: replace all merge tags with contact data
2. Inject open tracking pixel before </body>
3. Find all <a href="..."> tags, wrap each with click tracking URL
4. Append unsubscribe footer with tracked unsubscribe link
5. Set List-Unsubscribe header (RFC 8058 one-click unsubscribe)
6. Set Reply-To header to sender's email
7. Send via Resend API

**Tracking URL format:**
- Open: `{TRACKING_BASE_URL}/track/open/{sendLogId}`
- Click: `{TRACKING_BASE_URL}/track/click/{trackingEventId}?url={encodedOriginalUrl}`
- Unsubscribe: `{TRACKING_BASE_URL}/unsubscribe?id={contactId}&email={encodedEmail}&campaign={campaignId}`

### PHASE 12: Cron / Job Runner
Create `server/cron.mjs`:
- Runs on interval (every 5 minutes) or triggered via API
- For each active campaign:
  1. Check if it's within the sending window (based on schedule_time and timezone)
  2. Calculate today's send limit (warmup curve)
  3. Check how many already sent today
  4. If quota remains: pull next batch from send_queue
  5. Process each send with safety checks
  6. Update stats after batch completes
  7. Check for follow-up steps to schedule
- Log everything
- Handle errors gracefully (one failed send doesn't stop the batch)

## ENVIRONMENT VARIABLES
```
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Server
PORT=3001
NODE_ENV=development

# Resend (default — users can override with their own key)
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=

# Tracking
TRACKING_BASE_URL=http://localhost:3001

# Google Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_ID=primary
```

## DEPLOYMENT NOTES
- Frontend: Vercel or any static host
- Backend: Railway, Render, Fly.io, or any Node.js host
- Database: Supabase (hosted)
- Cron: Railway cron, or server-side setInterval, or external cron service

## QUALITY REQUIREMENTS
- Dark mode first, responsive on all screen sizes
- TypeScript strict mode — proper types everywhere
- Error boundaries on all route-level components
- Loading skeletons (not spinners) for all data fetches
- Optimistic UI updates where possible
- Toast notifications for user actions (success/error)
- Keyboard shortcuts for power users (n = new, / = search)
- All async operations have proper error handling
- Rate limiting on all API endpoints
- Input validation on all forms
- XSS protection on all rendered HTML (sanitize email templates before preview)
- CSRF protection on mutation endpoints
- Build must pass with zero errors

## AFTER COMPLETING ALL PHASES
1. Run `npx vite build` and fix any errors
2. Create a README.md with:
   - What NurtureFlow is
   - How to set up (env vars, Supabase, Resend)
   - How to run locally (frontend + backend)
   - How to configure DNS for sending domain
   - How to deploy
3. Create DNS_SETUP_GUIDE.md with generic Cloudflare instructions for any domain
4. List any manual steps remaining
5. Summarize the full feature set
