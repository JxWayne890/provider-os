# MEGA BUILD PROMPT — ProviderOS Cold Email Outreach System

## PURPOSE
You are building a production-grade cold email outreach system into an existing React + Supabase + Stripe app called ProviderOS. This system will allow the owner (John) to import 10,000 med spa leads via CSV, write email templates with merge tags, and send cold emails on an automated warmup schedule through Resend — with full tracking, suppression, compliance, and a built-in booking system that connects to Google Calendar.

## CRITICAL CONTEXT
- **Project root:** This directory (the-provider's-business-os)
- **Stack:** React 19 + TypeScript + Vite (port 3000), Supabase (database + realtime), Node.js relay server (port 3001, scripts/server.mjs), Resend (email), Stripe (payments), Google APIs (calendar)
- **Existing files you MUST read first before modifying:** App.tsx, types.ts, services/dataService.ts, services/supabase.ts, scripts/server.mjs, index.tsx, package.json, vite.config.ts
- **Design system:** Swiss mineral aesthetic — clean whites, #121212 blacks, #B8860B gold accents, luminous-card/luminous-button-gold CSS classes, font-serif for headings, rounded-2xl/rounded-xl cards, lucide-react icons. Match the existing UI exactly.
- **Env vars are in .env.local** — Supabase URL/key, Resend API key, Stripe key, Relay auth token, Google API key are already configured
- **The master plan is in OUTREACH_SYSTEM_PLAN.md** — read it fully before starting

## DOMAIN SETUP
- Root domain: theprovidersystem.com (NEVER touch this for cold email)
- Sending subdomain: go.theprovidersystem.com
- From address: john@go.theprovidersystem.com
- DNS is in Cloudflare — generate a DNS_SETUP_GUIDE.md with exact records needed (SPF, DKIM, DMARC) after reading Resend's domain verification requirements

## WHAT TO BUILD — IN THIS EXACT ORDER

### PHASE 1: Database Schema
Create a new file `supabase/outreach_tables.sql` with these tables:

1. **`campaigns`** — id (text PK), name, subject_template, body_template (HTML with merge tags), from_name, from_email, status (draft/active/paused/completed), daily_limit, send_time (time of day), weekdays_only (bool), warmup_enabled (bool), warmup_day (int, auto-increments), created_at, updated_at
2. **`campaign_leads`** — id (text PK), campaign_id (FK), email, company_name, city, state, country, website, verification_status, send_status (queued/sending/sent/opened/clicked/replied/bounced/failed/suppressed), engagement_score (int default 0), sent_at, opened_at, clicked_at, replied_at, bounced_at, error_message, created_at
3. **`suppression_list`** — id (text PK), email (unique), reason (unsubscribed/bounced/replied/manual), suppressed_at, source_campaign_id
4. **`send_log`** — id (text PK), campaign_id, campaign_lead_id, email, resend_message_id, status, batch_id, sent_at, opened_at, clicked_at, error_message
5. **`tracking_events`** — id (text PK), send_log_id, campaign_lead_id, event_type (open/click/unsubscribe), link_url, user_agent, ip_address, created_at
6. **`bookings`** — id (text PK), campaign_lead_id, lead_name, lead_email, lead_phone, scheduled_at, google_event_id, google_meet_link, status (confirmed/cancelled/completed), source (cold_email), created_at

All tables: enable RLS, create "allow all" policies (same pattern as existing tables).

### PHASE 2: Types
Add to `types.ts`:
- Campaign, CampaignLead, SuppressionEntry, SendLog, TrackingEvent, Booking interfaces
- CampaignStatus, SendStatus, SuppressionReason, TrackingEventType enums

### PHASE 3: Data Service
Add to `services/dataService.ts`:
- CRUD functions for all new tables (fetchCampaigns, upsertCampaign, fetchCampaignLeads, bulkInsertCampaignLeads, etc.)
- Row-to-camelCase mappers (same pattern as existing code)
- Suppression check function: `isEmailSuppressed(email: string): Promise<boolean>`
- Engagement score calculator
- Campaign stats aggregator (total sent, opened, clicked, replied, bounced, open rate, click rate)

### PHASE 4: Relay Server Endpoints
Add to `scripts/server.mjs` — new actions:

1. **`send_campaign_email`** — Takes: to, from_name, from_email, subject, html_body, reply_to, campaign_lead_id. Sends via Resend with: open tracking pixel injected, all links wrapped for click tracking, unsubscribe link appended. Returns resend message ID.
2. **`send_batch`** — Takes: campaign_id, batch_size. Queries next N unsent leads (checking suppression list first), personalizes template with merge tags, staggers sends (one every 2 seconds), logs each send. Respects warmup schedule.
3. **`process_webhook`** — Resend webhook handler for: email.delivered, email.opened, email.clicked, email.bounced, email.complained. Updates send_log and campaign_leads accordingly. Auto-suppresses on bounce/complaint.
4. **`unsubscribe`** — Takes email + campaign_lead_id. Adds to suppression_list, updates campaign_lead status.
5. **`track_click`** — Logs click event, redirects to destination URL.
6. **`track_open`** — Returns 1x1 transparent pixel, logs open event.
7. **`get_warmup_limit`** — Calculates today's send limit based on warmup_day: Day 1-3: 20, Day 4-7: 50, Week 2: 100, Week 3: 200, Week 4+: 500. Returns 0 if bounce rate > 3%.
8. **`create_booking`** — Takes lead info + time slot. Creates Google Calendar event with auto-generated Google Meet link. Creates Session in Supabase. Sends confirmation email to lead. Returns booking confirmation.
9. **`get_available_slots`** — Queries Google Calendar free/busy API for next 14 days. Returns available 30-min slots during business hours (9AM-5PM EST, weekdays).

### PHASE 5: Tracking & Webhook Infrastructure
In the relay server:
- **Open tracking:** When sending, inject `<img src="https://go.theprovidersystem.com/track/open/[send_log_id]" width="1" height="1" style="display:none" />` before `</body>`
- **Click tracking:** Before sending, find all `<a href="...">` tags in the HTML body. Replace each href with `https://go.theprovidersystem.com/track/click/[tracking_event_id]?url=[encoded_original_url]`. When clicked, log the event and 302 redirect to the original URL.
- **Unsubscribe link:** Append to every email footer: `<a href="https://go.theprovidersystem.com/unsubscribe?id=[campaign_lead_id]&email=[encoded_email]">Unsubscribe</a>`
- **Resend webhooks:** Create a POST endpoint at `/webhook/resend` that verifies the webhook signature and processes delivery/open/click/bounce/complaint events

NOTE: For local development, use `http://localhost:3001` for tracking URLs. The production URLs (go.theprovidersystem.com) will be configured via env var `TRACKING_BASE_URL`.

### PHASE 6: Unsubscribe Pages
Create a public unsubscribe flow. These are ROUTES in the React app that work WITHOUT authentication:

1. **Unsubscribe landing page** (URL: `?mode=unsubscribe&id=[campaign_lead_id]&email=[email]`) — Shows: "Are you sure you want to unsubscribe?" with a Confirm button. Branded with ProviderOS styling.
2. **Unsubscribe confirmation page** — After clicking confirm: "You have been unsubscribed. Thank you for your time." Clean, simple, professional. No further action needed.
3. On confirm, call the relay `unsubscribe` endpoint to add to suppression_list and update campaign_lead status.

### PHASE 7: Booking Page
Create a public booking flow (URL: `?mode=book&ref=[campaign_lead_id]`):

1. **Branded booking page** — Shows "Book a 15-Minute Consultation with The Provider System"
2. Pulls available slots from Google Calendar via relay `get_available_slots`
3. Displays a week view with clickable time slots
4. Lead fills in: name, email, phone, company name (pre-filled from campaign_lead data if available)
5. On submit: calls relay `create_booking` which creates Google Calendar event + Meet link + Session in ProviderOS
6. **Confirmation page** — "You're booked! Check your email for the Google Meet link." Shows date, time, Meet link.
7. Updates campaign_lead engagement_score (+20 for booking) and status
8. Creates a notification in ProviderOS: "New booking from [lead name] at [company]"
9. Mobile-friendly, fast, no auth required

### PHASE 8: Frontend — Outreach Tab
Add a new "Outreach" tab to the sidebar in App.tsx (between Projects and Settings). Icon: `Mail` from lucide-react.

The Outreach section has sub-tabs (same pattern as billing sub-tabs):
- **Campaigns** (default)
- **Templates**
- **Analytics**

#### 8A: Campaigns Sub-Tab
- List of all campaigns with status badge, send progress bar, open/click rates
- "New Campaign" button → creates a new campaign in draft status
- Campaign detail view: name, template selection, schedule settings, lead count, start/pause/resume controls
- Campaign lead list: sortable/filterable table showing each lead's status, engagement score, last event

#### 8B: CSV Import (inside campaign detail)
- Drag-and-drop zone or file picker
- After upload: preview first 20 rows in a table
- Column mapping UI: dropdowns to map CSV columns → campaign_lead fields (company_name, email, city, state, country, website)
- "Import" button → bulk inserts into campaign_leads with status "queued"
- Show import progress and final count
- Validate emails before import, skip duplicates, check against suppression_list

#### 8C: Template Editor (inside campaign detail or Templates sub-tab)
- Subject line input with merge tag buttons: {{company}}, {{city}}, {{state}}, {{website}}
- Rich text / HTML body editor (can be a textarea with basic formatting)
- Merge tag insertion buttons
- **Live preview panel** — shows the email as it would look with real lead data (picks a random lead from the campaign)
- Default template pre-loaded:

```
Subject: Quick question for {{company}}

Hi there,

I came across {{company}} in {{city}}, {{state}} and was impressed by your practice.

I help med spas like yours get found on Google and ChatGPT through high-performance websites with SEO and AI Engine Optimization — built with city + service page strategies that actually drive bookings.

Want to see what that could look like for {{company}}?

→ See our work: https://theprovidersystem.com/projects
→ Book a 15-min call: [BOOKING_LINK]

Talk soon,
John W Johnson
The Provider System

[UNSUBSCRIBE_LINK]
```

[BOOKING_LINK] and [UNSUBSCRIBE_LINK] are auto-replaced at send time with tracked URLs.

#### 8D: Campaign Scheduler
- Daily send limit (auto-calculated from warmup if warmup enabled)
- Preferred send time (default 9:00 AM)
- Weekdays only toggle (default ON)
- Warmup mode toggle (default ON for new campaigns)
- Warmup progress visualization: "Day 7 of warmup — sending 50/day, next increase in 3 days"
- Start Campaign / Pause Campaign / Resume buttons
- Safety indicators: current bounce rate, monthly send count, suppression count

#### 8E: Analytics Sub-Tab
- **Campaign performance cards:** total sent, open rate %, click rate %, reply rate %, bounce rate %, unsubscribe rate %
- **Daily send chart** (recharts AreaChart — same style as Dashboard revenue chart)
- **Engagement funnel:** Sent → Opened → Clicked → Booked (visual funnel)
- **Hot leads list:** leads with engagement_score > 10, sorted by score, with quick actions (view, book, add to CRM)
- **Recent activity feed:** last 50 tracking events in a timeline

### PHASE 9: Warmup Scheduler Logic
Create `scripts/warmup-cron.mjs`:
- Designed to be run via cron job or manual trigger
- On each run: checks all active campaigns, calculates today's warmup limit, calls `send_batch` for each
- Warmup curve: Day 1-3: 20/day, Day 4-7: 50/day, Day 8-14: 100/day, Day 15-21: 200/day, Day 22+: 500/day (or campaign daily_limit, whichever is lower)
- Safety checks before sending: bounce rate < 3%, monthly total < 50000, not a weekend (if weekdays_only)
- Increments warmup_day on the campaign after each run
- Logs everything to send_log

### PHASE 10: Integration with Existing ProviderOS
- When a campaign_lead books a call → create a Session in the sessions table
- When a campaign_lead replies → create a notification
- When a campaign_lead clicks → update engagement_score
- Hot leads (score > 10) → optionally auto-create as Leads in the existing leads table
- Campaign stats visible on the main Dashboard (new card: "Outreach: X sent today, Y% open rate")
- Add outreach notifications to the existing NotificationsPanel

## SAFETY RULES — DO NOT VIOLATE
1. NEVER send to an email on the suppression_list
2. NEVER exceed the warmup daily limit
3. NEVER exceed 50,000 sends per month
4. NEVER send on weekends if weekdays_only is enabled
5. ALWAYS include unsubscribe link in every email
6. ALWAYS check suppression before each send
7. ALWAYS stagger sends (minimum 2 second gap between emails)
8. Auto-pause campaign if bounce rate exceeds 3%
9. Auto-suppress on: unsubscribe, hard bounce, complaint, reply
10. Log every single send attempt in send_log

## ENVIRONMENT VARIABLES NEEDED
Add to .env.example and document:
```
# Existing (already in .env.local)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_RELAY_AUTH_TOKEN=
RELAY_AUTH_TOKEN=
STRIPE_API_KEY=
RESEND_API_KEY=
VITE_GOOGLE_API_KEY=

# New for outreach system
RESEND_FROM_EMAIL=john@go.theprovidersystem.com
RESEND_FROM_NAME=John W Johnson
TRACKING_BASE_URL=http://localhost:3001
RESEND_WEBHOOK_SECRET=
GOOGLE_CALENDAR_ID=primary
```

## FILE CREATION/MODIFICATION MAP
**New files to create:**
- supabase/outreach_tables.sql
- components/OutreachManager.tsx (main outreach tab container with sub-tabs)
- components/CampaignList.tsx
- components/CampaignDetail.tsx
- components/CSVImporter.tsx
- components/EmailTemplateEditor.tsx
- components/CampaignScheduler.tsx
- components/OutreachAnalytics.tsx
- components/BookingPage.tsx
- components/UnsubscribePage.tsx
- scripts/warmup-cron.mjs
- DNS_SETUP_GUIDE.md

**Existing files to modify:**
- App.tsx — add Outreach tab, import new components, add outreach state, add booking/unsubscribe URL routing
- types.ts — add new interfaces and enums
- services/dataService.ts — add CRUD for new tables
- scripts/server.mjs — add send_campaign_email, send_batch, process_webhook, unsubscribe, track_click, track_open, create_booking, get_available_slots endpoints
- package.json — add any needed dependencies (papaparse for CSV parsing)

## QUALITY REQUIREMENTS
- All new components must match the existing Swiss mineral design system exactly
- Mobile responsive (same pattern as existing components)
- TypeScript strict — no `any` types except for Supabase/API responses
- Error handling on every async operation
- Loading states on every data fetch
- No console.error spam — use console.warn for expected failures
- Test that the build succeeds with `npx vite build` before considering done

## AFTER COMPLETING ALL PHASES
1. Run `npx vite build` and fix any errors
2. Output the DNS_SETUP_GUIDE.md content so John can configure Cloudflare
3. List any manual steps remaining (Resend domain verification, env vars to set, cron setup)
4. Summarize what was built and how to use it
